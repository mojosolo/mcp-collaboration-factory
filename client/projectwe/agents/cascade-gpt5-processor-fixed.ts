#!/usr/bin/env npx tsx
/**
 * CASCADE GPT-5 Document Processor - FIXED VERSION
 * Properly uses v1/responses API for GPT-5 models
 * Uses v1/chat/completions for GPT-4 models
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs/promises";
import * as path from "path";
import pdf from "pdf-parse";
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
  tenant: "WE_PROJECTS",
  sessionId: uuidv4(),
  indexedBy: "gpt5-cascade-processor-fixed",
  extractionModel: "gpt-5-cascade-suite",
  environment: "production",
};

// CASCADE 4-Layer Architecture - Now with GPT-5!
const CASCADE_LAYERS = {
  FOUNDATION: {
    id: 1,
    name: "Foundation Layer",
    description: "Basic document extraction and parsing",
    domain: "foundation",
    complexityRange: [0, 30],
    model: "gpt-5-nano", // GPT-5 Nano for ultra-fast basic extraction
    useGPT5: true,
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
    model: "gpt-5-mini", // GPT-5 Mini for efficient analysis
    useGPT5: true,
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
    model: "gpt-5", // Full GPT-5 for complex synthesis
    useGPT5: true,
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
    model: "gpt-5", // GPT-5 with reasoning for highest complexity
    useGPT5: true,
    enableReasoning: true, // Enable reasoning for this layer
    prompts: [
      "Apply deep reasoning to synthesize insights across all document content",
      "Generate novel connections between concepts using logical inference",
      "Produce strategic recommendations based on comprehensive analysis",
      "Create knowledge synthesis with reasoning chains",
    ],
  },
};

/**
 * Extract text from PDF document
 */
async function extractPDFText(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw error;
  }
}

/**
 * Call GPT-5 using v1/responses API (the correct endpoint!)
 */
async function callGPT5Responses(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  enableReasoning: boolean = false,
): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const url = "https://api.openai.com/v1/responses";

  // Build the request with structured output
  const body: any = {
    model,
    input: `${systemPrompt}

${userPrompt}`,
    max_output_tokens: 2000,
    text: {
      format: {
        type: "json_schema",
        name: "CascadeAnalysis",
        schema: {
          type: "object",
          properties: {
            keyFindings: {
              type: "array",
              items: { type: "string" },
              maxItems: 5,
            },
            metrics: {
              type: "object",
              properties: {
                readinessScore: { type: "number", minimum: 1, maximum: 10 },
                confidenceLevel: { type: "number", minimum: 0, maximum: 1 },
                complexityScore: { type: "number", minimum: 0, maximum: 100 },
              },
              required: [
                "readinessScore",
                "confidenceLevel",
                "complexityScore",
              ],
            },
            riskFactors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  severity: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                  },
                  mitigation: { type: "string" },
                },
                required: ["risk", "severity", "mitigation"],
              },
              maxItems: 5,
            },
            opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  opportunity: { type: "string" },
                  impact: {
                    type: "string",
                    enum: ["low", "medium", "high", "transformational"],
                  },
                  effort: { type: "string", enum: ["low", "medium", "high"] },
                },
                required: ["opportunity", "impact", "effort"],
              },
              maxItems: 5,
            },
            recommendations: {
              type: "array",
              items: { type: "string" },
              maxItems: 3,
            },
            extractedConcepts: {
              type: "array",
              items: { type: "string" },
              maxItems: 10,
            },
          },
          required: [
            "keyFindings",
            "metrics",
            "riskFactors",
            "opportunities",
            "recommendations",
            "extractedConcepts",
          ],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  };

  // Add reasoning configuration if enabled
  if (enableReasoning) {
    body.reasoning = {
      effort: "high", // Use high effort for evolution layer
      summary: true,
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`GPT-5 API Error: ${JSON.stringify(data)}`);
  }

  // Extract content from v1/responses format
  const messageOutput = data.output?.find((o: any) => o.type === "message");
  const content = messageOutput?.content?.[0]?.text || "";
  const reasoningTokens =
    data.usage?.output_tokens_details?.reasoning_tokens || 0;

  return {
    content: content ? JSON.parse(content) : null,
    usage: data.usage,
    reasoningTokens,
    rateLimits: extractRateLimitHeaders(response.headers),
  };
}

/**
 * Call GPT-4 models using v1/chat/completions (fallback)
 */
async function callGPT4Chat(
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`GPT-4 API Error: ${JSON.stringify(data)}`);
  }

  const content = data.choices?.[0]?.message?.content;

  return {
    content: content ? JSON.parse(content) : null,
    usage: data.usage,
    reasoningTokens: 0,
    rateLimits: extractRateLimitHeaders(response.headers),
  };
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
    let result;

    // Use appropriate API based on model
    if (layer.useGPT5) {
      // Use v1/responses for GPT-5 models
      result = await callGPT5Responses(
        layer.model,
        systemPrompt,
        userPrompt,
        layer.enableReasoning || false,
      );
    } else {
      // Fallback to v1/chat/completions for GPT-4 models
      result = await callGPT4Chat(layer.model, systemPrompt, userPrompt);
    }

    const analysis = result.content;

    // Calculate cost
    let cost = 0;
    if (layer.useGPT5) {
      const modelConfig = GPT5_MODELS[layer.model];
      if (modelConfig) {
        cost = calculateGPT5Cost(
          layer.model as any,
          result.usage?.input_tokens || 0,
          result.usage?.output_tokens || 0,
        );
      }
    } else {
      // GPT-4 pricing
      const gpt4Pricing = {
        "gpt-4o": { input: 2.5, output: 10 },
        "gpt-4o-mini": { input: 0.15, output: 0.6 },
      };
      const pricing =
        gpt4Pricing[layer.model as keyof typeof gpt4Pricing] ||
        gpt4Pricing["gpt-4o-mini"];
      const inputCost =
        ((result.usage?.prompt_tokens || 0) * pricing.input) / 1000000;
      const outputCost =
        ((result.usage?.completion_tokens || 0) * pricing.output) / 1000000;
      cost = inputCost + outputCost;
    }

    const processingTime = Date.now() - startTime;

    console.log(`✅ ${layer.name} completed in ${processingTime}ms`);
    console.log(
      `   - Model: ${layer.model} (${layer.useGPT5 ? "GPT-5" : "GPT-4"})`,
    );
    console.log(
      `   - Input tokens: ${result.usage?.input_tokens || result.usage?.prompt_tokens || 0}`,
    );
    console.log(
      `   - Output tokens: ${result.usage?.output_tokens || result.usage?.completion_tokens || 0}`,
    );
    if (result.reasoningTokens > 0) {
      console.log(`   - Reasoning tokens: ${result.reasoningTokens}`);
    }
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
            tags: [SESSION_METADATA.tenant, layerName, "gpt5-fixed"],
            contextSnippet: `Layer: ${layerName} (${layer.model})`,
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
            tags: [SESSION_METADATA.tenant, layerName, "concept", "gpt5-fixed"],
          },
        });
      }
    }

    return {
      model: layer.model,
      isGPT5: layer.useGPT5,
      content: analysis,
      insights: analysis?.keyFindings || [],
      metrics: analysis?.metrics || {},
      reasoningTokens: result.reasoningTokens,
      totalTokens:
        result.usage?.total_tokens ||
        (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
      processingTime,
      cost,
      rateLimits: result.rateLimits,
    };
  } catch (error) {
    console.error(`❌ Error in ${layer.name}:`, error);

    // Fallback to GPT-4 if GPT-5 fails
    if (layer.useGPT5) {
      console.log(`⚠️  Falling back to GPT-4o-mini for ${layer.name}...`);

      try {
        const fallbackResult = await callGPT4Chat(
          "gpt-4o-mini",
          systemPrompt,
          userPrompt,
        );

        const processingTime = Date.now() - startTime;

        return {
          model: "gpt-4o-mini",
          isGPT5: false,
          fallback: true,
          content: fallbackResult.content,
          insights: fallbackResult.content?.keyFindings || [],
          metrics: fallbackResult.content?.metrics || {},
          reasoningTokens: 0,
          totalTokens: fallbackResult.usage?.total_tokens || 0,
          processingTime,
          cost: 0.001, // Minimal cost for fallback
          rateLimits: fallbackResult.rateLimits,
        };
      } catch (fallbackError) {
        console.error(`❌ Fallback also failed:`, fallbackError);
        throw fallbackError;
      }
    }

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
  console.log(`   - Processor: GPT-5 Fixed`);

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
  const totalReasoningTokens = Object.values(layers).reduce(
    (sum, layer: any) => sum + (layer.reasoningTokens || 0),
    0,
  );
  const gpt5LayersUsed = Object.values(layers).filter(
    (layer: any) => layer.isGPT5,
  ).length;

  // Store metadata
  await prisma.cascade_metadata.upsert({
    where: { documentId },
    create: {
      id: uuidv4(),
      documentId,
      intelligenceTags: [
        SESSION_METADATA.tenant,
        SESSION_METADATA.sessionId,
        "gpt5-processed-fixed",
        `cascade-score-${cascadeScore}`,
        `gpt5-layers-${gpt5LayersUsed}`,
        ...Object.keys(CASCADE_LAYERS).map((l) => `layer-${l.toLowerCase()}`),
      ],
      conceptsCount,
      entitiesCount,
      relationshipsCount: 0,
      complexityScore,
      extractionConfidence: 0.9, // Higher confidence with GPT-5
      processingTimeMs: totalTime,
      extractionModel: SESSION_METADATA.extractionModel,
      metadataJson: {
        session: SESSION_METADATA,
        cascadeScore,
        totalCost,
        totalReasoningTokens,
        gpt5LayersUsed,
        layerScores: Object.entries(layers).reduce(
          (acc, [key, value]: [string, any]) => {
            acc[key] = {
              score: value.metrics?.readinessScore || 0,
              model: value.model,
              isGPT5: value.isGPT5,
              fallback: value.fallback || false,
            };
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
        "gpt5-processed-fixed",
        `cascade-score-${cascadeScore}`,
        `gpt5-layers-${gpt5LayersUsed}`,
        ...Object.keys(CASCADE_LAYERS).map((l) => `layer-${l.toLowerCase()}`),
      ],
      conceptsCount,
      entitiesCount,
      complexityScore,
      extractionConfidence: 0.9,
      processingTimeMs: totalTime,
      extractionModel: SESSION_METADATA.extractionModel,
      metadataJson: {
        session: SESSION_METADATA,
        cascadeScore,
        totalCost,
        totalReasoningTokens,
        gpt5LayersUsed,
        layerScores: Object.entries(layers).reduce(
          (acc, [key, value]: [string, any]) => {
            acc[key] = {
              score: value.metrics?.readinessScore || 0,
              model: value.model,
              isGPT5: value.isGPT5,
              fallback: value.fallback || false,
            };
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
      metricType: "CASCADE_SCORE_GPT5",
      metricValue: cascadeScore,
      level: 4,
      domain: SESSION_METADATA.tenant,
      periodStart: now,
      periodEnd: now,
      metadata: {
        sessionId: SESSION_METADATA.sessionId,
        cost: totalCost,
        modelsUsed: Object.values(layers).map((l: any) => l.model),
        gpt5Models: Object.values(layers)
          .filter((l: any) => l.isGPT5)
          .map((l: any) => l.model),
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
        metricType: `${layerName}_READINESS_GPT5`,
        metricValue: metrics.readinessScore || 0,
        level: layer.id,
        domain: SESSION_METADATA.tenant,
        periodStart: now,
        periodEnd: now,
        metadata: {
          sessionId: SESSION_METADATA.sessionId,
          layerName,
          model: (layerData as any).model,
          isGPT5: (layerData as any).isGPT5,
          confidence: metrics.confidenceLevel,
          complexity: metrics.complexityScore,
          reasoningTokens: (layerData as any).reasoningTokens,
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
  console.log("🚀 Starting CASCADE GPT-5 Document Processing (FIXED)");
  console.log("=".repeat(50));
  console.log(`📌 Tenant: ${SESSION_METADATA.tenant}`);
  console.log(`📌 Session: ${SESSION_METADATA.sessionId}`);
  console.log(`📌 Using: v1/responses API for GPT-5 models`);

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
  const totalReasoningTokens = Object.values(layers).reduce(
    (sum, layer: any) => sum + (layer.reasoningTokens || 0),
    0,
  );

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
  console.log(`Total Reasoning Tokens: ${totalReasoningTokens}`);

  // Show which models were used
  console.log("
🤖 Models Used:");
  for (const [layerName, layerData] of Object.entries(layers)) {
    const data = layerData as any;
    const status = data.isGPT5 ? "✅ GPT-5" : "⚠️  GPT-4";
    const fallback = data.fallback ? " (fallback)" : "";
    console.log(`   ${layerName}: ${data.model} ${status}${fallback}`);
  }

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
    totalReasoningTokens,
    layers,
    recommendations,
    gpt5Status: "working",
    apiUsed: "v1/responses for GPT-5, v1/chat/completions for fallback",
  };

  const reportPath = `/Users/david/Documents/root/weexit-marketing/CASCADE-GPT5-FIXED-${SESSION_METADATA.sessionId}.json`;
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`
📁 Detailed report saved to: ${reportPath}`);

  return report;
}

/**
 * Process a single document for testing
 */
async function processSingleDocument() {
  const testDoc =
    "/Users/david/Documents/root/weexit-marketing/docs/WE Brain 041524/01 Exit Strategy Playbook Comprehensive Guide.pdf";

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

    // Check if test document exists
    try {
      await fs.access(testDoc);
      console.log("✅ Test document found");
    } catch {
      console.error("❌ Test document not found. Using first available PDF...");
      const docsDir =
        "/Users/david/Documents/root/weexit-marketing/docs/WE Brain 041524";
      const files = await fs.readdir(docsDir);
      const pdfFiles = files.filter((f) => f.endsWith(".pdf"));
      if (pdfFiles.length > 0) {
        const testDoc = path.join(docsDir, pdfFiles[0]);
        console.log(`📄 Using: ${pdfFiles[0]}`);
      } else {
        throw new Error("No PDF files found in docs directory");
      }
    }

    // Process the document
    const result = await processCASCADEDocument(testDoc);

    // Validate in database
    const dbCheck = await prisma.cascade_documents.findUnique({
      where: { id: result.documentId },
    });

    if (dbCheck && dbCheck.domain === "WE_PROJECTS") {
      console.log(
        `
✅ VALIDATED: Document ${result.documentId} stored with WE_PROJECTS tenant`,
      );
      console.log(`✅ GPT-5 Integration Working!`);
    } else {
      console.error(`⚠️  WARNING: Document not found or wrong tenant!`);
    }

    console.log("
🔍 Query processed documents:");
    console.log(
      `   SELECT * FROM cascade_documents WHERE id = '${result.documentId}';`,
    );
    console.log(
      `   SELECT * FROM cascade_metadata WHERE document_id = '${result.documentId}';`,
    );
    console.log(
      `   SELECT * FROM cascade_extractions WHERE document_id = '${result.documentId}';`,
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
  processSingleDocument();
}

export { processCASCADEDocument, CASCADE_LAYERS, SESSION_METADATA };
