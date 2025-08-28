/**
 * DataTable Component - Multi-Agent Collaboration Example
 * 
 * This component demonstrates how Claude and Codex can collaborate:
 * 1. Claude generates initial React implementation
 * 2. Codex reviews for accessibility and best practices
 * 3. Claude integrates accessibility improvements
 * 4. Codex validates TypeScript and React patterns
 * 
 * Features:
 * - Accessible data table with proper ARIA labels
 * - Responsive design with mobile considerations
 * - TypeScript interfaces for type safety
 * - Error boundaries and loading states
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './DataTable.css';

// TypeScript interfaces for type safety
interface DataRow {
  id: string | number;
  [key: string]: any;
}

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: DataRow) => React.ReactNode;
}

interface DataTableProps {
  data: DataRow[];
  columns: Column[];
  title?: string;
  loading?: boolean;
  error?: string | null;
  onRowClick?: (row: DataRow) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  className?: string;
  'aria-label'?: string;
}

interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

/**
 * Accessible data table component with sorting, filtering, and responsive design.
 * Designed through collaboration between Claude Opus and Codex GPT-5.
 */
export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  title,
  loading = false,
  error = null,
  onRowClick,
  onSort,
  className = '',
  'aria-label': ariaLabel
}) => {
  // State management
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortAnnouncement, setSortAnnouncement] = useState('');
  
  // Refs for accessibility
  const tableRef = useRef<HTMLTableElement>(null);
  const sortAnnouncementRef = useRef<HTMLDivElement>(null);

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(filterText.toLowerCase())
      )
    );

    if (sortState) {
      filtered.sort((a, b) => {
        const aVal = a[sortState.key];
        const bVal = b[sortState.key];
        
        if (aVal < bVal) return sortState.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortState.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, filterText, sortState]);

  // Pagination calculation
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedData.slice(startIndex, startIndex + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage]);

  // Memoized event handlers for performance
  const handleSort = useCallback((key: string) => {
    const newDirection = sortState?.key === key && sortState.direction === 'asc' ? 'desc' : 'asc';
    const newSortState = { key, direction: newDirection };
    
    setSortState(newSortState);
    onSort?.(key, newDirection);
    
    // Announce sort change for screen readers
    const column = columns.find(col => col.key === key);
    setSortAnnouncement(`Table sorted by ${column?.label} ${newDirection}ending`);
  }, [sortState, onSort, columns]);

  const handleRowClick = useCallback((row: DataRow) => {
    onRowClick?.(row);
  }, [onRowClick]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!tableRef.current) return;
    
    const focusableElements = tableRef.current.querySelectorAll(
      'button, [tabindex="0"]'
    ) as NodeListOf<HTMLElement>;
    
    const currentIndex = Array.from(focusableElements).indexOf(e.target as HTMLElement);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < focusableElements.length - 1) {
          focusableElements[currentIndex + 1].focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          focusableElements[currentIndex - 1].focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        focusableElements[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        focusableElements[focusableElements.length - 1]?.focus();
        break;
    }
  }, []);

  // Accessibility: Generate unique IDs for table elements
  const tableId = useMemo(() => `data-table-${Math.random().toString(36).substr(2, 9)}`, []);
  const filterId = useMemo(() => `${tableId}-filter`, [tableId]);

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  // Loading state
  if (loading) {
    return (
      <div 
        className={`data-table-loading ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="loading-spinner" aria-hidden="true"></div>
        <span>Loading data...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className={`data-table-error ${className}`}
        role="alert"
        aria-live="assertive"
      >
        <h3>Error Loading Data</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={`data-table-container ${className}`} onKeyDown={handleKeyDown}>
      {/* Live region for sort announcements */}
      <div
        ref={sortAnnouncementRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {sortAnnouncement}
      </div>
      
      {/* Table Header with Title and Controls */}
      <div className="data-table-header">
        {title && (
          <h2 className="data-table-title" id={`${tableId}-title`}>
            {title}
          </h2>
        )}
        
        {/* Search/Filter Controls */}
        <div className="data-table-controls">
          <label htmlFor={filterId} className="filter-label">
            Search:
          </label>
          <input
            id={filterId}
            type="text"
            value={filterText}
            onChange={handleFilterChange}
            placeholder="Filter data..."
            className="filter-input"
            aria-describedby={`${tableId}-title`}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-wrapper">
        <table 
          ref={tableRef}
          className="data-table"
          aria-labelledby={title ? `${tableId}-title` : undefined}
          aria-label={ariaLabel}
          role="table"
          aria-rowcount={processedData.length + 1}
          aria-describedby={`${tableId}-summary`}
        >
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`table-header ${column.sortable ? 'sortable' : ''}`}
                  style={{ width: column.width }}
                  aria-sort={
                    sortState?.key === column.key
                      ? sortState.direction === 'asc' ? 'ascending' : 'descending'
                      : column.sortable ? 'none' : undefined
                  }
                >
                  <button
                    className={`header-button ${column.sortable ? 'sortable' : ''}`}
                    onClick={() => column.sortable && handleSort(column.key)}
                    disabled={!column.sortable}
                    aria-label={
                      column.sortable
                        ? `Sort by ${column.label} ${
                            sortState?.key === column.key
                              ? sortState.direction === 'asc' ? 'descending' : 'ascending'
                              : 'ascending'
                          }`
                        : undefined
                    }
                  >
                    {column.label}
                    {column.sortable && (
                      <span className="sort-indicator" aria-hidden="true">
                        {sortState?.key === column.key
                          ? sortState.direction === 'asc' ? '↑' : '↓'
                          : '↕'}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length}
                  className="no-data"
                  role="status"
                  aria-live="polite"
                >
                  No data found
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={row.id}
                  className={`table-row ${onRowClick ? 'clickable' : ''}`}
                  onClick={() => onRowClick && handleRowClick(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleRowClick(row);
                    }
                  }}
                  role={onRowClick ? 'button' : undefined}
                  aria-label={onRowClick ? `Click to view details for row ${index + 1}` : undefined}
                  aria-rowindex={index + 2}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="table-cell">
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="data-table-pagination" role="navigation" aria-label="Table navigation">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
            aria-label="Go to previous page"
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
            aria-label="Go to next page"
          >
            Next
          </button>
        </div>
      )}

      {/* Results Summary */}
      <div 
        id={`${tableId}-summary`}
        className="data-table-summary" 
        role="status" 
        aria-live="polite"
      >
        Showing {paginatedData.length} of {processedData.length} results
        {filterText && ` filtered by "${filterText}"`}
      </div>
    </div>
  );
};

export default DataTable;
