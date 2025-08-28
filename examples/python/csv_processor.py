"""
CSV Data Processor - Multi-Agent Collaboration Example

This file demonstrates how Claude and Codex can collaborate:
1. Claude generates initial implementation
2. Codex reviews for improvements
3. Claude integrates feedback
4. Codex validates final result

Usage:
    python csv_processor.py input.csv output.csv
"""

import csv
import sys
from typing import List, Dict, Any
from pathlib import Path


class CSVProcessor:
    """
    A CSV processor that demonstrates multi-agent collaboration patterns.
    
    This class was initially drafted by Claude Opus, then reviewed and
    improved through collaboration with Codex GPT-5.
    """
    
    def __init__(self, input_file: str, output_file: str):
        """
        Initialize the CSV processor.
        
        Args:
            input_file: Path to input CSV file
            output_file: Path to output CSV file
        """
        self.input_file = Path(input_file)
        self.output_file = Path(output_file)
        self.processed_rows = 0
        self.errors = []
    
    def validate_input(self) -> bool:
        """
        Validate input file exists and is readable.
        
        Returns:
            True if input is valid, False otherwise
        """
        if not self.input_file.exists():
            self.errors.append(f"Input file not found: {self.input_file}")
            return False
        
        if not self.input_file.is_file():
            self.errors.append(f"Input path is not a file: {self.input_file}")
            return False
            
        return True
    
    def process_csv(self) -> bool:
        """
        Process the CSV file with error handling and validation.
        
        Returns:
            True if processing succeeded, False otherwise
        """
        if not self.validate_input():
            return False
        
        try:
            with open(self.input_file, 'r', newline='', encoding='utf-8') as infile:
                reader = csv.DictReader(infile)
                
                # Validate headers
                if not reader.fieldnames:
                    self.errors.append("CSV file has no headers")
                    return False
                
                # Process rows
                processed_data = []
                for row_num, row in enumerate(reader, start=2):  # Start at 2 (1-indexed + header)
                    try:
                        processed_row = self._process_row(row, row_num)
                        if processed_row:
                            processed_data.append(processed_row)
                            self.processed_rows += 1
                    except Exception as e:
                        self.errors.append(f"Row {row_num}: {str(e)}")
                        continue
                
                # Write output
                if processed_data:
                    self._write_output(processed_data, reader.fieldnames)
                    return True
                else:
                    self.errors.append("No valid rows to process")
                    return False
                    
        except Exception as e:
            self.errors.append(f"File processing error: {str(e)}")
            return False
    
    def _process_row(self, row: Dict[str, Any], row_num: int) -> Dict[str, Any]:
        """
        Process a single CSV row.
        
        Args:
            row: Dictionary representing the CSV row
            row_num: Row number for error reporting
            
        Returns:
            Processed row data or None if invalid
        """
        # Basic validation - ensure all required fields exist
        required_fields = ['id', 'name', 'value']
        for field in required_fields:
            if field not in row or not row[field].strip():
                self.errors.append(f"Row {row_num}: Missing required field '{field}'")
                return None
        
        # Data type validation and conversion
        try:
            processed_row = {
                'id': int(row['id']),
                'name': row['name'].strip(),
                'value': float(row['value'])
            }
            
            # Business logic validation
            if processed_row['value'] < 0:
                self.errors.append(f"Row {row_num}: Negative value not allowed")
                return None
                
            return processed_row
            
        except (ValueError, TypeError) as e:
            self.errors.append(f"Row {row_num}: Data conversion error - {str(e)}")
            return None
    
    def _write_output(self, data: List[Dict[str, Any]], fieldnames: List[str]) -> None:
        """
        Write processed data to output file.
        
        Args:
            data: List of processed row dictionaries
            fieldnames: CSV column headers
        """
        with open(self.output_file, 'w', newline='', encoding='utf-8') as outfile:
            writer = csv.DictWriter(outfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get processing summary and any errors.
        
        Returns:
            Dictionary with processing statistics and errors
        """
        return {
            'input_file': str(self.input_file),
            'output_file': str(self.output_file),
            'processed_rows': self.processed_rows,
            'errors': self.errors,
            'success': len(self.errors) == 0
        }


def main():
    """
    Main function demonstrating CSV processing with error handling.
    """
    if len(sys.argv) != 3:
        print("Usage: python csv_processor.py input.csv output.csv")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    processor = CSVProcessor(input_file, output_file)
    
    print(f"Processing {input_file}...")
    success = processor.process_csv()
    
    summary = processor.get_summary()
    
    if success:
        print(f"✅ Successfully processed {summary['processed_rows']} rows")
        print(f"📁 Output written to: {summary['output_file']}")
    else:
        print("❌ Processing failed with errors:")
        for error in summary['errors']:
            print(f"   - {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
