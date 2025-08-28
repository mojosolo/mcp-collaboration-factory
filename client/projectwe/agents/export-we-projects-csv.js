/*
  Export CSV for WE_PROJECTS tenant:
  - reports/we_projects_documents.csv (one row per document)
  - reports/we_projects_extractions.csv (one row per extraction)
*/

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

function toCsvValue(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (
    s.includes('"') ||
    s.includes(",") ||
    s.includes("\n") ||
    s.includes("\r")
  ) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const outDir = path.join(process.cwd(), "reports");
    ensureDir(outDir);

    // Fetch documents
    const docs = await prisma.cascade_documents.findMany({
      where: { domain: "WE_PROJECTS", status: "active" },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        cascade_metadata: {
          select: {
            intelligenceTags: true,
            complexityScore: true,
            metadataJson: true,
          },
        },
      },
      orderBy: { title: "asc" },
    });

    // Documents CSV
    const docsHeaders = [
      "id",
      "title",
      "content_length",
      "complexity_score",
      "tags",
      "created_at",
      "updated_at",
    ];
    const docsRows = [docsHeaders.join(",")];
    for (const d of docs) {
      const tags = (d.cascade_metadata?.intelligenceTags || []).join("|");
      const score =
        d.cascade_metadata?.complexityScore != null
          ? Number(d.cascade_metadata.complexityScore)
          : "";
      const row = [
        toCsvValue(d.id),
        toCsvValue(d.title.replace(/\n/g, " ")),
        toCsvValue((d.content || "").length),
        toCsvValue(score),
        toCsvValue(tags),
        toCsvValue(d.createdAt?.toISOString?.() || ""),
        toCsvValue(d.updatedAt?.toISOString?.() || ""),
      ];
      docsRows.push(row.join(","));
    }
    const docsPath = path.join(outDir, "we_projects_documents.csv");
    fs.writeFileSync(docsPath, docsRows.join("\n"));

    // Extractions CSV
    const exts = await prisma.cascade_extractions.findMany({
      where: { cascade_documents: { domain: "WE_PROJECTS", status: "active" } },
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

    const exHeaders = [
      "document_id",
      "title",
      "extraction_type",
      "extracted_value",
      "confidence",
      "tags",
      "created_at",
    ];
    const exRows = [exHeaders.join(",")];
    for (const e of exts) {
      const tags = Array.isArray(e.tags) ? e.tags.join("|") : "";
      const row = [
        toCsvValue(e.documentId),
        toCsvValue((e.cascade_documents?.title || "").replace(/\n/g, " ")),
        toCsvValue(e.extractionType),
        toCsvValue((e.extractedValue || "").replace(/\n/g, " ")),
        toCsvValue(e.confidenceScore != null ? Number(e.confidenceScore) : ""),
        toCsvValue(tags),
        toCsvValue(e.createdAt?.toISOString?.() || ""),
      ];
      exRows.push(row.join(","));
    }
    const exPath = path.join(outDir, "we_projects_extractions.csv");
    fs.writeFileSync(exPath, exRows.join("\n"));

    console.log(
      JSON.stringify(
        {
          ok: true,
          documents: docs.length,
          extractions: exts.length,
          paths: { docsPath, exPath },
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error("Export failed:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
