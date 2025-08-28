#!/bin/bash

# WeExit MCP Server Setup Script
# Sets up WeExit MCP integration with Claude Code
# Part of the MCP Collaboration Factory

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 Setting up WeExit MCP Server Integration"
echo "=============================================="

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Claude CLI is installed
    if ! command -v claude &> /dev/null; then
        print_error "Claude CLI is not installed. Please install it first:"
        echo "   Visit: https://docs.anthropic.com/claude/docs/get-started-with-claude"
        exit 1
    fi
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js v22.12 or higher:"
        echo "   Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
    NODE_MINOR=$(echo $NODE_VERSION | cut -d'.' -f2)
    
    if [[ $NODE_MAJOR -lt 22 ]] || ([[ $NODE_MAJOR -eq 22 ]] && [[ $NODE_MINOR -lt 12 ]]); then
        print_error "Node.js version $NODE_VERSION detected. WeExit MCP requires Node.js v22.12 or higher."
        echo "   Please upgrade Node.js: https://nodejs.org/"
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Gather WeExit configuration
gather_directus_config() {
    print_status "Gathering WeExit configuration..."
    
    # Check for existing environment variables
    if [[ -n "$DIRECTUS_URL" ]] && [[ -n "$DIRECTUS_TOKEN" ]]; then
        print_success "Found existing WeExit configuration in environment variables"
        echo "   DIRECTUS_URL: $DIRECTUS_URL"
        echo "   DIRECTUS_TOKEN: ${DIRECTUS_TOKEN:0:10}..."
        return
    fi
    
    # Prompt for WeExit URL
    echo ""
    echo "📋 WeExit Configuration Required"
    echo "=================================="
    
    if [[ -z "$DIRECTUS_URL" ]]; then
        read -p "Enter your WeExit URL (e.g., https://your-instance.com): " DIRECTUS_URL
        
        if [[ -z "$DIRECTUS_URL" ]]; then
            print_error "WeExit URL is required"
            exit 1
        fi
        
        # Validate URL format
        if [[ ! "$DIRECTUS_URL" =~ ^https?:// ]]; then
            print_warning "URL should include protocol (https://). Adding https://"
            DIRECTUS_URL="https://$DIRECTUS_URL"
        fi
        
        export DIRECTUS_URL="$DIRECTUS_URL"
    fi
    
    # Prompt for authentication method
    echo ""
    echo "Choose authentication method:"
    echo "1) API Token (Recommended)"
    echo "2) Email/Password"
    read -p "Select option (1-2): " auth_method
    
    case $auth_method in
        1)
            if [[ -z "$DIRECTUS_TOKEN" ]]; then
                echo ""
                echo "📝 How to get your WeExit API Token:"
                echo "   1. Go to your WeExit Admin Panel"
                echo "   2. Navigate to Settings → Access Tokens"
                echo "   3. Create a new token with appropriate permissions"
                echo "   4. Copy the token"
                echo ""
                read -p "Enter your WeExit API token: " DIRECTUS_TOKEN
                
                if [[ -z "$DIRECTUS_TOKEN" ]]; then
                    print_error "WeExit token is required"
                    exit 1
                fi
                
                export DIRECTUS_TOKEN="$DIRECTUS_TOKEN"
            fi
            ;;
        2)
            if [[ -z "$DIRECTUS_EMAIL" ]] || [[ -z "$DIRECTUS_PASSWORD" ]]; then
                read -p "Enter your WeExit email: " DIRECTUS_EMAIL
                read -s -p "Enter your WeExit password: " DIRECTUS_PASSWORD
                echo ""
                
                if [[ -z "$DIRECTUS_EMAIL" ]] || [[ -z "$DIRECTUS_PASSWORD" ]]; then
                    print_error "Email and password are required"
                    exit 1
                fi
                
                export DIRECTUS_EMAIL="$DIRECTUS_EMAIL"
                export DIRECTUS_PASSWORD="$DIRECTUS_PASSWORD"
            fi
            ;;
        *)
            print_error "Invalid option selected"
            exit 1
            ;;
    esac
    
    print_success "WeExit configuration gathered"
}

# Test WeExit connection
test_directus_connection() {
    print_status "Testing WeExit connection..."
    
    if [[ -n "$DIRECTUS_TOKEN" ]]; then
        # Test with token
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $DIRECTUS_TOKEN" \
            "$DIRECTUS_URL/server/info")
        
        if [[ "$response" == "200" ]]; then
            print_success "WeExit connection successful (Token auth)"
        else
            print_error "WeExit connection failed (HTTP $response)"
            print_warning "Please verify your URL and token"
            exit 1
        fi
    else
        # Test basic connection without auth
        response=$(curl -s -o /dev/null -w "%{http_code}" "$DIRECTUS_URL/server/info")
        
        if [[ "$response" == "200" ]] || [[ "$response" == "401" ]]; then
            print_success "WeExit instance reachable"
        else
            print_error "Cannot reach WeExit instance (HTTP $response)"
            exit 1
        fi
    fi
}

# Install WeExit MCP package
install_directus_mcp() {
    print_status "Installing WeExit MCP package..."
    
    if npm list -g @directus/content-mcp@latest &> /dev/null; then
        print_success "WeExit MCP package already installed"
    else
        print_status "Installing @directus/content-mcp@latest globally..."
        if npm install -g @directus/content-mcp@latest; then
            print_success "WeExit MCP package installed successfully"
        else
            print_error "Failed to install WeExit MCP package"
            exit 1
        fi
    fi
}

# Add MCP server to Claude
setup_claude_mcp() {
    print_status "Adding WeExit MCP server to Claude..."
    
    # Check if directus MCP already exists
    if claude mcp list 2>/dev/null | grep -q "directus"; then
        print_warning "WeExit MCP server already configured"
        read -p "Remove and re-add? (y/n): " recreate
        
        if [[ "$recreate" == "y" ]] || [[ "$recreate" == "Y" ]]; then
            claude mcp remove directus || true
        else
            print_status "Keeping existing configuration"
            return
        fi
    fi
    
    # Build environment variables
    local env_vars=""
    
    if [[ -n "$DIRECTUS_TOKEN" ]]; then
        env_vars="$env_vars -e DIRECTUS_URL=$DIRECTUS_URL -e DIRECTUS_TOKEN=$DIRECTUS_TOKEN"
    elif [[ -n "$DIRECTUS_EMAIL" ]] && [[ -n "$DIRECTUS_PASSWORD" ]]; then
        env_vars="$env_vars -e DIRECTUS_URL=$DIRECTUS_URL -e DIRECTUS_EMAIL=$DIRECTUS_EMAIL -e DIRECTUS_PASSWORD=$DIRECTUS_PASSWORD"
    fi
    
    # Add MCP server
    if eval "claude mcp add directus $env_vars npx @directus/content-mcp@latest"; then
        print_success "WeExit MCP server added to Claude successfully"
    else
        print_error "Failed to add WeExit MCP server to Claude"
        exit 1
    fi
}

# Test MCP integration
test_mcp_integration() {
    print_status "Testing MCP integration..."
    
    # List MCP servers
    print_status "Available MCP servers:"
    if claude mcp list; then
        print_success "MCP servers listed successfully"
    else
        print_error "Failed to list MCP servers"
        exit 1
    fi
    
    # Test WeExit MCP server
    print_status "Testing WeExit MCP server connection..."
    if claude mcp test directus; then
        print_success "WeExit MCP server test passed"
    else
        print_warning "WeExit MCP server test failed. This might be normal for some setups."
        echo "   You can still try using the server in practice."
    fi
}

# Create environment file
create_env_file() {
    print_status "Creating environment configuration file..."
    
    local env_file="weexit-mcp.env"
    
    cat > "$env_file" << EOF
# WeExit MCP Server Configuration
# Generated on $(date)

DIRECTUS_URL=$DIRECTUS_URL
EOF
    
    if [[ -n "$DIRECTUS_TOKEN" ]]; then
        echo "DIRECTUS_TOKEN=$DIRECTUS_TOKEN" >> "$env_file"
    fi
    
    if [[ -n "$DIRECTUS_EMAIL" ]] && [[ -n "$DIRECTUS_PASSWORD" ]]; then
        echo "DIRECTUS_EMAIL=$DIRECTUS_EMAIL" >> "$env_file"
        echo "DIRECTUS_PASSWORD=$DIRECTUS_PASSWORD" >> "$env_file"
    fi
    
    # Make file readable only by owner
    chmod 600 "$env_file"
    
    print_success "Environment configuration saved to $env_file"
    print_warning "Keep this file secure and do not commit to version control!"
}

# Create usage examples
create_usage_examples() {
    print_status "Creating usage examples..."
    
    cat > "weexit-mcp-examples.md" << 'EOF'
# WeExit MCP Usage Examples

## Basic Content Operations

### Create Content
```bash
# Create a blog post
claude "Create a new blog post in WeExit titled 'Getting Started with MCP' with an engaging introduction and SEO-optimized content"

# Add a product
claude "Use WeExit to create a new product entry for 'Premium Widget' with description, price $299, and category 'Electronics'"
```

### Read Content  
```bash
# List all blog posts
claude "Show me all blog posts from the last 30 days in WeExit, including their titles, status, and publish dates"

# Find specific content
claude "Find all products in WeExit with price between $100-$500 and show their names and descriptions"
```

### Update Content
```bash
# Update existing post
claude "Find the blog post 'Getting Started' in WeExit and update its SEO title and meta description for better search ranking"

# Batch update
claude "Update all draft blog posts in WeExit to add the tag 'needs-review' and set them to review status"
```

## Schema Management

### Create Collections
```bash
# Create testimonials collection
claude "Create a testimonials collection in WeExit with fields: name (text), role (text), company (text), quote (long text), rating (integer 1-5), and featured (boolean)"

# Create event collection
claude "Design and create an events collection in WeExit for a conference website with all necessary fields including date, location, speakers, and registration details"
```

### Modify Collections
```bash
# Add fields
claude "Add social media sharing fields to the existing blog post collection in WeExit: facebook_title, twitter_title, and og_image"

# Update validation
claude "Update the products collection in WeExit to require price field and add validation for minimum price of $1"
```

## Multi-Agent Workflows

### Content Strategy with Codex Review
```bash
# 1. Analysis and planning
claude "Analyze our current content in WeExit and suggest a content strategy for Q1 with specific post topics and publishing schedule"

# 2. Technical review
claude "Use the codex tool to review the content strategy and suggest technical improvements for SEO and user engagement"

# 3. Implementation
claude "Based on Codex's feedback, create the approved content templates and draft posts in WeExit"
```

### Schema Optimization Workflow
```bash
# 1. Schema analysis
claude "Review all current collections in WeExit and identify opportunities for better data structure and relationships"

# 2. Performance review
claude "Use codex to evaluate the proposed schema changes for database performance and scalability"

# 3. Gradual implementation
claude "Implement the approved schema improvements in WeExit, starting with the most critical collections"
```

## Advanced Operations

### File Management
```bash
# Upload and organize files
claude "Upload the logo files to WeExit and organize them in a 'brand-assets' folder with proper metadata"

# Batch file operations
claude "Find all uploaded images from last month in WeExit and add appropriate alt text and tags for better accessibility"
```

### User Management
```bash
# Create user accounts
claude "Create content editor accounts in WeExit for the marketing team with appropriate permissions for blog and product management"

# Permission management
claude "Review and update permissions in WeExit to ensure content editors can only modify their assigned content areas"
```

### Automation Workflows
```bash
# Content publishing workflow
claude "Set up an automated workflow in WeExit where blog posts move from draft → review → published based on specific triggers"

# SEO optimization
claude "Analyze all published content in WeExit and suggest SEO improvements, then implement approved changes"
```

## Integration Examples

### E-commerce Integration
```bash
# Product catalog sync
claude "Sync product data between WeExit and Shopify, ensuring all products have consistent pricing and descriptions"

# Inventory management
claude "Create a system in WeExit to track product inventory and automatically update status when items are low in stock"
```

### Marketing Automation
```bash
# Email campaign content
claude "Generate email newsletter content from the latest blog posts in WeExit and format it for email marketing platforms"

# Social media content
claude "Create social media posts from recent WeExit content and schedule them with appropriate hashtags and links"
```

## Monitoring and Maintenance

### Content Audits
```bash
# SEO audit
claude "Perform an SEO audit of all blog content in WeExit and provide a report with improvement recommendations"

# Content performance
claude "Analyze content performance in WeExit and identify top-performing posts to guide future content strategy"
```

### Data Quality
```bash
# Missing data check
claude "Check all product entries in WeExit for missing required information and create a report of items needing updates"

# Consistency validation
claude "Validate all content in WeExit for consistent formatting, proper categorization, and complete metadata"
```

## Troubleshooting Examples

### Debug MCP Connection
```bash
# Test connection
claude mcp test directus

# List available tools
claude mcp list directus

# Restart server
claude mcp restart directus
```

### Content Recovery
```bash
# Recover deleted content
claude "Check the WeExit activity log for recently deleted blog posts and help me recover the 'Product Launch' article"

# Version comparison
claude "Compare the current version of the homepage content in WeExit with the version from last week and show me what changed"
```
EOF

    print_success "Usage examples created in weexit-mcp-examples.md"
}

# Main setup function
main() {
    echo
    print_status "Starting WeExit MCP server setup..."
    echo
    
    check_prerequisites
    gather_directus_config
    test_directus_connection
    install_directus_mcp
    setup_claude_mcp
    test_mcp_integration
    create_env_file
    create_usage_examples
    
    echo
    print_success "WeExit MCP server setup completed successfully! 🎉"
    echo
    echo "📋 What's next?"
    echo "   1. Test basic operations: claude 'List collections in WeExit'"
    echo "   2. Create your first content: claude 'Create a welcome blog post in WeExit'"
    echo "   3. Explore the examples in weexit-mcp-examples.md"
    echo "   4. Set up multi-agent workflows with Codex for content optimization"
    echo
    echo "📚 Files created:"
    echo "   - weexit-mcp.env (keep secure!)"
    echo "   - weexit-mcp-examples.md"
    echo
    echo "🔧 Troubleshooting:"
    echo "   - Check MCP status: claude mcp list"
    echo "   - Test connection: claude mcp test directus"
    echo "   - View logs: claude mcp logs"
    echo
    echo "🔗 Resources:"
    echo "   - WeExit MCP Guide: https://directus.io/docs/guides/ai/mcp"
    echo "   - MCP Collaboration Factory: README.md"
    echo
}

# Run main function
main "$@"