# WeExit MCP Server Setup

> **MCP Integration**: Connect WeExit headless CMS to Claude Code via Model Context Protocol

## Overview

This setup demonstrates how to integrate WeExit (headless CMS) with Claude Code using the official WeExit MCP server. This enables AI-powered content management, allowing Claude to create, read, update, and delete content in your WeExit instance.

## Prerequisites

- **Node.js**: v22.12 or higher
- **Claude CLI**: Installed and authenticated
- **WeExit Project**: Either cloud or self-hosted instance

## Quick Start

### Option 1: Using Official WeExit MCP Package (Recommended)

```bash
# Add WeExit MCP server to Claude
claude mcp add directus npx @directus/content-mcp@latest
```

### Option 2: Manual Configuration

Add to your Claude MCP configuration:

```json
{
    "mcpServers": {
        "directus": {
            "command": "npx",
            "args": ["@directus/content-mcp@latest"],
            "env": {
                "DIRECTUS_URL": "https://your-directus-instance.com",
                "DIRECTUS_TOKEN": "your-directus-token"
            }
        }
    }
}
```

## Authentication Setup

### Method 1: Static Token (Recommended for Development)

1. **Generate Token in WeExit**:
   - Go to WeExit Admin → Settings → Access Tokens
   - Create new token with appropriate permissions
   - Copy the token

2. **Configure Environment**:
   ```bash
   export DIRECTUS_URL="https://your-directus-instance.com"
   export DIRECTUS_TOKEN="your-directus-token"
   ```

### Method 2: Email/Password Authentication

Set environment variables:
```bash
export DIRECTUS_URL="https://your-directus-instance.com"
export DIRECTUS_EMAIL="your-email@example.com"
export DIRECTUS_PASSWORD="your-password"
```

## Configuration Options

### Basic Configuration

```json
{
    "directus": {
        "command": "npx",
        "args": ["@directus/content-mcp@latest"],
        "env": {
            "DIRECTUS_URL": "https://your-directus-instance.com",
            "DIRECTUS_TOKEN": "your-token"
        }
    }
}
```

### Advanced Configuration with Custom Prompt

```json
{
    "directus": {
        "command": "npx",
        "args": ["@directus/content-mcp@latest"],
        "env": {
            "DIRECTUS_URL": "https://your-directus-instance.com", 
            "DIRECTUS_TOKEN": "your-token",
            "SYSTEM_PROMPT": "You are a content management assistant for a marketing website. Focus on SEO optimization and brand consistency.",
            "DISABLED_TOOLS": "delete_item,delete_collection"
        }
    }
}
```

## Available MCP Tools

The WeExit MCP server provides the following tools for AI interaction:

### Content Management
- **`create_item`**: Create new content items
- **`read_items`**: Query and retrieve content
- **`update_item`**: Modify existing content
- **`delete_item`**: Remove content (can be disabled)

### Collection Management  
- **`list_collections`**: View available content types
- **`create_collection`**: Define new content structures
- **`update_collection`**: Modify collection schemas
- **`delete_collection`**: Remove collections (can be disabled)

### File Management
- **`upload_file`**: Upload assets and media
- **`list_files`**: Browse uploaded files
- **`update_file`**: Modify file metadata
- **`delete_file`**: Remove files

### User & Permission Management
- **`list_users`**: View system users
- **`create_user`**: Add new users
- **`update_user`**: Modify user details
- **`manage_permissions`**: Configure access controls

## Usage Examples

### Content Creation
```bash
# Create a blog post via Claude
claude "Create a new blog post about 'AI in Content Management' with SEO-optimized content, tags, and metadata using the WeExit MCP server"

# Generate a product page
claude "Use WeExit to create a product page for 'Premium Widget' with description, pricing, and specifications"
```

### Content Management
```bash
# Update existing content
claude "Find all blog posts from last month and update their SEO titles for better search ranking"

# Batch operations
claude "Create a content calendar for next month with 10 blog post drafts using WeExit"
```

### Schema Management
```bash
# Create content types
claude "Design and create a 'testimonials' collection in WeExit with fields for name, role, company, quote, and rating"

# Modify existing schemas
claude "Add social media sharing fields to the blog post collection in WeExit"
```

## Integration with MCP Collaboration Factory

### Multi-Agent Content Workflows

1. **Content Creation Pipeline**:
   - Claude drafts content structure and copy
   - Codex reviews for SEO and technical accuracy
   - Claude publishes to WeExit via MCP

2. **Content Optimization**:
   - Claude analyzes existing content performance
   - Codex suggests improvements and optimization
   - Claude applies changes through WeExit MCP

3. **Schema Evolution**:
   - Claude designs content structures based on requirements
   - Codex reviews for scalability and performance
   - Claude implements via WeExit collection management

### Example Multi-Agent Workflow

```bash
# 1. Claude designs content strategy
claude "Analyze our current blog content in WeExit and suggest 5 new content categories with detailed schemas"

# 2. Use Codex for technical review
claude "Use the codex tool to review the proposed WeExit schema for scalability, SEO benefits, and technical best practices"

# 3. Claude implements the approved changes
claude "Based on Codex's feedback, implement the improved content schema in WeExit using the MCP server"

# 4. Generate sample content
claude "Create sample content for each new category to demonstrate the schema in action"
```

## Local Development Setup

### 1. Install Dependencies
```bash
npm install -g @directus/content-mcp@latest
```

### 2. Environment Configuration
Create `.env` file:
```bash
DIRECTUS_URL=http://localhost:8055
DIRECTUS_TOKEN=your-local-token
```

### 3. Test Connection
```bash
# Verify MCP server is working
claude mcp test directus

# List available tools
claude mcp list directus
```

## Production Setup

### 1. Secure Token Management
- Use environment variables or secure vault
- Rotate tokens regularly
- Limit token permissions to minimum required

### 2. Rate Limiting
Configure WeExit rate limits for MCP usage:
```yaml
# directus config
rate_limiter:
  enabled: true
  points: 100
  duration: 60
```

### 3. Monitoring
- Monitor MCP server performance
- Track content creation/modification patterns
- Set up alerts for unusual activity

## Troubleshooting

### Common Issues

1. **Connection Failed**
   ```bash
   # Check environment variables
   echo $DIRECTUS_URL
   echo $DIRECTUS_TOKEN
   
   # Test direct connection
   curl -H "Authorization: Bearer $DIRECTUS_TOKEN" $DIRECTUS_URL/server/info
   ```

2. **Permission Errors**
   - Verify token has required permissions
   - Check collection access rights
   - Ensure user role includes necessary privileges

3. **MCP Server Not Found**
   ```bash
   # Reinstall MCP package
   npm install -g @directus/content-mcp@latest
   
   # Verify installation
   npx @directus/content-mcp@latest --help
   ```

### Debug Mode

Enable verbose logging:
```bash
export DEBUG=directus:mcp:*
claude mcp restart directus
```

## Security Best Practices

1. **Token Security**:
   - Use environment variables, never hardcode tokens
   - Implement token rotation
   - Use least-privilege access

2. **Network Security**:
   - Use HTTPS for all connections
   - Implement IP whitelisting if possible
   - Monitor for unusual access patterns

3. **Content Validation**:
   - Implement content approval workflows
   - Use WeExit validation rules
   - Monitor AI-generated content for quality

## Next Steps

1. **Set up your WeExit instance** (cloud or self-hosted)
2. **Generate API token** with appropriate permissions
3. **Configure MCP server** using the commands above
4. **Test basic operations** with Claude
5. **Explore multi-agent workflows** for content management

## Resources

- [WeExit Documentation](https://docs.directus.io/)
- [WeExit MCP Guide](https://directus.io/docs/guides/ai/mcp)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Claude MCP Documentation](https://docs.anthropic.com/claude/docs/mcp)

---

*Part of the MCP Collaboration Factory - Human-centered AI workflows following ONE® system principles*