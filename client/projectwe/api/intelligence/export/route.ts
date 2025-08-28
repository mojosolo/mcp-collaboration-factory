import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ log: ["error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (
    s.includes('"') ||
    s.includes(",") ||
    s.includes(\n"
") ||
    s.includes("\r")
  ) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const variant = (searchParams.get("variant") || "combined").toLowerCase();

    // Fetch documents
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

    const docById: Record<
      string,
      {
        title: string;
        contentLength: number;
        complexityScore: number | null;
        tags: string;
        createdAt: string;
      }
    > = {};
    for (const d of documents) {
      docById[d.id] = {
        title: d.title || "",
        contentLength: (d.content || "").length,
        complexityScore: d.cascade_metadata?.complexityScore ?? null,
        tags: (d.cascade_metadata?.intelligenceTags || []).join("|"),
        createdAt: d.createdAt ? d.createdAt.toISOString() : "",
      };
    }

    // Fetch extractions
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

    let filename = "we_projects_extractions_with_docmeta.csv";
    const headers = [
      "document_id",
      "title",
      "extraction_type",
      "extracted_value",
      "confidence",
      "extraction_tags",
      "extraction_created_at",
      "doc_content_length",
      "doc_complexity_score",
      "doc_tags",
      "doc_created_at",
    ];

    const rows: string[] = [];
    rows.push(headers.join(","));

    for (const e of extractions) {
      const doc = docById[e.documentId as string] || {
        title: "",
        contentLength: 0,
        complexityScore: null,
        tags: "",
        createdAt: "",
      };
      const confidence =
        typeof e.confidenceScore === "number" &&
        !Number.isNaN(e.confidenceScore)
          ? e.confidenceScore
          : "";
      const extractionTags = Array.isArray(e.tags) ? e.tags.join("|") : "";

      if (variant === "low_conf") {
        const t = (e.extractionType || "").toLowerCase();
        const c =
          typeof e.confidenceScore === "number" ? e.confidenceScore : NaN;
        if (
          !(t === "recommendations" || t === "strategic_insights") ||
          !(c < 0.8)
        ) {
          continue;
        }
        filename = "we_projects_low_confidence_review.csv";
      }

      const row = [
        toCsvValue(e.documentId),
        toCsvValue(e.cascade_documents?.title || doc.title),
        toCsvValue(e.extractionType || ""),
        toCsvValue((e.extractedValue || "").replace(/
/g, " ").trim()),
        toCsvValue(confidence),
        toCsvValue(extractionTags),
        toCsvValue(e.createdAt ? e.createdAt.toISOString() : ""),
        toCsvValue(doc.contentLength),
        toCsvValue(
          doc.complexityScore === null ? "" : Number(doc.complexityScore),
        ),
        toCsvValue(doc.tags),
        toCsvValue(doc.createdAt),
      ];
      rows.push(row.join(","));
    }

    const csv = rows.join("\n")
");
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("CSV export failed:", error);
    return new Response(
      JSON.stringify({ success: false, error: "CSV export failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
