import React, { useState, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { exportToCSV } from '../services/dataManager';
import { 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Search, 
  Trash2, 
  Edit 
} from 'lucide-react';

export default function DatasetExplorerView({ setActiveTab }) {
  const { filteredDataset, dataset, deleteFarmRecord } = usePlatform();
  
  // Local Search & Sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'Farm_ID', direction: 'asc' });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Reset page when dataset or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredDataset, searchTerm]);

  // Handle local searching across fields
  const searchedData = filteredDataset.filter(row => {
    const term = searchTerm.toLowerCase();
    return (
      row.Farm_ID.toLowerCase().includes(term) ||
      row.Crop_Type.toLowerCase().includes(term) ||
      row.Soil_Type.toLowerCase().includes(term) ||
      row.Irrigation_Type.toLowerCase().includes(term) ||
      row.Season.toLowerCase().includes(term)
    );
  });

  // Handle Sorting
  const sortedData = [...searchedData].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    if (typeof aVal === 'string') {
      return sortConfig.direction === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    } else {
      return sortConfig.direction === 'asc' 
        ? aVal - bVal 
        : bVal - aVal;
    }
  });

  // Handle Sort Toggle
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get current page slices
  const totalRows = sortedData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedData.slice(indexOfFirstRow, indexOfLastRow);

  // CSV Exporter Action
  const handleExport = () => {
    const csvContent = exportToCSV(sortedData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `agri_dataset_filtered_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Row deletion helper
  const handleDeleteRow = async (id) => {
    const matchingRecord = dataset.find(r => r.Farm_ID === id);
    if (!matchingRecord) return;
    
    if (window.confirm(`Are you sure you want to delete Farm Record ${id}?`)) {
      try {
        await deleteFarmRecord(matchingRecord.id);
        alert(`Farm Record ${id} deleted successfully.`);
      } catch (err) {
        console.error(err);
        alert("Error deleting record: " + err.message);
      }
    }
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={12} style={{ opacity: 0.4, marginLeft: '4px' }} />;
    return sortConfig.direction === 'asc' 
      ? <span style={{ marginLeft: '4px', color: 'var(--primary)' }}>▲</span> 
      : <span style={{ marginLeft: '4px', color: 'var(--primary)' }}>▼</span>;
  };

  return (
    <div className="content-body">
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '0.4rem 0.75rem', width: '300px' }}>
            <Search size={16} style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }} />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.85rem', fontFamily: 'var(--font-main)' }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setActiveTab('crud')}>
              + Add Record
            </button>
            <button className="btn btn-primary" onClick={handleExport}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Paginated Table */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('Farm_ID')}>Farm ID {getSortIndicator('Farm_ID')}</th>
                <th onClick={() => requestSort('Crop_Type')}>Crop Type {getSortIndicator('Crop_Type')}</th>
                <th onClick={() => requestSort('Farm_Area(acres)')}>Area (acres) {getSortIndicator('Farm_Area(acres)')}</th>
                <th onClick={() => requestSort('Irrigation_Type')}>Irrigation {getSortIndicator('Irrigation_Type')}</th>
                <th onClick={() => requestSort('Fertilizer_Used(tons)')}>Fertilizer (tons) {getSortIndicator('Fertilizer_Used(tons)')}</th>
                <th onClick={() => requestSort('Pesticide_Used(kg)')}>Pesticide (kg) {getSortIndicator('Pesticide_Used(kg)')}</th>
                <th onClick={() => requestSort('Yield(tons)')}>Yield (tons) {getSortIndicator('Yield(tons)')}</th>
                <th onClick={() => requestSort('Soil_Type')}>Soil Type {getSortIndicator('Soil_Type')}</th>
                <th onClick={() => requestSort('Season')}>Season {getSortIndicator('Season')}</th>
                <th onClick={() => requestSort('Water_Usage(cubic meters)')}>Water (m³) {getSortIndicator('Water_Usage(cubic meters)')}</th>
                <th style={{ cursor: 'default', color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map((row) => (
                  <tr key={row.Farm_ID}>
                    <td style={{ fontWeight: '600', color: 'var(--secondary)' }}>{row.Farm_ID}</td>
                    <td>{row.Crop_Type}</td>
                    <td>{row['Farm_Area(acres)'].toFixed(2)}</td>
                    <td>{row.Irrigation_Type}</td>
                    <td>{row['Fertilizer_Used(tons)'].toFixed(2)}</td>
                    <td>{row['Pesticide_Used(kg)'].toFixed(2)}</td>
                    <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{row['Yield(tons)'].toFixed(2)}</td>
                    <td>{row.Soil_Type}</td>
                    <td>{row.Season}</td>
                    <td>{row['Water_Usage(cubic meters)'].toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-sm" 
                          onClick={() => {
                            // Open CRUD editor with this row prefilled
                            setActiveTab('crud');
                            // Delay slightly to wait for render and select the record
                            setTimeout(() => {
                              const selectEl = document.getElementById('crud-select-farm');
                              if (selectEl) {
                                selectEl.value = row.Farm_ID;
                                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                              }
                            }, 50);
                          }}
                          title="Edit record"
                          style={{ padding: '0.25rem 0.4rem' }}
                        >
                          <Edit size={12} />
                        </button>
                        <button 
                          className="btn btn-sm btn-danger" 
                          onClick={() => handleDeleteRow(row.Farm_ID)}
                          title="Delete record"
                          style={{ padding: '0.25rem 0.4rem' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginator Controls */}
        {totalRows > 0 && (
          <div className="pagination-bar">
            <span>
              Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, totalRows)} of {totalRows} records
            </span>

            <div className="pagination-controls">
              <button 
                className="btn btn-sm" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontWeight: '500' }}>
                Page {currentPage} of {totalPages}
              </span>

              <button 
                className="btn btn-sm" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
