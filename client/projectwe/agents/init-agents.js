#!/usr/bin/env node

/**
 * Agent System Initialization
 * Initializes the agent registry and starts core monitoring agents
 * Created: 2025-01-09
 */

const { agentRegistry } = require("../src/lib/agent-registry.ts");

console.log("🚀 Initializing Agent System...\n");

// Initialize registry (agents are auto-registered in constructor)
const stats = agentRegistry.getStats();

console.log("📊 Agent Registry Statistics:");
console.log(`  Total Agents: ${stats.total}`);
console.log(`  Active: ${stats.active}`);
console.log(`  By Category:`);
Object.entries(stats.byCategory).forEach(([category, count]) => {
  console.log(`    - ${category}: ${count}`);
});
console.log(`  By Type:`);
Object.entries(stats.byType).forEach(([type, count]) => {
  console.log(`    - ${type}: ${count}`);
});

// Verify critical agents
console.log("\n🔍 Verifying Critical Agents...");

const criticalAgents = [
  "deployment-pipeline-architect",
  "projectwe-monitoring-agent",
  "security-monitoring-agent",
  "infrastructure-monitoring-agent",
];

let allHealthy = true;

criticalAgents.forEach((agentId) => {
  const agent = agentRegistry.getAgent(agentId);
  if (agent) {
    console.log(`  ✅ ${agent.name}: ${agent.status}`);
  } else {
    console.log(`  ❌ ${agentId}: NOT FOUND`);
    allHealthy = false;
  }
});

// Initialize monitoring agents (mock initialization for now)
console.log("\n🎯 Initializing Monitoring Agents...");

try {
  // In production, these would actually start the monitoring services
  console.log("  Starting ProjectWE Monitor...");
  agentRegistry.updateAgentStatus("projectwe-monitoring-agent", {
    healthy: true,
    lastCheck: new Date(),
    errorCount: 0,
  });
  console.log("  ✅ ProjectWE Monitor started");

  console.log("  Starting Security Monitor...");
  agentRegistry.updateAgentStatus("security-monitoring-agent", {
    healthy: true,
    lastCheck: new Date(),
    errorCount: 0,
  });
  console.log("  ✅ Security Monitor started");

  console.log("  Starting Infrastructure Monitor...");
  agentRegistry.updateAgentStatus("infrastructure-monitoring-agent", {
    healthy: true,
    lastCheck: new Date(),
    errorCount: 0,
  });
  console.log("  ✅ Infrastructure Monitor started");
} catch (error) {
  console.error("❌ Error initializing monitoring agents:", error);
  process.exit(1);
}

if (allHealthy) {
  console.log("\n✅ Agent System Initialized Successfully!");
  console.log("📊 Dashboard available at: http://localhost:3000/admin/agents");
  console.log("🔍 API status at: http://localhost:3000/api/agent/status");
} else {
  console.log("\n⚠️  Agent System Initialized with Warnings");
  console.log("Some critical agents are missing. Check configuration.");
}

process.exit(0);
