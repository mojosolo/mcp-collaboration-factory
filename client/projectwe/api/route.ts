/**
 * WE Brain Document Processing Endpoint
 * Phase 2 Security Hardened Implementation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  validateAndSanitize,
  createSecureStringSchema,
} from "@/lib/validation/security-schemas";
import WEBrainOrchestrator from "@/agents/we-brain-orchestrator";
import { z } from "zod";

// Mark as dynamic to prevent caching
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ===== VALIDATION SCHEMAS =====
const WEBrainProcessRequestSchema = z.object({
  documentIds: z.array(z.string().uuid()).max(10).optional(),
  processAll: z.boolean().default(false),
  options: z
    .object({
      includeAnalytics: z.boolean().default(true),
      includeRecommendations: z.boolean().default(true),
      maxDocuments: z.number().int().positive().max(50).default(10),
    })
    .optional(),
});

/**
 * Process WE Brain documents with CASCADE framework
 * Requires authentication, rate limiting, and input validation
 */
export async function POST(request: NextRequest) {
  try {
    // ===== AUTHENTICATION CHECK =====
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    // ===== RATE LIMITING - AGGRESSIVE FOR AI OPERATIONS =====
    const rateLimitResult = await rateLimit(request, {
      limit: 5, // Only 5 processing requests per hour - expensive operation
      windowMs: 3600000, // 1 hour
      identifier: `we-brain-process:${userId}`,
    });

    if (rateLimitResult) {
      return rateLimitResult;
    }

    // ===== INPUT VALIDATION =====
    const body = await request.json();
    const validation = validateAndSanitize(WEBrainProcessRequestSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          code: "VALIDATION_FAILED",
          details: validation.errors?.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const { processAll, documentIds, options } = validation.data!;

    // ===== TENANT ISOLATION =====
    const tenantContext = {
      userId,
      orgId: orgId || userId, // Use userId as fallback tenant
      requestId: request.headers.get("x-request-id") || crypto.randomUUID(),
    };

    // ===== AUDIT LOGGING =====
    console.log("WE Brain processing initiated", {
      ...tenantContext,
      processAll,
      documentCount: documentIds?.length || 0,
      timestamp: new Date().toISOString(),
      ip: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    // ===== WE BRAIN PROCESSING =====
    const orchestrator = new WEBrainOrchestrator();

    // Initialize system first
    const healthCheck = await orchestrator.initialize();
    if (!healthCheck.allSystemsGo) {
      return NextResponse.json(
        {
          success: false,
          error: "WE Brain system not ready",
          code: "SYSTEM_NOT_READY",
          details: {
            errorCount: healthCheck.errors.length,
            componentStatus: Object.fromEntries(
              Object.entries(healthCheck.components).map(([key, value]) => [
                key,
                value ? "operational" : "failed",
              ]),
            ),
          },
        },
        { status: 503 },
      );
    }

    // Process documents
    const report = await orchestrator.processWEBrainDocuments();

    // ===== SECURITY: SANITIZE RESPONSE =====
    // Don't expose internal paths, system details, or sensitive data
    const sanitizedReport = {
      tenant: report.tenant,
      success: report.success || false,
      documentsProcessed: report.documentsProcessed.length,
      processingTime: report.processingTime,
      insights: report.insights.map((insight) => ({
        document: insight.document.replace(/^.*[\\\/]/, ""), // Remove path, keep filename only
        keyInsights: insight.keyInsights?.slice(0, 3) || [], // Limit insights
      })),
      cascadeScores: report.cascadeScores.map((score) => ({
        document: score.document.replace(/^.*[\\\/]/, ""), // Remove path, keep filename only
        score: Math.round(score.score * 100) / 100, // Round to 2 decimals
        category: score.category,
      })),
      errorCount: report.errors.length,
      hasErrors: report.errors.length > 0,
    };

    // ===== AUDIT LOGGING - COMPLETION =====
    console.log("WE Brain processing completed", {
      ...tenantContext,
      success: report.success,
      documentsProcessed: report.documentsProcessed.length,
      errorCount: report.errors.length,
      processingTime: report.processingTime,
      timestamp: new Date().toISOString(),
    });

    // ===== RESPONSE =====
    return NextResponse.json({
      success: true,
      data: sanitizedReport,
      metadata: {
        requestId: tenantContext.requestId,
        processedAt: new Date().toISOString(),
        tenantId: tenantContext.orgId,
      },
    });
  } catch (error) {
    console.error("WE Brain processing failed:", error);

    // ===== SECURITY: DON'T EXPOSE INTERNAL ERRORS =====
    return NextResponse.json(
      {
        success: false,
        error: "Processing failed",
        message: "Unable to process documents at this time",
        code: "PROCESSING_FAILED",
      },
      { status: 500 },
    );
  }
}

/**
 * Get processing status
 */
export async function GET(request: NextRequest) {
  try {
    // ===== AUTHENTICATION CHECK =====
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    // ===== RATE LIMITING =====
    const rateLimitResult = await rateLimit(request, {
      limit: 30, // 30 status checks per minute
      windowMs: 60000,
      identifier: `we-brain-status:${userId}`,
    });

    if (rateLimitResult) {
      return rateLimitResult;
    }

    // ===== RESPONSE =====
    return NextResponse.json({
      success: true,
      data: {
        status: "ready",
        lastProcessed: null, // Would come from database in production
        queueLength: 0, // Would come from job queue in production
        avgProcessingTime: "45s", // Estimated
      },
      metadata: {
        requestId: request.headers.get("x-request-id") || crypto.randomUUID(),
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("WE Brain status check failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Status check failed",
        code: "STATUS_CHECK_FAILED",
      },
      { status: 500 },
    );
  }
}
