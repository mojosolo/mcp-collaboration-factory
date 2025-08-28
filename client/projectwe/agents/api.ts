// API Response Types for ProjectWE Platform
// Based on actual Prisma schema

// Common response wrapper with strict typing
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

// Pagination wrapper with strict typing
export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  limit?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// User types
export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN" | "OWNER";
  image: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Organization types
export interface ApiOrganization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  createdAt: Date;
  updatedAt: Date;
  stats?: {
    memberCount: number;
    projectCount: number;
    documentCount: number;
    taskCount: number;
  };
}

// Document types
export interface ApiDocument {
  id: string;
  title: string;
  type: "FINANCIAL" | "LEGAL" | "STRATEGIC" | "OPERATIONAL" | "OTHER";
  content: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  version: number;
  status: "DRAFT" | "REVIEW" | "APPROVED" | "ARCHIVED";
  organizationId: string;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  organization?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
    status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  };
  versions?: ApiDocumentVersion[];
  shares?: ApiDocumentShare[];
}

export interface ApiDocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string | null;
  fileUrl: string | null;
  changes: Record<string, unknown>;
  createdAt: Date;
}

export interface ApiDocumentShare {
  id: string;
  documentId: string;
  permission: 'read' | 'write' | 'admin';
  expiresAt: Date | null;
  createdAt: Date;
}

// Project types
export interface ApiProject {
  id: string;
  name: string;
  description: string | null;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  exitStrategy:
    | "ACQUISITION"
    | "MERGER"
    | "IPO"
    | "MANAGEMENT_BUYOUT"
    | "LIQUIDATION"
    | null;
  targetDate: Date | null;
  valuation: number | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    tasks: number;
    documents: number;
    milestones: number;
  };
  tasks?: ApiTask[];
  documents?: ApiDocument[];
  milestones?: ApiMilestone[];
}

// Task types
export interface ApiTask {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: Date | null;
  completedAt: Date | null;
  organizationId: string;
  projectId: string | null;
  creatorId: string;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  project?: {
    id: string;
    name: string;
    status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  };
  _count?: {
    comments: number;
    attachments: number;
  };
  comments?: ApiComment[];
  attachments?: ApiAttachment[];
}

export interface ApiComment {
  id: string;
  content: string;
  userId: string;
  taskId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  task?: {
    id: string;
    title: string;
  };
}

export interface ApiAttachment {
  id: string;
  filename: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  taskId: string;
  createdAt: Date;
}

export interface ApiMilestone {
  id: string;
  title: string;
  description: string | null;
  targetDate: Date;
  completed: boolean;
  completedAt: Date | null;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

// AI types
export interface AgentCapabilities {
  modelAccess: string[];
  maxTokens: number;
  supportedLanguages: string[];
  specializations: string[];
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerDay: number;
  };
}

export interface AgentConfiguration {
  temperature: number;
  maxOutputTokens: number;
  systemPrompt?: string;
  tools?: string[];
  memory?: {
    enabled: boolean;
    maxMemorySize: number;
  };
}

export interface ApiAIAgent {
  id: string;
  name: string;
  type: "LEGAL" | "FINANCIAL" | "STRATEGIC" | "RESEARCH" | "DOCUMENTATION";
  description: string | null;
  capabilities: AgentCapabilities;
  configuration: AgentConfiguration;
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  organizationId: string;
  currentTopic?: string;
  relevantDocuments?: string[];
  preferences?: Record<string, unknown>;
}

export interface ApiConversation {
  id: string;
  messages: ConversationMessage[];
  context: ConversationContext;
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
  agent?: ApiAIAgent;
}

// Intelligence/Chat types
export interface ChatRequest {
  query: string;
  namespace: "mojosolo-transcripts" | "exit-planning-documents" | "all";
  conversationId?: string;
  model: "gpt-4" | "claude-3";
}

export interface ChatResponse {
  response: string;
  insights: ChatInsight[];
  sources: ChatSource[];
  confidence: number;
  processing_time: number;
  conversationId: string;
  messageId: string;
}

export interface ChatInsight {
  type: string;
  title: string;
  description: string;
  confidence: number;
  metadata: {
    source: string;
  };
}

export interface ChatSource {
  id: string;
  title: string;
  snippet: string;
  relevance_score: number;
  metadata: {
    type: string;
    date: string;
  };
}

// Activity types
export interface TeamActivity {
  id: string;
  type: "task" | "document" | "comment" | "project";
  action: string;
  title: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

// Exit Planning types
export interface ExitReadinessRequest {
  revenue?: number;
  profitMargin?: number;
  industry: string;
  yearsInBusiness?: number;
  employeeCount?: number;
  customerConcentration?: number;
  [key: string]: any;
}

export interface ExitReadinessResponse {
  overallScore: number;
  dimensions: {
    financial: number;
    operational: number;
    market: number;
    legal: number;
    personal: number;
  };
  recommendations: string[];
  risks: string[];
  timeline: string;
  aiGenerated: boolean;
  confidence: number;
}

export interface BusinessValuationRequest {
  revenue: number;
  industry: string;
  profitMargin?: number;
  assets?: number;
  liabilities?: number;
  employeeCount?: number;
  yearsInBusiness?: number;
  recurringRevenue?: number;
  [key: string]: any;
}

export interface BusinessValuationResponse {
  estimatedValue: number;
  range: {
    low: number;
    high: number;
  };
  methodology: string;
  multiplier: number;
  components: {
    earnings: number;
    assets: number;
    primaryValue: number;
  };
  confidence: number;
  aiGenerated: boolean;
  analysis?: {
    methodology: string;
    assumptions: string[];
    marketConditions: Record<string, unknown>;
    riskFactors: string[];
  };
}

// Client types (for ProjectWE platform)
export interface ApiClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string;
  jobTitle: string | null;
  industry: string;
  companySize: "MICRO" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";
  annualRevenue: number | null;
  exitStrategy:
    | "STRATEGIC_BUYER"
    | "FINANCIAL_BUYER"
    | "MANAGEMENT_BUYOUT"
    | "EMPLOYEE_STOCK_OWNERSHIP"
    | "FAMILY_OFFICE"
    | "INDIVIDUAL_INVESTOR"
    | "COMPETITOR"
    | "SUPPLIER"
    | "CUSTOMER"
    | "ANY"
    | null;
  exitTimeframe:
    | "IMMEDIATE"
    | "SHORT_TERM"
    | "MEDIUM_TERM"
    | "LONG_TERM"
    | "EXTENDED"
    | null;
  overallReadinessScore: number | null;
  financialReadiness: number | null;
  operationalReadiness: number | null;
  marketReadiness: number | null;
  legalReadiness: number | null;
  personalReadiness: number | null;
  relationshipStatus:
    | "PROSPECT"
    | "ACTIVE"
    | "INACTIVE"
    | "CHURNED"
    | "TERMINATED";
  currentPhase:
    | "DISCOVERY"
    | "ASSESSMENT"
    | "PLANNING"
    | "PREPARATION"
    | "EXECUTION"
    | "COMPLETION"
    | "POST_EXIT";
  status:
    | "ACTIVE"
    | "INACTIVE"
    | "PROSPECT"
    | "ONBOARDING"
    | "CHURNED"
    | "ARCHIVED";
  organizationId: string;
  advisorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics types
export interface BusinessMetric {
  id: string;
  organizationId: string;
  metricType: string;
  metricName: string;
  value: number;
  unit: string | null;
  dimensions: Record<string, string | number | boolean>;
  timestamp: Date;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: Record<string, unknown>;
  timestamp?: string;
  path?: string;
}

// Request/Response helpers
export type CreateProjectRequest = Pick<
  ApiProject,
  "name" | "description" | "exitStrategy" | "targetDate" | "valuation"
>;
export type UpdateProjectRequest = Partial<CreateProjectRequest>;

export type CreateTaskRequest = Pick<
  ApiTask,
  "title" | "description" | "priority" | "dueDate" | "assigneeId" | "projectId"
>;
export type UpdateTaskRequest = Partial<CreateTaskRequest>;

export type CreateDocumentRequest = {
  file: File;
  type?: string;
  projectId?: string;
};

export type CreateOrganizationRequest = Pick<
  ApiOrganization,
  "name" | "slug" | "domain" | "plan"
>;
