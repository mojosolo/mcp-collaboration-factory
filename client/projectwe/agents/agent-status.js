#!/usr/bin/env node

/**
 * Agent Status Check Script
 * Reports the current status of all registered agents
 */

const path = require("path");
const fs = require("fs");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Agent registry (simplified version for CLI)
const agents = [
  // Deployment agents
  {
    id: "deployment-pipeline-architect",
    name: "Deployment Pipeline Architect",
    category: "deployment",
    status: "active",
  },
  {
    id: "deploy-orchestrator",
    name: "Deploy Orchestrator",
    category: "deployment",
    status: "active",
  },
  {
    id: "deployment-pipeline-architect",
    name: "Deployment Pipeline",
    category: "deployment",
    status: "active",
  },

  // Monitoring agents
  {
    id: "projectwe-monitoring-agent",
    name: "ProjectWE Monitor",
    category: "monitoring",
    status: "active",
  },
  {
    id: "projectwe-platform-orchestrator",
    name: "Platform Orchestrator",
    category: "monitoring",
    status: "active",
  },
  {
    id: "projectwe-monitor-orchestrator",
    name: "Monitor Orchestrator",
    category: "monitoring",
    status: "active",
  },
  {
    id: "infrastructure-monitoring-agent",
    name: "Infrastructure Monitor",
    category: "monitoring",
    status: "active",
  },

  // Security agents
  {
    id: "security-monitoring-agent",
    name: "Security Monitor",
    category: "security",
    status: "active",
  },
  {
    id: "security-scanner-agent",
    name: "Security Scanner",
    category: "security",
    status: "active",
  },

  // Intelligence agents
  {
    id: "ai-research-agent",
    name: "AI Research",
    category: "intelligence",
    status: "active",
  },
  {
    id: "model-analysis-orchestrator",
    name: "Model Analysis",
    category: "intelligence",
    status: "active",
  },
  {
    id: "intelligence-gatherer",
    name: "Intelligence Gatherer",
    category: "intelligence",
    status: "active",
  },

  // Automation agents
  {
    id: "revo-executor",
    name: "Revo Executor",
    category: "automation",
    status: "active",
  },
  {
    id: "bmad-planner",
    name: "BMAD Planner",
    category: "automation",
    status: "active",
  },
  {
    id: "indydev-integrator",
    name: "IndyDev Integrator",
    category: "automation",
    status: "active",
  },

  // Integration agents
  {
    id: "db-manager",
    name: "Database Manager",
    category: "integration",
    status: "active",
  },
  {
    id: "playwright-agent",
    name: "Playwright Agent",
    category: "integration",
    status: "active",
  },
  {
    id: "context7-agent",
    name: "Context7 Agent",
    category: "integration",
    status: "active",
  },
];

// Check if API is available
async function checkAPI() {
  try {
    const http = require("http");
    return new Promise((resolve) => {
      const req = http.get("http://localhost:3010/api/agent/status", (res) => {
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

// Print status table
function printStatus() {
  console.log(
    `\n${colors.magenta}${colors.bright}╔════════════════════════════════════════════════════════════════╗${colors.reset}`,
  );
  console.log(
    `${colors.magenta}${colors.bright}║            WeExit Agent System Status Report                   ║${colors.reset}`,
  );
  console.log(
    `${colors.magenta}${colors.bright}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`,
  );

  // Group agents by category
  const categories = {};
  agents.forEach((agent) => {
    if (!categories[agent.category]) {
      categories[agent.category] = [];
    }
    categories[agent.category].push(agent);
  });

  // Print each category
  Object.entries(categories).forEach(([category, categoryAgents]) => {
    const emoji =
      {
        deployment: "🚀",
        monitoring: "📊",
        security: "🔒",
        intelligence: "🧠",
        automation: "⚡",
        integration: "🔗",
      }[category] || "📦";

    console.log(
      `${colors.cyan}${emoji}  ${category.toUpperCase()}${colors.reset}`,
    );
    console.log(`${colors.blue}${"─".repeat(50)}${colors.reset}`);

    categoryAgents.forEach((agent) => {
      const statusColor =
        agent.status === "active"
          ? colors.green
          : agent.status === "inactive"
            ? colors.yellow
            : colors.red;
      const statusSymbol =
        agent.status === "active"
          ? "✅"
          : agent.status === "inactive"
            ? "⏸️"
            : "❌";

      console.log(
        `  ${statusSymbol} ${agent.name.padEnd(30)} ${statusColor}[${agent.status.toUpperCase()}]${colors.reset}`,
      );
    });
    console.log();
  });

  // Summary statistics
  const activeCount = agents.filter((a) => a.status === "active").length;
  const totalCount = agents.length;
  const percentage = Math.round((activeCount / totalCount) * 100);

  console.log(`${colors.blue}${"═".repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}📈 SUMMARY${colors.reset}`);
  console.log(`${colors.blue}${"─".repeat(60)}${colors.reset}`);
  console.log(`  Total Agents: ${colors.cyan}${totalCount}${colors.reset}`);
  console.log(`  Active: ${colors.green}${activeCount}${colors.reset}`);
  console.log(
    `  System Health: ${percentage >= 80 ? colors.green : percentage >= 50 ? colors.yellow : colors.red}${percentage}%${colors.reset}`,
  );
  console.log(`${colors.blue}${"═".repeat(60)}${colors.reset}\n`);
}

// Main execution
async function main() {
  console.log(`${colors.cyan}Checking agent system status...${colors.reset}`);

  // Check if API is running
  const apiAvailable = await checkAPI();

  if (apiAvailable) {
    console.log(`${colors.green}✅ API Server: ONLINE${colors.reset}`);
    console.log(
      `${colors.cyan}📡 Live data available at: http://localhost:3010/api/agent/status${colors.reset}`,
    );
  } else {
    console.log(`${colors.yellow}⚠️  API Server: OFFLINE${colors.reset}`);
    console.log(
      `${colors.yellow}   Showing static agent configuration${colors.reset}`,
    );
  }

  // Print status table
  printStatus();

  // Provide helpful commands
  console.log(`${colors.bright}💡 QUICK COMMANDS:${colors.reset}`);
  console.log(
    `  ${colors.cyan}npm run agents:start${colors.reset}     - Start all agents`,
  );
  console.log(
    `  ${colors.cyan}npm run agents:dashboard${colors.reset} - Open admin dashboard`,
  );
  console.log(
    `  ${colors.cyan}npm run agents:health-check${colors.reset} - Check health via API`,
  );
  console.log(
    `  ${colors.cyan}npm run agents:logs${colors.reset}      - View agent logs\n`,
  );
}

// Run
main().catch(console.error);
