import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ log: ["error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sampleSize = Math.min(Number(body.sampleSize) || 30, 100);

    // Fetch core data
    const documents = await prisma.cascade_documents.findMany({
      where: { domain: "WE_PROJECTS", status: "active" },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        cascade_metadata: {
          select: { intelligenceTags: true, complexityScore: true },
        },
      },
      orderBy: { title: "asc" },
    });

    const docIdToMeta: Record<
      string,
      {
        title: string;
        contentLength: number;
        complexityScore: number | null;
        tags: string[];
        createdAt: string | null;
      }
    > = {};
    for (const d of documents) {
      docIdToMeta[d.id] = {
        title: d.title || "",
        contentLength: (d.content || "").length,
        complexityScore: d.cascade_metadata?.complexityScore ?? null,
        tags: d.cascade_metadata?.intelligenceTags || [],
        createdAt: d.createdAt ? d.createdAt.toISOString() : null,
      };
    }

    const extractions = await prisma.cascade_extractions.findMany({
      where: { documentId: { in: documents.map((d) => d.id) } },
      select: {
        documentId: true,
        extractionType: true,
        extractedValue: true,
        confidenceScore: true,
        tags: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Analytics summary
    const byType: Record<string, number> = {};
    const confValues: number[] = [];
    const confBuckets: Record<string, number> = {
      ">=0.9": 0,
      "0.8-0.89": 0,
      "0.7-0.79": 0,
      "<0.7": 0,
    };
    const tagsCounter: Record<string, number> = {};
    for (const e of extractions) {
      const t = e.extractionType || "UNKNOWN";
      byType[t] = (byType[t] || 0) + 1;
      const c = e.confidenceScore;
      if (typeof c === "number" && !Number.isNaN(c)) {
        confValues.push(c);
        if (c >= 0.9) confBuckets[">=0.9"]++;
        else if (c >= 0.8) confBuckets["0.8-0.89"]++;
        else if (c >= 0.7) confBuckets["0.7-0.79"]++;
        else confBuckets["<0.7"]++;
      }
      if (Array.isArray(e.tags)) {
        for (const tag of e.tags) {
          if (!tag) continue;
          tagsCounter[tag] = (tagsCounter[tag] || 0) + 1;
        }
      }
    }

    const avgConf = confValues.length
      ? Number(
          (confValues.reduce((s, v) => s + v, 0) / confValues.length).toFixed(
            4,
          ),
        )
      : null;

    // Low-confidence cohort (recommendations + strategic_insights < 0.8)
    const lowConf = extractions
      .filter((e) => {
        const t = (e.extractionType || "").toLowerCase();
        const c = e.confidenceScore;
        return (
          (t === "recommendations" || t === "strategic_insights") &&
          typeof c === "number" &&
          c < 0.8
        );
      })
      .slice(0, sampleSize)
      .map((e) => ({
        documentId: e.documentId,
        title: docIdToMeta[e.documentId]?.title || "",
        type: e.extractionType,
        confidence: e.confidenceScore,
        value: (e.extractedValue || "").slice(0, 400),
        tags: e.tags || [],
      }));

    const byTypeTop = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    const topTags = Object.entries(tagsCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }));

    const summary = {
      documents: { total: documents.length },
      extractions: {
        total: extractions.length,
        byTypeTop,
        avgConfidence: avgConf,
        confidenceBuckets: confBuckets,
        topTags,
      },
      notes: [
        "Concept types show high confidence; recommendations and strategic_insights lower",
        "Use low-confidence cohort for QA and calibration",
      ],
    };

    const prompt = `You are a senior AI quality auditor. Review the intelligence extraction analytics and sampled low-confidence outputs. 

GUIDELINES:
- Identify data quality issues, biases, or skew
- Prioritize concrete QA checks and fixes
- Propose confidence threshold adjustments (if needed)
- Flag any anomalies by type/tag
- Recommend 5 KPI metrics to monitor ongoing quality

Provide concise, actionable bullets. Avoid fluff.

ANALYTICS SUMMARY (JSON):
${JSON.stringify(summary)}

LOW-CONFIDENCE SAMPLES (JSON, truncated values):
${JSON.stringify(lowConf)}
`;

    // Try GPT-5 first, fallback to GPT-4o if empty or error
    let content = "";
    let modelUsed = "gpt-5";

    try {
      const gpt5Completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 1500,
      });

      content = gpt5Completion.choices[0]?.message?.content || "";

      if (!content) {
        console.log("GPT-5 returned empty response, falling back to GPT-4o");
        modelUsed = "gpt-4o";
        const gpt4oCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_completion_tokens: 1500,
        });
        content = gpt4oCompletion.choices[0]?.message?.content || "";
      }
    } catch (error: any) {
      console.log("GPT-5 error, using GPT-4o:", error.message);
      modelUsed = "gpt-4o";
      const gpt4oCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 1500,
      });
      content = gpt4oCompletion.choices[0]?.message?.content || "";
    }

    // Derive status from metrics
    const lowRatio = lowConf.length / Math.max(1, sampleSize);
    const status: "pass" | "warn" | "fail" =
      (avgConf ?? 0) >= 0.86 && lowRatio <= 0.15
        ? "pass\n"
        : (avgConf ?? 0) >= 0.8 && lowRatio <= 0.3
          ? "warn\n"
          : "fail";

    const record = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      documentsTotal: documents.length,
      extractionsTotal: extractions.length,
      avgConfidence: avgConf,
      lowConfidenceSample: lowConf.length,
      byTypeTop,
      topTags,
      thresholds: {
        passAvg: 0.86,
        passLowRatio: 0.15,
        warnAvg: 0.8,
        warnLowRatio: 0.3,
      },
      status,
      reviewText: content,
      model: modelUsed,
    };

    // Try DB persistence; fallback to filesystem under reports/intelligence-reviews/
    let persisted = false;
    try {
      // Optional table: IntelligenceReview (if schema exists)
      // @ts-ignore - access guarded by try/catch
      await (prisma as any).intelligence_reviews.create({
        data: {
          id: record.id,
          createdAt: new Date(record.createdAt),
          documentsTotal: record.documentsTotal,
          extractionsTotal: record.extractionsTotal,
          avgConfidence: record.avgConfidence,
          lowConfidenceSample: record.lowConfidenceSample,
          byTypeTopJson: record.byTypeTop,
          topTagsJson: record.topTags,
          thresholdsJson: record.thresholds,
          status: record.status,
          model: record.model,
          reviewText: record.reviewText,
        },
      });
      persisted = true;
    } catch (e) {
      // Fallback to filesystem
      try {
        const dir = path.join(process.cwd(), "reports", "intelligence-reviews");
        await fs.mkdir(dir, { recursive: true });
        const fp = path.join(dir, `review-${record.id}.json`);
        await fs.writeFile(fp, JSON.stringify(record, null, 2), "utf-8");
        persisted = true;
      } catch {
        persisted = false;
      }
    }

    return NextResponse.json({
      success: true,
      review: content,
      status,
      used: { summary, lowConfCount: lowConf.length },
      persisted,
    });
  } catch (error: any) {
    console.error("Reasoning review failed:", error);
    return NextResponse.json(
      { success: false, error: "Reasoning review failed" },
      { status: 500 },
    );
  }
}
