import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    // Read one CASCADE file to debug
    const reportsDir = path.join(process.cwd(), "reports/gpt5-cascade");
    const testFile = "A8-Accountability Engine-gpt5.json";
    const filePath = path.join(reportsDir, testFile);

    const content = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(content);

    // Extract insights from each layer
    const layerInsights: any = {};

    data.results.forEach((result: any) => {
      if (!result.success || !result.content) return;

      const layer = result.layer;
      const content = result.content;

      // Extract first 500 chars as preview
      const preview = content.substring(0, 500);

      // Extract key points
      const insights = [];

      // For EVOLUTION layer, extract synthesis
      if (layer === "EVOLUTION") {
        const synthesisMatch = content.match(/Synthesis:\s*([^.
]+[.])/);
        if (synthesisMatch) {
          insights.push(`SYNTHESIS: ${synthesisMatch[1]}`);
        }

        // Extract paradigm shifts
        const paradigmSection = content.match(
          /Paradigm shifts[^:]*:\s*([\s\S]*?)(?=

|
Strategic)/,
        );
        if (paradigmSection) {
          const shifts = paradigmSection[1].match(/From .+ to .+/g);
          if (shifts) {
            insights.push(
              ...shifts.slice(0, 2).map((s: string) => `PARADIGM: ${s}`),
            );
          }
        }

        // Extract hidden patterns
        const hiddenSection = content.match(
          /Hidden patterns[^:]*:\s*([\s\S]*?)(?=

|
Paradigm)/,
        );
        if (hiddenSection) {
          const patterns = hiddenSection[1]
            .split("\n")
")
            .filter((l: string) => l.trim().startsWith("-"));
          if (patterns.length > 0) {
            insights.push(`HIDDEN: ${patterns[0].replace("-", "").trim()}`);
          }
        }
      }

      // For other layers, extract bullet points
      const bullets = content.match(/^[-•]\s*.+$/gm);
      if (bullets) {
        insights.push(
          ...bullets.slice(0, 3).map((b: string) => b.replace(/^[-•]\s*/, "")),
        );
      }

      layerInsights[layer] = {
        preview,
        insights,
        contentLength: content.length,
        hasContent: true,
      };
    });

    return NextResponse.json({
      success: true,
      file: testFile,
      layersCompleted: data.layersCompleted,
      layers: Object.keys(layerInsights),
      layerInsights,
      rawEvolution: data.results
        .find((r: any) => r.layer === "EVOLUTION")
        ?.content?.substring(0, 1000),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
