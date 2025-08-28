/*
  Generates missing 'recommendations' for WE_PROJECTS using OpenAI and saves
  them as cascade_extractions.

  Requirements:
  - env OPENAI_API_KEY must be set
*/

const { PrismaClient } = require("@prisma/client");
const OpenAI = require("openai");

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildPrompt(doc) {
  const content = (doc.content || "").slice(0, 20000);
  const insights = doc.strategicInsights.join("\n- ");
  const concepts = doc.keyConcepts.join(", ");
  return `You are a strategy analyst. Given the rewritten knowledge document content and its key insights,
produce a concise list of 5-10 actionable recommendations tailored to this content. Each recommendation should
be a single sentence, imperative, specific, and high-value. Avoid duplication and generic fluff.

Return ONLY valid JSON in the following schema:
{ "recommendations": [ "...", "..." ] }

Title: ${doc.title}
Key Concepts: ${concepts}
Strategic Insights:\n- ${insights}

Content:\n${content}`;
}

async function generateRecommendationsForDoc(doc) {
  const prompt = buildPrompt(doc);
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You return only valid JSON. No extra text." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });
  const content = response.choices?.[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    parsed = { recommendations: [] };
  }
  const recs = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
    : [];
  return recs
    .filter((r) => typeof r === "string" && r.trim().length > 0)
    .slice(0, 10);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY");
    process.exit(1);
  }
  try {
    const docs = await prisma.cascade_documents.findMany({
      where: { domain: "WE_PROJECTS", status: "active" },
      select: {
        id: true,
        title: true,
        content: true,
        cascade_extractions: {
          select: { extractionType: true, extractedValue: true },
        },
        cascade_metadata: { select: { intelligenceTags: true } },
      },
      orderBy: { title: "asc" },
    });

    const targets = [];
    for (const d of docs) {
      const types = new Set(d.cascade_extractions.map((e) => e.extractionType));
      if (!types.has("recommendations")) {
        const keyConcepts = (d.cascade_metadata?.intelligenceTags || []).slice(
          0,
          12,
        );
        const strategicInsights = d.cascade_extractions
          .filter((e) => e.extractionType === "strategic_insights")
          .map((e) => e.extractedValue)
          .filter(Boolean)
          .slice(0, 12);
        targets.push({
          id: d.id,
          title: d.title,
          content: d.content,
          keyConcepts,
          strategicInsights,
        });
      }
    }

    let created = 0;
    for (const doc of targets) {
      try {
        const recs = await generateRecommendationsForDoc(doc);
        for (const r of recs) {
          const id = `${doc.id}:recommendation:${Buffer.from(r).toString("base64").slice(0, 24)}`;
          await prisma.cascade_extractions.upsert({
            where: { id },
            update: {},
            create: {
              id,
              documentId: doc.id,
              extractionType: "recommendations",
              extractedValue: r,
              confidenceScore: 0.75,
              tags: ["auto_ai", "recommendation_generated"],
            },
          });
          created++;
        }
        // small delay to respect rate limits
        await new Promise((res) => setTimeout(res, 300));
      } catch (e) {
        console.error(`Failed for ${doc.id} ${doc.title}:`, e?.message || e);
      }
    }

    console.log(
      JSON.stringify(
        { status: "ok", targetedDocs: targets.length, created },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error("Generation error:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
