import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { rateLimiter } from "@/lib/rate-limit";
import { documentsCache } from "@/lib/cache/documents-cache";

// Create a singleton instance
const globalForPrisma = global as unknown as { prisma: PrismaClient | null };

// Only create Prisma client if DATABASE_URL is available
let prisma: PrismaClient | null = null;

if (process.env.DATABASE_URL) {
  prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
      log: ["error"],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
}

// Input validation schema
const querySchema = z.object({
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    // Check if database is available
    if (!prisma) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection not available",
          data: {
            documents: [],
            total: 0,
            categories: {},
          },
        },
        { status: 503 },
      );
    }

    // Authentication check
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Please sign in to access documents.",
        },
        { status: 401 },
      );
    }

    // Rate limiting - 100 requests per minute per user
    const rateLimitCheck = await rateLimiter.check(
      `api:we-projects:${userId}`,
      100,
      60000,
    );

    if (!rateLimitCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          details: `Try again at ${new Date(rateLimitCheck.resetTime).toISOString()}`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": rateLimitCheck.remaining.toString(),
            "X-RateLimit-Reset": rateLimitCheck.resetTime.toString(),
          },
        },
      );
    }

    // Parse and validate query parameters
    const searchParams = {
      category: request.nextUrl.searchParams.get("category") || undefined,
      search: request.nextUrl.searchParams.get("search") || undefined,
      page: request.nextUrl.searchParams.get("page") || "1",
      limit: request.nextUrl.searchParams.get("limit") || "20",
    };
    const validationResult = querySchema.safeParse(searchParams);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { category, search, page, limit } = validationResult.data;

    // Try to get from cache first
    const cacheParams = { category, search, page, limit };
    const cached = await documentsCache.get(cacheParams);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached.data || cached,
        metadata: cached.metadata,
        cached: true,
      });
    }

    const offset = (page - 1) * limit;
    console.log("Cache miss - fetching WE_PROJECTS documents from database...");

    // Build query filters
    const where: any = {
      domain: "WE_PROJECTS",
      status: "active",
    };

    // Add search filter if provided
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.cascade_documents.count({ where });

    // Fetch documents with metadata (with pagination)
    const documents = await prisma.cascade_documents.findMany({
      where,
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
          },
          take: 5,
        },
      },
      skip: offset,
      take: limit,
      orderBy: {
        title: "asc",
      },
    });

    console.log(
      `Found ${documents.length} documents (page ${page} of ${Math.ceil(totalCount / limit)})`,
    );

    // Transform documents for frontend
    const transformedDocs = documents.map((doc) => {
      // Parse metadata to get category and score
      const metadata = doc.cascade_metadata as any;
      const metaJson = metadata?.metadataJson as any;
      const rawScore = metadata?.complexityScore;
      const score = rawScore != null ? Math.round(Number(rawScore) * 97) : 70;

      // Determine category based on title patterns
      let category = "Knowledge";
      const titleLower = doc.title.toLowerCase();

      if (
        titleLower.includes("framework") ||
        titleLower.includes("model") ||
        titleLower.includes("methodology") ||
        titleLower.includes("approach") ||
        titleLower.includes("system")
      ) {
        category = "Framework";
      } else if (
        titleLower.includes("practice") ||
        titleLower.includes("guide") ||
        titleLower.includes("kit") ||
        titleLower.includes("checklist") ||
        titleLower.includes("tips")
      ) {
        category = "Best Practices";
      } else if (
        titleLower.includes("case") ||
        titleLower.includes("example") ||
        titleLower.includes("sample") ||
        titleLower.includes("study") ||
        titleLower.includes("scenario")
      ) {
        category = "Case Studies";
      }

      // Extract insights
      const insights = doc.cascade_extractions.map((e) => ({
        type: e.extractionType.replace(/_/g, " "),
        value: e.extractedValue,
      }));

      // Clean up title
      let cleanTitle = doc.title
        .replace(".pdf", "")
        .replace(".PDF", "")
        .replace(".docx", "")
        .replace(".DOCX", "")
        .replace(/^A8-?/, "")
        .replace(/^\d+[-_\s]/, "")
        .trim();

      // Ensure content is not too long for cards
      const contentPreview =
        doc.content.length > 500
          ? doc.content.substring(0, 500) + "...\n"
          : doc.content;

      return {
        id: doc.id,
        title: cleanTitle,
        content: doc.content,
        contentPreview,
        category,
        score,
        insights,
        tags: metadata?.intelligenceTags || [],
        createdAt: doc.createdAt,
      };
    });

    // Apply category filter if specified (documents already filtered in DB query)
    let filteredDocs = transformedDocs;
    if (category && category !== "all" && category !== "All") {
      // Category filtering should be done in the DB query for better performance
      // This is a fallback for the current logic that determines category from title
      filteredDocs = transformedDocs.filter((doc) => doc.category === category);
    }

    // Get category counts from all documents
    const categoryCounts = transformedDocs.reduce((acc: any, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    }, {});

    console.log("Category distribution:", categoryCounts);

    // Prepare response data
    const responseData = {
      documents: filteredDocs,
      total: totalCount,
      categories: categoryCounts,
    };

    const metadata = {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPreviousPage: page > 1,
    };

    // Cache the response for future requests
    await documentsCache.set(cacheParams, {
      ...responseData,
      metadata,
    });

    // Also cache category counts separately for longer
    await documentsCache.setCategoryCounts(categoryCounts);

    return NextResponse.json({
      success: true,
      data: responseData,
      metadata,
      cached: false,
    });
  } catch (error: any) {
    console.error("Error fetching WE_PROJECTS documents:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });

    // Return a more detailed error for debugging
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch documents",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
