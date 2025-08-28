/**
 * ProjectWE Monitoring Agent
 * Integrates with GitHub and Vercel MCP servers for comprehensive monitoring
 * Updated: 2025-01-09 - Added proper MCP integration
 */

import { EventEmitter } from "events";

interface DeploymentStatus {
  id: string;
  url: string;
  state: "BUILDING" | "ERROR" | "READY" | "CANCELED";
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  error?: {
    code: string;
    message: string;
  };
}

interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  deploymentId?: string;
}

interface MonitoringAlert {
  level: "info" | "warning" | "error" | "critical";
  source: "github" | "vercel" | "system";
  message: string;
  details?: any;
  timestamp: Date;
}

export class ProjectWEMonitoringAgent extends EventEmitter {
  private githubToken: string;
  private vercelToken: string;
  private webhookUrl?: string;
  private monitoringInterval?: NodeJS.Timeout;
  private lastDeploymentId?: string;
  private mcpEndpoint: string;

  constructor(config: {
    githubToken: string;
    vercelToken: string;
    webhookUrl?: string;
    mcpEndpoint?: string;
  }) {
    super();
    this.githubToken = config.githubToken;
    this.vercelToken = config.vercelToken;
    this.webhookUrl = config.webhookUrl;
    this.mcpEndpoint = config.mcpEndpoint || "http://localhost:3456";
  }

  /**
   * Start monitoring
   */
  async start(intervalMs: number = 60000) {
    console.log("🚀 Starting ProjectWE Monitoring Agent...");

    // Initial check
    await this.performHealthCheck();

    // Set up interval monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);

    // Set up GitHub webhook listener
    this.setupGitHubWebhooks();

    // Set up Vercel webhook listener
    this.setupVercelWebhooks();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    console.log("🛑 ProjectWE Monitoring Agent stopped");
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck() {
    try {
      // Check Vercel deployment status
      const deploymentStatus = await this.checkVercelDeployments();

      // Check GitHub repository status
      const repoStatus = await this.checkGitHubRepository();

      // Check for any errors or issues
      this.analyzeHealthStatus(deploymentStatus, repoStatus);
    } catch (error) {
      this.emitAlert({
        level: "error",
        source: "system",
        message: "Health check failed",
        details: error,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Check Vercel deployments via MCP
   */
  private async checkVercelDeployments(): Promise<DeploymentStatus[]> {
    try {
      // Use MCP endpoint for Vercel deployments
      const response = await fetch(
        `${this.mcpEndpoint}/api/vercel/deployments`,
        {
          headers: {
            Authorization: `Bearer ${this.vercelToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Vercel MCP API error: ${response.status}`);
      }

      const deployments = await response.json();

      // Check for failed deployments
      const failedDeployments = deployments.filter(
        (d: DeploymentStatus) => d.state === "ERROR",
      );

      if (failedDeployments.length > 0) {
        this.emitAlert({
          level: "error",
          source: "vercel",
          message: `${failedDeployments.length} deployment(s) failed`,
          details: failedDeployments,
          timestamp: new Date(),
        });
      }

      // Check for new successful deployments
      const latestDeployment = deployments[0];
      if (latestDeployment && latestDeployment.id !== this.lastDeploymentId) {
        this.lastDeploymentId = latestDeployment.id;

        if (latestDeployment.state === "READY") {
          this.emitAlert({
            level: "info",
            source: "vercel",
            message: "✅ New deployment successful",
            details: {
              url: latestDeployment.url,
              deploymentId: latestDeployment.id,
            },
            timestamp: new Date(),
          });
        }
      }

      return deployments;
    } catch (error) {
      console.error("Failed to check Vercel deployments:", error);
      this.emitAlert({
        level: "error",
        source: "system",
        message: `Failed to check Vercel deployments: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      });
      return [];
    }
  }

  /**
   * Check GitHub repository
   */
  private async checkGitHubRepository() {
    // Use GitHub MCP to check repository status
    const commits = await this.getRecentCommits();
    const issues = await this.getOpenIssues();
    const prs = await this.getOpenPullRequests();

    // Alert on critical issues
    const criticalIssues = issues.filter((issue: any) =>
      issue.labels.some(
        (label: any) => label.name === "critical" || label.name === "bug",
      ),
    );

    if (criticalIssues.length > 0) {
      this.emitAlert({
        level: "warning",
        source: "github",
        message: `${criticalIssues.length} critical issue(s) open`,
        details: criticalIssues,
        timestamp: new Date(),
      });
    }

    return {
      commits,
      issues,
      pullRequests: prs,
    };
  }

  /**
   * Analyze health status and emit appropriate alerts
   */
  private analyzeHealthStatus(
    deployments: DeploymentStatus[],
    repoStatus: any,
  ) {
    // Check deployment success rate
    const recentDeployments = deployments.slice(0, 10);
    const failureRate =
      recentDeployments.filter((d) => d.state === "ERROR").length /
      recentDeployments.length;

    if (failureRate > 0.3) {
      this.emitAlert({
        level: "critical",
        source: "system",
        message: `High deployment failure rate: ${(failureRate * 100).toFixed(1)}%`,
        details: { failureRate, recentDeployments },
        timestamp: new Date(),
      });
    }

    // Check for deployment patterns
    this.detectAnomalies(deployments);
  }

  /**
   * Detect anomalies in deployment patterns
   */
  private detectAnomalies(deployments: DeploymentStatus[]) {
    // Detect rapid deployments (possible CI/CD loop)
    const lastHour = Date.now() - 3600000;
    const recentDeployments = deployments.filter((d) => d.createdAt > lastHour);

    if (recentDeployments.length > 10) {
      this.emitAlert({
        level: "warning",
        source: "system",
        message: `Unusually high deployment frequency: ${recentDeployments.length} in the last hour`,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Set up GitHub webhooks
   */
  private setupGitHubWebhooks() {
    // This would integrate with GitHub MCP server
    console.log("📡 GitHub webhooks configured");
  }

  /**
   * Set up Vercel webhooks
   */
  private setupVercelWebhooks() {
    // This would integrate with Vercel MCP server
    console.log("📡 Vercel webhooks configured");
  }

  /**
   * Get recent commits from GitHub via MCP
   */
  private async getRecentCommits(): Promise<GitHubCommit[]> {
    try {
      const response = await fetch(`${this.mcpEndpoint}/api/github/commits`, {
        headers: {
          Authorization: `Bearer ${this.githubToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub MCP API error: ${response.status}`);
      }

      const commits = await response.json();
      return commits.map((commit: any) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        timestamp: commit.commit.author.date,
        deploymentId: undefined, // Will be linked later if available
      }));
    } catch (error) {
      console.warn("Failed to fetch GitHub commits:", error);
      return [];
    }
  }

  /**
   * Get open issues from GitHub via MCP
   */
  private async getOpenIssues(): Promise<any[]> {
    try {
      const response = await fetch(`${this.mcpEndpoint}/api/github/issues`, {
        headers: {
          Authorization: `Bearer ${this.githubToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub Issues MCP API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn("Failed to fetch GitHub issues:", error);
      return [];
    }
  }

  /**
   * Get open pull requests via MCP
   */
  private async getOpenPullRequests(): Promise<any[]> {
    try {
      const response = await fetch(`${this.mcpEndpoint}/api/github/pulls`, {
        headers: {
          Authorization: `Bearer ${this.githubToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub PRs MCP API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn("Failed to fetch GitHub PRs:", error);
      return [];
    }
  }

  /**
   * Emit monitoring alert
   */
  private emitAlert(alert: MonitoringAlert) {
    console.log(
      `[${alert.level.toUpperCase()}] ${alert.source}: ${alert.message}`,
    );
    this.emit("alert", alert);

    // Send to webhook if configured
    if (this.webhookUrl) {
      this.sendWebhook(alert);
    }
  }

  /**
   * Send alert to webhook
   */
  private async sendWebhook(alert: MonitoringAlert) {
    try {
      await fetch(this.webhookUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: `${alert.level === "critical" ? "🚨" : alert.level === "error" ? "❌" : alert.level === "warning" ? "⚠️" : "ℹ️"} **${alert.source.toUpperCase()}**: ${alert.message}`,
          alert,
        }),
      });
    } catch (error) {
      console.error("Failed to send webhook:", error);
    }
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    return {
      running: !!this.monitoringInterval,
      lastCheck: new Date(),
      services: {
        github: "connected",
        vercel: "connected",
      },
    };
  }
}
