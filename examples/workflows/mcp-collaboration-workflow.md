# MCP Collaboration Workflow Template

> **ONE® System Workflow**: Human-orchestrated AI collaboration for optimal code quality

## Workflow Overview

This template demonstrates how to orchestrate collaboration between **Claude Opus** and **Codex GPT-5** using MCP to create high-quality, well-reviewed code through iterative improvement cycles.

## Phase 1: Initial Setup and Planning

### Step 1: Verify MCP Connection
```bash
# Check available MCP tools
claude mcp list

# Test Codex connection
claude mcp test codex
```

### Step 2: Define Collaboration Goals
- **Claude's Role**: Initial solution drafting, reasoning, and integration
- **Codex's Role**: Code review, testing, and improvement suggestions
- **Human's Role**: Orchestration, decision-making, and quality control

## Phase 2: Draft → Review → Iterate Cycle

### Step 1: Claude Generates Initial Solution
**Prompt to Claude:**
```
"Create a [component/function/class] that [specific requirements]. 
Include proper error handling, documentation, and follow [language] best practices.
Write this as if it will be reviewed by another AI agent for improvements."
```

**Example:**
```
"Create a Python CSV processor class that handles large files with memory efficiency.
Include proper error handling, logging, and follow PEP 8 standards.
Write this as if it will be reviewed by another AI agent for improvements."
```

### Step 2: Codex Reviews the Solution
**Prompt to Claude:**
```
"Use the codex tool to review the previous solution. Ask it to:
1. Analyze code quality and best practices
2. Identify potential improvements
3. Check for security vulnerabilities
4. Suggest performance optimizations
5. Validate against [specific standards/frameworks]"
```

**MCP Tool Call:**
```bash
codex_review("Review this Python CSV processor for PEP 8 compliance, security, and performance. Focus on memory efficiency and error handling.")
```

### Step 3: Claude Integrates Feedback
**Prompt to Claude:**
```
"Based on Codex's review, improve the previous solution by:
1. Addressing all identified issues
2. Implementing suggested improvements
3. Maintaining the original functionality
4. Adding any missing features identified
5. Updating documentation to reflect changes"
```

### Step 4: Codex Validates Final Result
**Prompt to Claude:**
```
"Use the codex tool to validate the improved solution by:
1. Running any available tests
2. Checking for remaining issues
3. Confirming all improvements were implemented
4. Suggesting final optimizations if any"
```

**MCP Tool Call:**
```bash
codex_execute("Validate this improved CSV processor by running basic tests and checking for any remaining issues.")
```

## Phase 3: Advanced Collaboration Patterns

### Pattern 1: Multi-Perspective Architecture Review
1. **Claude**: Design system architecture
2. **Codex**: Review for scalability and best practices
3. **Claude**: Refine based on feedback
4. **Codex**: Validate against industry standards
5. **Claude**: Finalize with documentation

### Pattern 2: Security-First Development
1. **Claude**: Implement core functionality
2. **Codex**: Security audit and vulnerability assessment
3. **Claude**: Implement security fixes
4. **Codex**: Penetration testing simulation
5. **Claude**: Final security review and hardening

### Pattern 3: Performance Optimization
1. **Claude**: Baseline implementation
2. **Codex**: Performance profiling and bottleneck identification
3. **Claude**: Implement optimizations
4. **Codex**: Performance testing and validation
5. **Claude**: Documentation of optimization strategies

## Phase 4: Quality Assurance and Documentation

### Step 1: Final Code Review
```bash
# Comprehensive review by Codex
codex_review("Perform final comprehensive review of this solution including:
- Code quality and maintainability
- Performance characteristics
- Security considerations
- Documentation completeness
- Testing coverage")
```

### Step 2: Documentation Generation
**Prompt to Claude:**
```
"Generate comprehensive documentation for the final solution including:
1. Usage examples and API documentation
2. Performance characteristics and limitations
3. Security considerations and best practices
4. Troubleshooting guide
5. Future improvement suggestions"
```

### Step 3: Knowledge Synthesis
**Prompt to Claude:**
```
"Create a summary document that captures:
1. Key decisions made during development
2. Trade-offs considered and chosen
3. Lessons learned from the collaboration
4. Best practices identified
5. Recommendations for future similar projects"
```

## Workflow Templates by Project Type

### Frontend Component Development
```
1. Claude: Component architecture and initial implementation
2. Codex: Accessibility review and React best practices
3. Claude: Accessibility improvements and responsive design
4. Codex: Performance testing and bundle analysis
5. Claude: Final integration and documentation
```

### Backend API Development
```
1. Claude: API design and initial implementation
2. Codex: Security review and validation
3. Claude: Security hardening and error handling
4. Codex: Performance testing and load testing
5. Claude: Final API documentation and examples
```

### Data Processing Pipeline
```
1. Claude: Pipeline architecture and core logic
2. Codex: Memory efficiency and error handling review
3. Claude: Optimization and robustness improvements
4. Codex: Edge case testing and validation
5. Claude: Final pipeline documentation and monitoring
```

## Collaboration Best Practices

### 1. Clear Role Definition
- **Claude**: Creative problem-solving, reasoning, integration
- **Codex**: Technical validation, testing, optimization
- **Human**: Orchestration, decision-making, quality gates

### 2. Iterative Improvement
- Start with working solutions, then optimize
- Each iteration should address specific concerns
- Maintain functionality while improving quality

### 3. Context Preservation
- Use shared files for complex collaborations
- Document decisions and reasoning
- Maintain conversation history for reference

### 4. Quality Gates
- Define acceptance criteria upfront
- Use Codex for objective validation
- Human review for business logic and requirements

## Troubleshooting Common Issues

### MCP Connection Problems
```bash
# Check MCP server status
claude mcp list

# Restart MCP server if needed
claude mcp restart codex

# Verify API keys and authentication
codex auth
```

### Collaboration Breakdown
- **Issue**: Agents providing conflicting advice
- **Solution**: Human decision on which approach to follow
- **Prevention**: Clear acceptance criteria and decision framework

### Quality Regression
- **Issue**: Improvements breaking existing functionality
- **Solution**: Automated testing and validation
- **Prevention**: Incremental changes with validation at each step

## Success Metrics

### Code Quality
- Reduced technical debt
- Improved maintainability scores
- Fewer security vulnerabilities
- Better performance characteristics

### Development Efficiency
- Faster iteration cycles
- Reduced debugging time
- Better documentation quality
- Improved team knowledge sharing

### Collaboration Effectiveness
- Clearer decision-making processes
- Better knowledge capture
- Reduced rework
- Improved learning outcomes

---

*This workflow template follows ONE® system principles for human-centered AI collaboration, ensuring that technology adapts to human needs while maintaining high code quality standards.*
