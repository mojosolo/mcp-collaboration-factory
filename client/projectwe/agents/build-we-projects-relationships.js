/*
  Builds cascade_relationships for WE_PROJECTS by shared intelligence tags.
  - For documents with overlapping tags, create bidirectional relationships with type 'TAG_SIMILARITY'.
  - Strength = Jaccard index of tag sets.
*/

const { PrismaClient } = require("@prisma/client");

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const uni = new Set([...a, ...b]).size;
  return uni === 0 ? 0 : inter / uni;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const docs = await prisma.cascade_documents.findMany({
      where: { domain: "WE_PROJECTS", status: "active" },
      select: {
        id: true,
        cascade_metadata: { select: { intelligenceTags: true } },
      },
      orderBy: { id: "asc" },
    });

    const items = docs.map((d) => ({
      id: d.id,
      tags: d.cascade_metadata?.intelligenceTags || [],
    }));

    const toCreate = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const strength = jaccard(a.tags, b.tags);
        if (strength >= 0.3) {
          toCreate.push({ sourceDocId: a.id, targetDocId: b.id, strength });
        }
      }
    }

    console.log(`Found ${toCreate.length} relationships to create`);

    // Upsert relationships
    for (const rel of toCreate) {
      // Create both directions
      await prisma.cascade_relationships.upsert({
        where: { id: `${rel.sourceDocId}->${rel.targetDocId}:TAG_SIMILARITY` },
        update: { strength: rel.strength },
        create: {
          id: `${rel.sourceDocId}->${rel.targetDocId}:TAG_SIMILARITY`,
          sourceDocId: rel.sourceDocId,
          targetDocId: rel.targetDocId,
          relationshipType: "TAG_SIMILARITY",
          strength: rel.strength,
          bidirectional: true,
        },
      });
      await prisma.cascade_relationships.upsert({
        where: { id: `${rel.targetDocId}->${rel.sourceDocId}:TAG_SIMILARITY` },
        update: { strength: rel.strength },
        create: {
          id: `${rel.targetDocId}->${rel.sourceDocId}:TAG_SIMILARITY`,
          sourceDocId: rel.targetDocId,
          targetDocId: rel.sourceDocId,
          relationshipType: "TAG_SIMILARITY",
          strength: rel.strength,
          bidirectional: true,
        },
      });
    }

    console.log("Relationship build complete");
  } catch (err) {
    console.error("Error building relationships:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
