import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    const doc = await prisma.cascade_documents.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        cascade_metadata: {
          select: {
            complexityScore: true,
            intelligenceTags: true,
            metadataJson: true,
          },
        },
        cascade_extractions: {
          select: {
            extractionType: true,
            extractedValue: true,
            contextSnippet: true,
            confidenceScore: true,
            positionStart: true,
            positionEnd: true,
            tags: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    const metadata = doc.cascade_metadata as any;
    const score =
      metadata?.complexityScore != null ? Number(metadata.complexityScore) : 70;

    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        title: doc.title.replace(".pdf", "").replace(/^A8-?/, ""),
        content: doc.content,
        score,
        tags: metadata?.intelligenceTags || [],
        metadata: metadata?.metadataJson || null,
        createdAt: doc.createdAt,
        extractions: doc.cascade_extractions,
      },
    });
  } catch (error) {
    console.error("Error fetching WE_PROJECTS document:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch document" },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
