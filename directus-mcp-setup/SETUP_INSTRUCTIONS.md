# Directus MCP Setup Instructions

> **Ready to Use**: Your Directus MCP integration setup is complete and ready for configuration!

## ✅ What's Been Created

### 📁 Complete Setup Package
- **`README.md`** - Comprehensive setup and usage guide
- **`setup-directus-mcp.sh`** - Automated setup script  
- **`directus-mcp-config.yaml`** - Configuration templates and examples
- **`.claude/commands/directus-mcp.md`** - Claude slash command reference
- **`SETUP_INSTRUCTIONS.md`** - This file with next steps

### 🛠️ Ready-to-Run Setup Options

## Option 1: Quick Setup (Recommended)

If you have a Directus instance and API token ready:

```bash
# Set your Directus credentials
export DIRECTUS_URL="https://your-directus-instance.com"
export DIRECTUS_TOKEN="your-api-token"

# Add Directus MCP server to Claude (one command)
claude mcp add directus -e DIRECTUS_URL=$DIRECTUS_URL -e DIRECTUS_TOKEN=$DIRECTUS_TOKEN npx @directus/content-mcp@latest

# Verify setup
claude mcp list
claude mcp test directus
```

## Option 2: Interactive Setup

Run the automated setup script which will guide you through:

```bash
cd directus-mcp-setup
./setup-directus-mcp.sh
```

The script will:
- ✅ Check prerequisites (Node.js v22.12+, Claude CLI)
- 🔧 Guide you through Directus configuration
- 🧪 Test your Directus connection
- 📦 Install the official Directus MCP package
- ⚙️ Configure Claude MCP integration
- 📚 Create usage examples and environment files

## Option 3: Manual Configuration

1. **Install Directus MCP Package**:
   ```bash
   npm install -g @directus/content-mcp@latest
   ```

2. **Get Your Directus API Token**:
   - Go to your Directus Admin panel
   - Navigate to Settings → Access Tokens
   - Create new token with required permissions
   - Copy the token

3. **Configure Claude MCP**:
   ```bash
   claude mcp add directus -e DIRECTUS_URL=https://your-instance.com -e DIRECTUS_TOKEN=your-token npx @directus/content-mcp@latest
   ```

## 🎯 First Steps After Setup

Once you have Directus MCP configured, try these commands:

### Test Basic Connection
```bash
# Verify MCP integration
claude "List all collections available in my Directus instance"

# Check recent content
claude "Show me the 5 most recently created items across all collections in Directus"
```

### Create Your First AI-Managed Content
```bash
# Create a blog post
claude "Create a welcome blog post in Directus titled 'Hello from AI Content Management' with engaging content and proper SEO metadata"

# Create a simple page
claude "Create an About Us page in Directus with placeholder content that I can customize later"
```

### Multi-Agent Content Workflow
```bash
# 1. Claude creates content strategy
claude "Analyze my current Directus content and suggest 5 new blog post topics that would complement existing content"

# 2. Use Codex for technical review (if you have codex MCP set up)
claude "Use the codex tool to review these blog post ideas for SEO potential and technical feasibility"

# 3. Claude implements the approved ideas
claude "Based on the review, create draft blog posts in Directus for the 3 most promising topics"
```

## 🔧 Available Commands

Use the Claude slash command for quick reference:
```bash
/directus-mcp
```

This will show you:
- Setup verification commands
- Content management examples
- Multi-agent collaboration workflows
- Troubleshooting steps

## 📚 What You Can Do Now

### Content Management
- **Create**: Blog posts, products, pages, any content type
- **Update**: Existing content with AI optimization
- **Query**: Find and filter content based on any criteria
- **Organize**: Manage files, folders, and content structure

### Schema Management
- **Design**: New content types and collections
- **Modify**: Add fields, update validation rules
- **Optimize**: Improve database structure and relationships

### Multi-Agent Workflows
- **Content Strategy**: Claude analyzes, Codex reviews, implementation follows
- **SEO Optimization**: AI-powered content optimization and technical review
- **Quality Assurance**: Automated content audits and improvements

### Automation
- **Batch Operations**: Update multiple items at once
- **Content Migration**: Move content between environments
- **Workflow Automation**: Set up content approval and publishing flows

## 🚨 Important Notes

### Security
- **Keep tokens secure**: Never commit API tokens to version control
- **Use environment variables**: Store credentials in `.env` files (excluded from git)
- **Rotate tokens**: Regularly update API tokens for security
- **Limit permissions**: Use minimum required permissions for tokens

### Production Safety
Consider disabling dangerous operations in production:
```bash
claude mcp add directus-prod -e DIRECTUS_URL=$PROD_URL -e DIRECTUS_TOKEN=$PROD_TOKEN -e DISABLED_TOOLS="delete_item,delete_collection,delete_user,delete_file" npx @directus/content-mcp@latest
```

### Monitoring
- Monitor AI-generated content for quality and accuracy
- Set up content approval workflows in Directus
- Regular audits of automated content changes

## 🆘 Troubleshooting

### Connection Issues
```bash
# Test Directus directly
curl -H "Authorization: Bearer $DIRECTUS_TOKEN" $DIRECTUS_URL/server/info

# Check Claude MCP status
claude mcp list
claude mcp test directus
claude mcp logs directus
```

### Permission Errors
- Verify token has required permissions in Directus Admin
- Check collection-level permissions for content operations
- Ensure user role includes necessary privileges

### Package Issues
```bash
# Reinstall package
npm uninstall -g @directus/content-mcp
npm install -g @directus/content-mcp@latest

# Verify installation
npx @directus/content-mcp@latest --help
```

## 🎉 You're Ready!

Your Directus MCP integration is fully set up and ready to use! This brings AI-powered content management to your workflow with:

- ✅ **Official Directus MCP server** for reliable integration
- 🤖 **Multi-agent collaboration** with Claude + Codex workflows
- 🔧 **Complete automation** for setup and configuration
- 📚 **Comprehensive documentation** and examples
- 🛡️ **Security best practices** and safety configurations

Start with simple content operations and gradually explore the advanced multi-agent workflows for maximum productivity!

---

*Part of the MCP Collaboration Factory - Human-centered AI workflows following ONE® system principles*