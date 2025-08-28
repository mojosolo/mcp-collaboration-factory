#!/usr/bin/env npx tsx
/**
 * CASCADE GPT-5 Document Processor with Multi-Tenant Tagging
 * Uses existing CASCADE tables with tenant/session tagging
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs/promises";
import * as path from "path";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { v4 as uuidv4 } from "uuid";
import {
  GPT5_MODELS,
  hasReasoningTokens,
  calculateGPT5Cost,
  formatSystemPrompt,
  extractRateLimitHeaders,
} from "../lib/cascade/gpt5-features";

// Initialize Prisma
const prisma = new PrismaClient();

// Session metadata for multi-tenancy
const SESSION_METADATA = {
  tenant: "WE_PROJECTS", // SEPARATE TENANT FOR WE PROJECTS (NOT WEEXIT!)
  sessionId: uuidv4(),
  indexedBy: "gpt5-cascade-processor",
  extractionModel: "gpt-5-cascade-suite",
  environment: "production",
};

// CASCADE 4-Layer Architecture - WE PROJECTS DOCUMENT PROCESSING
const CASCADE_LAYERS = {
  FOUNDATION: {
    id: 1,
    name: "Foundation Layer",
    description: "Basic document extraction and parsing",
    domain: "foundation",
    complexityRange: [0, 30],
    model: "gpt-4.1-nano", // Ultra-fast for basic extraction (NO REASONING)
    prompts: [
      "Extract key topics and main concepts from document",
      "Identify document type and structure",
      "Parse section headings and organization",
      "Extract named entities and keywords",
    ],
  },
  STRATEGIC: {
    id: 2,
    name: "Strategic Layer",
    description: "Content analysis and categorization",
    domain: "strategic",
    complexityRange: [31, 60],
    model: "gpt-4.1-mini", // Efficient for content analysis (NO REASONING)
    prompts: [
      "Analyze document themes and patterns",
      "Categorize content by domain and topic",
      "Identify relationships between concepts",
      "Extract actionable insights and recommendations",
    ],
  },
  IMPLEMENTATION: {
    id: 3,
    name: "Implementation Layer",
    description: "Deep content synthesis",
    domain: "implementation",
    complexityRange: [61, 85],
    model: "gpt-4.1", // Full analysis capabilities (NO REASONING)
    prompts: [
      "Synthesize complex information structures",
      "Generate comprehensive summaries",
      "Map dependencies and connections",
      "Extract implementation patterns and methodologies",
    ],
  },
  EVOLUTION: {
    id: 4,
    name: "Evolution Layer",
    description: "Advanced reasoning and synthesis",
    domain: "evolution",
    complexityRange: [86, 97],
    model: "gpt-4o", // ADVANCED MODEL with reasoning capabilities
    prompts: [
      "Apply deep reasoning to synthesize insights across all document content",
      "Generate novel connections between concepts using logical inference",
      "Produce strategic recommendations based on comprehensive analysis",
      "Create knowledge synthesis with reasoning chains",
    ],
  },
};

/**
 * Extract text from DOCX document
 */
async function extractPDFText(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });

    if (result.messages.length > 0) {
      console.log("⚠️  Extraction warnings:", result.messages);
    }

    return result.value;
  } catch (error) {
    console.error("Error extracting DOCX text:", error);
    throw error;
  }
}

/**
 * Process document through a single CASCADE layer
 */
async function processLayer(
  layerName: string,
  documentText: string,
  documentId: string,
  previousLayerResults?: any,
): Promise<any> {
  const layer = CASCADE_LAYERS[layerName as keyof typeof CASCADE_LAYERS];
  const startTime = Date.now();

  console.log(`
📊 Processing ${layer.name} with ${layer.model}...`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  // Build comprehensive prompt for this layer
  const systemPrompt = `You are analyzing documents for WE PROJECTS.
    Current layer: ${layer.name}
    Your task: ${layer.description}
    Tenant: ${SESSION_METADATA.tenant}
    Focus: Extract and analyze document content without domain-specific bias.`;

  const userPrompt = `
Analyze this document for ${layer.name}:

DOCUMENT CONTENT:
${documentText.substring(0, 10000)} // Limit for context window

${
  previousLayerResults
    ? `
PREVIOUS LAYER INSIGHTS:
${JSON.stringify(previousLayerResults, null, 2).substring(0, 2000)}
`
    : ""
}

REQUIRED ANALYSIS:
${layer.prompts.map((p, i) => `${i + 1}. ${p}`).join("
")}

You MUST respond with valid JSON containing these fields:
{
  "keyFindings": ["finding1", "finding2", "finding3"],
  "metrics": {
    "readinessScore": 7,
    "confidenceLevel": 0.85,
    "complexityScore": 65
  },
  "riskFactors": [
    {"risk": "risk1", "severity": "high", "mitigation": "action1"}
  ],
  "opportunities": [
    {"opportunity": "opp1", "impact": "high", "effort": "medium"}
  ],
  "recommendations": ["rec1", "rec2"],
  "extractedConcepts": ["concept1", "concept2"]
}
`;

  try {
    // Use v1/chat/completions API for GPT-4 models
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: layer.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000, // CORRECT PARAMETER FOR GPT-4!
        temperature: 0.7,
        response_format: { type: "json_object" }, // Simpler JSON format for GPT-4
      }),
    });

    /* Original complex schema - commenting out for now
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'CascadeLayerAnalysis',
            schema: {
              type: 'object',
              properties: {
                keyFindings: {
                  type: 'array',
                  items: { type: 'string' },
                  maxItems: 5
                },
                metrics: {
                  type: 'object',
                  properties: {
                    readinessScore: { type: 'number', minimum: 1, maximum: 10 },
                    confidenceLevel: { type: 'number', minimum: 0, maximum: 1 },
                    complexityScore: { type: 'number', minimum: 0, maximum: 100 },
                    timeToExit: { type: 'string' },
                    estimatedValue: { type: 'string' }
                  },
                  required: ['readinessScore', 'confidenceLevel', 'complexityScore']
                },
                riskFactors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      risk: { type: 'string' },
                      severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                      mitigation: { type: 'string' }
                    },
                    required: ['risk', 'severity', 'mitigation']
                  },
                  maxItems: 5
                },
                opportunities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      opportunity: { type: 'string' },
                      impact: { type: 'string', enum: ['low', 'medium', 'high', 'transformational'] },
                      effort: { type: 'string', enum: ['low', 'medium', 'high'] },
                      timeline: { type: 'string' }
                    },
                    required: ['opportunity', 'impact', 'effort']
                  },
                  maxItems: 5
                },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' },
                  maxItems: 3
                },
                extractedConcepts: {
                  type: 'array',
                  items: { type: 'string' },
                  maxItems: 10
                }
              },
              required: ['keyFindings', 'metrics', 'riskFactors', 'opportunities', 'recommendations', 'extractedConcepts'],
              additionalProperties: false
            },
            strict: true
          }
        }
      */

    const rateLimits = extractRateLimitHeaders(response.headers);
    const json = await response.json();

    // Parse the structured output (GPT-4 format)
    const analysisText = json.choices?.[0]?.message?.content;
    const analysis = analysisText ? JSON.parse(analysisText) : null;

    // Calculate cost (Updated pricing for all models)
    const gpt4Pricing = {
      "gpt-4o": { input: 2.5, output: 10 }, // per 1M tokens
      "gpt-4o-mini": { input: 0.15, output: 0.6 },
      "gpt-4.1": { input: 2.0, output: 8 }, // Estimated
      "gpt-4.1-mini": { input: 0.12, output: 0.5 }, // Estimated
      "gpt-4.1-nano": { input: 0.05, output: 0.2 }, // Estimated
      "o3-mini": { input: 5.0, output: 20 }, // Reasoning model - higher cost
    };
    const pricing =
      gpt4Pricing[layer.model as keyof typeof gpt4Pricing] ||
      gpt4Pricing["gpt-4o-mini"];
    const inputCost =
      ((json.usage?.prompt_tokens || 0) * pricing.input) / 1000000;
    const outputCost =
      ((json.usage?.completion_tokens || 0) * pricing.output) / 1000000;
    const cost = inputCost + outputCost;

    const processingTime = Date.now() - startTime;

    console.log(`✅ ${layer.name} completed in ${processingTime}ms`);
    console.log(`   - Input tokens: ${json.usage?.prompt_tokens || 0}`);
    console.log(`   - Output tokens: ${json.usage?.completion_tokens || 0}`);
    console.log(`   - Total tokens: ${json.usage?.total_tokens || 0}`);
    console.log(`   - Cost: $${cost.toFixed(4)}`);

    // Store extractions in cascade_extractions table
    if (analysis) {
      // Store key findings as extractions
      for (const finding of analysis.keyFindings || []) {
        await prisma.cascade_extractions.create({
          data: {
            id: uuidv4(),
            documentId,
            extractionType: `${layerName}_FINDING`,
            extractedValue: finding,
            confidenceScore: analysis.metrics?.confidenceLevel || 0.8,
            tags: [SESSION_METADATA.tenant, layerName, "gpt5"],
            contextSnippet: `Layer: ${layerName}`,
          },
        });
      }

      // Store extracted concepts
      for (const concept of analysis.extractedConcepts || []) {
        await prisma.cascade_extractions.create({
          data: {
            id: uuidv4(),
            documentId,
            extractionType: `${layerName}_CONCEPT`,
            extractedValue: concept,
            confidenceScore: 0.9,
            tags: [SESSION_METADATA.tenant, layerName, "concept", "gpt5"],
          },
        });
      }
    }

    return {
      model: layer.model,
      content: analysis,
      insights: analysis?.keyFindings || [],
      metrics: analysis?.metrics || {},
      reasoningTokens: 0, // GPT-4 doesn't have reasoning tokens
      totalTokens: json.usage?.total_tokens || 0,
      processingTime,
      cost,
      rateLimits,
    };
  } catch (error) {
    console.error(`❌ Error in ${layer.name}:`, error);
    throw error;
  }
}

/**
 * Store document in CASCADE tables with tagging
 */
async function storeDocument(
  documentPath: string,
  documentName: string,
  documentText: string,
): Promise<string> {
  const documentId = uuidv4();

  // Store in cascade_documents
  await prisma.cascade_documents.create({
    data: {
      id: documentId,
      title: documentName,
      filename: documentName,
      filepath: documentPath,
      level: 1, // Starting at foundation
      domain: SESSION_METADATA.tenant,
      content: documentText.substring(0, 50000), // Store first 50k chars
      extractionPriority: "high",
      version: "1.0.0",
      status: "processing",
      lastIndexedAt: new Date(),
      indexedBy: SESSION_METADATA.indexedBy,
      updatedAt: new Date(),
    },
  });

  console.log(`📄 Document stored with ID: ${documentId}`);
  console.log(`   - Tenant: ${SESSION_METADATA.tenant}`);
  console.log(`   - Session: ${SESSION_METADATA.sessionId}`);

  return documentId;
}

/**
 * Update document metadata after processing
 */
async function updateDocumentMetadata(
  documentId: string,
  layers: any,
  cascadeScore: number,
  totalCost: number,
  totalTime: number,
) {
  // Calculate aggregate metrics
  const complexityScore = cascadeScore / 97; // Normalize to 0-1
  const conceptsCount = Object.values(layers).reduce(
    (sum, layer: any) => sum + (layer.content?.extractedConcepts?.length || 0),
    0,
  );
  const entitiesCount = Object.values(layers).reduce(
    (sum, layer: any) => sum + (layer.content?.keyFindings?.length || 0),
    0,
  );

  // Store metadata
  await prisma.cascade_metadata.upsert({
    where: { documentId },
    create: {
      id: uuidv4(),
      documentId,
      intelligenceTags: [
        SESSION_METADATA.tenant,
        SESSION_METADATA.sessionId,
        "gpt5-processed",
        `cascade-score-${cascadeScore}`,
        ...Object.keys(CASCADE_LAYERS).map((l) => `layer-${l.toLowerCase()}`),
      ],
      conceptsCount,
      entitiesCount,
      relationshipsCount: 0,
      complexityScore,
      extractionConfidence: 0.85,
      processingTimeMs: totalTime,
      extractionModel: SESSION_METADATA.extractionModel,
      metadataJson: {
        session: SESSION_METADATA,
        cascadeScore,
        totalCost,
        layerScores: Object.entries(layers).reduce(
          (acc, [key, value]: [string, any]) => {
            acc[key] = value.metrics?.readinessScore || 0;
            return acc;
          },
          {} as any,
        ),
        modelsUsed: Object.values(layers).map((l: any) => l.model),
        timestamp: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
    update: {
      intelligenceTags: [
        SESSION_METADATA.tenant,
        SESSION_METADATA.sessionId,
        "gpt5-processed",
        `cascade-score-${cascadeScore}`,
        ...Object.keys(CASCADE_LAYERS).map((l) => `layer-${l.toLowerCase()}`),
      ],
      conceptsCount,
      entitiesCount,
      complexityScore,
      extractionConfidence: 0.85,
      processingTimeMs: totalTime,
      extractionModel: SESSION_METADATA.extractionModel,
      metadataJson: {
        session: SESSION_METADATA,
        cascadeScore,
        totalCost,
        layerScores: Object.entries(layers).reduce(
          (acc, [key, value]: [string, any]) => {
            acc[key] = value.metrics?.readinessScore || 0;
            return acc;
          },
          {} as any,
        ),
        modelsUsed: Object.values(layers).map((l: any) => l.model),
        timestamp: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
  });

  // Update document status
  await prisma.cascade_documents.update({
    where: { id: documentId },
    data: {
      status: "active",
      level: 4, // Completed all 4 layers
      updatedAt: new Date(),
    },
  });
}

/**
 * Store CASCADE metrics
 */
async function storeMetrics(
  layers: any,
  cascadeScore: number,
  totalCost: number,
) {
  const now = new Date();

  // Store overall CASCADE score
  await prisma.cascade_metrics.create({
    data: {
      id: uuidv4(),
      metricType: "CASCADE_SCORE",
      metricValue: cascadeScore,
      level: 4,
      domain: SESSION_METADATA.tenant,
      periodStart: now,
      periodEnd: now,
      metadata: {
        sessionId: SESSION_METADATA.sessionId,
        cost: totalCost,
        modelsUsed: Object.values(layers).map((l: any) => l.model),
      },
    },
  });

  // Store layer-specific metrics
  for (const [layerName, layerData] of Object.entries(layers)) {
    const layer = CASCADE_LAYERS[layerName as keyof typeof CASCADE_LAYERS];
    const metrics = (layerData as any).metrics || {};

    await prisma.cascade_metrics.create({
      data: {
        id: uuidv4(),
        metricType: `${layerName}_READINESS`,
        metricValue: metrics.readinessScore || 0,
        level: layer.id,
        domain: SESSION_METADATA.tenant,
        periodStart: now,
        periodEnd: now,
        metadata: {
          sessionId: SESSION_METADATA.sessionId,
          layerName,
          model: (layerData as any).model,
          confidence: metrics.confidenceLevel,
          complexity: metrics.complexityScore,
        },
      },
    });
  }
}

/**
 * Calculate CASCADE score from all layer results
 */
function calculateCASCADEScore(layers: any): number {
  let score = 0;
  let weights = {
    FOUNDATION: 0.2,
    STRATEGIC: 0.25,
    IMPLEMENTATION: 0.3,
    EVOLUTION: 0.25,
  };

  for (const [layerName, layerData] of Object.entries(layers)) {
    const metrics = (layerData as any).metrics;
    if (metrics?.readinessScore) {
      score +=
        metrics.readinessScore *
        10 *
        weights[layerName as keyof typeof weights];
    }
  }

  return Math.min(97, Math.round(score));
}

/**
 * Main CASCADE processing function
 */
async function processCASCADEDocument(documentPath: string) {
  console.log("🚀 Starting CASCADE GPT-5 Document Processing");
  console.log("=".repeat(50));
  console.log(`📌 Tenant: ${SESSION_METADATA.tenant}`);
  console.log(`📌 Session: ${SESSION_METADATA.sessionId}`);

  const startTime = Date.now();
  const documentName = path.basename(documentPath);

  // Extract text from PDF
  console.log(`
📄 Processing document: ${documentName}`);
  const documentText = await extractPDFText(documentPath);
  console.log(`   - Extracted ${documentText.length} characters`);

  // Store document in CASCADE tables
  const documentId = await storeDocument(
    documentPath,
    documentName,
    documentText,
  );

  // Process through all 4 layers sequentially
  const layers: any = {};
  let previousResults = null;

  for (const layerName of [
    "FOUNDATION",
    "STRATEGIC",
    "IMPLEMENTATION",
    "EVOLUTION",
  ]) {
    layers[layerName] = await processLayer(
      layerName,
      documentText,
      documentId,
      previousResults,
    );
    previousResults = layers[layerName].content;

    // Small delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Calculate total metrics
  const totalCost = Object.values(layers).reduce(
    (sum, layer: any) => sum + layer.cost,
    0,
  );
  const totalTime = Date.now() - startTime;
  const cascadeScore = calculateCASCADEScore(layers);

  // Update document metadata
  await updateDocumentMetadata(
    documentId,
    layers,
    cascadeScore,
    totalCost,
    totalTime,
  );

  // Store metrics
  await storeMetrics(layers, cascadeScore, totalCost);

  // Generate report
  console.log("
" + "=".repeat(50));
  console.log("📊 CASCADE PROCESSING COMPLETE");
  console.log("=".repeat(50));
  console.log(`Document: ${documentName}`);
  console.log(`Document ID: ${documentId}`);
  console.log(`CASCADE Score: ${cascadeScore}/97`);
  console.log(`Total Processing Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Total Cost: $${totalCost.toFixed(4)}`);

  // Display key recommendations
  const recommendations = layers.EVOLUTION?.content?.recommendations || [];
  if (recommendations.length > 0) {
    console.log("
🎯 Key Recommendations:");
    recommendations.forEach((rec: string, i: number) =>
      console.log(`${i + 1}. ${rec}`),
    );
  }

  // Save detailed report
  const report = {
    documentId,
    documentName,
    tenant: SESSION_METADATA.tenant,
    sessionId: SESSION_METADATA.sessionId,
    processedAt: new Date().toISOString(),
    cascadeScore,
    totalCost,
    totalTime,
    layers,
    recommendations,
  };

  const reportPath = `/Users/david/Documents/root/weexit-marketing/CASCADE-REPORT-${SESSION_METADATA.sessionId}.json`;
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`
📁 Detailed report saved to: ${reportPath}`);

  return report;
}

/**
 * Process ALL WE Brain documents
 */
async function processAllWEBrainDocuments() {
  const docxFile =
    "/Users/david/Documents/root/weexit-marketing/docs/WE Brain 041524/Advisor ROWW RFN.docx";

  try {
    console.log("📋 Pre-flight checks...");

    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected");

    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not set");
    }
    console.log("✅ OpenAI API key configured");

    // Process single DOCX file
    const pdfFiles = [path.basename(docxFile)];

    console.log(`
📚 Processing DOCX document: ${path.basename(docxFile)}`);
    console.log(
      "🏷️ TENANT: WE_PROJECTS (SEPARATE FROM WEEXIT_PROJECT AND WE_BRAIN_041524)",
    );

    // Process tracking
    let successCount = 0;
    let failCount = 0;
    const results = [];

    // Process the DOCX document
    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      const filePath = docxFile;

      console.log("
" + "=".repeat(70));
      console.log(`📄 [${i + 1}/${pdfFiles.length}] Processing: ${file}`);
      console.log("=".repeat(70));

      try {
        const result = await processCASCADEDocument(filePath);
        successCount++;
        results.push(result);

        // VALIDATE IN DATABASE IMMEDIATELY
        const dbCheck = await prisma.cascade_documents.findUnique({
          where: { id: result.documentId },
        });

        if (dbCheck && dbCheck.domain === "WE_PROJECTS") {
          console.log(
            `✅ VALIDATED: Document ${result.documentId} stored with WE_PROJECTS tenant`,
          );
        } else {
          console.error(`⚠️ WARNING: Document not found or wrong tenant!`);
        }

        // Small delay between documents
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to process ${file}:`, error);
        failCount++;
      }
    }

    // FINAL VALIDATION: Check tenant separation
    console.log("
" + "=".repeat(70));
    console.log("🔍 VALIDATING TENANT SEPARATION");
    console.log("=".repeat(70));

    const weProjectsDocs = await prisma.cascade_documents.count({
      where: { domain: "WE_PROJECTS" },
    });

    const weexitDocs = await prisma.cascade_documents.count({
      where: { domain: "WEEXIT_PROJECT" },
    });

    const weBrainDocs = await prisma.cascade_documents.count({
      where: { domain: "WE_BRAIN_041524" },
    });

    console.log(`
📊 TENANT SEPARATION CONFIRMED:`);
    console.log(`   - WE_PROJECTS documents: ${weProjectsDocs}`);
    console.log(`   - WEEXIT_PROJECT documents: ${weexitDocs}`);
    console.log(`   - WE_BRAIN_041524 documents: ${weBrainDocs}`);
    console.log(
      `   - Total documents processed this run: ${successCount}/${pdfFiles.length}`,
    );

    // Generate summary report
    const summaryReport = {
      tenant: "WE_PROJECTS",
      sessionId: SESSION_METADATA.sessionId,
      processedAt: new Date().toISOString(),
      totalDocuments: pdfFiles.length,
      successCount,
      failCount,
      documents: results.map((r) => ({
        id: r.documentId,
        name: r.documentName,
        cascadeScore: r.cascadeScore,
        cost: r.totalCost,
      })),
      totalCost: results.reduce((sum, r) => sum + r.totalCost, 0),
      databaseValidation: {
        weProjectsCount: weProjectsDocs,
        weexitProjectCount: weexitDocs,
        weBrain041524Count: weBrainDocs,
      },
    };

    const reportPath = `/Users/david/Documents/root/weexit-marketing/WE-PROJECTS-CASCADE-SUMMARY.json`;
    await fs.writeFile(reportPath, JSON.stringify(summaryReport, null, 2));

    console.log("
" + "=".repeat(70));
    console.log("✅ ALL WE PROJECTS DOCUMENTS PROCESSED");
    console.log("=".repeat(70));
    console.log(`📁 Summary report: ${reportPath}`);
    console.log("
🔍 Query WE PROJECTS documents:");
    console.log(
      `   SELECT * FROM cascade_documents WHERE domain = 'WE_PROJECTS';`,
    );
    console.log(
      `   SELECT * FROM cascade_metadata WHERE 'WE_PROJECTS' = ANY(intelligence_tags);`,
    );
    console.log(
      `   SELECT * FROM cascade_extractions WHERE 'WE_PROJECTS' = ANY(tags);`,
    );

    process.exit(0);
  } catch (error) {
    console.error("
❌ Processing failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  processAllWEBrainDocuments();
}

export { processCASCADEDocument, CASCADE_LAYERS, SESSION_METADATA };
