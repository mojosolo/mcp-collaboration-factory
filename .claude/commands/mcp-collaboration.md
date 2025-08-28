---
name: MCP Collaboration
description: Set up and manage MCP collaboration between Claude and Codex
---

# MCP Collaboration Command

This command helps you set up and manage collaborative workflows between Claude Code (Opus) and OpenAI Codex (GPT-5) using the Model Context Protocol.

## Quick Setup

### 1. Install Codex CLI
```bash
curl -fsSL https://codex.ai/install.sh | sh
codex auth
```

### 2. Add Codex as MCP Tool
```bash
# Option A: Direct MCP mode
claude mcp add codex -s user -- codex -m gpt-5 --model_reasoning_effort=high mcp

# Option B: Using codex-mcp package
claude mcp add codex-data -e CODEX_API_KEY=$CODEX_API_KEY npx @codex-data/codex-mcp claude

# Option C: Using codex-as-mcp
claude mcp add codex-as-mcp -- uvx codex-as-mcp@latest
```

### 3. Verify Connection
```bash
claude mcp list
```

## Collaboration Workflows

### Draft → Review → Iterate
1. **Claude**: Generate initial solution
2. **Codex**: Review and suggest improvements  
3. **Claude**: Integrate feedback and refine
4. **Repeat** until quality standards met

### Shared Document Workflow
1. Create implementation plan in Markdown
2. **Claude**: Write initial draft
3. **Codex**: Add comments/suggestions
4. **Claude**: Respond to feedback
5. **Iterate** through shared context

### Multi-Agent Code Review
1. **Claude**: Generate code with reasoning
2. **Codex**: Execute `codex_review()` analysis
3. **Claude**: Process review feedback
4. **Codex**: Execute `codex_execute()` testing
5. **Claude**: Final integration

## Example Usage

```bash
# Basic collaboration
claude "Draft a Python function for CSV processing"
claude "Use codex tool to review and improve the function"

# Advanced workflows
claude "Generate React component, then have Codex review for accessibility"
claude "Create Python workflow, Codex review for PEP 8, then integrate feedback"
```

## Troubleshooting

```bash
# Check MCP status
claude mcp list

# Test connection
claude mcp test codex

# View logs
claude mcp logs
```
