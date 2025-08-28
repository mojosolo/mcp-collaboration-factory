#!/bin/bash

# MCP Collaboration Setup Script
# This script sets up the Model Context Protocol collaboration between Claude and Codex
# Following ONE® system principles for human-centered AI collaboration

set -e

echo "🚀 Setting up MCP Collaboration between Claude and Codex"
echo "========================================================"

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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Claude CLI is installed
    if ! command -v claude &> /dev/null; then
        print_error "Claude CLI is not installed. Please install it first:"
        echo "   Visit: https://docs.anthropic.com/claude/docs/get-started-with-claude"
        exit 1
    fi
    
    # Check if Codex CLI is installed
    if ! command -v codex &> /dev/null; then
        print_warning "Codex CLI is not installed. Installing now..."
        curl -fsSL https://codex.ai/install.sh | sh
        
        # Source the shell profile to make codex available
        if [ -f ~/.bashrc ]; then
            source ~/.bashrc
        elif [ -f ~/.zshrc ]; then
            source ~/.zshrc
        fi
        
        # Verify installation
        if ! command -v codex &> /dev/null; then
            print_error "Failed to install Codex CLI. Please install manually:"
            echo "   curl -fsSL https://codex.ai/install.sh | sh"
            exit 1
        fi
    fi
    
    # Check if Node.js is available (for MCP packages)
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed. Some MCP packages may not work."
        echo "   Consider installing Node.js for full MCP functionality."
    fi
    
    print_success "Prerequisites check completed"
}

# Authenticate Codex
authenticate_codex() {
    print_status "Setting up Codex authentication..."
    
    # Check if already authenticated
    if codex auth --check &> /dev/null; then
        print_success "Codex is already authenticated"
        return
    fi
    
    print_status "Please authenticate with Codex..."
    echo "   You'll need your OpenAI API key"
    echo "   Visit: https://platform.openai.com/api-keys"
    
    if codex auth; then
        print_success "Codex authentication successful"
    else
        print_error "Codex authentication failed. Please try again manually:"
        echo "   codex auth"
        exit 1
    fi
}

# Setup MCP tools
setup_mcp_tools() {
    print_status "Setting up MCP tools..."
    
    # Check current MCP tools
    print_status "Current MCP tools:"
    claude mcp list || print_warning "No MCP tools configured yet"
    
    # Add Codex as MCP tool
    print_status "Adding Codex as MCP tool..."
    
    # Try different MCP setup methods
    local setup_success=false
    
    # Method 1: Direct Codex MCP mode
    print_status "Trying direct Codex MCP mode..."
    if claude mcp add codex -s user -- codex -m gpt-5 --model_reasoning_effort=high mcp; then
        print_success "Codex MCP tool added successfully (direct mode)"
        setup_success=true
    else
        print_warning "Direct MCP mode failed, trying alternative methods..."
        
        # Method 2: Using codex-mcp package
        if command -v npx &> /dev/null; then
            print_status "Trying codex-mcp package..."
            if claude mcp add codex-data -e CODEX_API_KEY=$(codex config get api_key) npx @codex-data/codex-mcp claude; then
                print_success "Codex MCP tool added successfully (codex-mcp package)"
                setup_success=true
            fi
        fi
        
        # Method 3: Using codex-as-mcp
        if ! $setup_success && command -v uvx &> /dev/null; then
            print_status "Trying codex-as-mcp..."
            if claude mcp add codex-as-mcp -- uvx codex-as-mcp@latest; then
                print_success "Codex MCP tool added successfully (codex-as-mcp)"
                setup_success=true
            fi
        fi
    fi
    
    if ! $setup_success; then
        print_error "Failed to add Codex as MCP tool. Please try manually:"
        echo "   claude mcp add codex -s user -- codex -m gpt-5 mcp"
        echo "   or"
        echo "   claude mcp add codex-data -e CODEX_API_KEY=\$CODEX_API_KEY npx @codex-data/codex-mcp claude"
        exit 1
    fi
}

# Verify MCP setup
verify_mcp_setup() {
    print_status "Verifying MCP setup..."
    
    # List MCP tools
    print_status "Available MCP tools:"
    if claude mcp list; then
        print_success "MCP tools listed successfully"
    else
        print_error "Failed to list MCP tools"
        exit 1
    fi
    
    # Test Codex connection
    print_status "Testing Codex MCP connection..."
    if claude mcp test codex; then
        print_success "Codex MCP connection test passed"
    else
        print_warning "Codex MCP connection test failed. This might be normal for some setups."
        echo "   You can still try using the tool in practice."
    fi
}

# Create sample collaboration files
create_sample_files() {
    print_status "Creating sample collaboration files..."
    
    # Create sample CSV data for testing
    if [ ! -f "examples/sample_data.csv" ]; then
        mkdir -p examples
        cat > examples/sample_data.csv << 'EOF'
id,name,value
1,Product A,25.50
2,Product B,30.00
3,Product C,15.75
4,Product D,45.25
5,Product E,12.00
EOF
        print_success "Created sample CSV data file"
    fi
    
    # Create test script
    if [ ! -f "test_collaboration.py" ]; then
        cat > test_collaboration.py << 'EOF'
#!/usr/bin/env python3
"""
Test script for MCP collaboration between Claude and Codex.
Run this to verify your setup is working correctly.
"""

import csv
import sys
from pathlib import Path

def test_csv_processing():
    """Test the CSV processor with sample data."""
    try:
        # Import the CSV processor
        from examples.python.csv_processor import CSVProcessor
        
        input_file = "examples/sample_data.csv"
        output_file = "examples/processed_data.csv"
        
        # Test processing
        processor = CSVProcessor(input_file, output_file)
        success = processor.process_csv()
        
        if success:
            summary = processor.get_summary()
            print(f"✅ CSV processing successful!")
            print(f"   Processed {summary['processed_rows']} rows")
            print(f"   Output: {summary['output_file']}")
            
            # Verify output file
            if Path(output_file).exists():
                print(f"   Output file created successfully")
                return True
            else:
                print(f"   ❌ Output file not found")
                return False
        else:
            summary = processor.get_summary()
            print(f"❌ CSV processing failed:")
            for error in summary['errors']:
                print(f"   - {error}")
            return False
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   Make sure you're in the project root directory")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing MCP Collaboration Setup")
    print("==================================")
    
    if test_csv_processing():
        print("\n🎉 Setup verification successful!")
        print("   Your MCP collaboration environment is ready.")
        print("\n   Next steps:")
        print("   1. Use the slash command: /mcp-collaboration")
        print("   2. Try the workflow template in examples/workflows/")
        print("   3. Start collaborating between Claude and Codex!")
    else:
        print("\n❌ Setup verification failed.")
        print("   Please check the errors above and try again.")
        sys.exit(1)
EOF
        chmod +x test_collaboration.py
        print_success "Created test script"
    fi
}

# Main setup function
main() {
    echo
    print_status "Starting MCP collaboration setup..."
    echo
    
    check_prerequisites
    authenticate_codex
    setup_mcp_tools
    verify_mcp_setup
    create_sample_files
    
    echo
    print_success "MCP collaboration setup completed successfully!"
    echo
    echo "🎯 What's next?"
    echo "   1. Test your setup: python test_collaboration.py"
    echo "   2. Use the slash command: /mcp-collaboration"
    echo "   3. Explore the workflow templates in examples/workflows/"
    echo "   4. Start collaborating between Claude and Codex!"
    echo
    echo "📚 Resources:"
    echo "   - README.md: Complete setup and usage guide"
    echo "   - .claude/commands/mcp-collaboration.md: Quick reference"
    echo "   - examples/: Sample code and workflows"
    echo
    echo "🔧 Troubleshooting:"
    echo "   - Check MCP status: claude mcp list"
    echo "   - Test connection: claude mcp test codex"
    echo "   - View logs: claude mcp logs"
    echo
}

# Run main function
main "$@"
