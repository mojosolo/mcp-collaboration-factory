# 🚀 MCP Collaboration Quick Start Guide

> **Get up and running with Claude + Codex collaboration in 5 minutes!**

## ⚡ Quick Setup (5 minutes)

### 1. Run the Setup Script
```bash
# Make the script executable and run it
chmod +x setup-mcp.sh
./setup-mcp.sh
```

The script will automatically:
- ✅ Check prerequisites
- ✅ Install Codex CLI if needed
- ✅ Authenticate with OpenAI
- ✅ Configure MCP tools
- ✅ Create sample files
- ✅ Verify the setup

### 2. Test Your Setup
```bash
python test_collaboration.py
```

You should see: `🎉 Setup verification successful!`

## 🎯 Start Collaborating Right Now

### Basic Collaboration Cycle
```bash
# 1. Claude drafts a solution
claude "Create a Python function to validate email addresses with proper error handling"

# 2. Codex reviews it
claude "Use the codex tool to review the previous email validation function for security and best practices"

# 3. Claude improves it
claude "Based on Codex's review, improve the email validation function"
```

### Use the Slash Command
Type `/mcp-collaboration` in Claude to get quick reference commands.

## 🔧 Manual Setup (if script fails)

### Install Codex CLI
```bash
curl -fsSL https://codex.ai/install.sh | sh
codex auth
```

### Add Codex to Claude
```bash
# Option 1: Direct mode (recommended)
claude mcp add codex -s user -- codex -m gpt-5 mcp

# Option 2: Using package
claude mcp add codex-data -e CODEX_API_KEY=$CODEX_API_KEY npx @codex-data/codex-mcp claude
```

### Verify Setup
```bash
claude mcp list
claude mcp test codex
```

## 📚 What You Can Do Now

### 1. **Code Review Collaboration**
- Claude writes code → Codex reviews → Claude improves
- Perfect for catching bugs, security issues, and performance problems

### 2. **Multi-Perspective Problem Solving**
- Claude handles reasoning and architecture
- Codex provides technical validation and testing
- You orchestrate the collaboration

### 3. **Quality Assurance**
- Automated code review through AI collaboration
- Consistent quality standards across projects
- Reduced debugging time

## 🎨 Example Workflows

### Frontend Development
```
Claude: "Create a React component for user profile editing"
Codex: "Review for accessibility and React best practices"
Claude: "Implement accessibility improvements"
Codex: "Validate final component"
```

### Backend Development
```
Claude: "Design a REST API for user management"
Codex: "Review for security and scalability"
Claude: "Implement security measures"
Codex: "Test API endpoints and performance"
```

### Data Processing
```
Claude: "Create a CSV processing pipeline"
Codex: "Review for memory efficiency and error handling"
Claude: "Optimize memory usage and add error handling"
Codex: "Validate with large file testing"
```

## 🆘 Need Help?

### Check MCP Status
```bash
claude mcp list          # List available tools
claude mcp test codex    # Test Codex connection
claude mcp logs          # View error logs
```

### Common Issues
- **"Tool not found"** → Run `claude mcp list` to verify
- **"Connection failed"** → Check your OpenAI API key
- **"Permission denied"** → Ensure proper MCP tool setup

### Resources
- 📖 **README.md** - Complete documentation
- 🔧 **mcp-config.yaml** - Configuration options
- 📋 **examples/workflows/** - Workflow templates
- 💬 **.claude/commands/** - Quick reference commands

## 🎉 You're Ready!

Your MCP collaboration environment is now set up. Start with simple collaborations and gradually explore more complex workflows.

**Remember**: You're the conductor of this AI orchestra. Claude and Codex are your talented musicians - you decide when and how they collaborate!

---

*Built with ❤️ following ONE® system principles for human-centered AI collaboration*
