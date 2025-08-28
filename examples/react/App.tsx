import React, { useState } from 'react';
import { DataTable } from './DataTable';
import './DataTable.css';

type Row = {
  id: number;
  name: string;
  value: number;
};

const initialData: Row[] = [
  { id: 1, name: 'Product A', value: 25.5 },
  { id: 2, name: 'Product B', value: 30.0 },
  { id: 3, name: 'Product C', value: 15.75 },
  { id: 4, name: 'Product D', value: 45.25 },
  { id: 5, name: 'Product E', value: 12.0 },
  { id: 6, name: 'Product F', value: 18.0 },
  { id: 7, name: 'Product G', value: 9.5 },
  { id: 8, name: 'Product H', value: 22.0 },
  { id: 9, name: 'Product I', value: 40.0 },
  { id: 10, name: 'Product J', value: 33.0 },
  { id: 11, name: 'Product K', value: 27.25 },
];

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'value', label: 'Value', sortable: true, render: (v: number) => `$${v.toFixed(2)}` },
];

export default function App() {
  const [data, setData] = useState<Row[]>(initialData);

  return (
    <div style={{ padding: 16 }}>
      <DataTable
        title="Products"
        aria-label="Products data table"
        data={data}
        columns={columns}
        onRowClick={(row) => console.log('Row clicked:', row)}
        onSort={(key, dir) => console.log('Sort changed:', key, dir)}
      />

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={() => setData(initialData)}>Reset</button>
        <button onClick={() => setData([])}>Clear</button>
      </div>
    </div>
  );
}

