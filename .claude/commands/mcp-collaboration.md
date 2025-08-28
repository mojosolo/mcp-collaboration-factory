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

## React Review Prompts

- Draft: "Create an accessible, paginated DataTable in React + TypeScript with sorting, filtering, keyboard navigation (Enter/Space/Arrows/Home/End), and ARIA. Include a minimal `DataTable.css`."
- Review (a11y): "Use the codex tool to review `examples/react/DataTable.tsx` for WCAG 2.1 and ARIA: header semantics, `aria-sort` (ascending/descending/none), `aria-rowcount`/`aria-rowindex`, focus order, Enter/Space activation for rows, and appropriate `aria-live` regions for dynamic updates. Suggest a concise patch."
- Review (perf/TS): "Use the codex tool to assess memoization, stable handler dependencies, refs vs state for DOM access, `useMemo` keys, key props, and tighten `DataRow`/`Column` types. Recommend improvements and potential virtualization approach for large datasets."
- Improve: "Based on Codex’s review, refactor `DataTable.tsx` to fix a11y/perf issues, add `React.memo` where helpful, and improve types. Return a unified diff only."
- Validate: "Generate React Testing Library tests to cover: `aria-sort` changes, live region announcements for sort, keyboard navigation across headers/rows, pagination enable/disable states, and filter resets page to 1."

Quick start files are in `examples/react/`: `DataTable.tsx`, `DataTable.css`, `App.tsx`, and `DataTable.test.tsx`.
