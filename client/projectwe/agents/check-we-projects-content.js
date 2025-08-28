/*
  Checks cascade_documents.content completeness for WE_PROJECTS.
  Prints summary metrics and flags potentially truncated/short contents.
*/

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const docs = await prisma.cascade_documents.findMany({
      where: { domain: "WE_PROJECTS", status: "active" },
      select: { id: true, title: true, content: true },
      orderBy: { title: "asc" },
    });

    const total = docs.length;
    let nullOrEmpty = 0;
    let veryShort = 0; // < 200 chars
    let short = 0; // < 1000 chars
    let truncated = 0; // heuristic ... ending
    let lengths = [];

    const nullOrEmptyIds = [];
    const veryShortIds = [];
    const shortIds = [];
    const truncatedIds = [];

    for (const d of docs) {
      const c = (d.content || "").trim();
      const len = c.length;
      lengths.push(len);
      if (!c) {
        nullOrEmpty++;
        nullOrEmptyIds.push({ id: d.id, title: d.title });
        continue;
      }
      if (len < 200) {
        veryShort++;
        veryShortIds.push({ id: d.id, title: d.title, len });
      }
      if (len < 1000) {
        short++;
        shortIds.push({ id: d.id, title: d.title, len });
      }
      if (c.endsWith("...") || /\bcontinued\b\s*$/i.test(c)) {
        truncated++;
        truncatedIds.push({ id: d.id, title: d.title, len });
      }
    }

    lengths.sort((a, b) => a - b);
    const min = lengths[0] || 0;
    const max = lengths[lengths.length - 1] || 0;
    const avg = lengths.length
      ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
      : 0;

    const shortestSamples = [...veryShortIds]
      .sort((a, b) => a.len - b.len)
      .slice(0, 10);

    const result = {
      domain: "WE_PROJECTS",
      totalDocuments: total,
      contentLength: { min, max, avg },
      nullOrEmptyCount: nullOrEmpty,
      veryShortCount: veryShort,
      shortCount: short,
      truncatedHeuristicCount: truncated,
      examples: {
        nullOrEmpty: nullOrEmptyIds.slice(0, 10),
        veryShort: shortestSamples,
        truncated: truncatedIds.slice(0, 10),
      },
    };

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error checking WE_PROJECTS content:", err);
    process.exitCode = 1;
  } finally {
    // eslint-disable-next-line no-unsafe-finally
    await prisma.$disconnect();
  }
}

main();
