# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is an **MCP (Model Context Protocol) Collaboration Demo** that demonstrates human-orchestrated AI collaboration between Claude Code (Opus) and OpenAI Codex (GPT-5). The project implements ONE® system principles for human-centered AI collaboration, focusing on reducing cognitive load while maintaining human control over development workflows.

## Core Architecture

### MCP Collaboration Framework
The repository centers around a **Draft → Review → Iterate** collaboration pattern:
1. **Claude Opus**: Drafts initial solutions with reasoning and documentation
2. **Codex GPT-5**: Reviews code for quality, security, performance, and best practices  
3. **Claude Opus**: Integrates feedback and refines solutions
4. **Human**: Orchestrates the collaboration and makes final decisions

### Key MCP Integration Points
- **MCP Tools**: `codex_review()` and `codex_execute()` functions for code analysis
- **Multi-Agent Workflows**: Defined collaboration patterns in `examples/workflows/`
- **Context Sharing**: Shared state management through MCP for seamless agent handoffs

## Common Commands

### Setup and Configuration
```bash
# One-command setup (recommended first run)
./setup-mcp.sh

# Manual MCP setup
claude mcp add codex -s user -- codex -m gpt-5 --model_reasoning_effort=high mcp
claude mcp list
claude mcp test codex

# Verify setup
python test_collaboration.py
```

### Development Workflow Commands
```bash
# Basic collaboration cycle
claude "Create a [component] that [requirements]"
claude "Use codex tool to review the previous solution for [criteria]"  
claude "Based on Codex's review, improve the [component]"

# Advanced collaboration patterns
claude "Generate [code], then have Codex review for [specific concerns]"
claude "Use the codex tool to validate the improved solution"
```

### Troubleshooting
```bash
# MCP status and debugging
claude mcp list          # List available MCP tools
claude mcp test codex    # Test Codex connection  
claude mcp logs          # View error logs
claude mcp restart codex # Restart MCP server

# Authentication checks
codex auth --check       # Verify Codex authentication
codex config get api_key # Check API key status
```

## Multi-Agent Collaboration Patterns

### Architecture Philosophy
The system implements **Variable-Based Architecture** where AI agents can fluidly switch roles based on task requirements. Claude handles creative problem-solving and integration while Codex provides technical validation and testing, with humans orchestrating the collaboration.

### Workflow Templates (examples/workflows/)
- **Basic Cycle**: Draft → Review → Iterate → Validate
- **Security-First**: Implement → Security Audit → Fix → Penetration Test → Harden
- **Performance Optimization**: Baseline → Profile → Optimize → Test → Document
- **Architecture Review**: Design → Scalability Review → Refine → Validate → Finalize

### MCP Tool Functions
- `codex_review(prompt, work_dir)`: Code review for quality, security, best practices
- `codex_execute(prompt, work_dir)`: Code execution, testing, and validation

## Project Structure

```
factory/
├── setup-mcp.sh                 # Automated MCP setup script
├── mcp-config.yaml              # MCP server configuration options
├── test_collaboration.py        # Setup verification script
├── .claude/commands/            # Claude Code slash commands
│   └── mcp-collaboration.md    # Quick reference command
├── examples/                    # Collaboration demonstrations
│   ├── python/csv_processor.py # Python collaboration example
│   ├── react/DataTable.tsx     # React component example  
│   └── workflows/              # MCP workflow templates
└── docs/                       # Documentation and guides
```

## Development Environment

### Prerequisites and Setup
- **Claude CLI**: Required for MCP orchestration
- **Codex CLI**: Required for GPT-5 integration (`curl -fsSL https://codex.ai/install.sh | sh`)
- **OpenAI API Key**: For Codex authentication
- **Node.js**: Optional, for MCP package-based setups

### MCP Server Options
The project supports multiple MCP integration approaches with fallback mechanisms:
1. **Direct Codex MCP** (recommended): `codex -m gpt-5 --model_reasoning_effort=high mcp`
2. **codex-mcp package**: `npx @codex-data/codex-mcp claude`
3. **codex-as-mcp**: `uvx codex-as-mcp@latest`

## ONE® System Integration

### Human-Centered Design
- **Reduced Cognitive Load**: AI agents handle complex analysis and iteration
- **Adaptive Workflows**: Collaboration patterns adjust to project needs and development stages
- **Human Orchestration**: Developers control when and how AI agents collaborate

### Content-Driven Development  
- **Purpose-Driven Collaboration**: Each agent's strengths leveraged for specific tasks
- **Iterative Improvement**: Multi-perspective review cycles enhance code quality
- **Knowledge Synthesis**: Combining Claude's reasoning with GPT's execution capabilities

## Success Metrics and Quality Gates

### Code Quality Indicators
- Reduced technical debt through multi-agent review
- Improved maintainability scores via standardized patterns
- Fewer security vulnerabilities through dedicated security review cycles
- Better performance characteristics via optimization workflows

### Collaboration Effectiveness
- Faster iteration cycles through automated review processes
- Reduced debugging time via early issue detection
- Better documentation quality through AI-generated explanations
- Improved learning outcomes through exposed reasoning processes

## Important Notes

- **Human Control**: You maintain orchestration control - AI agents are tools, not decision-makers
- **Context Preservation**: Use shared files for complex collaborations to maintain conversation history
- **Quality Gates**: Define acceptance criteria upfront and use Codex for objective validation
- **Iterative Approach**: Start with working solutions, then optimize through collaboration cycles
- **Fallback Mechanisms**: Multiple MCP setup options ensure reliability across different environments