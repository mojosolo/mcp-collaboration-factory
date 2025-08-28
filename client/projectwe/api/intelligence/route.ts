import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ log: ["error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";
    const limit = parseInt(searchParams.get("limit") || "1000");
    const offset = parseInt(searchParams.get("offset") || "0");

    console.log(
      `Fetching WE_PROJECTS intelligence: type=${type}, limit=${limit}, offset=${offset}`,
    );

    // Get all WE_PROJECTS document IDs
    const documents = await prisma.cascade_documents.findMany({
      where: {
        domain: "WE_PROJECTS",
        status: "active",
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
      },
      orderBy: { title: "asc" },
    });

    const documentIds = documents.map((d) => d.id);

    // Fetch extractions (insights)
    const extractions = await prisma.cascade_extractions.findMany({
      where: {
        documentId: { in: documentIds },
      },
      select: {
        id: true,
        documentId: true,
        extractionType: true,
        extractedValue: true,
        confidenceScore: true,
        tags: true,
        contextSnippet: true,
      },
      skip: type === "extractions" ? offset : 0,
      take: type === "extractions" ? limit : undefined,
      orderBy: [{ extractionType: "asc" }, { confidenceScore: "desc" }],
    });

    // Fetch metadata (concepts, entities, tags)
    const metadata = await prisma.cascade_metadata.findMany({
      where: {
        documentId: { in: documentIds },
      },
      select: {
        id: true,
        documentId: true,
        intelligenceTags: true,
        conceptsCount: true,
        entitiesCount: true,
        complexityScore: true,
        extractionConfidence: true,
        metadataJson: true,
      },
    });

    // Group extractions by type
    const groupedExtractions = extractions.reduce((acc: any, ext) => {
      const type = ext.extractionType;
      if (!acc[type]) acc[type] = [];
      acc[type].push({
        id: ext.id,
        value: ext.extractedValue,
        confidence: ext.confidenceScore,
        context: ext.contextSnippet,
        documentId: ext.documentId,
        tags: ext.tags,
      });
      return acc;
    }, {});

    // Extract all unique concepts from metadata
    const allConcepts = new Set<string>();
    const allTags = new Set<string>();

    metadata.forEach((m) => {
      if (m.intelligenceTags) {
        m.intelligenceTags.forEach((tag) => allTags.add(tag));
      }

      // Extract concepts from metadataJson if available
      const metaJson = m.metadataJson as any;
      if (metaJson?.extractedConcepts) {
        metaJson.extractedConcepts.forEach((c: string) => allConcepts.add(c));
      }
    });

    // Build intelligent document summaries
    const intelligentDocuments = documents.map((doc) => {
      const docExtractions = extractions.filter((e) => e.documentId === doc.id);
      const docMetadata = metadata.find((m) => m.documentId === doc.id);

      // Get key insights for this document
      const keyInsights = docExtractions
        .filter(
          (e) =>
            e.extractionType.includes("FINDING") ||
            e.extractionType.includes("INSIGHT") ||
            e.extractionType.includes("RECOMMENDATION"),
        )
        .slice(0, 5)
        .map((e) => e.extractedValue);

      // Get concepts for this document
      const docConcepts = docExtractions
        .filter((e) => e.extractionType.includes("CONCEPT"))
        .map((e) => e.extractedValue);

      return {
        id: doc.id,
        title: doc.title
          .replace(".pdf", "")
          .replace(".docx", "")
          .replace(/^A8-?/, ""),
        originalContent: doc.content.substring(0, 500),
        intelligentSummary: keyInsights.join(" • ") || "Processing insights...",
        keyInsights,
        concepts: docConcepts,
        complexityScore: docMetadata?.complexityScore || 0,
        extractionCount: docExtractions.length,
        tags: docMetadata?.intelligenceTags || [],
      };
    });

    // Calculate statistics
    const stats = {
      totalDocuments: documents.length,
      totalExtractions: extractions.length,
      totalConcepts: allConcepts.size,
      totalTags: allTags.size,
      extractionTypes: Object.keys(groupedExtractions).length,
      averageConfidence:
        extractions.reduce((sum, e) => sum + (e.confidenceScore || 0), 0) /
        extractions.length,
      byType: Object.keys(groupedExtractions).map((type) => ({
        type,
        count: groupedExtractions[type].length,
      })),
    };

    // Prepare response based on type
    let responseData;

    switch (type) {
      case "insights":
        responseData = {
          insights: groupedExtractions,
          total: extractions.length,
          stats,
        };
        break;

      case "concepts":
        responseData = {
          concepts: Array.from(allConcepts),
          total: allConcepts.size,
          stats,
        };
        break;

      case "documents":
        responseData = {
          documents: intelligentDocuments,
          total: intelligentDocuments.length,
          stats,
        };
        break;

      default:
        responseData = {
          insights: groupedExtractions,
          concepts: Array.from(allConcepts),
          tags: Array.from(allTags),
          documents: intelligentDocuments,
          stats,
        };
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error("Error fetching WE_PROJECTS intelligence:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch intelligence data",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
