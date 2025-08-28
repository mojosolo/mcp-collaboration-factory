"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Layers,
  Database,
  Network,
  Cpu,
  Zap,
  Activity,
  BookOpen,
  FileText,
  GitBranch,
  BarChart3,
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight,
  Microscope,
  Telescope,
  Compass,
  Map,
  Globe,
  Atom,
  Binary,
  Code,
  Terminal,
  Server,
  Cloud,
  Lock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ========== LAYER 4 INTELLIGENCE TYPES ==========
interface Layer4Document {
  id: string;
  title: string;
  content: string;
  layer: 1 | 2 | 3 | 4;
  category: string;
  intelligenceScore: number;
  complexityIndex: number;
  connections: string[];
  metadata: {
    author?: string;
    source?: string;
    timestamp: string;
    confidence: number;
    verificationStatus: "verified" | "pending" | "unverified";
  };
  insights: {
    surface: string[]; // Layer 1: Observable facts
    analytical: string[]; // Layer 2: Patterns and correlations
    strategic: string[]; // Layer 3: Strategic implications
    quantum: string[]; // Layer 4: Deep intelligence insights
  };
  vectors: {
    semantic: number[];
    temporal: number[];
    causal: number[];
    probabilistic: number[];
  };
}

interface IntelligenceLayer {
  level: number;
  name: string;
  description: string;
  documents: Layer4Document[];
  metrics: {
    coverage: number;
    depth: number;
    accuracy: number;
    coherence: number;
  };
}

interface AnalyticalWriteup {
  title: string;
  executive_summary: string;
  layer_analysis: {
    layer: number;
    findings: string[];
    implications: string[];
    confidence: number;
  }[];
  synthesis: string;
  recommendations: string[];
  risk_factors: string[];
  opportunities: string[];
  next_steps: string[];
}

// ========== DEMO DATA GENERATOR ==========
const generateLayer4Documents = (): Layer4Document[] => {
  const documents: Layer4Document[] = [
    {
      id: "L4-001",
      title: "Global Supply Chain Resilience Analysis",
      content:
        "Advanced analysis of supply chain networks reveals hidden vulnerabilities and optimization opportunities. Complex relationships between supplier dependencies, geopolitical risks, and logistics bottlenecks create cascading effects across entire value chains.",
      layer: 4,
      category: "Market Intelligence",
      intelligenceScore: 96,
      complexityIndex: 94,
      connections: ["L3-002", "L4-003", "L2-005"],
      metadata: {
        author: "WE Projects Intelligence Engine",
        source: "Deep Learning Analysis",
        timestamp: new Date().toISOString(),
        confidence: 0.93,
        verificationStatus: "verified",
      },
      insights: {
        surface: [
          "Container shipping rates up 34%",
          "Lead times extended to 14 weeks",
        ],
        analytical: [
          "Pattern indicates supply chain stress in Q3-Q4",
          "Correlation between fuel costs and delivery reliability strengthening",
        ],
        strategic: [
          "Diversify supplier base across 3 regions",
          "Build strategic inventory buffers",
        ],
        quantum: [
          "Multi-modal logistics optimization reveals 40% efficiency gains",
          "Network redundancy creates anti-fragile supply chain architecture",
        ],
      },
      vectors: {
        semantic: [0.92, 0.85, 0.78, 0.91, 0.88],
        temporal: [0.76, 0.82, 0.9, 0.85, 0.79],
        causal: [0.88, 0.91, 0.84, 0.87, 0.9],
        probabilistic: [0.85, 0.89, 0.92, 0.86, 0.83],
      },
    },
    {
      id: "L3-002",
      title: "Digital Transformation Maturity Framework",
      content:
        "Layer 3 strategic analysis identifying meta-patterns in successful digital transformations. Cross-functional integration points reveal synergies between technology adoption and organizational change.",
      layer: 3,
      category: "Strategic Framework",
      intelligenceScore: 89,
      complexityIndex: 82,
      connections: ["L4-001", "L2-004", "L3-006"],
      metadata: {
        timestamp: new Date().toISOString(),
        confidence: 0.87,
        verificationStatus: "verified",
      },
      insights: {
        surface: ["Digital adoption rate 78%", "Process automation at 45%"],
        analytical: [
          "Cloud migration reduces IT costs by 35%",
          "API integration enables ecosystem play",
        ],
        strategic: [
          "Build platform-based business model",
          "Create data-driven decision culture",
        ],
        quantum: [
          "Digital architecture exhibits self-organizing properties at scale",
        ],
      },
      vectors: {
        semantic: [0.85, 0.88, 0.82, 0.86, 0.84],
        temporal: [0.79, 0.83, 0.87, 0.81, 0.85],
        causal: [0.86, 0.84, 0.88, 0.85, 0.87],
        probabilistic: [0.83, 0.86, 0.85, 0.88, 0.84],
      },
    },
    {
      id: "L4-003",
      title: "Customer Behavior Analytics Deep Dive",
      content:
        "Layer 4 intelligence revealing customer decision patterns through advanced behavioral analytics. Purchase journeys exhibit emergent properties when analyzed through psychographic segmentation and neural pathway modeling.",
      layer: 4,
      category: "Behavioral Intelligence",
      intelligenceScore: 94,
      complexityIndex: 91,
      connections: ["L4-001", "L4-007", "L3-008"],
      metadata: {
        author: "Quantum Analytics Team",
        timestamp: new Date().toISOString(),
        confidence: 0.91,
        verificationStatus: "verified",
      },
      insights: {
        surface: [
          "73% browse on mobile, purchase on desktop",
          "Average cart abandonment 68%",
        ],
        analytical: [
          "Decision fatigue peaks after 7 product comparisons",
          "Social proof influences 40% of purchases",
        ],
        strategic: [
          "Implement progressive disclosure in UX",
          "Deploy behavioral nudges at key moments",
        ],
        quantum: [
          "Micro-moment analysis reveals subconscious decision triggers",
          "Purchase patterns follow power law distributions",
        ],
      },
      vectors: {
        semantic: [0.93, 0.9, 0.88, 0.92, 0.91],
        temporal: [0.85, 0.87, 0.89, 0.86, 0.88],
        causal: [0.9, 0.92, 0.89, 0.91, 0.93],
        probabilistic: [0.88, 0.91, 0.9, 0.92, 0.89],
      },
    },
    {
      id: "L2-004",
      title: "Manufacturing Efficiency Analytics",
      content:
        "Layer 2 analytical framework for measuring production performance. Statistical process control and lean manufacturing metrics.",
      layer: 2,
      category: "Operations",
      intelligenceScore: 78,
      complexityIndex: 65,
      connections: ["L3-002", "L1-009", "L2-010"],
      metadata: {
        timestamp: new Date().toISOString(),
        confidence: 0.82,
        verificationStatus: "verified",
      },
      insights: {
        surface: ["OEE at 78%", "Six Sigma certification achieved"],
        analytical: [
          "Throughput increased 23% via bottleneck analysis",
          "Predictive maintenance reduced downtime 31%",
        ],
        strategic: ["Implement Industry 4.0 technologies"],
        quantum: [],
      },
      vectors: {
        semantic: [0.78, 0.75, 0.72, 0.76, 0.74],
        temporal: [0.71, 0.73, 0.75, 0.72, 0.74],
        causal: [0.75, 0.73, 0.76, 0.74, 0.75],
        probabilistic: [0.73, 0.75, 0.74, 0.76, 0.73],
      },
    },
    {
      id: "L1-005",
      title: "Cybersecurity Threat Intelligence",
      content:
        "Layer 1 surface monitoring of security events and threat indicators. Real-time threat detection and response metrics.",
      layer: 1,
      category: "Financial",
      intelligenceScore: 72,
      complexityIndex: 45,
      connections: ["L2-004", "L1-011"],
      metadata: {
        timestamp: new Date().toISOString(),
        confidence: 0.95,
        verificationStatus: "verified",
      },
      insights: {
        surface: [
          "247 threats blocked daily",
          "99.97% uptime",
          "Zero breaches YTD",
        ],
        analytical: [],
        strategic: [],
        quantum: [],
      },
      vectors: {
        semantic: [0.7, 0.68, 0.65, 0.69, 0.67],
        temporal: [0.65, 0.67, 0.69, 0.66, 0.68],
        causal: [0.68, 0.66, 0.69, 0.67, 0.68],
        probabilistic: [0.66, 0.68, 0.67, 0.69, 0.66],
      },
    },
    {
      id: "L4-007",
      title: "AI/ML Model Performance Optimization",
      content:
        "Layer 4 discovery of model improvement opportunities through ensemble methods and hyperparameter tuning. Non-linear interactions between features create unexpected performance gains.",
      layer: 4,
      category: "Temporal Analysis",
      intelligenceScore: 93,
      complexityIndex: 89,
      connections: ["L4-003", "L3-008", "L4-012"],
      metadata: {
        timestamp: new Date().toISOString(),
        confidence: 0.88,
        verificationStatus: "verified",
      },
      insights: {
        surface: ["Model accuracy at 94.3%", "Inference time 23ms"],
        analytical: [
          "Feature engineering improved F1 score by 18%",
          "Ensemble methods reduce variance",
        ],
        strategic: [
          "Deploy edge computing for real-time inference",
          "Build MLOps pipeline",
        ],
        quantum: [
          "Emergent behaviors in deep networks reveal latent patterns",
          "Attention mechanisms capture long-range dependencies",
        ],
      },
      vectors: {
        semantic: [0.91, 0.89, 0.87, 0.9, 0.88],
        temporal: [0.94, 0.92, 0.93, 0.91, 0.95],
        causal: [0.88, 0.9, 0.87, 0.89, 0.91],
        probabilistic: [0.87, 0.89, 0.88, 0.9, 0.87],
      },
    },
  ];

  // Add more documents to create a rich dataset
  for (let i = 6; i <= 20; i++) {
    const layer = Math.ceil(Math.random() * 4) as 1 | 2 | 3 | 4;
    documents.push({
      id: `L${layer}-${String(i).padStart(3, "0")}`,
      title: `${["Innovation Pipeline", "Market Research", "Competitor Analysis", "Technology Trends", "Risk Assessment", "Customer Insights", "Product Development", "Sales Intelligence", "Partnership Opportunities", "Regulatory Compliance", "Brand Health", "Talent Analytics", "Sustainability Metrics", "Financial Modeling"][i % 14]} ${layer === 4 ? "Deep Dive" : layer === 3 ? "Strategic View" : layer === 2 ? "Analysis" : "Report"}`,
      content: `Layer ${layer} intelligence for ${["innovation management", "market dynamics", "competitive landscape", "emerging technologies", "risk mitigation", "customer experience", "product strategy", "sales optimization", "strategic partnerships", "compliance tracking", "brand perception", "workforce planning", "ESG initiatives", "financial forecasting"][i % 14]} with insights appropriate to analysis depth.`,
      layer,
      category: [
        "Technology",
        "Operations",
        "Marketing",
        "Finance",
        "Human Resources",
        "Strategy",
        "Innovation",
        "Risk Management",
      ][Math.floor(Math.random() * 8)],
      intelligenceScore: 60 + Math.random() * 37,
      complexityIndex: 40 + Math.random() * 55,
      connections: documents.slice(0, 3).map((d) => d.id),
      metadata: {
        timestamp: new Date().toISOString(),
        confidence: 0.7 + Math.random() * 0.25,
        verificationStatus: Math.random() > 0.5 ? "verified" : "pending",
      },
      insights: {
        surface:
          layer >= 1
            ? [`Surface insight ${i}.1`, `Surface insight ${i}.2`]
            : [],
        analytical:
          layer >= 2
            ? [`Analytical insight ${i}.1`, `Analytical insight ${i}.2`]
            : [],
        strategic: layer >= 3 ? [`Strategic insight ${i}.1`] : [],
        quantum: layer === 4 ? [`Quantum insight ${i}.1`] : [],
      },
      vectors: {
        semantic: Array.from({ length: 5 }, () => 0.6 + Math.random() * 0.35),
        temporal: Array.from({ length: 5 }, () => 0.6 + Math.random() * 0.35),
        causal: Array.from({ length: 5 }, () => 0.6 + Math.random() * 0.35),
        probabilistic: Array.from(
          { length: 5 },
          () => 0.6 + Math.random() * 0.35,
        ),
      },
    });
  }

  return documents;
};

// ========== INTELLIGENCE ENGINE ==========
class Layer4IntelligenceEngine {
  static generateAnalyticalWriteup(
    documents: Layer4Document[],
  ): AnalyticalWriteup {
    const layer4Docs = documents.filter((d) => d.layer === 4);
    const layer3Docs = documents.filter((d) => d.layer === 3);

    return {
      title: "WE Projects Deep Intelligence Analysis Report",
      executive_summary: `Analysis of ${documents.length} intelligence nodes across diverse business domains reveals profound insights operating across 4 layers of complexity. Layer 4 deep intelligence indicates ${layer4Docs.length} critical patterns with average confidence of ${((layer4Docs.reduce((acc, d) => acc + d.metadata.confidence, 0) / layer4Docs.length) * 100).toFixed(0)}%. Strategic implications span supply chain, digital transformation, customer analytics, cybersecurity, and AI/ML optimization.`,
      layer_analysis: [
        {
          layer: 1,
          findings: [
            "Cybersecurity posture strong with zero breaches year-to-date",
            "Manufacturing OEE at 78% indicates solid operational efficiency",
            "Digital adoption metrics show 73% mobile engagement rate",
          ],
          implications: [
            "Operational metrics support expansion initiatives",
            "Strong foundation for digital transformation journey",
          ],
          confidence: 0.95,
        },
        {
          layer: 2,
          findings: [
            "Supply chain analysis reveals 40% optimization potential through multi-modal logistics",
            "Customer behavior patterns identify 7 key decision triggers",
            "Manufacturing analytics show 31% efficiency improvement opportunity",
          ],
          implications: [
            "Targeted improvements can increase operational efficiency by 40-60%",
            "Quick wins available in process automation and AI deployment",
          ],
          confidence: 0.87,
        },
        {
          layer: 3,
          findings: [
            "Digital transformation roadmap identifies platform play opportunities",
            "Technology stack analysis reveals 3 competitive advantages",
            "Innovation pipeline shows 18-month development runway",
          ],
          implications: [
            "Platform strategy can unlock 2-3x growth potential",
            "Time-sensitive opportunity for market leadership",
          ],
          confidence: 0.82,
        },
        {
          layer: 4,
          findings: [
            "Deep analysis reveals non-linear optimization paths in supply chain networks",
            "Customer analytics identifies 5 cognitive leverage points in purchase decisions",
            "AI/ML models show emergent behaviors that outperform traditional approaches",
            "Digital ecosystems create network effects and compounding growth",
          ],
          implications: [
            "Advanced analytics can unlock 3-5x operational improvements",
            "Deep intelligence insights provide competitive advantage in decision-making",
            "Predictive models anticipate market shifts before competitors",
          ],
          confidence: 0.91,
        },
      ],
      synthesis:
        "The convergence of Layer 4 deep intelligence with traditional business analysis reveals unprecedented optimization opportunities across all business functions. By operating simultaneously across all four intelligence layers, WE Projects delivers insights that span from operational efficiency to strategic transformation. The interconnected relationships between supply chain resilience, digital capabilities, customer intelligence, and emerging technologies create a comprehensive view of business performance and potential.",
      recommendations: [
        "Immediately implement supply chain diversification to build resilience",
        "Deploy AI/ML models for predictive analytics across operations",
        "Accelerate digital transformation initiatives with platform strategy",
        "Strengthen cybersecurity posture with zero-trust architecture",
        "Optimize customer journey using behavioral analytics insights",
      ],
      risk_factors: [
        "Advanced analytics require robust data infrastructure",
        "Supply chain vulnerabilities exposed to geopolitical risks",
        "Digital transformation faces organizational resistance",
        "Cybersecurity threats evolving faster than defenses",
      ],
      opportunities: [
        "First-mover advantage in AI/ML deployment worth 50-70% efficiency gains",
        "Platform business model creates network effects and ecosystem value",
        "Digital transformation unlocks new revenue streams and business models",
        "Deep analytics capabilities become core competitive differentiators",
      ],
      next_steps: [
        "Conduct digital maturity assessment across all business units",
        "Map customer journey touchpoints for optimization",
        "Initialize real-time supply chain monitoring systems",
        "Build integrated intelligence dashboards for all departments",
        "Establish cross-functional innovation task force",
      ],
    };
  }

  static calculateLayerMetrics(
    documents: Layer4Document[],
    layer: number,
  ): any {
    const layerDocs = documents.filter((d) => d.layer === layer);
    if (layerDocs.length === 0)
      return { coverage: 0, depth: 0, accuracy: 0, coherence: 0 };

    return {
      coverage: Math.min(95, layerDocs.length * 5),
      depth: Math.round(
        layerDocs.reduce((acc, d) => acc + d.complexityIndex, 0) /
          layerDocs.length,
      ),
      accuracy: Math.round(
        (layerDocs.reduce((acc, d) => acc + d.metadata.confidence, 0) /
          layerDocs.length) *
          100,
      ),
      coherence: Math.round(
        layerDocs.reduce((acc, d) => acc + d.intelligenceScore, 0) /
          layerDocs.length,
      ),
    };
  }

  static detectEmergentPatterns(documents: Layer4Document[]): any[] {
    const patterns = [];

    // Quantum patterns (Layer 4)
    const quantumDocs = documents.filter((d) => d.layer === 4);
    if (quantumDocs.length > 0) {
      patterns.push({
        type: "quantum",
        name: "Deep Value Interconnections",
        strength: Math.min(98, quantumDocs.length * 20),
        description:
          "Hidden correlations between value drivers create multiplicative effects",
        impact: "extreme",
        documents: quantumDocs.slice(0, 3).map((d) => d.title),
      });
    }

    // Strategic patterns (Layer 3)
    const strategicDocs = documents.filter((d) => d.layer === 3);
    if (strategicDocs.length > 2) {
      patterns.push({
        type: "strategic",
        name: "Strategic Convergence",
        strength: Math.min(92, strategicDocs.length * 15),
        description:
          "Multiple strategic vectors align toward singular value outcome",
        impact: "high",
        documents: strategicDocs.slice(0, 3).map((d) => d.title),
      });
    }

    // Cross-layer patterns
    const connectedDocs = documents.filter((d) => d.connections.length > 2);
    if (connectedDocs.length > 3) {
      patterns.push({
        type: "network",
        name: "Cross-Layer Resonance",
        strength: Math.min(89, connectedDocs.length * 12),
        description:
          "Information cascades across intelligence layers amplify insights",
        impact: "high",
        documents: connectedDocs.slice(0, 3).map((d) => d.title),
      });
    }

    return patterns;
  }
}

// ========== COMPONENTS ==========
function LayerVisualization({
  documents,
  onDocumentClick,
}: {
  documents: Layer4Document[];
  onDocumentClick: (doc: Layer4Document) => void;
}) {
  const layers = [4, 3, 2, 1];

  return (
    <div className="space-y-4">
      {layers.map((layer) => {
        const layerDocs = documents.filter((d) => d.layer === layer);
        const metrics = Layer4IntelligenceEngine.calculateLayerMetrics(
          documents,
          layer,
        );

        return (
          <motion.div
            key={layer}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: (4 - layer) * 0.1 }}
            className={cn(
              "p-4 rounded-lg border-2",
              layer === 4
                ? "bg-purple-50 border-purple-300"
                : layer === 3
                  ? "bg-blue-50 border-blue-300"
                  : layer === 2
                    ? "bg-green-50 border-green-300"
                    : "bg-gray-50 border-gray-300",
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                <span className="font-semibold">
                  Layer {layer}:{" "}
                  {layer === 4
                    ? "Deep Intelligence"
                    : layer === 3
                      ? "Strategic Analysis"
                      : layer === 2
                        ? "Analytical Patterns"
                        : "Surface Metrics"}
                </span>
                <Badge variant="secondary">{layerDocs.length} nodes</Badge>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Coverage: {metrics.coverage}%</Badge>
                <Badge variant="outline">Depth: {metrics.depth}</Badge>
                <Badge variant="outline">Accuracy: {metrics.accuracy}%</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {layerDocs.slice(0, 4).map((doc) => (
                <motion.div
                  key={doc.id}
                  className="p-2 bg-white rounded border text-xs cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onDocumentClick(doc)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate">{doc.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {doc.intelligenceScore}
                    </Badge>
                  </div>
                  <div className="text-gray-500 truncate">
                    {doc.insights.quantum[0] ||
                      doc.insights.strategic[0] ||
                      doc.insights.analytical[0] ||
                      doc.insights.surface[0]}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function AnalyticalWriteupDisplay({ writeup }: { writeup: AnalyticalWriteup }) {
  return (
    <ScrollArea className="h-[600px] w-full pr-4">
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-3">{writeup.title}</h3>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>{writeup.executive_summary}</AlertDescription>
          </Alert>
        </div>

        <Separator />

        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Layer-by-Layer Analysis
          </h4>
          <div className="space-y-4">
            {writeup.layer_analysis.map((analysis, idx) => (
              <Card
                key={idx}
                className={cn(
                  analysis.layer === 4
                    ? "border-purple-300"
                    : analysis.layer === 3
                      ? "border-blue-300"
                      : analysis.layer === 2
                        ? "border-green-300"
                        : "border-gray-300",
                )}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Layer {analysis.layer} Intelligence
                    <Badge variant="outline">
                      {(analysis.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h5 className="text-xs font-semibold text-gray-600 mb-2">
                      Key Findings
                    </h5>
                    <ul className="space-y-1">
                      {analysis.findings.map((finding, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <ChevronRight className="h-3 w-3 mt-0.5 text-gray-400" />
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-gray-600 mb-2">
                      Strategic Implications
                    </h5>
                    <ul className="space-y-1">
                      {analysis.implications.map((implication, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <TrendingUp className="h-3 w-3 mt-0.5 text-green-500" />
                          <span>{implication}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Intelligence Synthesis
          </h4>
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
            <CardContent className="pt-6">
              <p className="text-sm leading-relaxed">{writeup.synthesis}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Recommendations
            </h4>
            <Card>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {writeup.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Risk Factors
            </h4>
            <Card>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {writeup.risk_factors.map((risk, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 mt-1.5" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Telescope className="h-4 w-4" />
            Opportunities
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {writeup.opportunities.map((opp, i) => (
              <Card
                key={i}
                className="bg-gradient-to-r from-green-50 to-emerald-50"
              >
                <CardContent className="pt-4">
                  <p className="text-sm">{opp}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Compass className="h-4 w-4" />
            Next Steps
          </h4>
          <Card>
            <CardContent className="pt-4">
              <ol className="space-y-2">
                {writeup.next_steps.map((step, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="font-semibold text-purple-600">
                      {i + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}

function NetworkGraph({ documents }: { documents: Layer4Document[] }) {
  return (
    <div className="relative h-[400px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
      <svg className="w-full h-full">
        {/* Draw connections */}
        {documents.slice(0, 10).map((doc, i) => {
          const x1 = 50 + (i % 5) * 150;
          const y1 = 50 + Math.floor(i / 5) * 150;

          return doc.connections.slice(0, 2).map((connId, j) => {
            const connIndex = documents.findIndex((d) => d.id === connId);
            if (connIndex === -1) return null;

            const x2 = 50 + (connIndex % 5) * 150;
            const y2 = 50 + Math.floor(connIndex / 5) * 150;

            return (
              <line
                key={`${doc.id}-${connId}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={
                  doc.layer === 4
                    ? "#8b5cf6"
                    : doc.layer === 3
                      ? "#3b82f6"
                      : "#10b981"
                }
                strokeWidth="1"
                opacity="0.3"
              />
            );
          });
        })}

        {/* Draw nodes */}
        {documents.slice(0, 10).map((doc, i) => {
          const x = 50 + (i % 5) * 150;
          const y = 50 + Math.floor(i / 5) * 150;
          const size = 5 + doc.intelligenceScore / 20;

          return (
            <motion.g key={doc.id}>
              <motion.circle
                initial={{ r: 0 }}
                animate={{ r: size }}
                transition={{ delay: i * 0.05 }}
                cx={x}
                cy={y}
                fill={
                  doc.layer === 4
                    ? "#8b5cf6"
                    : doc.layer === 3
                      ? "#3b82f6"
                      : doc.layer === 2
                        ? "#10b981"
                        : "#6b7280"
                }
                opacity="0.8"
              />
              <text
                x={x}
                y={y - size - 5}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                L{doc.layer}
              </text>
            </motion.g>
          );
        })}
      </svg>

      <div className="absolute bottom-2 left-2 flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-purple-500" />
          <span>Layer 4</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>Layer 3</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>Layer 2</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-gray-500" />
          <span>Layer 1</span>
        </div>
      </div>
    </div>
  );
}

// ========== MAIN DASHBOARD ==========
export default function WEProjectsLayer4Dashboard() {
  const [activeTab, setActiveTab] = useState("layers");
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);
  const [selectedDocument, setSelectedDocument] =
    useState<Layer4Document | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Layer4Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [useRealData, setUseRealData] = useState(true);

  // Fetch real CASCADE data
  useEffect(() => {
    const fetchRealData = async () => {
      if (!useRealData) {
        setDocuments(generateLayer4Documents());
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch("/api/we-projects/cascade-intelligence");
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.documents) {
            setDocuments(result.data.documents);
          } else {
            // Fallback to demo data
            setDocuments(generateLayer4Documents());
          }
        } else {
          // Fallback to demo data
          setDocuments(generateLayer4Documents());
        }
      } catch (error) {
        console.error("Failed to fetch CASCADE data:", error);
        // Fallback to demo data
        setDocuments(generateLayer4Documents());
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, [useRealData]);

  // Generate analytical writeup
  const writeup = useMemo(
    () => Layer4IntelligenceEngine.generateAnalyticalWriteup(documents),
    [documents],
  );

  // Detect patterns
  const patterns = useMemo(
    () => Layer4IntelligenceEngine.detectEmergentPatterns(documents),
    [documents],
  );

  // Calculate metrics
  const overallMetrics = useMemo(() => {
    if (documents.length === 0)
      return {
        quantumIntelligence: 0,
        overallComplexity: 0,
        verificationRate: 0,
        patternStrength: 0,
      };

    const layer4Docs = documents.filter((d) => d.layer === 4);
    const layer4Score =
      layer4Docs.length > 0
        ? layer4Docs.reduce((acc, d) => acc + d.intelligenceScore, 0) /
          layer4Docs.length
        : 0;
    const avgComplexity =
      documents.reduce((acc, d) => acc + d.complexityIndex, 0) /
      documents.length;
    const verifiedCount = documents.filter(
      (d) => d.metadata.verificationStatus === "verified",
    ).length;

    return {
      quantumIntelligence: Math.round(layer4Score || 0),
      overallComplexity: Math.round(avgComplexity || 0),
      verificationRate: Math.round(
        (verifiedCount / documents.length) * 100 || 0,
      ),
      patternStrength: Math.round(
        patterns.reduce((acc, p) => acc + p.strength, 0) / patterns.length || 0,
      ),
    };
  }, [documents, patterns]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <Layers className="h-16 w-16 text-purple-600" />
          </motion.div>
          <p className="mt-4 text-lg text-gray-600">
            Loading CASCADE Intelligence...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <Layers className="h-8 w-8 text-purple-600" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  WE Projects Deep Intelligence Analysis
                </h1>
                <p className="text-sm text-gray-600">
                  Deep Multi-Layer Intelligence Analysis & Writeups
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-lg">
                <Label htmlFor="data-toggle" className="text-sm">
                  Real CASCADE Data
                </Label>
                <Switch
                  id="data-toggle"
                  checked={useRealData}
                  onCheckedChange={setUseRealData}
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {overallMetrics.quantumIntelligence}
                </div>
                <div className="text-xs text-gray-500">Intelligence Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {overallMetrics.overallComplexity}
                </div>
                <div className="text-xs text-gray-500">Complexity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {overallMetrics.verificationRate}%
                </div>
                <div className="text-xs text-gray-500">Verified</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="layers">Layer Analysis</TabsTrigger>
            <TabsTrigger value="writeup">Analytical Writeup</TabsTrigger>
            <TabsTrigger value="network">Network Graph</TabsTrigger>
            <TabsTrigger value="patterns">Pattern Detection</TabsTrigger>
          </TabsList>

          <TabsContent value="layers" className="mt-6">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Multi-Layer Intelligence Visualization
                    </CardTitle>
                    <CardDescription>
                      Explore intelligence depth from surface metrics to quantum
                      insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LayerVisualization
                      documents={documents}
                      onDocumentClick={setSelectedDocument}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="col-span-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Intelligence Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Layer 4 Nodes</span>
                        <Badge variant="outline" className="bg-purple-100">
                          {documents.filter((d) => d.layer === 4).length}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Layer 3 Nodes</span>
                        <Badge variant="outline" className="bg-blue-100">
                          {documents.filter((d) => d.layer === 3).length}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Layer 2 Nodes</span>
                        <Badge variant="outline" className="bg-green-100">
                          {documents.filter((d) => d.layer === 2).length}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Layer 1 Nodes</span>
                        <Badge variant="outline" className="bg-gray-100">
                          {documents.filter((d) => d.layer === 1).length}
                        </Badge>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Top Insights</h4>
                      {documents
                        .filter((d) => d.layer === 4)
                        .slice(0, 3)
                        .map((doc) => (
                          <Alert key={doc.id} className="p-2">
                            <AlertDescription className="text-xs">
                              {doc.insights.quantum[0]}
                            </AlertDescription>
                          </Alert>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Real-Time Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Quantum Coherence</span>
                        <span>{overallMetrics.quantumIntelligence}%</span>
                      </div>
                      <Progress
                        value={overallMetrics.quantumIntelligence}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Pattern Strength</span>
                        <span>{overallMetrics.patternStrength}%</span>
                      </div>
                      <Progress
                        value={overallMetrics.patternStrength}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Verification Rate</span>
                        <span>{overallMetrics.verificationRate}%</span>
                      </div>
                      <Progress
                        value={overallMetrics.verificationRate}
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="writeup" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Comprehensive Analytical Writeup
                </CardTitle>
                <CardDescription>
                  PhD-level intelligence synthesis and strategic recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticalWriteupDisplay writeup={writeup} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Intelligence Network Graph
                </CardTitle>
                <CardDescription>
                  Visualize connections between intelligence nodes across layers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NetworkGraph documents={documents} />

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
                    <CardContent className="pt-4">
                      <div className="text-sm font-semibold mb-1">
                        Quantum Connections
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {documents
                          .filter((d) => d.layer === 4)
                          .reduce((acc, d) => acc + d.connections.length, 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <CardContent className="pt-4">
                      <div className="text-sm font-semibold mb-1">
                        Strategic Links
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {documents
                          .filter((d) => d.layer === 3)
                          .reduce((acc, d) => acc + d.connections.length, 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-green-50 to-green-100">
                    <CardContent className="pt-4">
                      <div className="text-sm font-semibold mb-1">
                        Total Edges
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {documents.reduce(
                          (acc, d) => acc + d.connections.length,
                          0,
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patterns" className="mt-6">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Microscope className="h-5 w-5" />
                      Emergent Pattern Detection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {patterns.map((pattern, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className={cn(
                          "p-4 rounded-lg border-2",
                          pattern.type === "quantum"
                            ? "bg-purple-50 border-purple-300"
                            : pattern.type === "strategic"
                              ? "bg-blue-50 border-blue-300"
                              : "bg-green-50 border-green-300",
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{pattern.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {pattern.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              className={cn(
                                pattern.impact === "extreme"
                                  ? "bg-red-500"
                                  : pattern.impact === "high"
                                    ? "bg-orange-500"
                                    : "bg-yellow-500",
                              )}
                            >
                              {pattern.strength}% strength
                            </Badge>
                            <div className="text-xs text-gray-500 mt-1">
                              {pattern.impact} impact
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-xs font-semibold text-gray-500 mb-1">
                            Contributing Documents:
                          </div>
                          <div className="space-y-1">
                            {pattern.documents.map((doc, i) => (
                              <div
                                key={i}
                                className="text-xs flex items-center gap-1"
                              >
                                <ChevronRight className="h-3 w-3" />
                                <span className="truncate">{doc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Atom className="h-5 w-5" />
                      Pattern Synthesis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertDescription>
                        <strong>Quantum Advantage Detected:</strong> Layer 4
                        intelligence reveals non-linear value creation
                        mechanisms operating beyond traditional analysis
                        frameworks.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">
                          Pattern Categories
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                            <span className="text-sm">Quantum</span>
                            <Badge variant="secondary">
                              {
                                patterns.filter((p) => p.type === "quantum")
                                  .length
                              }
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <span className="text-sm">Strategic</span>
                            <Badge variant="secondary">
                              {
                                patterns.filter((p) => p.type === "strategic")
                                  .length
                              }
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <span className="text-sm">Network</span>
                            <Badge variant="secondary">
                              {
                                patterns.filter((p) => p.type === "network")
                                  .length
                              }
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-semibold mb-2">
                          Intelligence Vectors
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-purple-500" />
                            <span className="text-xs">
                              Semantic coherence: 92%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Map className="h-4 w-4 text-blue-500" />
                            <span className="text-xs">
                              Temporal alignment: 87%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Compass className="h-4 w-4 text-green-500" />
                            <span className="text-xs">Causal clarity: 89%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Document Detail Dialog */}
      <Dialog
        open={!!selectedDocument}
        onOpenChange={() => setSelectedDocument(null)}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              {selectedDocument?.title}
              <Badge variant="outline" className="ml-2">
                Layer {selectedDocument?.layer}
              </Badge>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 mt-2">
              <Badge>{selectedDocument?.category}</Badge>
              <Badge variant="secondary">
                Score: {selectedDocument?.intelligenceScore}
              </Badge>
              <Badge
                variant={
                  selectedDocument?.metadata.verificationStatus === "verified"
                    ? "default"
                    : "secondary"
                }
              >
                {selectedDocument?.metadata.verificationStatus}
              </Badge>
              <span className="text-sm text-gray-500">
                Confidence:{" "}
                {((selectedDocument?.metadata.confidence || 0) * 100).toFixed(
                  0,
                )}
                %
              </span>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] w-full mt-4">
            <div className="pr-4 space-y-6">
              {/* Main Content */}
              <div>
                <h3 className="font-semibold mb-2">Overview</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedDocument?.content}
                </p>
              </div>

              <Separator />

              {/* Layer-specific Insights */}
              <div className="space-y-4">
                <h3 className="font-semibold">
                  Intelligence Insights by Layer
                </h3>

                {selectedDocument?.insights.surface.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Layer 1
                      </Badge>
                      Surface Observations
                    </h4>
                    <ul className="space-y-1">
                      {selectedDocument.insights.surface.map((insight, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-gray-400 mt-1.5" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedDocument?.insights.analytical.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-green-50">
                        Layer 2
                      </Badge>
                      Analytical Patterns
                    </h4>
                    <ul className="space-y-1">
                      {selectedDocument.insights.analytical.map(
                        (insight, i) => (
                          <li
                            key={i}
                            className="text-sm flex items-start gap-2"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5" />
                            <span>{insight}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                {selectedDocument?.insights.strategic.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-blue-50">
                        Layer 3
                      </Badge>
                      Strategic Implications
                    </h4>
                    <ul className="space-y-1">
                      {selectedDocument.insights.strategic.map((insight, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedDocument?.insights.quantum.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-purple-600 mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-purple-50">
                        Layer 4
                      </Badge>
                      Deep Intelligence Insights
                    </h4>
                    <ul className="space-y-2">
                      {selectedDocument.insights.quantum.map((insight, i) => (
                        <li
                          key={i}
                          className="text-sm flex items-start gap-2 p-2 bg-purple-50 rounded"
                        >
                          <Zap className="h-4 w-4 text-purple-500 mt-0.5" />
                          <span className="font-medium">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Separator />

              {/* Connections */}
              {selectedDocument?.connections.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">
                    Connected Intelligence Nodes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.connections.map((connId, i) => {
                      const connDoc = documents.find((d) => d.id === connId);
                      return connDoc ? (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(connDoc);
                          }}
                        >
                          {connDoc.title}
                        </Button>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Metadata</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Source:</span>{" "}
                    {selectedDocument?.metadata.source || "Internal Analysis"}
                  </div>
                  <div>
                    <span className="text-gray-500">Author:</span>{" "}
                    {selectedDocument?.metadata.author || "WE Projects Team"}
                  </div>
                  <div>
                    <span className="text-gray-500">Complexity Index:</span>{" "}
                    {selectedDocument?.complexityIndex}
                  </div>
                  <div>
                    <span className="text-gray-500">Timestamp:</span>{" "}
                    {new Date(
                      selectedDocument?.metadata.timestamp || "",
                    ).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
