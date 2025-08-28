import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "reports", "intelligence-reviews");
    let files: string[] = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      // If directory doesn't exist, return empty history
      return NextResponse.json({ success: true, reviews: [] });
    }
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const records = [] as any[];
    for (const f of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(dir, f), "utf-8");
        const data = JSON.parse(content);
        records.push({
          id: data.id,
          createdAt: data.createdAt,
          status: data.status,
          documentsTotal: data.documentsTotal,
          extractionsTotal: data.extractionsTotal,
          avgConfidence: data.avgConfidence,
          lowConfidenceSample: data.lowConfidenceSample,
          model: data.model,
        });
      } catch {
        // skip bad file
      }
    }
    records.sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || ""),
    );
    return NextResponse.json({ success: true, reviews: records });
  } catch (error: any) {
    console.error("Failed to load review history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load history" },
      { status: 500 },
    );
  }
}
