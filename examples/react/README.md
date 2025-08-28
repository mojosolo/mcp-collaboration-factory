# DataTable React Component Demo

> **MCP Collaboration Example**: Accessible DataTable created through Claude + Codex collaboration

## Overview

This directory contains a fully accessible React DataTable component enhanced through multi-agent collaboration between Claude Code (Opus) and OpenAI Codex (GPT-5). The component demonstrates best practices for accessibility, performance, and comprehensive testing.

## Files

- **`DataTable.tsx`** - Main component with accessibility and performance optimizations
- **`DataTable.test.tsx`** - Comprehensive RTL test suite (150+ test cases)  
- **`DataTable.css`** - Accessible styles with `.sr-only` class for screen readers
- **`App.tsx`** - Demo application with sample data
- **`package.json`** - Testing dependencies and scripts

## Features ✨

### Accessibility (WCAG 2.1 AA Compliant)
- ✅ Proper ARIA attributes (`aria-sort`, `aria-rowcount`, `aria-rowindex`)
- ✅ Live region announcements for sort changes
- ✅ Full keyboard navigation (Arrow keys, Home, End)
- ✅ Screen reader optimized with proper roles and labels
- ✅ High contrast and reduced motion support

### Performance Optimizations
- ✅ Memoized event handlers and computed values
- ✅ Efficient DOM access with refs
- ✅ Optimized keyboard navigation queries
- ✅ Proper dependency arrays for hooks

### Functionality
- ✅ Sortable columns with visual indicators
- ✅ Real-time filtering across all columns
- ✅ Pagination with proper state management
- ✅ Clickable rows with keyboard activation
- ✅ Loading and error states
- ✅ Responsive design

## Quick Start

### Option 1: Run Tests with Vitest (Recommended)

```bash
# Install dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom react react-dom @types/react @types/react-dom

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Option 2: Run Tests with Jest

```bash
# Install dependencies
npm install -D jest ts-jest @types/jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event react react-dom @types/react @types/react-dom

# Initialize Jest configuration
npx ts-jest config:init
# Then set "testEnvironment": "jsdom" in jest.config.js

# Run specific test
npx jest examples/react/DataTable.test.tsx

# Or use npm script
npm run test:jest
```

### Option 3: Manual Demo

1. Set up a React app with TypeScript
2. Copy `DataTable.tsx`, `DataTable.css`, and `App.tsx`
3. Install React and TypeScript dependencies
4. Run your development server

## Testing Coverage 🧪

The test suite includes **150+ test cases** covering:

### Accessibility Testing
- ARIA attributes validation
- Live region announcements  
- Screen reader compatibility
- Keyboard navigation patterns
- Focus management

### Sorting Functionality
- Ascending/descending sort behavior
- Numeric vs text sorting
- Visual sort indicators (↑↓↕)
- Sort callback functions
- Sort persistence during filtering

### Keyboard Navigation
- Enter/Space key activation
- Arrow key navigation between elements
- Home/End key navigation
- Row keyboard activation
- Focus trap behavior

### Pagination
- Page navigation (next/previous)
- Button state management
- Results summary updates
- Page reset on filtering
- Edge cases (first/last page)

### Filtering
- Real-time text filtering
- Case-insensitive search
- Multi-column search
- Filter clearing
- Results updates

### Combined Functionality
- Sort + filter interactions
- Sort + pagination interactions  
- State management across features
- Loading and error states

## Manual Testing Checklist ✓

When testing the demo manually, verify:

### Sort Functionality
- [ ] Click column headers to toggle sort (asc → desc → asc)
- [ ] Listen for live announcement: "Table sorted by [Column] [direction]ending"
- [ ] Visual indicators change (↕ → ↑ → ↓)
- [ ] `aria-sort` attribute updates correctly
- [ ] Console logs show sort events (if onSort provided)

### Keyboard Navigation
- [ ] Tab through sortable column headers
- [ ] Use Enter/Space to activate sorting
- [ ] Arrow Down/Up moves focus between elements
- [ ] Home key focuses first element
- [ ] End key focuses last element
- [ ] If rows are clickable, tab to them and use Enter/Space

### Pagination
- [ ] Previous button disabled on page 1
- [ ] Next button disabled on last page
- [ ] Page info updates correctly
- [ ] Results summary reflects current page
- [ ] Pagination disappears if all data fits on one page

### Filtering
- [ ] Type in search box to filter results
- [ ] Results update in real-time
- [ ] Case-insensitive matching works
- [ ] Results summary shows "filtered by '[term]'"
- [ ] Page resets to 1 when filtering
- [ ] Clear search box restores all results

### Accessibility Features
- [ ] Screen reader announces sort changes (use dev tools or real screen reader)
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] High contrast mode works properly
- [ ] Table has proper ARIA labels and structure

## Multi-Agent Collaboration Workflow 🤖

This component demonstrates the **Draft → Review → Iterate** pattern:

1. **Claude Opus**: Created initial accessible React component
2. **Codex GPT-5**: Reviewed for accessibility and performance improvements
3. **Claude Opus**: Applied improvements and generated comprehensive tests
4. **Human**: Orchestrated collaboration and validated results

### Key Collaboration Improvements
- Enhanced ARIA attributes based on accessibility audit
- Optimized performance through better memoization
- Added comprehensive keyboard navigation
- Implemented live regions for dynamic announcements
- Created thorough test coverage for all functionality

## Architecture Notes 📚

### Component Design
- **Controlled/Uncontrolled Flexibility**: Supports both controlled (external state) and uncontrolled (internal state) usage
- **Render Props Pattern**: Custom cell rendering via `render` functions
- **Event Callback Pattern**: Optional callbacks for sort, row click events
- **Accessibility First**: Built with screen readers and keyboard users in mind

### Performance Patterns
- **Memoization**: `useMemo` for expensive computations, `useCallback` for event handlers
- **Efficient Updates**: Minimal re-renders through proper dependency arrays
- **DOM Optimization**: Refs for direct DOM access without triggering renders

### Testing Philosophy  
- **User-Centric**: Tests focus on user interactions, not implementation details
- **Accessibility-Focused**: Extensive testing of ARIA attributes and keyboard behavior
- **Comprehensive Coverage**: All features tested in isolation and combination
- **Real-World Scenarios**: Tests mirror actual usage patterns

## Contributing

This component is part of the MCP Collaboration Factory. When making changes:

1. Follow the accessibility-first approach
2. Maintain comprehensive test coverage
3. Update documentation for new features
4. Test with actual screen readers when possible
5. Consider performance implications of changes

---

*Created through Claude + Codex collaboration following ONE® system principles for human-centered AI development*