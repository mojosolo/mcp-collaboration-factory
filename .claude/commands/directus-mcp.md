---
name: Directus MCP
description: Set up and manage Directus MCP server for AI-powered content management
---

# Directus MCP Command

This command helps you set up and manage Directus MCP integration for AI-powered content management through the Model Context Protocol.

## Quick Setup

### 1. Install and Configure Directus MCP
```bash
# Run automated setup script
./directus-mcp-setup/setup-directus-mcp.sh

# Or manual setup
claude mcp add directus -e DIRECTUS_URL=https://your-instance.com -e DIRECTUS_TOKEN=your-token npx @directus/content-mcp@latest
```

### 2. Verify Connection
```bash
claude mcp list
claude mcp test directus
```

## Environment Setup

### Required Variables
```bash
export DIRECTUS_URL="https://your-directus-instance.com"
export DIRECTUS_TOKEN="your-api-token"
# OR
export DIRECTUS_EMAIL="your-email@example.com"
export DIRECTUS_PASSWORD="your-password"
```

### Get Directus API Token
1. Go to Directus Admin → Settings → Access Tokens
2. Create new token with required permissions
3. Copy token and set DIRECTUS_TOKEN environment variable

## Basic Usage Examples

### Content Management
```bash
# Create blog post
claude "Create a blog post in Directus titled 'AI Content Management' with SEO-optimized content and metadata"

# List recent content
claude "Show me all blog posts from the last 7 days in Directus with their status and publish dates"

# Update content
claude "Find the blog post about 'Getting Started' in Directus and update its meta description for better SEO"

# Search content
claude "Find all products in Directus with price between $50-$200 and show their names and categories"
```

### Collection Management
```bash
# Create collection
claude "Create a testimonials collection in Directus with fields: name, role, company, quote, rating (1-5), featured"

# List collections
claude "Show me all collections in Directus and their field structures"

# Add fields
claude "Add social media fields to the blog collection: twitter_title, facebook_title, linkedin_summary"

# Update validation
claude "Update the products collection to require price field and set minimum value of $1"
```

### File Management
```bash
# Upload files
claude "Upload brand logos to Directus in a 'brand-assets' folder with proper metadata and alt text"

# Organize files
claude "Find all product images in Directus and organize them by product category"

# Update metadata
claude "Add appropriate alt text and tags to all uploaded images for better accessibility"
```

## Multi-Agent Collaboration Workflows

### Content Strategy with Codex Review
```bash
# 1. Analysis and strategy
claude "Analyze current content in Directus and suggest a Q1 content strategy with specific topics and publishing schedule"

# 2. Technical validation
claude "Use codex tool to review the content strategy for SEO optimization, technical accuracy, and engagement potential"

# 3. Implementation
claude "Based on Codex feedback, create content templates and draft posts in Directus with proper SEO structure"

# 4. Quality assurance
claude "Use codex to validate the created content for technical accuracy and optimization before publishing"
```

### Schema Optimization Workflow
```bash
# 1. Schema analysis
claude "Review all Directus collections and identify opportunities for better structure, relationships, and performance"

# 2. Performance review
claude "Use codex to evaluate proposed schema changes for database performance, scalability, and query optimization"

# 3. Implementation
claude "Implement approved schema improvements in Directus, starting with high-impact collections"

# 4. Validation
claude "Test the new schema structure and verify all existing content migrations work correctly"
```

### Automated Content Audit
```bash
# 1. Content inventory
claude "Create a comprehensive audit of all Directus content including SEO metrics, completeness, and quality indicators"

# 2. Technical analysis
claude "Use codex to analyze content for SEO issues, accessibility problems, and performance optimization opportunities"

# 3. Improvement plan
claude "Generate an action plan to address identified issues, prioritized by impact and effort required"

# 4. Implementation
claude "Apply approved improvements to Directus content, tracking changes and measuring impact"
```

## Advanced Configuration

### Custom System Prompt
```bash
claude mcp add directus-custom -e DIRECTUS_URL=$DIRECTUS_URL -e DIRECTUS_TOKEN=$DIRECTUS_TOKEN -e SYSTEM_PROMPT="You are a content management AI focused on SEO optimization and brand consistency" npx @directus/content-mcp@latest
```

### Disable Dangerous Operations
```bash
claude mcp add directus-safe -e DIRECTUS_URL=$DIRECTUS_URL -e DIRECTUS_TOKEN=$DIRECTUS_TOKEN -e DISABLED_TOOLS="delete_item,delete_collection,delete_user" npx @directus/content-mcp@latest
```

### Enable Debug Logging
```bash
claude mcp add directus-debug -e DIRECTUS_URL=$DIRECTUS_URL -e DIRECTUS_TOKEN=$DIRECTUS_TOKEN -e DEBUG="directus:mcp:*" npx @directus/content-mcp@latest
```

## Available MCP Tools

### Content Operations
- **create_item**: Create new content in collections
- **read_items**: Query and retrieve content
- **update_item**: Modify existing content
- **delete_item**: Remove content (can be disabled)

### Collection Management
- **list_collections**: View available content types
- **create_collection**: Define new content structures
- **update_collection**: Modify collection schemas
- **delete_collection**: Remove collections (can be disabled)

### File Management
- **upload_file**: Upload assets and media
- **list_files**: Browse uploaded files
- **update_file**: Modify file metadata
- **delete_file**: Remove files

### User & Permission Management
- **list_users**: View system users
- **create_user**: Add new users
- **update_user**: Modify user details
- **manage_permissions**: Configure access controls

## Content Creation Templates

### Blog Post Creation
```bash
claude "Create a blog post in Directus with:
- Title: 'Advanced AI Content Strategies'
- SEO-optimized meta description
- Structured content with H2 headings
- Internal linking suggestions
- Featured image requirements
- Tags: AI, Content, Marketing
- Status: Draft for review"
```

### Product Entry
```bash
claude "Add a new product to Directus:
- Name: Premium Widget Pro
- Description: Professional-grade widget for enterprise
- Price: $299.99
- Category: Professional Tools
- Images: Upload and set product photos
- SEO: Optimized title and description
- Inventory: 50 units in stock"
```

### Event Creation
```bash
claude "Create an event in Directus:
- Title: AI Content Summit 2024
- Date: March 15, 2024
- Location: San Francisco Convention Center
- Description: Full event details with agenda
- Speakers: Add speaker profiles and bios
- Registration: Set up registration fields
- Marketing: Create promotional content"
```

## Troubleshooting

### Connection Issues
```bash
# Test Directus connection
curl -H "Authorization: Bearer $DIRECTUS_TOKEN" $DIRECTUS_URL/server/info

# Check MCP server status
claude mcp list
claude mcp test directus

# View MCP logs
claude mcp logs directus

# Restart MCP server
claude mcp restart directus
```

### Permission Errors
```bash
# Check token permissions
curl -H "Authorization: Bearer $DIRECTUS_TOKEN" $DIRECTUS_URL/users/me

# Verify required permissions in Directus Admin:
# - Collections: Read, Create, Update
# - Items: Read, Create, Update
# - Files: Read, Create, Update (for file management)
```

### Package Issues
```bash
# Reinstall Directus MCP package
npm uninstall -g @directus/content-mcp
npm install -g @directus/content-mcp@latest

# Verify installation
npx @directus/content-mcp@latest --help
```

## Security Best Practices

### Token Management
- Use environment variables for tokens
- Rotate tokens regularly
- Use minimum required permissions
- Monitor token usage

### Production Safety
```bash
# Disable destructive operations in production
claude mcp add directus-prod -e DIRECTUS_URL=$PROD_URL -e DIRECTUS_TOKEN=$PROD_TOKEN -e DISABLED_TOOLS="delete_item,delete_collection,delete_user,delete_file" npx @directus/content-mcp@latest
```

### Content Validation
- Implement content approval workflows
- Use Directus validation rules
- Monitor AI-generated content
- Regular content audits

## Integration with Other MCP Servers

### With Database Servers
```bash
# Sync Directus content with external database
claude "Export blog posts from Directus and sync with PostgreSQL database for analytics"
```

### With AI Content Generators
```bash
# Generate content and publish to Directus
claude "Generate 5 blog post ideas using OpenAI, then create draft posts in Directus with SEO optimization"
```

### With File Processing
```bash
# Process images before Directus upload
claude "Optimize and resize product images, then upload to Directus with proper metadata"
```

## Resources

- [Directus Documentation](https://docs.directus.io/)
- [Directus MCP Guide](https://directus.io/docs/guides/ai/mcp)
- [Setup Script](../directus-mcp-setup/setup-directus-mcp.sh)
- [Configuration Examples](../directus-mcp-setup/directus-mcp-config.yaml)
- [Usage Examples](../directus-mcp-setup/directus-mcp-examples.md)