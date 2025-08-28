/*
  Audits WE_PROJECTS rewritten intelligence:
  - content completeness (length)
  - presence of metadata (cascade_metadata)
  - extractions count and type coverage
  - relationships (in/out degree)
  - indexing status (lastIndexedAt / indexedBy)
*/

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const docs = await prisma.cascade_documents.findMany({
      where: { domain: "WE_PROJECTS", status: "active" },
      select: {
        id: true,
        title: true,
        content: true,
        lastIndexedAt: true,
        indexedBy: true,
        cascade_metadata: {
          select: {
            intelligenceTags: true,
            complexityScore: true,
            metadataJson: true,
          },
        },
        cascade_extractions: {
          select: { extractionType: true },
        },
        cascade_relationships_cascade_relationships_sourceDocIdTocascade_documents:
          { select: { id: true } },
        cascade_relationships_cascade_relationships_targetDocIdTocascade_documents:
          { select: { id: true } },
      },
      orderBy: { title: "asc" },
    });

    const total = docs.length;
    const stats = {
      total,
      content: { nullOrEmpty: 0, lt1000: 0, lt5000: 0, min: 0, max: 0, avg: 0 },
      metadata: { present: 0, missing: 0 },
      indexing: { lastIndexedAtPresent: 0, indexedByPresent: 0 },
      relationships: { withAny: 0, withoutAny: 0, avgDegree: 0 },
      extractions: { totalCount: 0, perType: {} },
      problems: {
        contentTooShort: [],
        missingMetadata: [],
        missingIndexing: [],
        noRelationships: [],
        sparseExtractions: [],
        missingKeyTypes: [],
      },
    };

    const lengths = [];

    for (const d of docs) {
      const c = (d.content || "").trim();
      const len = c.length;
      lengths.push(len);
      if (!c) stats.content.nullOrEmpty++;
      if (len < 1000)
        (stats.content.lt1000++,
          stats.problems.contentTooShort.push({
            id: d.id,
            title: d.title,
            len,
          }));
      else if (len < 5000) stats.content.lt5000++;

      // metadata
      if (d.cascade_metadata) stats.metadata.present++;
      else
        (stats.metadata.missing++,
          stats.problems.missingMetadata.push({ id: d.id, title: d.title }));

      // indexing
      if (d.lastIndexedAt) stats.indexing.lastIndexedAtPresent++;
      else
        stats.problems.missingIndexing.push({
          id: d.id,
          title: d.title,
          field: "lastIndexedAt",
        });
      if (d.indexedBy) stats.indexing.indexedByPresent++;

      // relationships
      const outDeg =
        d
          .cascade_relationships_cascade_relationships_sourceDocIdTocascade_documents
          .length;
      const inDeg =
        d
          .cascade_relationships_cascade_relationships_targetDocIdTocascade_documents
          .length;
      const degree = outDeg + inDeg;
      stats.relationships.avgDegree += degree;
      if (degree > 0) stats.relationships.withAny++;
      else
        (stats.relationships.withoutAny++,
          stats.problems.noRelationships.push({ id: d.id, title: d.title }));

      // extractions
      const count = d.cascade_extractions.length;
      stats.extractions.totalCount += count;
      if (count < 3)
        stats.problems.sparseExtractions.push({
          id: d.id,
          title: d.title,
          count,
        });
      const types = new Set(d.cascade_extractions.map((e) => e.extractionType));
      for (const t of types)
        stats.extractions.perType[t] = (stats.extractions.perType[t] || 0) + 1;
      const mustHave = [
        "key_concepts",
        "recommendations",
        "strategic_insights",
      ];
      const missingKey = mustHave.filter((t) => !types.has(t));
      if (missingKey.length)
        stats.problems.missingKeyTypes.push({
          id: d.id,
          title: d.title,
          missing: missingKey,
        });
    }

    lengths.sort((a, b) => a - b);
    stats.content.min = lengths[0] || 0;
    stats.content.max = lengths[lengths.length - 1] || 0;
    stats.content.avg = lengths.length
      ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
      : 0;
    stats.relationships.avgDegree = total
      ? +(stats.relationships.avgDegree / total).toFixed(2)
      : 0;

    console.log(JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error("Error auditing WE_PROJECTS intelligence:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
