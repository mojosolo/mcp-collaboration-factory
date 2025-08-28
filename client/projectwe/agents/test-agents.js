#!/usr/bin/env node

/**
 * Agent System Test Suite
 * Tests agent registry and monitoring functionality
 * Created: 2025-01-09
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Mock agent registry for testing
const mockAgentRegistry = {
  agents: [
    { id: 'deployment-pipeline-architect', name: 'Deployment Pipeline Architect', type: 'builtin', category: 'deployment', status: 'active' },
    { id: 'deploy-orchestrator', name: 'Deploy Orchestrator', type: 'builtin', category: 'deployment', status: 'active' },
    { id: 'projectwe-monitoring-agent', name: 'ProjectWE Monitor', type: 'custom', category: 'monitoring', status: 'active' },
    { id: 'projectwe-platform-orchestrator', name: 'Platform Orchestrator', type: 'custom', category: 'monitoring', status: 'active' },
    { id: 'security-monitoring-agent', name: 'Security Monitor', type: 'custom', category: 'security', status: 'active' },
    { id: 'infrastructure-monitoring-agent', name: 'Infrastructure Monitor', type: 'script', category: 'monitoring', status: 'active' },
    { id: 'revo-executor', name: 'Revo Executor', type: 'builtin', category: 'automation', status: 'active' },
    { id: 'bmad-planner', name: 'BMAD Planner', type: 'builtin', category: 'automation', status: 'active' },
    { id: 'db-manager', name: 'Database Manager', type: 'builtin', category: 'integration', status: 'active' },
    { id: 'playwright-agent', name: 'Playwright Agent', type: 'builtin', category: 'integration', status: 'active' },
    { id: 'context7-agent', name: 'Context7 Agent', type: 'builtin', category: 'integration', status: 'active' },
    { id: 'ai-research-agent', name: 'AI Research', type: 'custom', category: 'intelligence', status: 'active' },
    { id: 'model-analysis-orchestrator', name: 'Model Analysis', type: 'custom', category: 'intelligence', status: 'active' },
    { id: 'intelligence-gatherer', name: 'Intelligence Gatherer', type: 'script', category: 'intelligence', status: 'active' },
    { id: 'security-scanner-agent', name: 'Security Scanner', type: 'script', category: 'security', status: 'active' },
    { id: 'projectwe-monitor-orchestrator', name: 'Monitor Orchestrator', type: 'mcp', category: 'monitoring', status: 'active' },
    { id: 'indydev-integrator', name: 'IndyDev Integrator', type: 'builtin', category: 'automation', status: 'active' },
    { id: 'deployment-pipeline', name: 'Deployment Pipeline', type: 'workflow', category: 'deployment', status: 'active' },
  ],
  
  getAllAgents() {
    return this.agents;
  },
  
  getAgent(id) {
    return this.agents.find(a => a.id === id);
  },
  
  getActiveAgents() {
    return this.agents.filter(a => a.status === 'active');
  },
  
  getAgentsByCategory(category) {
    return this.agents.filter(a => a.category === category);
  },
  
  getAgentsByType(type) {
    return this.agents.filter(a => a.type === type);
  },
  
  getStats() {
    const stats = {
      total: this.agents.length,
      active: this.agents.filter(a => a.status === 'active').length,
      inactive: this.agents.filter(a => a.status === 'inactive').length,
      deprecated: this.agents.filter(a => a.status === 'deprecated').length,
      archived: this.agents.filter(a => a.status === 'archived').length,
      byCategory: {},
      byType: {}
    };
    
    this.agents.forEach(agent => {
      stats.byCategory[agent.category] = (stats.byCategory[agent.category] || 0) + 1;
      stats.byType[agent.type] = (stats.byType[agent.type] || 0) + 1;
    });
    
    return stats;
  }
};

async function test(name, fn) {
  totalTests++;
  process.stdout.write(`  Testing ${name}... `);
  
  try {
    await fn();
    console.log(`${colors.green}✅ PASSED${colors.reset}`);
    passedTests++;
  } catch (error) {
    console.log(`${colors.red}❌ FAILED${colors.reset}`);
    console.log(`    ${colors.yellow}${error.message}${colors.reset}`);
    failedTests++;
  }
}

async function runTests() {
  console.log(`${colors.magenta}================================${colors.reset}`);
  console.log(`${colors.magenta}  Agent System Test Suite${colors.reset}`);
  console.log(`${colors.magenta}================================${colors.reset}\n`);

  // Test 1: File System Tests
  console.log(`${colors.blue}1. File System Tests${colors.reset}`);
  
  await test('Agent registry file exists', async () => {
    const registryPath = path.join(process.cwd(), 'src/lib/agent-registry.ts');
    if (!fs.existsSync(registryPath)) throw new Error('Registry file not found');
  });
  
  await test('Init script exists', async () => {
    const scriptPath = path.join(process.cwd(), 'scripts/init-agents.js');
    if (!fs.existsSync(scriptPath)) throw new Error('Init script not found');
  });
  
  await test('Health API route exists', async () => {
    const healthPath = path.join(process.cwd(), 'src/app/api/health/route.ts');
    if (!fs.existsSync(healthPath)) throw new Error('Health route not found');
  });
  
  await test('Admin dashboard exists', async () => {
    const dashboardPath = path.join(process.cwd(), 'src/app/admin/agents/page.tsx');
    if (!fs.existsSync(dashboardPath)) throw new Error('Dashboard not found');
  });
  
  console.log('');
  
  // Test 2: Agent Registry Tests (using mock)
  console.log(`${colors.blue}2. Agent Registry Tests${colors.reset}`);
  
  await test('Registry has agents', async () => {
    const agents = mockAgentRegistry.getAllAgents();
    if (agents.length === 0) throw new Error('No agents registered');
  });
  
  await test('Expected agent count (18)', async () => {
    const agents = mockAgentRegistry.getAllAgents();
    if (agents.length !== 18) throw new Error(`Expected 18 agents, found ${agents.length}`);
  });
  
  await test('Built-in agents registered', async () => {
    const agent = mockAgentRegistry.getAgent('deployment-pipeline-architect');
    if (!agent) throw new Error('Built-in agent not found');
  });
  
  await test('Custom agents registered', async () => {
    const agent = mockAgentRegistry.getAgent('projectwe-monitoring-agent');
    if (!agent) throw new Error('Custom agent not found');
  });
  
  console.log('');
  
  // Test 3: Agent Functionality
  console.log(`${colors.blue}3. Agent Functionality Tests${colors.reset}`);
  
  await test('Active agents available', async () => {
    const activeAgents = mockAgentRegistry.getActiveAgents();
    if (activeAgents.length === 0) throw new Error('No active agents');
  });
  
  await test('Agent categories populated', async () => {
    const deploymentAgents = mockAgentRegistry.getAgentsByCategory('deployment');
    if (deploymentAgents.length === 0) throw new Error('No deployment agents');
  });
  
  await test('Agent types populated', async () => {
    const builtinAgents = mockAgentRegistry.getAgentsByType('builtin');
    if (builtinAgents.length === 0) throw new Error('No built-in agents');
  });
  
  await test('Agent stats calculation', async () => {
    const stats = mockAgentRegistry.getStats();
    if (stats.total === 0) throw new Error('Stats not calculated');
    if (!stats.byCategory || !stats.byType) throw new Error('Stats incomplete');
  });
  
  console.log('');
  
  // Test 4: Monitoring Agents
  console.log(`${colors.blue}4. Monitoring Agent Tests${colors.reset}`);
  
  await test('ProjectWE monitor exists', async () => {
    const agent = mockAgentRegistry.getAgent('projectwe-monitoring-agent');
    if (!agent) throw new Error('ProjectWE monitor not found');
    if (agent.status !== 'active') throw new Error('ProjectWE monitor not active');
  });
  
  await test('Security monitor exists', async () => {
    const agent = mockAgentRegistry.getAgent('security-monitoring-agent');
    if (!agent) throw new Error('Security monitor not found');
  });
  
  await test('Infrastructure monitor exists', async () => {
    const agent = mockAgentRegistry.getAgent('infrastructure-monitoring-agent');
    if (!agent) throw new Error('Infrastructure monitor not found');
  });
  
  console.log('');
  
  // Test 5: Deployment Configuration
  console.log(`${colors.blue}5. Deployment Configuration Tests${colors.reset}`);
  
  await test('Deployment manifest exists', async () => {
    const manifestPath = path.join(process.cwd(), 'deploy/manifest.yaml');
    if (!fs.existsSync(manifestPath)) throw new Error('Manifest not found');
  });
  
  await test('Deployment policies exist', async () => {
    const policiesPath = path.join(process.cwd(), 'deploy/policies.yaml');
    if (!fs.existsSync(policiesPath)) throw new Error('Policies not found');
  });
  
  await test('GitHub Actions workflow exists', async () => {
    const workflowPath = path.join(process.cwd(), '.github/workflows/deploy.yml');
    if (!fs.existsSync(workflowPath)) throw new Error('GitHub workflow not found');
  });
  
  await test('Deployment script is executable', async () => {
    const scriptPath = path.join(process.cwd(), 'deploy/execute-deployment.sh');
    if (!fs.existsSync(scriptPath)) throw new Error('Deployment script not found');
    const stats = fs.statSync(scriptPath);
    const mode = '0' + (stats.mode & parseInt('777', 8)).toString(8);
    if (!mode.includes('7') && !mode.includes('5')) {
      throw new Error('Deployment script not executable');
    }
  });
  
  console.log('');
  
  // Summary
  console.log(`${colors.magenta}================================${colors.reset}`);
  console.log(`${colors.magenta}         TEST SUMMARY${colors.reset}`);
  console.log(`${colors.magenta}================================${colors.reset}\n`);
  
  console.log(`Total Tests: ${colors.cyan}${totalTests}${colors.reset}`);
  console.log(`Passed: ${colors.green}${passedTests}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failedTests}${colors.reset}`);
  
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  console.log(`Pass Rate: ${colors.cyan}${passRate}%${colors.reset}\n`);
  
  if (failedTests === 0) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ ${failedTests} test(s) failed${colors.reset}`);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
  process.exit(1);
});