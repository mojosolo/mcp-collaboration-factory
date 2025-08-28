import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ log: ["error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

type ExtractionAgg = {
  total: number;
  byTypeTop10: Array<{ type: string; count: number }>;
  confidenceOverall: {
    avg: number | null;
    median: number | null;
    p90: number | null;
  };
  confidenceBuckets: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
  perDocumentTop10: Array<{ documentId: string; title: string; count: number }>;
  range: { first: string | null; last: string | null };
  monthly: Array<{ month: string; count: number }>;
};

type DocumentAgg = {
  total: number;
  stats: {
    contentLength: {
      min: number | null;
      avg: number | null;
      median: number | null;
      max: number | null;
    };
    complexityScore: {
      count: number;
      avg: number | null;
      median: number | null;
      min: number | null;
      max: number | null;
    };
  };
  docsWithTags: number;
  topTags: Array<{ tag: string; count: number }>;
  contentLengthVsExtractionCountCorr: number | null;
};

function percentile(sortedValues: number[], p: number): number | null {
  if (!sortedValues.length) return null;
  const idx = Math.floor(p * (sortedValues.length - 1));
  return sortedValues[idx];
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export async function GET(_request: NextRequest) {
  try {
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
        createdAt: Date | null;
      }
    > = {};
    for (const d of documents) {
      docIdToMeta[d.id] = {
        title: d.title || "",
        contentLength: (d.content || "").length,
        complexityScore: d.cascade_metadata?.complexityScore ?? null,
        tags: d.cascade_metadata?.intelligenceTags || [],
        createdAt: d.createdAt || null,
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
        cascade_documents: { select: { title: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const total = extractions.length;

    const byTypeMap: Record<string, number> = {};
    const confValues: number[] = [];
    const buckets: Record<string, number> = {
      ">=0.9": 0,
      "0.8-0.89": 0,
      "0.7-0.79": 0,
      "<0.7": 0,
    };
    const tagCounter: Record<string, number> = {};
    const perDocCounter: Record<string, number> = {};
    const dates: Date[] = [];

    for (const e of extractions) {
      const t = e.extractionType || "UNKNOWN";
      byTypeMap[t] = (byTypeMap[t] || 0) + 1;

      const c = e.confidenceScore;
      if (typeof c === "number" && !Number.isNaN(c)) {
        confValues.push(c);
        if (c >= 0.9) buckets[">=0.9"] += 1;
        else if (c >= 0.8) buckets["0.8-0.89"] += 1;
        else if (c >= 0.7) buckets["0.7-0.79"] += 1;
        else buckets["<0.7"] += 1;
      }

      if (Array.isArray(e.tags)) {
        for (const tag of e.tags) {
          if (!tag) continue;
          tagCounter[tag] = (tagCounter[tag] || 0) + 1;
        }
      }

      if (e.documentId)
        perDocCounter[e.documentId] = (perDocCounter[e.documentId] || 0) + 1;
      if (e.createdAt) dates.push(e.createdAt);
    }

    const byTypeTop10 = Object.entries(byTypeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    const sortedConf = [...confValues].sort((a, b) => a - b);
    const avgConf = confValues.length
      ? confValues.reduce((s, v) => s + v, 0) / confValues.length
      : null;
    const medConf = median(confValues);
    const p90Conf = percentile(sortedConf, 0.9);

    const topTags = Object.entries(tagCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    const perDocumentTop10 = Object.entries(perDocCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([documentId, count]) => ({
        documentId,
        title: docIdToMeta[documentId]?.title || "",
        count,
      }));

    const first = dates.length
      ? new Date(Math.min(...dates.map((d) => d.getTime())))
      : null;
    const last = dates.length
      ? new Date(Math.max(...dates.map((d) => d.getTime())))
      : null;

    const monthMap: Record<string, number> = {};
    for (const d of dates) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = (monthMap[key] || 0) + 1;
    }
    const monthly = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));

    const extractionAgg: ExtractionAgg = {
      total,
      byTypeTop10,
      confidenceOverall: {
        avg: avgConf !== null ? Number(avgConf.toFixed(4)) : null,
        median: medConf !== null ? Number(medConf.toFixed(4)) : null,
        p90: p90Conf !== null ? Number(p90Conf.toFixed(4)) : null,
      },
      confidenceBuckets: buckets,
      topTags,
      perDocumentTop10,
      range: {
        first: first ? first.toISOString() : null,
        last: last ? last.toISOString() : null,
      },
      monthly,
    };

    const contentLengths = documents.map((d) => (d.content || "").length);
    const complexityScores = documents
      .map((d) => d.cascade_metadata?.complexityScore)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

    const docsWithTags = documents.filter(
      (d) => (d.cascade_metadata?.intelligenceTags || []).length > 0,
    ).length;
    const docTagCounter: Record<string, number> = {};
    for (const d of documents) {
      for (const t of d.cascade_metadata?.intelligenceTags || []) {
        if (!t) continue;
        docTagCounter[t] = (docTagCounter[t] || 0) + 1;
      }
    }
    const docTopTags = Object.entries(docTagCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    const idToContentLength: Record<string, number> = {};
    for (const d of documents)
      idToContentLength[d.id] = (d.content || "").length;
    const commonIds = Object.keys(perDocCounter).filter(
      (id) => id in idToContentLength,
    );
    let corr: number | null = null;
    if (commonIds.length >= 2) {
      const xs = commonIds.map((id) => idToContentLength[id]);
      const ys = commonIds.map((id) => perDocCounter[id]);
      const meanX = xs.reduce((s, v) => s + v, 0) / xs.length;
      const meanY = ys.reduce((s, v) => s + v, 0) / ys.length;
      const cov =
        xs
          .map((x, i) => (x - meanX) * (ys[i] - meanY))
          .reduce((s, v) => s + v, 0) /
        (xs.length - 1);
      const varX =
        xs.map((x) => (x - meanX) ** 2).reduce((s, v) => s + v, 0) /
        (xs.length - 1);
      const varY =
        ys.map((y) => (y - meanY) ** 2).reduce((s, v) => s + v, 0) /
        (ys.length - 1);
      corr = varX > 0 && varY > 0 ? cov / Math.sqrt(varX * varY) : null;
      if (corr !== null) corr = Number(corr.toFixed(4));
    }

    const docAgg: DocumentAgg = {
      total: documents.length,
      stats: {
        contentLength: {
          min: contentLengths.length ? Math.min(...contentLengths) : null,
          avg: contentLengths.length
            ? Number(
                (
                  contentLengths.reduce((s, v) => s + v, 0) /
                  contentLengths.length
                ).toFixed(2),
              )
            : null,
          median: contentLengths.length ? median(contentLengths) : null,
          max: contentLengths.length ? Math.max(...contentLengths) : null,
        },
        complexityScore: {
          count: complexityScores.length,
          avg: complexityScores.length
            ? Number(
                (
                  complexityScores.reduce((s, v) => s + v, 0) /
                  complexityScores.length
                ).toFixed(4),
              )
            : null,
          median: complexityScores.length
            ? Number((median(complexityScores) || 0).toFixed(4))
            : null,
          min: complexityScores.length
            ? Number(Math.min(...complexityScores).toFixed(4))
            : null,
          max: complexityScores.length
            ? Number(Math.max(...complexityScores).toFixed(4))
            : null,
        },
      },
      docsWithTags,
      topTags: docTopTags,
      contentLengthVsExtractionCountCorr: corr,
    };

    return NextResponse.json({
      success: true,
      data: { extractions: extractionAgg, documents: docAgg },
    });
  } catch (error: any) {
    console.error("Error computing intelligence analytics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to compute analytics",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
