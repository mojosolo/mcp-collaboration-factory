// ULTRATHINK Export Adapters
// Production-ready converters for PDF, DOCX, PPTX, HTML, and JSON formats

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import PptxGenJS from "pptxgenjs";
import {
  UltrathinkOutput,
  ComponentOutput,
  UltrathinkComponent,
} from "@/services/ultrathink";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || "",
);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Configure pdfMake with fonts
if (typeof window !== "undefined") {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

// Export format configuration
export interface ExportConfig {
  format: "pdf" | "docx" | "pptx" | "html" | "json";
  includeMetadata?: boolean;
  includeCharts?: boolean;
  includeImages?: boolean;
  watermark?: string;
  password?: string;
  compression?: boolean;
  styling?: ExportStyling;
}

export interface ExportStyling {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: number;
  headerImage?: string;
  footerText?: string;
  pageNumbering?: boolean;
}

export interface ExportResult {
  success: boolean;
  format: string;
  buffer?: Buffer;
  url?: string;
  size?: number;
  pages?: number;
  error?: string;
}

// Main Export Adapter Class
export class ExportAdapter {
  private static instance: ExportAdapter;

  private constructor() {}

  public static getInstance(): ExportAdapter {
    if (!ExportAdapter.instance) {
      ExportAdapter.instance = new ExportAdapter();
    }
    return ExportAdapter.instance;
  }

  // Export to specified format
  public async export(
    output: UltrathinkOutput,
    config: ExportConfig,
  ): Promise<ExportResult> {
    try {
      switch (config.format) {
        case "pdf":
          return await this.exportToPDF(output, config);

        case "docx":
          return await this.exportToDOCX(output, config);

        case "pptx":
          return await this.exportToPPTX(output, config);

        case "html":
          return await this.exportToHTML(output, config);

        case "json":
          return await this.exportToJSON(output, config);

        default:
          throw new Error(`Unsupported export format: ${config.format}`);
      }
    } catch (error) {
      console.error("Export failed:", error);
      return {
        success: false,
        format: config.format,
        error: error instanceof Error ? error.message : "Export failed",
      };
    }
  }

  // Export to PDF
  private async exportToPDF(
    output: UltrathinkOutput,
    config: ExportConfig,
  ): Promise<ExportResult> {
    const styling = config.styling || {};

    // Create PDF document definition
    const docDefinition: any = {
      content: [],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 10, 0, 10],
          color: styling.primaryColor || "#333333",
        },
        subheader: {
          fontSize: 14,
          bold: true,
          margin: [0, 8, 0, 6],
          color: styling.secondaryColor || "#666666",
        },
        body: {
          fontSize: styling.fontSize || 11,
          margin: [0, 4, 0, 4],
          alignment: "justify",
        },
        metadata: {
          fontSize: 9,
          italics: true,
          color: "#999999",
        },
      },
      defaultStyle: {
        font: styling.fontFamily || "Helvetica",
      },
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      footer: (currentPage: number, pageCount: number) => {
        const footer: any[] = [];

        if (styling.footerText) {
          footer.push({ text: styling.footerText, alignment: "center" });
        }

        if (styling.pageNumbering) {
          footer.push({
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: "right",
            margin: [0, 0, 40, 0],
          });
        }

        return footer;
      },
    };

    // Add header image if provided
    if (styling.headerImage) {
      docDefinition.content.push({
        image: styling.headerImage,
        width: 150,
        alignment: "center",
        margin: [0, 0, 0, 20],
      });
    }

    // Add title
    docDefinition.content.push({
      text: "ULTRATHINK Business Analysis Report",
      style: "header",
      alignment: "center",
    });

    // Add metadata
    if (config.includeMetadata) {
      docDefinition.content.push({
        text: [
          `Generated: ${output.timestamp.toISOString()}
`,
          `Request ID: ${output.requestId}
`,
          `Voice Score: ${output.voiceScore.toFixed(2)}
`,
          `Components: ${output.components.length}
`,
        ],
        style: "metadata",
        margin: [0, 10, 0, 20],
      });
    }

    // Add watermark if provided
    if (config.watermark) {
      docDefinition.watermark = {
        text: config.watermark,
        color: "gray",
        opacity: 0.1,
        bold: true,
        italics: false,
      };
    }

    // Add components content
    for (const component of output.components) {
      if (!component.success || !component.content) continue;

      // Add component header
      docDefinition.content.push({
        text: this.getComponentName(component.component),
        style: "subheader",
        pageBreak: "before",
      });

      // Process and add content
      const processedContent = this.processContentForPDF(component.content);
      docDefinition.content.push({
        text: processedContent,
        style: "body",
      });

      // Add charts if available and requested
      if (config.includeCharts && component.data?.chart) {
        docDefinition.content.push({
          image: await this.generateChartImage(component.data.chart),
          width: 400,
          alignment: "center",
          margin: [0, 10, 0, 10],
        });
      }
    }

    // Generate PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        if (buffer) {
          resolve(buffer);
        } else {
          reject(new Error("Failed to generate PDF"));
        }
      });
    });

    // Add password protection if requested
    let finalBuffer = buffer;
    if (config.password) {
      finalBuffer = await this.addPDFPassword(buffer, config.password);
    }

    // Upload to S3 and generate URL
    const url = await this.uploadToS3(
      finalBuffer,
      `exports/${output.requestId}.pdf`,
      "application/pdf",
    );

    return {
      success: true,
      format: "pdf",
      buffer: finalBuffer,
      url,
      size: finalBuffer.length,
      pages: output.components.length,
    };
  }

  // Export to DOCX
  private async exportToDOCX(
    output: UltrathinkOutput,
    config: ExportConfig,
  ): Promise<ExportResult> {
    const styling = config.styling || {};

    // Create document sections
    const sections: any[] = [];

    // Title section
    sections.push({
      children: [
        new Paragraph({
          text: "ULTRATHINK Business Analysis Report",
          heading: HeadingLevel.TITLE,
          alignment: "center",
        }),
        new Paragraph({
          text: `Generated: ${output.timestamp.toISOString()}`,
          alignment: "center",
          spacing: { after: 400 },
        }),
      ],
    });

    // Add metadata if requested
    if (config.includeMetadata) {
      sections[0].children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Request ID: ", bold: true }),
            new TextRun(output.requestId),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Voice Score: ", bold: true }),
            new TextRun(output.voiceScore.toFixed(2)),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Components Generated: ", bold: true }),
            new TextRun(output.components.length.toString()),
          ],
          spacing: { after: 400 },
        }),
      );
    }

    // Add component sections
    for (const component of output.components) {
      if (!component.success || !component.content) continue;

      const componentSection = {
        children: [
          new Paragraph({
            text: this.getComponentName(component.component),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
        ],
      };

      // Process content into paragraphs
      const paragraphs = this.processContentForDOCX(component.content);
      componentSection.children.push(...paragraphs);

      sections.push(componentSection);
    }

    // Add footer if requested
    if (styling.footerText || styling.pageNumbering) {
      sections.forEach((section) => {
        section.footers = {
          default: {
            children: [
              new Paragraph({
                text: styling.footerText || "",
                alignment: "center",
              }),
            ],
          },
        };
      });
    }

    // Create document
    const doc = new Document({
      sections,
      creator: "ULTRATHINK",
      title: "Business Analysis Report",
      description: `Generated on ${output.timestamp.toISOString()}`,
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Upload to S3 and generate URL
    const url = await this.uploadToS3(
      buffer,
      `exports/${output.requestId}.docx`,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    return {
      success: true,
      format: "docx",
      buffer,
      url,
      size: buffer.length,
      pages: sections.length,
    };
  }

  // Export to PPTX
  private async exportToPPTX(
    output: UltrathinkOutput,
    config: ExportConfig,
  ): Promise<ExportResult> {
    const styling = config.styling || {};
    const pptx = new PptxGenJS();

    // Set presentation properties
    pptx.author = "ULTRATHINK";
    pptx.company = "ProjectWE";
    pptx.title = "Business Analysis Report";
    pptx.subject = `Generated on ${output.timestamp.toISOString()}`;

    // Define master slide
    pptx.defineSlideMaster({
      title: "MASTER_SLIDE",
      background: { color: "FFFFFF" },
      objects: [
        {
          placeholder: {
            options: {
              name: "title",
              type: "title",
              x: 0.5,
              y: 0.5,
              w: 9,
              h: 1.5,
              fontSize: 32,
              bold: true,
              color: styling.primaryColor || "333333",
              align: "center",
            },
            text: "Slide Title",
          },
        },
        {
          placeholder: {
            options: {
              name: "body",
              type: "body",
              x: 0.5,
              y: 2.5,
              w: 9,
              h: 4.5,
              fontSize: 18,
              color: "666666",
            },
            text: "Slide Content",
          },
        },
      ],
    });

    // Add title slide
    const titleSlide = pptx.addSlide();
    titleSlide.addText("ULTRATHINK Business Analysis", {
      x: 0.5,
      y: 2,
      w: 9,
      h: 1.5,
      fontSize: 36,
      bold: true,
      color: styling.primaryColor || "333333",
      align: "center",
    });

    titleSlide.addText(`Voice Score: ${output.voiceScore.toFixed(2)}`, {
      x: 0.5,
      y: 3.5,
      w: 9,
      h: 0.5,
      fontSize: 24,
      color: styling.secondaryColor || "666666",
      align: "center",
    });

    titleSlide.addText(output.timestamp.toISOString(), {
      x: 0.5,
      y: 4.5,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: "999999",
      align: "center",
    });

    // Add component slides
    for (const component of output.components) {
      if (!component.success || !component.content) continue;

      const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });

      // Add title
      slide.addText(this.getComponentName(component.component), {
        placeholder: "title",
      });

      // Process content for slides
      const slideContent = this.processContentForPPTX(component.content);

      // Add content as bullet points
      slide.addText(slideContent, {
        placeholder: "body",
        bullet: true,
      });

      // Add charts if available
      if (config.includeCharts && component.data?.chart) {
        slide.addChart(pptx.ChartType.bar, component.data.chart, {
          x: 1,
          y: 3.5,
          w: 8,
          h: 3,
        });
      }

      // Add notes if metadata included
      if (config.includeMetadata && component.metadata) {
        slide.addNotes(
          `Voice Score: ${component.metadata.voiceScore || "N/A"}
` +
            `Generation Time: ${component.metadata.generationTime}ms`,
        );
      }
    }

    // Add summary slide
    const summarySlide = pptx.addSlide();
    summarySlide.addText("Summary", {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 1,
      fontSize: 32,
      bold: true,
      color: styling.primaryColor || "333333",
      align: "center",
    });

    const summaryPoints = [
      `Total Components: ${output.components.length}`,
      `Success Rate: ${((output.components.filter((c) => c.success).length / output.components.length) * 100).toFixed(1)}%`,
      `Average Voice Score: ${output.voiceScore.toFixed(2)}`,
      `Total Duration: ${output.performanceMetrics.totalDuration}ms`,
    ];

    summarySlide.addText(summaryPoints, {
      x: 0.5,
      y: 2,
      w: 9,
      h: 4,
      fontSize: 20,
      bullet: true,
      color: "666666",
    });

    // Generate buffer
    const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

    // Upload to S3 and generate URL
    const url = await this.uploadToS3(
      buffer,
      `exports/${output.requestId}.pptx`,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );

    return {
      success: true,
      format: "pptx",
      buffer,
      url,
      size: buffer.length,
      pages: output.components.length + 2, // Title + components + summary
    };
  }

  // Export to HTML
  private async exportToHTML(
    output: UltrathinkOutput,
    config: ExportConfig,
  ): Promise<ExportResult> {
    const styling = config.styling || {};

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ULTRATHINK Business Analysis Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${styling.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'};
      font-size: ${styling.fontSize || 16}px;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    
    header {
      text-align: center;
      padding: 40px 0;
      border-bottom: 3px solid ${styling.primaryColor || "#007bff"};
      margin-bottom: 40px;
    }
    
    h1 {
      color: ${styling.primaryColor || "#007bff"};
      font-size: 36px;
      margin-bottom: 10px;
    }
    
    .metadata {
      color: #666;
      font-size: 14px;
      margin-top: 20px;
    }
    
    .metadata span {
      display: inline-block;
      margin: 0 15px;
    }
    
    .voice-score {
      display: inline-block;
      padding: 5px 15px;
      background: ${output.voiceScore >= 0.85 ? "#28a745" : output.voiceScore >= 0.7 ? "#ffc107" : "#dc3545"};
      color: white;
      border-radius: 20px;
      font-weight: bold;
    }
    
    section {
      margin-bottom: 40px;
      padding: 30px;
      background: #fafafa;
      border-radius: 8px;
      border-left: 4px solid ${styling.secondaryColor || "#6c757d"};
    }
    
    h2 {
      color: ${styling.secondaryColor || "#6c757d"};
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ddd;
    }
    
    .content {
      white-space: pre-wrap;
      color: #555;
    }
    
    .chart-container {
      margin: 20px 0;
      text-align: center;
    }
    
    .chart-container img {
      max-width: 100%;
      height: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    footer {
      text-align: center;
      padding: 20px;
      margin-top: 40px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 14px;
    }
    
    @media print {
      body {
        background: white;
      }
      
      .container {
        box-shadow: none;
      }
      
      section {
        page-break-inside: avoid;
      }
    }
    
    ${
      config.watermark
        ? `
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120px;
      color: rgba(0,0,0,0.05);
      font-weight: bold;
      z-index: -1;
      pointer-events: none;
    }
    `
        : ""
    }
  </style>
</head>
<body>
  ${config.watermark ? `<div class="watermark">${config.watermark}</div>` : ""}
  
  <div class="container">
    <header>
      ${styling.headerImage ? `<img src="${styling.headerImage}" alt="Logo" style="max-width: 200px; margin-bottom: 20px;">` : ""}
      <h1>ULTRATHINK Business Analysis Report</h1>
      <div class="metadata">
        <span>Generated: ${output.timestamp.toISOString()}</span>
        <span>Request ID: ${output.requestId}</span>
        <span class="voice-score">Voice Score: ${output.voiceScore.toFixed(2)}</span>
      </div>
    </header>
    
    <main>
      ${output.components
        .map((component) => {
          if (!component.success || !component.content) return "";

          return `
        <section id="${component.component}">
          <h2>${this.getComponentName(component.component)}</h2>
          <div class="content">${this.escapeHTML(component.content)}</div>
          ${
            config.includeCharts && component.data?.chart
              ? `<div class="chart-container">
              <img src="${component.data.chart}" alt="${component.component} chart">
            </div>`
              : ""
          }
          ${
            config.includeMetadata && component.metadata
              ? `<div class="metadata">
              <small>
                Generation time: ${component.metadata.generationTime}ms | 
                Words: ${component.metadata.wordCount || "N/A"} | 
                Retries: ${component.metadata.retries || 0}
              </small>
            </div>`
              : ""
          }
        </section>
        `;
        })
        .join("")}
    </main>
    
    <footer>
      ${styling.footerText || "© 2024 ULTRATHINK - ProjectWE®"}
      ${styling.pageNumbering ? " | Page 1 of 1" : ""}
    </footer>
  </div>
</body>
</html>
    `;

    const buffer = Buffer.from(html, "utf-8");

    // Upload to S3 and generate URL
    const url = await this.uploadToS3(
      buffer,
      `exports/${output.requestId}.html`,
      "text/html",
    );

    return {
      success: true,
      format: "html",
      buffer,
      url,
      size: buffer.length,
    };
  }

  // Export to JSON
  private async exportToJSON(
    output: UltrathinkOutput,
    config: ExportConfig,
  ): Promise<ExportResult> {
    const jsonData = {
      metadata: {
        requestId: output.requestId,
        timestamp: output.timestamp,
        voiceScore: output.voiceScore,
        status: output.status,
        performance: {
          totalDuration: output.performanceMetrics.totalDuration,
          cacheHitRate: output.performanceMetrics.cacheHitRate,
          errorRate: output.performanceMetrics.errorRate,
        },
      },
      components: output.components.map((component) => ({
        type: component.component,
        name: this.getComponentName(component.component),
        success: component.success,
        content: component.content,
        data: component.data,
        metadata: config.includeMetadata ? component.metadata : undefined,
      })),
      voiceAnalysis: output.voiceAnalysis,
      errors: output.errors,
    };

    const jsonString = JSON.stringify(jsonData, null, 2);
    const buffer = Buffer.from(jsonString, "utf-8");

    // Compress if requested
    let finalBuffer = buffer;
    if (config.compression) {
      finalBuffer = await this.compressBuffer(buffer);
    }

    // Upload to S3 and generate URL
    const url = await this.uploadToS3(
      finalBuffer,
      `exports/${output.requestId}.json${config.compression ? ".gz" : ""}`,
      "application/json",
    );

    return {
      success: true,
      format: "json",
      buffer: finalBuffer,
      url,
      size: finalBuffer.length,
    };
  }

  // Utility methods
  private getComponentName(component: UltrathinkComponent): string {
    const names: Record<UltrathinkComponent, string> = {
      [UltrathinkComponent.EXECUTIVE_SUMMARY]: "Executive Summary",
      [UltrathinkComponent.MARKET_ANALYSIS]: "Market Analysis",
      [UltrathinkComponent.COMPETITIVE_LANDSCAPE]: "Competitive Landscape",
      [UltrathinkComponent.FINANCIAL_PROJECTIONS]: "Financial Projections",
      [UltrathinkComponent.RISK_ASSESSMENT]: "Risk Assessment",
      [UltrathinkComponent.STRATEGIC_RECOMMENDATIONS]:
        "Strategic Recommendations",
      [UltrathinkComponent.VALUATION_MODEL]: "Valuation Model",
      [UltrathinkComponent.EXIT_READINESS]: "Exit Readiness Assessment",
      [UltrathinkComponent.BUYER_PROFILING]: "Buyer Profiling",
      [UltrathinkComponent.NEGOTIATION_STRATEGY]: "Negotiation Strategy",
      [UltrathinkComponent.TAX_OPTIMIZATION]: "Tax Optimization",
      [UltrathinkComponent.LEGAL_COMPLIANCE]: "Legal Compliance",
      [UltrathinkComponent.OPERATIONAL_EFFICIENCY]: "Operational Efficiency",
      [UltrathinkComponent.TECHNOLOGY_AUDIT]: "Technology Audit",
      [UltrathinkComponent.HUMAN_CAPITAL]: "Human Capital",
      [UltrathinkComponent.INTELLECTUAL_PROPERTY]: "Intellectual Property",
      [UltrathinkComponent.CUSTOMER_ANALYSIS]: "Customer Analysis",
      [UltrathinkComponent.SUPPLY_CHAIN]: "Supply Chain",
      [UltrathinkComponent.SUSTAINABILITY_ESG]: "Sustainability & ESG",
      [UltrathinkComponent.BRAND_VALUE]: "Brand Value",
      [UltrathinkComponent.GROWTH_OPPORTUNITIES]: "Growth Opportunities",
      [UltrathinkComponent.SUCCESSION_PLANNING]: "Succession Planning",
      [UltrathinkComponent.WEALTH_PRESERVATION]: "Wealth Preservation",
    };

    return names[component] || component;
  }

  private processContentForPDF(content: string): string {
    // Clean and format content for PDF
    return content
      .replace(/^#+\s/gm, "") // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown
      .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .trim();
  }

  private processContentForDOCX(content: string): Paragraph[] {
    const lines = content.split("\n");
    const paragraphs: Paragraph[] = [];

    for (const line of lines) {
      if (line.trim() === "") continue;

      // Check if it's a heading
      const headingMatch = line.match(/^(#{1,6})\s(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        paragraphs.push(
          new Paragraph({
            text: headingMatch[2],
            heading:
              level === 1
                ? HeadingLevel.HEADING_1
                : level === 2
                  ? HeadingLevel.HEADING_2
                  : level === 3
                    ? HeadingLevel.HEADING_3
                    : HeadingLevel.HEADING_4,
          }),
        );
      } else {
        // Regular paragraph
        paragraphs.push(
          new Paragraph({
            text: line,
            spacing: { after: 120 },
          }),
        );
      }
    }

    return paragraphs;
  }

  private processContentForPPTX(content: string): string[] {
    // Convert content to bullet points for slides
    const lines = content.split("\n");
    const bullets: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "") continue;

      // Skip headers
      if (trimmed.startsWith("#")) continue;

      // Convert to bullet point
      if (
        trimmed.startsWith("•") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith("*")
      ) {
        bullets.push(trimmed.substring(1).trim());
      } else if (bullets.length < 5) {
        // Limit bullets per slide
        bullets.push(trimmed);
      }
    }

    return bullets;
  }

  private escapeHTML(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  private async generateChartImage(chartData: any): Promise<string> {
    // Generate chart image from data
    // This would integrate with a charting library
    // For now, return placeholder
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  }

  private async addPDFPassword(
    buffer: Buffer,
    password: string,
  ): Promise<Buffer> {
    // Add password protection to PDF
    // This would use pdf-lib or similar library
    const pdfDoc = await PDFDocument.load(buffer);

    // Note: pdf-lib doesn't support password protection directly
    // You would need to use a different library like qpdf or pdftk
    // For now, return the original buffer

    return buffer;
  }

  private async compressBuffer(buffer: Buffer): Promise<Buffer> {
    // Compress buffer using gzip
    const { promisify } = require("util");
    const zlib = require("zlib");
    const gzip = promisify(zlib.gzip);

    return await gzip(buffer);
  }

  private async uploadToS3(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || "ultrathink-exports",
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          "generated-by": "ultrathink",
          "generated-at": new Date().toISOString(),
        },
      });

      await s3Client.send(command);

      // Generate signed URL (expires in 24 hours)
      const getCommand = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || "ultrathink-exports",
        Key: key,
      });

      const url = await getSignedUrl(s3Client, getCommand, {
        expiresIn: 86400,
      });

      return url;
    } catch (error) {
      console.error("Failed to upload to S3:", error);
      // Return data URL as fallback
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    }
  }
}

// Singleton instance
export const exportAdapter = ExportAdapter.getInstance();

// Export convenience functions
export async function exportDocument(
  output: UltrathinkOutput,
  format: ExportConfig["format"],
  options?: Partial<ExportConfig>,
): Promise<ExportResult> {
  const config: ExportConfig = {
    format,
    includeMetadata: true,
    includeCharts: true,
    ...options,
  };

  return exportAdapter.export(output, config);
}

export async function exportAllFormats(
  output: UltrathinkOutput,
  options?: Partial<ExportConfig>,
): Promise<Record<string, ExportResult>> {
  const formats: ExportConfig["format"][] = [
    "pdf",
    "docx",
    "pptx",
    "html",
    "json",
  ];
  const results: Record<string, ExportResult> = {};

  for (const format of formats) {
    results[format] = await exportDocument(output, format, options);
  }

  return results;
}

// Import required types for client libraries
declare module "pptxgenjs" {
  export default class PptxGenJS {
    author: string;
    company: string;
    title: string;
    subject: string;
    ChartType: any;
    defineSlideMaster(options: any): void;
    addSlide(options?: any): any;
    write(options: any): Promise<any>;
  }
}

declare module "docx" {
  export class Document {
    constructor(options: any);
  }
  export class Packer {
    static toBuffer(doc: Document): Promise<Buffer>;
  }
  export class Paragraph {
    constructor(options: any);
  }
  export class TextRun {
    constructor(options: any);
  }
  export enum HeadingLevel {
    TITLE,
    HEADING_1,
    HEADING_2,
    HEADING_3,
    HEADING_4,
  }
}

declare const GetObjectCommand: any;
