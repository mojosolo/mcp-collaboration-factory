import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Map CASCADE layers to our Layer 1-4 system
const LAYER_MAPPING: Record<string, number> = {
  FOUNDATION: 1, // Surface metrics and facts
  IMPLEMENTATION: 2, // Analytical/tactical patterns
  STRATEGIC: 3, // Strategic analysis
  EVOLUTION: 4, // Deep intelligence insights (synthesis, paradigm shifts, hidden patterns)
  SYNTHESIS: 4, // Alternative name for deep insights
};

interface CASCADEResult {
  layer: string;
  model: string;
  success: boolean;
  content: string;
  reasoningTokens?: number;
  tokens?: any;
}

interface CASCADEDocument {
  document: string;
  processedAt: string;
  tenant: string;
  processor: string;
  layersCompleted: number;
  results: CASCADEResult[];
}

function extractKeyInsights(
  content: string,
  layer: string,
  maxInsights: number = 3,
): string[] {
  const insights: string[] = [];
  const lines = content.split("\n");

  // For EVOLUTION layer, look for synthesis and paradigm shifts
  if (layer === "EVOLUTION") {
    // Look for key sections
    const keyPhrases = [
      "Synthesis:",
      "Hidden patterns",
      "Paradigm shifts",
      "Strategic leverage",
      "transforms",
      "breakthrough",
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const phrase of keyPhrases) {
        if (line.includes(phrase)) {
          // Capture the content after the key phrase
          let insight = line
            .substring(line.indexOf(phrase) + phrase.length)
            .trim();
          if (!insight && i + 1 < lines.length) {
            insight = lines[i + 1].trim();
          }
          if (insight && insight.length > 20) {
            // Clean up the insight
            insight = insight.replace(/^[-•]\s*/, "").trim();
            if (insight.length < 250) {
              insights.push(insight);
            }
          }
        }
      }
    }
  }

  // Look for bullet points
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("-") ||
      trimmed.startsWith("•") ||
      trimmed.match(/^\d+\)/)
    ) {
      const insight = trimmed
        .replace(/^[-•]\s*/, "")
        .replace(/^\d+\)\s*/, "")
        .trim();
      if (insight.length > 30 && insight.length < 250) {
        insights.push(insight);
        if (insights.length >= maxInsights * 2) break; // Get more initially, filter later
      }
    }
  }

  // If no bullet points, extract key sentences
  if (insights.length === 0) {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const filtered = sentences
      .filter((s) => {
        const trimmed = s.trim();
        return (
          trimmed.length > 30 &&
          trimmed.length < 250 &&
          !trimmed.startsWith("Below")
        );
      })
      .slice(0, maxInsights * 2)
      .map((s) => s.trim());
    insights.push(...filtered);
  }

  // Deduplicate and return top insights
  const unique = [...new Set(insights)];
  return unique.slice(0, maxInsights);
}

function transformCASCADEToLayer4(data: CASCADEDocument, filename: string) {
  const insights = {
    surface: [] as string[],
    analytical: [] as string[],
    strategic: [] as string[],
    quantum: [] as string[], // Layer 4 deep insights
  };

  let maxLayer = 1;
  let totalScore = 50;

  // Process each CASCADE layer
  data.results.forEach((result) => {
    if (!result.success || !result.content) return;

    const layer = LAYER_MAPPING[result.layer] || 1;
    maxLayer = Math.max(maxLayer, layer);

    const extractedInsights = extractKeyInsights(result.content, result.layer);

    switch (layer) {
      case 1: // FOUNDATION
        if (insights.surface.length === 0) {
          insights.surface = extractedInsights;
        }
        totalScore += 10;
        break;
      case 2: // IMPLEMENTATION
        if (insights.analytical.length === 0) {
          insights.analytical = extractedInsights;
        }
        totalScore += 15;
        break;
      case 3: // STRATEGIC
        if (insights.strategic.length === 0) {
          insights.strategic = extractedInsights;
        }
        totalScore += 20;
        break;
      case 4: // EVOLUTION/SYNTHESIS
        if (insights.quantum.length === 0) {
          insights.quantum = extractedInsights;
        }
        totalScore += 25;
        break;
    }
  });

  // If EVOLUTION layer exists, extract its powerful insights
  const evolutionLayer = data.results.find((r) => r.layer === "EVOLUTION");
  if (evolutionLayer && evolutionLayer.content) {
    const evolutionInsights = [];

    // Extract synthesis statement if present
    const synthesisMatch = evolutionLayer.content.match(
      /Synthesis:\s*([^.]+\.)/,
    );
    if (synthesisMatch) {
      evolutionInsights.push(synthesisMatch[1].trim());
    }

    // Extract paradigm shifts
    const paradigmMatch = evolutionLayer.content.match(/From .+ to .+:/g);
    if (paradigmMatch && paradigmMatch.length > 0) {
      evolutionInsights.push(paradigmMatch[0].replace(":", ""));
    }

    // Extract hidden patterns
    const hiddenMatch = evolutionLayer.content.match(
      /Hidden patterns[^:]*:\s*([^.]+)/,
    );
    if (hiddenMatch) {
      evolutionInsights.push(`Hidden pattern: ${hiddenMatch[1].trim()}`);
    }

    if (evolutionInsights.length > 0) {
      insights.quantum = evolutionInsights.slice(0, 3);
    }
  }

  // Clean up the title
  const title = filename
    .replace(".json", "")
    .replace("-gpt5", "")
    .replace("A8-", "")
    .replace(/_/g, " ")
    .replace(/-/g, " ");

  // Determine category based on content
  const category = determineCategory(title, data.document);

  // Calculate complexity based on CASCADE processing
  const complexity =
    40 +
    data.layersCompleted * 10 +
    Math.min(
      20,
      Math.floor(
        data.results.reduce((sum, r) => sum + (r.reasoningTokens || 0), 0) /
          500,
      ),
    );

  return {
    id: filename.replace(".json", ""),
    title: title,
    content: data.results[0]?.content?.substring(0, 500) || "",
    layer: maxLayer as 1 | 2 | 3 | 4,
    category: category,
    intelligenceScore: Math.min(97, totalScore),
    complexityIndex: Math.min(95, complexity),
    connections: [], // Will be populated based on related documents
    metadata: {
      source: "CASCADE Analysis",
      timestamp: data.processedAt,
      confidence: 0.85 + data.layersCompleted * 0.03,
      verificationStatus: "verified" as const,
    },
    insights: insights,
    vectors: {
      semantic: Array.from({ length: 5 }, () => 0.7 + Math.random() * 0.25),
      temporal: Array.from({ length: 5 }, () => 0.7 + Math.random() * 0.25),
      causal: Array.from({ length: 5 }, () => 0.7 + Math.random() * 0.25),
      probabilistic: Array.from(
        { length: 5 },
        () => 0.7 + Math.random() * 0.25,
      ),
    },
  };
}

function determineCategory(title: string, document: string): string {
  const titleLower = title.toLowerCase();
  const docLower = document.toLowerCase();

  if (
    titleLower.includes("culture") ||
    titleLower.includes("team") ||
    titleLower.includes("leadership")
  ) {
    return "Leadership & Culture";
  }
  if (titleLower.includes("case") || docLower.includes("case")) {
    return "Case Studies";
  }
  if (
    titleLower.includes("tool") ||
    titleLower.includes("kit") ||
    titleLower.includes("template")
  ) {
    return "Tools & Resources";
  }
  if (titleLower.includes("roadmap") || titleLower.includes("strategy")) {
    return "Strategy";
  }
  if (titleLower.includes("methodology") || titleLower.includes("framework")) {
    return "Frameworks";
  }
  if (titleLower.includes("family") || titleLower.includes("enterprise")) {
    return "Family Enterprise";
  }
  if (
    titleLower.includes("accountability") ||
    titleLower.includes("performance")
  ) {
    return "Performance Management";
  }

  return "Business Intelligence";
}

export async function GET(request: NextRequest) {
  try {
    // NO AUTH REQUIRED - This is public demo data
    // Read CASCADE files from reports directory
    const reportsDir = path.join(process.cwd(), "reports/gpt5-cascade");
    const files = await fs.readdir(reportsDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const documents = [];

    // Process each CASCADE file
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(reportsDir, file);
        const content = await fs.readFile(filePath, "utf8");
        const data = JSON.parse(content) as CASCADEDocument;

        if (data.results && Array.isArray(data.results)) {
          const transformed = transformCASCADEToLayer4(data, file);
          documents.push(transformed);
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }

    // Sort by intelligence score
    documents.sort((a, b) => b.intelligenceScore - a.intelligenceScore);

    // Add connections between related documents
    documents.forEach((doc, idx) => {
      // Connect to documents in same category
      const related = documents
        .filter((d, i) => i !== idx && d.category === doc.category)
        .slice(0, 3)
        .map((d) => d.id);

      // Connect to documents with similar scores
      const similar = documents
        .filter(
          (d, i) =>
            i !== idx &&
            Math.abs(d.intelligenceScore - doc.intelligenceScore) < 10,
        )
        .slice(0, 2)
        .map((d) => d.id);

      doc.connections = [...new Set([...related, ...similar])].slice(0, 4);
    });

    // Calculate summary statistics
    const stats = {
      totalDocuments: documents.length,
      averageIntelligence: Math.round(
        documents.reduce((sum, d) => sum + d.intelligenceScore, 0) /
          documents.length,
      ),
      averageComplexity: Math.round(
        documents.reduce((sum, d) => sum + d.complexityIndex, 0) /
          documents.length,
      ),
      layerDistribution: {
        layer1: documents.filter((d) => d.layer === 1).length,
        layer2: documents.filter((d) => d.layer === 2).length,
        layer3: documents.filter((d) => d.layer === 3).length,
        layer4: documents.filter((d) => d.layer === 4).length,
      },
      categories: [...new Set(documents.map((d) => d.category))],
    };

    return NextResponse.json({
      success: true,
      data: {
        documents,
        stats,
      },
    });
  } catch (error) {
    console.error("CASCADE intelligence API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load CASCADE intelligence" },
      { status: 500 },
    );
  }
}
