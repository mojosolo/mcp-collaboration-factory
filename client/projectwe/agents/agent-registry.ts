/**
 * Unified Agent Registry
 * Single source of truth for all active agents in the system
 * Created: 2025-01-09
 */

import { EventEmitter } from "events";

export interface AgentDefinition {
  id: string;
  name: string;
  type: "builtin" | "custom" | "script" | "mcp" | "workflow";
  category:
    | "deployment"
    | "monitoring"
    | "security"
    | "intelligence"
    | "automation"
    | "integration";
  description: string;
  status: "active" | "inactive" | "deprecated" | "archived";
  capabilities: string[];
  dependencies?: string[];
  configRequired?: string[];
  location?: string;
  lastUpdated: string;
  version?: string;
}

export interface AgentStatus {
  id: string;
  healthy: boolean;
  lastCheck: Date;
  errorCount: number;
  lastError?: string;
  metrics?: {
    requestCount: number;
    avgResponseTime: number;
    successRate: number;
  };
}

class AgentRegistry extends EventEmitter {
  private agents: Map<string, AgentDefinition> = new Map();
  private statuses: Map<string, AgentStatus> = new Map();

  constructor() {
    super();
    this.initializeBuiltinAgents();
    this.initializeCustomAgents();
    this.initializeScriptAgents();
  }

  /**
   * Initialize built-in Claude Code agents
   */
  private initializeBuiltinAgents() {
    const builtinAgents: AgentDefinition[] = [
      {
        id: "revo-executor",
        name: "Revo Executor",
        type: "builtin",
        category: "automation",
        description:
          "Revo CLI workflows, code generation, refactoring, automation",
        status: "active",
        capabilities: [
          "code-generation",
          "refactoring",
          "automation",
          "cli-workflows",
        ],
        lastUpdated: "2025-01-09",
      },
      {
        id: "deployment-pipeline-architect",
        name: "Deployment Pipeline Architect",
        type: "builtin",
        category: "deployment",
        description:
          "Deployment workflows, infrastructure setup, CI/CD pipeline configuration",
        status: "active",
        capabilities: [
          "deployment",
          "infrastructure",
          "secrets-management",
          "zero-downtime",
          "rollback",
        ],
        lastUpdated: "2025-01-09",
      },
      {
        id: "cucumber-bdd-architect",
        name: "Cucumber BDD Architect",
        type: "builtin",
        category: "automation",
        description:
          "BDD/Cucumber testing implementation, Gherkin scenarios, test framework integration",
        status: "active",
        capabilities: ["bdd-testing", "gherkin", "test-automation", "cucumber"],
        lastUpdated: "2025-01-09",
      },
      {
        id: "db-manager",
        name: "Database Manager",
        type: "builtin",
        category: "integration",
        description:
          "Neon Postgres operations, state management, caching, logging",
        status: "active",
        capabilities: ["database", "postgres", "caching", "state-management"],
        lastUpdated: "2025-01-09",
      },
      {
        id: "claude-scrummaster",
        name: "Claude Scrum Master",
        type: "builtin",
        category: "automation",
        description:
          "Sprint planning, agile ceremonies, backlog management, retrospectives",
        status: "active",
        capabilities: [
          "sprint-planning",
          "agile",
          "backlog-management",
          "retrospectives",
        ],
        lastUpdated: "2025-01-09",
      },
      {
        id: "bmad-planner",
        name: "BMAD Planner",
        type: "builtin",
        category: "intelligence",
        description:
          "BMAD workflows, PRD generation, architecture planning, agent loops",
        status: "active",
        capabilities: [
          "prd-generation",
          "architecture-planning",
          "bmad-workflows",
        ],
        location: "src/agents/bmad-planner-agent.ts",
        lastUpdated: "2025-01-09",
      },
      {
        id: "consult7-agent",
        name: "Consult7 Agent",
        type: "builtin",
        category: "intelligence",
        description:
          "Large codebase consulting, delegating to secondary LLMs like Gemini",
        status: "active",
        capabilities: ["codebase-analysis", "consulting", "multi-llm"],
        dependencies: ["context7-agent"],
        lastUpdated: "2025-01-09",
      },
      {
        id: "context7-agent",
        name: "Context7 Agent",
        type: "builtin",
        category: "intelligence",
        description:
          "Documentation fetching, context summarization, bridging to serena-agent",
        status: "active",
        capabilities: ["documentation", "context-analysis", "summarization"],
        dependencies: ["serena-agent"],
        lastUpdated: "2025-01-09",
      },
      {
        id: "serena-agent",
        name: "Serena Agent",
        type: "builtin",
        category: "intelligence",
        description:
          "Semantic code analysis, type checking, search in codebases",
        status: "active",
        capabilities: ["semantic-analysis", "type-checking", "code-search"],
        lastUpdated: "2025-01-09",
      },
      {
        id: "playwright-agent",
        name: "Playwright Agent",
        type: "builtin",
        category: "automation",
        description:
          "Browser automation, web scraping, UI testing with Playwright",
        status: "active",
        capabilities: ["browser-automation", "web-scraping", "ui-testing"],
        lastUpdated: "2025-01-09",
      },
      {
        id: "desktop-commander-agent",
        name: "Desktop Commander Agent",
        type: "builtin",
        category: "automation",
        description: "Desktop commands, file management, system interactions",
        status: "active",
        capabilities: [
          "desktop-automation",
          "file-management",
          "system-commands",
        ],
        lastUpdated: "2025-01-09",
      },
      {
        id: "general-purpose",
        name: "General Purpose Agent",
        type: "builtin",
        category: "intelligence",
        description:
          "Multi-step task research, complex question handling, autonomous execution",
        status: "active",
        capabilities: ["multi-step-tasks", "research", "autonomous-execution"],
        lastUpdated: "2025-01-09",
      },
    ];

    builtinAgents.forEach((agent) => {
      this.agents.set(agent.id, agent);
    });
  }

  /**
   * Initialize custom TypeScript agents
   */
  private initializeCustomAgents() {
    const customAgents: AgentDefinition[] = [
      {
        id: "projectwe-monitoring-agent",
        name: "ProjectWE Monitoring Agent",
        type: "custom",
        category: "monitoring",
        description:
          "GitHub/Vercel integration, deployment tracking, real-time monitoring",
        status: "active",
        capabilities: [
          "github-integration",
          "vercel-monitoring",
          "deployment-tracking",
          "webhooks",
        ],
        configRequired: ["GITHUB_TOKEN", "VERCEL_TOKEN"],
        location: "src/agents/projectwe-monitoring-agent.ts",
        lastUpdated: "2025-01-09",
        version: "2.0.0",
      },
      {
        id: "security-monitoring-agent",
        name: "Security Monitoring Agent",
        type: "custom",
        category: "security",
        description:
          "SNYK integration, vulnerability scanning, license compliance, auto-fix",
        status: "active",
        capabilities: [
          "vulnerability-scanning",
          "license-compliance",
          "container-security",
          "auto-fix",
        ],
        configRequired: ["SNYK_TOKEN"],
        location: "src/agents/security-monitoring-agent.ts",
        lastUpdated: "2025-01-09",
        version: "1.0.0",
      },
      {
        id: "infrastructure-monitoring-agent",
        name: "Infrastructure Monitoring Agent",
        type: "custom",
        category: "monitoring",
        description:
          "Cloudflare/DigitalOcean monitoring, resource tracking, alerting",
        status: "active",
        capabilities: [
          "cloudflare-monitoring",
          "digitalocean-monitoring",
          "resource-tracking",
          "alerting",
        ],
        configRequired: ["CLOUDFLARE_TOKEN", "DIGITALOCEAN_TOKEN"],
        location: "src/agents/infrastructure-monitoring-agent.ts",
        lastUpdated: "2025-01-09",
        version: "1.0.0",
      },
      {
        id: "github-manager-agent",
        name: "GitHub Manager Agent",
        type: "custom",
        category: "integration",
        description:
          "Issues, labels, PRs, planner sync; supports PAT and GitHub App tokens",
        status: "active",
        capabilities: ["issues", "labels", "prs", "webhooks"],
        configRequired: [
          "GITHUB_TOKEN or (GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID)",
        ],
        location: "src/agents/github-manager-agent.ts",
        lastUpdated: "2025-01-09",
        version: "1.0.0",
      },
    ];

    customAgents.forEach((agent) => {
      this.agents.set(agent.id, agent);
    });
  }

  /**
   * Initialize script-based agents
   */
  private initializeScriptAgents() {
    const scriptAgents: AgentDefinition[] = [
      {
        id: "ultimate-deployment-orchestrator",
        name: "Ultimate Deployment Orchestrator",
        type: "script",
        category: "deployment",
        description:
          "Advanced deployment with blue-green strategy, health checks, rollback",
        status: "active",
        capabilities: [
          "blue-green-deployment",
          "health-checks",
          "auto-rollback",
          "git-workflow",
        ],
        location: "deploy/ultimate-deployment-orchestrator.sh",
        lastUpdated: "2025-01-09",
        version: "3.0.0",
      },
      {
        id: "deploy-agent",
        name: "Deploy Agent",
        type: "script",
        category: "deployment",
        description:
          "Master deployment orchestrator for Digital Ocean with Doppler",
        status: "active",
        capabilities: [
          "deployment",
          "doppler-integration",
          "digitalocean",
          "health-checks",
        ],
        configRequired: ["DOPPLER_TOKEN"],
        location: "deploy/deploy-agent.sh",
        lastUpdated: "2025-01-09",
        version: "1.0.0",
      },
      {
        id: "deployment-monitor",
        name: "Deployment Monitor",
        type: "script",
        category: "monitoring",
        description: "Real-time deployment monitoring and verification",
        status: "active",
        capabilities: [
          "deployment-monitoring",
          "real-time-tracking",
          "metrics-collection",
        ],
        location: "deploy/deployment-monitor.sh",
        lastUpdated: "2025-01-09",
        version: "1.0.0",
      },
      {
        id: "bmad-workflow",
        name: "BMAD Workflow",
        type: "workflow",
        category: "automation",
        description:
          "Build→Measure→Analyze→Decide cycle runner with CLI/Bash integration",
        status: "active",
        capabilities: ["build", "measure", "analyze", "decide", "reports"],
        location: "COMMANDS/bmad",
        lastUpdated: "2025-01-09",
        version: "1.0.0",
      },
    ];

    scriptAgents.forEach((agent) => {
      this.agents.set(agent.id, agent);
    });
  }

  /**
   * Register a new agent
   */
  registerAgent(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent);
    this.emit("agent:registered", agent);
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by category
   */
  getAgentsByCategory(category: string): AgentDefinition[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.category === category,
    );
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: string): AgentDefinition[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.type === type,
    );
  }

  /**
   * Get active agents only
   */
  getActiveAgents(): AgentDefinition[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.status === "active",
    );
  }

  /**
   * Update agent status
   */
  updateAgentStatus(id: string, status: Partial<AgentStatus>): void {
    const existingStatus = this.statuses.get(id) || {
      id,
      healthy: true,
      lastCheck: new Date(),
      errorCount: 0,
    };

    const updatedStatus = { ...existingStatus, ...status };
    this.statuses.set(id, updatedStatus);
    this.emit("agent:status:updated", updatedStatus);
  }

  /**
   * Get agent status
   */
  getAgentStatus(id: string): AgentStatus | undefined {
    return this.statuses.get(id);
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses(): AgentStatus[] {
    return Array.from(this.statuses.values());
  }

  /**
   * Check if agent is available
   */
  isAgentAvailable(id: string): boolean {
    const agent = this.getAgent(id);
    const status = this.getAgentStatus(id);

    return !!(
      agent &&
      agent.status === "active" &&
      (!status || status.healthy)
    );
  }

  /**
   * Get agents with dependencies satisfied
   */
  getAvailableAgents(): AgentDefinition[] {
    return this.getActiveAgents().filter((agent) => {
      if (!agent.dependencies) return true;

      return agent.dependencies.every((depId) => this.isAgentAvailable(depId));
    });
  }

  /**
   * Deactivate agent
   */
  deactivateAgent(id: string, reason?: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = "inactive";
      this.agents.set(id, agent);
      this.emit("agent:deactivated", { id, reason });
    }
  }

  /**
   * Archive agent
   */
  archiveAgent(id: string, reason?: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = "archived";
      this.agents.set(id, agent);
      this.emit("agent:archived", { id, reason });
    }
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const allAgents = this.getAllAgents();
    const allStatuses = this.getAllAgentStatuses();

    return {
      total: allAgents.length,
      active: allAgents.filter((a) => a.status === "active").length,
      inactive: allAgents.filter((a) => a.status === "inactive").length,
      archived: allAgents.filter((a) => a.status === "archived").length,
      healthy: allStatuses.filter((s) => s.healthy).length,
      unhealthy: allStatuses.filter((s) => !s.healthy).length,
      byCategory: {
        deployment: this.getAgentsByCategory("deployment").length,
        monitoring: this.getAgentsByCategory("monitoring").length,
        security: this.getAgentsByCategory("security").length,
        intelligence: this.getAgentsByCategory("intelligence").length,
        automation: this.getAgentsByCategory("automation").length,
        integration: this.getAgentsByCategory("integration").length,
      },
      byType: {
        builtin: this.getAgentsByType("builtin").length,
        custom: this.getAgentsByType("custom").length,
        script: this.getAgentsByType("script").length,
        mcp: this.getAgentsByType("mcp").length,
        workflow: this.getAgentsByType("workflow").length,
      },
    };
  }
}

// Export singleton instance
export const agentRegistry = new AgentRegistry();

// Export class for testing
export { AgentRegistry };
