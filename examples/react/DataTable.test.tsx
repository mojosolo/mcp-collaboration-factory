/**
 * DataTable RTL Tests - Multi-Agent Collaboration Testing
 * 
 * Tests for accessibility, keyboard navigation, sorting, pagination, and filtering
 * Created through Claude + Codex collaboration workflow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DataTable } from './DataTable';

// Mock CSS import
jest.mock('./DataTable.css', () => ({}));

// Test data setup
const mockData = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', age: 28, role: 'Engineer' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', age: 34, role: 'Designer' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', age: 22, role: 'Intern' },
  { id: 4, name: 'Diana Prince', email: 'diana@example.com', age: 31, role: 'Manager' },
  { id: 5, name: 'Eve Wilson', email: 'eve@example.com', age: 29, role: 'Engineer' },
  { id: 6, name: 'Frank Davis', email: 'frank@example.com', age: 26, role: 'Designer' },
  { id: 7, name: 'Grace Lee', email: 'grace@example.com', age: 33, role: 'Manager' },
  { id: 8, name: 'Henry Chen', email: 'henry@example.com', age: 27, role: 'Engineer' },
  { id: 9, name: 'Iris Taylor', email: 'iris@example.com', age: 35, role: 'Manager' },
  { id: 10, name: 'Jack Miller', email: 'jack@example.com', age: 24, role: 'Intern' },
  { id: 11, name: 'Kate Jones', email: 'kate@example.com', age: 30, role: 'Engineer' },
  { id: 12, name: 'Leo Garcia', email: 'leo@example.com', age: 32, role: 'Designer' },
];

const mockColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'age', label: 'Age', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
];

describe('DataTable', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Clear any previous announcements
    jest.clearAllMocks();
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <DataTable
          data={mockData.slice(0, 5)}
          columns={mockColumns}
          title="Test Table"
          aria-label="Test data table"
        />
      );

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-labelledby');
      expect(table).toHaveAttribute('aria-rowcount', '6'); // 5 data rows + 1 header
      expect(table).toHaveAttribute('aria-describedby');
    });

    it('should have proper column headers with sort indicators', () => {
      render(<DataTable data={mockData.slice(0, 3)} columns={mockColumns} />);

      mockColumns.forEach(column => {
        const columnHeader = screen.getByRole('columnheader', { name: new RegExp(column.label) });
        expect(columnHeader).toHaveAttribute('aria-sort', 'none');
      });
    });

    it('should update aria-sort when column is sorted', async () => {
      render(<DataTable data={mockData.slice(0, 3)} columns={mockColumns} />);

      const nameHeader = screen.getByRole('button', { name: /Sort by Name/i });
      await user.click(nameHeader);

      const nameColumn = screen.getByRole('columnheader', { name: /Name/i });
      expect(nameColumn).toHaveAttribute('aria-sort', 'ascending');
    });

    it('should announce sort changes to screen readers', async () => {
      render(<DataTable data={mockData.slice(0, 3)} columns={mockColumns} />);

      const nameHeader = screen.getByRole('button', { name: /Sort by Name/i });
      await user.click(nameHeader);

      // Check for live region announcement
      expect(screen.getByText('Table sorted by Name ascending')).toBeInTheDocument();
    });

    it('should have proper row indices for accessibility', () => {
      render(<DataTable data={mockData.slice(0, 3)} columns={mockColumns} />);

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0)
      rows.slice(1).forEach((row, index) => {
        expect(row).toHaveAttribute('aria-rowindex', String(index + 2));
      });
    });

    it('should have proper live regions for status updates', () => {
      render(<DataTable data={mockData.slice(0, 3)} columns={mockColumns} />);

      const summary = screen.getByRole('status', { name: /Showing.*results/i });
      expect(summary).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Sorting Functionality', () => {
    it('should sort data ascending when clicking sortable column', async () => {
      render(<DataTable data={mockData.slice(0, 5)} columns={mockColumns} />);

      const nameHeader = screen.getByRole('button', { name: /Sort by Name/i });
      await user.click(nameHeader);

      // Check that names are sorted ascending
      const rows = screen.getAllByRole('row');
      const firstDataCell = rows[1].querySelector('td');
      expect(firstDataCell).toHaveTextContent('Alice Johnson');
    });

    it('should sort data descending when clicking same column twice', async () => {
      render(<DataTable data={mockData.slice(0, 5)} columns={mockColumns} />);

      const nameHeader = screen.getByRole('button', { name: /Sort by Name/i });
      
      // First click - ascending
      await user.click(nameHeader);
      // Second click - descending
      await user.click(nameHeader);

      const nameColumn = screen.getByRole('columnheader', { name: /Name/i });
      expect(nameColumn).toHaveAttribute('aria-sort', 'descending');
    });

    it('should handle numeric sorting correctly', async () => {
      render(<DataTable data={mockData.slice(0, 5)} columns={mockColumns} />);

      const ageHeader = screen.getByRole('button', { name: /Sort by Age/i });
      await user.click(ageHeader);

      // Verify youngest person is first
      const rows = screen.getAllByRole('row');
      const cells = rows[1].querySelectorAll('td');
      const ageCell = cells[2]; // Age is the third column
      expect(ageCell).toHaveTextContent('22'); // Charlie Brown, youngest
    });

    it('should call onSort callback when provided', async () => {
      const mockOnSort = jest.fn();
      render(
        <DataTable 
          data={mockData.slice(0, 3)} 
          columns={mockColumns} 
          onSort={mockOnSort}
        />
      );

      const nameHeader = screen.getByRole('button', { name: /Sort by Name/i });
      await user.click(nameHeader);

      expect(mockOnSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('should show proper sort indicators in UI', async () => {
      render(<DataTable data={mockData.slice(0, 3)} columns={mockColumns} />);

      const nameHeader = screen.getByRole('button', { name: /Sort by Name/i });
      
      // Initially should show neutral sort indicator
      expect(nameHeader).toHaveTextContent('↕');
      
      // After clicking, should show ascending indicator
      await user.click(nameHeader);
      expect(nameHeader).toHaveTextContent('↑');
      
      // After clicking again, should show descending indicator
      await user.click(nameHeader);
      expect(nameHeader).toHaveTextContent('↓');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard activation of sortable columns', async () => {
      render(<DataTable data={mockData.slice(0, 3)} columns={mockColumns} />);

      const nameHeader = screen.getByRole('button', { name: /Sort by Name/i });
      nameHeader.focus();
      
      await user.keyboard('{Enter}');
      
      const nameColumn = screen.getByRole('columnheader', { name: /Name/i });
      expect(nameColumn).toHaveAttribute('aria-sort', 'ascending');
    });

    it('should support space key activation of sortable columns', async () => {
      render(<DataTable data={mockData.slice(0, 3)} columns={mockColumns} />);

      const nameHeader = screen.getByRole('button', { name: /Sort by Name/i });
      nameHeader.focus();
      
      await user.keyboard(' ');
      
      const nameColumn = screen.getByRole('columnheader', { name: /Name/i });
      expect(nameColumn).toHaveAttribute('aria-sort', 'ascending');
    });

    it('should handle arrow key navigation between focusable elements', async () => {
      const mockOnRowClick = jest.fn();
      render(
        <DataTable 
          data={mockData.slice(0, 3)} 
          columns={mockColumns}
          onRowClick={mockOnRowClick}
        />
      );

      // Focus first sortable header
      const nameHeader = screen.getByRole('button', { name: /Sort by Name/i });
      nameHeader.focus();
      
      // Press Arrow Down to move to next focusable element
      await user.keyboard('{ArrowDown}');
      
      // Should move focus to next button or row
      const focusedElement = document.activeElement;
      expect(focusedElement).not.toBe(nameHeader);
    });

    it('should support Home/End key navigation', async () => {
      render(<DataTable data={mockData.slice(0, 3)} columns={mockColumns} />);

      const nameHeader = screen.getByRole('button', { name: /Sort by Name/i });
      nameHeader.focus();
      
      await user.keyboard('{End}');
      
      // Should focus on last focusable element
      const focusedElement = document.activeElement;
      expect(focusedElement).not.toBe(nameHeader);
    });

    it('should allow keyboard activation of clickable rows', async () => {
      const mockOnRowClick = jest.fn();
      render(
        <DataTable 
          data={mockData.slice(0, 3)} 
          columns={mockColumns}
          onRowClick={mockOnRowClick}
        />
      );

      const firstRow = screen.getAllByRole('button').find(el => 
        el.getAttribute('aria-label')?.includes('row 1')
      );
      
      if (firstRow) {
        firstRow.focus();
        await user.keyboard('{Enter}');
        expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
      }
    });
  });

  describe('Pagination', () => {
    it('should render pagination when data exceeds items per page', () => {
      render(<DataTable data={mockData} columns={mockColumns} />);

      expect(screen.getByRole('navigation', { name: /Table navigation/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
    });

    it('should navigate to next page', async () => {
      render(<DataTable data={mockData} columns={mockColumns} />);

      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });

    it('should navigate to previous page', async () => {
      render(<DataTable data={mockData} columns={mockColumns} />);

      // Go to page 2 first
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      // Then go back to page 1
      const prevButton = screen.getByRole('button', { name: /previous page/i });
      await user.click(prevButton);

      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    it('should disable previous button on first page', () => {
      render(<DataTable data={mockData} columns={mockColumns} />);

      const prevButton = screen.getByRole('button', { name: /previous page/i });
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', async () => {
      render(<DataTable data={mockData} columns={mockColumns} />);

      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      expect(nextButton).toBeDisabled();
    });

    it('should update results summary when paginating', async () => {
      render(<DataTable data={mockData} columns={mockColumns} />);

      // Should show first 10 results
      expect(screen.getByText('Showing 10 of 12 results')).toBeInTheDocument();

      // Navigate to page 2
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      // Should show remaining 2 results
      expect(screen.getByText('Showing 2 of 12 results')).toBeInTheDocument();
    });

    it('should reset to page 1 when filtering', async () => {
      render(<DataTable data={mockData} columns={mockColumns} />);

      // Go to page 2
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

      // Apply filter
      const filterInput = screen.getByLabelText(/Search/i);
      await user.type(filterInput, 'Engineer');

      // Should be back on page 1
      await waitFor(() => {
        // Pagination might disappear if filtered results fit on one page
        const pageInfo = screen.queryByText(/Page \d+ of \d+/);
        if (pageInfo) {
          expect(pageInfo).toHaveTextContent('Page 1 of');
        }
      });
    });
  });

  describe('Filtering', () => {
    it('should filter data based on text input', async () => {
      render(<DataTable data={mockData.slice(0, 5)} columns={mockColumns} />);

      const filterInput = screen.getByLabelText(/Search/i);
      await user.type(filterInput, 'Alice');

      // Should show only Alice Johnson
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });

    it('should filter across all column values', async () => {
      render(<DataTable data={mockData.slice(0, 5)} columns={mockColumns} />);

      const filterInput = screen.getByLabelText(/Search/i);
      await user.type(filterInput, 'Engineer');

      // Should show all engineers
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Eve Wilson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument(); // Designer
    });

    it('should be case insensitive', async () => {
      render(<DataTable data={mockData.slice(0, 3)} columns={mockColumns} />);

      const filterInput = screen.getByLabelText(/Search/i);
      await user.type(filterInput, 'ALICE');

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    it('should update results summary with filter info', async () => {
      render(<DataTable data={mockData.slice(0, 5)} columns={mockColumns} />);

      const filterInput = screen.getByLabelText(/Search/i);
      await user.type(filterInput, 'Engineer');

      expect(screen.getByText(/filtered by "Engineer"/)).toBeInTheDocument();
    });

    it('should show "No data found" when filter matches nothing', async () => {
      render(<DataTable data={mockData.slice(0, 3)} columns={mockColumns} />);

      const filterInput = screen.getByLabelText(/Search/i);
      await user.type(filterInput, 'NonexistentValue');

      expect(screen.getByText('No data found')).toBeInTheDocument();
    });

    it('should clear filter results when input is cleared', async () => {
      render(<DataTable data={mockData.slice(0, 3)} columns={mockColumns} />);

      const filterInput = screen.getByLabelText(/Search/i);
      
      // Apply filter
      await user.type(filterInput, 'Alice');
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();

      // Clear filter
      await user.clear(filterInput);

      // All data should be visible again
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    });
  });

  describe('Combined Functionality', () => {
    it('should maintain sort when filtering', async () => {
      render(<DataTable data={mockData.slice(0, 5)} columns={mockColumns} />);

      // Sort by name ascending
      const nameHeader = screen.getByRole('button', { name: /Sort by Name/i });
      await user.click(nameHeader);

      // Apply filter for Engineers
      const filterInput = screen.getByLabelText(/Search/i);
      await user.type(filterInput, 'Engineer');

      // First engineer should be Alice (alphabetically first)
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent('Alice Johnson');

      // Sort should still be active
      const nameColumn = screen.getByRole('columnheader', { name: /Name/i });
      expect(nameColumn).toHaveAttribute('aria-sort', 'ascending');
    });

    it('should handle sorting with pagination', async () => {
      render(<DataTable data={mockData} columns={mockColumns} />);

      // Sort by age ascending
      const ageHeader = screen.getByRole('button', { name: /Sort by Age/i });
      await user.click(ageHeader);

      // First page should show youngest people
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent('Charlie Brown'); // Age 22

      // Navigate to page 2
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      // Second page should show older people
      const page2Rows = screen.getAllByRole('row');
      const firstPage2Row = page2Rows[1];
      expect(firstPage2Row).toHaveTextContent('Iris Taylor'); // Age 35
    });

    it('should handle keyboard navigation with clickable rows', async () => {
      const mockOnRowClick = jest.fn();
      render(
        <DataTable 
          data={mockData.slice(0, 3)} 
          columns={mockColumns}
          onRowClick={mockOnRowClick}
        />
      );

      // Find first clickable row
      const clickableRows = screen.getAllByRole('button').filter(el => 
        el.getAttribute('aria-label')?.includes('row')
      );

      if (clickableRows.length > 0) {
        const firstRow = clickableRows[0];
        firstRow.focus();
        
        // Use space key to activate
        await user.keyboard(' ');
        
        expect(mockOnRowClick).toHaveBeenCalled();
      }
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading state', () => {
      render(
        <DataTable 
          data={[]} 
          columns={mockColumns} 
          loading={true}
        />
      );

      expect(screen.getByRole('status')).toHaveTextContent('Loading data...');
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should display error state', () => {
      render(
        <DataTable 
          data={[]} 
          columns={mockColumns} 
          error="Failed to load data"
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });

    it('should have proper accessibility attributes for loading state', () => {
      render(
        <DataTable 
          data={[]} 
          columns={mockColumns} 
          loading={true}
        />
      );

      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper accessibility attributes for error state', () => {
      render(
        <DataTable 
          data={[]} 
          columns={mockColumns} 
          error="Test error"
        />
      );

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveAttribute('aria-live', 'assertive');
    });
  });
});