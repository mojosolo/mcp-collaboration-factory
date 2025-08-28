# Multi-Agent MCP Collaboration Demo

> **ONE® System Implementation**: Human-centered AI collaboration through Model Context Protocol

## Overview

This project demonstrates how to set up collaborative workflows between **Claude Code (Opus)** and **OpenAI Codex (GPT-5)** using the Model Context Protocol (MCP). The goal is to create a human-centric development environment where multiple AI agents can work together to reduce cognitive load and improve code quality.

## ONE® System Principles Applied

### 1. Human-Centered Design
- **Reduced Cognitive Load**: AI agents handle complex analysis while humans orchestrate
- **Adaptive Workflows**: Collaboration patterns adjust to user needs and context
- **Simplified Complexity**: Multi-agent review cycles made accessible through MCP

### 2. Variable-Based Architecture
- **Fluid Collaboration**: Agents can switch roles based on task requirements
- **Contextual Adaptation**: Workflows respond to changing development stages
- **Shared State Management**: MCP enables seamless context sharing between agents

### 3. Content-Driven Development
- **Purpose-Driven Collaboration**: Each agent's strengths leveraged for specific tasks
- **Iterative Improvement**: Code quality enhanced through multi-perspective review
- **Knowledge Synthesis**: Combining Claude's reasoning with GPT's execution capabilities

## Setup Instructions

### Prerequisites
- Claude CLI installed and authenticated
- Codex CLI installed and authenticated
- Node.js/npm for MCP server tools

### 1. Install Codex CLI
```bash
# Install latest Codex CLI
curl -fsSL https://codex.ai/install.sh | sh

# Authenticate with your OpenAI API key
codex auth
```

### 2. Add Codex as MCP Tool to Claude

#### Option A: Direct Codex MCP Mode
```bash
claude mcp add codex -s user -- codex -m gpt-5 --model_reasoning_effort=high mcp
```

#### Option B: Using codex-mcp Package
```bash
claude mcp add codex-data -e CODEX_API_KEY=$CODEX_API_KEY npx @codex-data/codex-mcp claude
```

#### Option C: Using codex-as-mcp
```bash
claude mcp add codex-as-mcp -- uvx codex-as-mcp@latest
```

### 3. Verify MCP Connection
```bash
claude mcp list
```

You should see `codex` or similar in the list of available MCP tools.

## Collaboration Workflows

### Workflow 1: Draft → Review → Iterate
1. **Claude Opus**: Draft initial solution
2. **Codex GPT-5**: Review and suggest improvements
3. **Claude Opus**: Integrate feedback and refine
4. **Repeat** until solution meets quality standards

### Workflow 2: Shared Document Collaboration
1. Create implementation plan in Markdown
2. **Claude**: Write initial draft
3. **Codex**: Open file, add comments/suggestions
4. **Claude**: Respond to feedback
5. **Iterate** through shared context

### Workflow 3: Multi-Agent Code Review
1. **Claude**: Generate code with reasoning
2. **Codex**: Execute `codex_review()` on the code
3. **Claude**: Process review feedback
4. **Codex**: Execute `codex_execute()` for testing
5. **Claude**: Final integration and documentation

## Example Commands

### Basic Codex Tool Usage
```bash
# Within Claude, you can now invoke:
codex_execute("Review this Python function for PEP 8 compliance", work_dir)
codex_review("Analyze this React component for accessibility issues")
```

### Orchestrated Collaboration
```bash
# 1. Claude drafts solution
claude "Draft a Python function to process CSV data with error handling"

# 2. Switch to Codex for review
claude "Use the codex tool to review the previous solution and suggest improvements"

# 3. Claude integrates feedback
claude "Based on Codex's review, improve the CSV processing function"
```

## Project Structure

```
factory/
├── README.md                 # This file
├── .claude/                 # Claude configuration
│   └── commands/           # Slash commands for MCP workflows
├── examples/               # Collaboration examples
│   ├── python/            # Python code collaboration
│   ├── react/             # React component collaboration
│   └── workflows/         # MCP workflow templates
├── mcp-servers/           # MCP server configurations
└── docs/                  # Documentation and guides
```

## Benefits of This Approach

### For Developers
- **Reduced Cognitive Load**: AI agents handle complex analysis
- **Quality Assurance**: Multi-perspective code review
- **Learning Opportunity**: See how different models approach problems
- **Efficient Iteration**: Faster feedback loops

### For Teams
- **Consistent Code Quality**: Standardized review processes
- **Knowledge Sharing**: AI agents can document reasoning
- **Scalable Collaboration**: MCP enables team-wide AI tool access

### For Projects
- **Better Architecture**: Multiple AI perspectives on design decisions
- **Faster Development**: Automated review and testing
- **Documentation**: AI-generated explanations and guides

## Troubleshooting

### Common Issues
1. **MCP Connection Failed**: Check API keys and CLI authentication
2. **Tool Not Found**: Verify MCP server is running and properly registered
3. **Permission Errors**: Ensure proper MCP tool permissions

### Debug Commands
```bash
# Check MCP status
claude mcp list

# Test MCP connection
claude mcp test codex

# View MCP logs
claude mcp logs
```

## Next Steps

1. **Set up MCP tools** using the commands above
2. **Test basic collaboration** with simple code examples
3. **Explore advanced workflows** for your specific use cases
4. **Customize collaboration patterns** based on your team's needs

## Contributing

This demo project follows the ONE® system principles. When contributing:
- Maintain human-centered design
- Keep solutions simple and structured
- Document collaboration patterns
- Test MCP workflows thoroughly

---

*Built with ❤️ following ONE® system principles for human-centric AI collaboration*
