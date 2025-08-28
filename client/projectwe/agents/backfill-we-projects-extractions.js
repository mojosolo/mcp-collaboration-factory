/*
  Backfills missing extraction types for WE_PROJECTS:
  - key_concepts: from cascade_metadata.intelligenceTags (top 10)
  - recommendations: heuristic parse from content under headings (up to 10)
  - strategic_insights: from existing STRATEGIC_FINDING/STRATEGIC_CONCEPT (up to 10)
*/

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function extractRecommendationsFromContent(content) {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const recs = [];
  const headingRegex =
    /^(recommendations|recommended actions|next steps|actions|what to do)\s*:?\s*$/i;
  let inRec = false;
  let buffer = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (headingRegex.test(line)) {
      inRec = true;
      buffer = [];
      continue;
    }
    if (inRec) {
      if (!line) {
        if (buffer.length > 0) break;
        continue;
      }
      if (/^[\-•\*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
        buffer.push(line.replace(/^([\-•\*]|\d+\.)\s+/, ""));
        continue;
      }
      // stop when we hit a new heading-like line
      if (/^[A-Z][A-Za-z\s]{0,40}:$/.test(line)) break;
      // treat as continuation
      if (buffer.length > 0) {
        buffer[buffer.length - 1] += " " + line;
      }
    }
  }
  for (const b of buffer) {
    if (b && b.length > 3) recs.push(b);
  }
  // Fallback: capture early bullets if no heading section found
  if (recs.length === 0) {
    for (const l of lines) {
      const m = l.trim();
      if (/^[\-•\*]\s+/.test(m)) recs.push(m.replace(/^([\-•\*])\s+/, ""));
      if (recs.length >= 5) break;
    }
  }
  return [...new Set(recs)].slice(0, 10);
}

async function main() {
  try {
    const docs = await prisma.cascade_documents.findMany({
      where: { domain: "WE_PROJECTS", status: "active" },
      select: {
        id: true,
        title: true,
        content: true,
        cascade_metadata: { select: { intelligenceTags: true } },
        cascade_extractions: {
          select: { id: true, extractionType: true, extractedValue: true },
        },
      },
      orderBy: { title: "asc" },
    });

    let created = 0;
    for (const d of docs) {
      const haveTypes = new Set(
        d.cascade_extractions.map((e) => e.extractionType),
      );

      // key_concepts
      if (!haveTypes.has("key_concepts")) {
        const tags = (d.cascade_metadata?.intelligenceTags || []).slice(0, 10);
        for (const tag of tags) {
          const id = `${d.id}:key_concept:${Buffer.from(tag).toString("base64").slice(0, 24)}`;
          await prisma.cascade_extractions.upsert({
            where: { id },
            update: {},
            create: {
              id,
              documentId: d.id,
              extractionType: "key_concepts",
              extractedValue: String(tag),
              confidenceScore: 0.9,
              tags: ["auto_backfill", "tag_derived"],
            },
          });
          created++;
        }
      }

      // recommendations
      if (!haveTypes.has("recommendations")) {
        const recs = extractRecommendationsFromContent(d.content).slice(0, 10);
        for (const r of recs) {
          const id = `${d.id}:recommendation:${Buffer.from(r).toString("base64").slice(0, 24)}`;
          await prisma.cascade_extractions.upsert({
            where: { id },
            update: {},
            create: {
              id,
              documentId: d.id,
              extractionType: "recommendations",
              extractedValue: r,
              confidenceScore: 0.7,
              tags: ["auto_backfill", "content_heuristic"],
            },
          });
          created++;
        }
      }

      // strategic_insights
      if (!haveTypes.has("strategic_insights")) {
        const strategic = d.cascade_extractions
          .filter(
            (e) =>
              e.extractionType === "STRATEGIC_FINDING" ||
              e.extractionType === "STRATEGIC_CONCEPT",
          )
          .map((e) => e.extractedValue)
          .filter(Boolean);
        const unique = [...new Set(strategic)].slice(0, 10);
        for (const s of unique) {
          const id = `${d.id}:strategic:${Buffer.from(s).toString("base64").slice(0, 24)}`;
          await prisma.cascade_extractions.upsert({
            where: { id },
            update: {},
            create: {
              id,
              documentId: d.id,
              extractionType: "strategic_insights",
              extractedValue: s,
              confidenceScore: 0.8,
              tags: ["auto_backfill", "strategic_mapped"],
            },
          });
          created++;
        }
      }
    }

    console.log(JSON.stringify({ status: "ok", created }, null, 2));
  } catch (err) {
    console.error("Backfill error:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
