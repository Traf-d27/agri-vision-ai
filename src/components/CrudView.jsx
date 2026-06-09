import React, { useState, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Save, 
  Trash2, 
  Upload, 
  CheckCircle, 
  AlertTriangle,
  History,
  X,
  Edit2,
  RotateCcw,
  AlertOctagon,
  Download,
  Info,
  Calendar,
  Layers,
  Activity,
  Droplet
} from 'lucide-react';

export default function CrudView() {
  const { 
    dataset, 
    createFarmRecord, 
    updateFarmRecord, 
    deleteFarmRecord, 
    uploadCsvDataset, 
    activityLog, 
    addLog,
    auth
  } = usePlatform();

  // Dialog & View States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [editingRecordId, setEditingRecordId] = useState(null); // database integer id

  // Notifications (toasts)
  const [toasts, setToasts] = useState([]);
  const [lastDeletedRecord, setLastDeletedRecord] = useState(null);

  // Form values state
  const [formValues, setFormValues] = useState({
    Farm_ID: '',
    Crop_Type: 'Cotton',
    'Farm_Area(acres)': 150,
    Irrigation_Type: 'Drip',
    'Fertilizer_Used(tons)': 5.0,
    'Pesticide_Used(kg)': 2.5,
    'Yield(tons)': 25.0,
    Soil_Type: 'Loamy',
    Season: 'Kharif',
    'Water_Usage(cubic meters)': 45000
  });

  // Bulk CSV pasting state
  const [csvPasteText, setCsvPasteText] = useState('');
  const [uploadStatus, setUploadStatus] = useState({ type: '', msg: '' });

  // Categories from dataset to populate dropdowns
  const [categories, setCategories] = useState({
    crops: ['Cotton', 'Carrot', 'Sugarcane', 'Tomato', 'Soybean', 'Rice', 'Maize', 'Wheat', 'Barley', 'Potato'],
    soils: ['Loamy', 'Peaty', 'Silty', 'Clay', 'Sandy'],
    irrigations: ['Sprinkler', 'Manual', 'Flood', 'Rain-fed', 'Drip'],
    seasons: ['Kharif', 'Zaid', 'Rabi']
  });

  // Extract categories dynamically
  useEffect(() => {
    if (dataset.length === 0) return;
    setCategories({
      crops: Array.from(new Set(dataset.map(r => r.Crop_Type))),
      soils: Array.from(new Set(dataset.map(r => r.Soil_Type))),
      irrigations: Array.from(new Set(dataset.map(r => r.Irrigation_Type))),
      seasons: Array.from(new Set(dataset.map(r => r.Season)))
    });
  }, [dataset]);

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const isNum = ['Farm_Area(acres)', 'Fertilizer_Used(tons)', 'Pesticide_Used(kg)', 'Yield(tons)', 'Water_Usage(cubic meters)'].includes(name);
    setFormValues(prev => ({
      ...prev,
      [name]: isNum ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  // Toast helper
  const showToast = (message, type = 'success', undoData = null) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, undoData }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  // Open Form for Adding
  const handleOpenAdd = () => {
    const ids = dataset.map(r => {
      const match = r.Farm_ID.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    });
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    const nextId = `F${String(maxId + 1).padStart(3, '0')}`;

    setFormValues({
      Farm_ID: nextId,
      Crop_Type: categories.crops[0] || 'Rice',
      'Farm_Area(acres)': 150,
      Irrigation_Type: categories.irrigations[0] || 'Drip',
      'Fertilizer_Used(tons)': 4.5,
      'Pesticide_Used(kg)': 2.5,
      'Yield(tons)': 25.0,
      Soil_Type: categories.soils[0] || 'Loamy',
      Season: categories.seasons[0] || 'Kharif',
      'Water_Usage(cubic meters)': 45000
    });
    setShowAddModal(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (record) => {
    setEditingRecordId(record.id);
    setFormValues({
      Farm_ID: record.Farm_ID,
      Crop_Type: record.Crop_Type,
      'Farm_Area(acres)': record['Farm_Area(acres)'],
      Irrigation_Type: record.Irrigation_Type,
      'Fertilizer_Used(tons)': record['Fertilizer_Used(tons)'],
      'Pesticide_Used(kg)': record['Pesticide_Used(kg)'],
      'Yield(tons)': record['Yield(tons)'],
      Soil_Type: record.Soil_Type,
      Season: record.Season,
      'Water_Usage(cubic meters)': record['Water_Usage(cubic meters)']
    });
    setShowEditDrawer(true);
  };

  // Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const exists = dataset.some(r => r.Farm_ID.trim().toLowerCase() === formValues.Farm_ID.trim().toLowerCase());
    if (exists) {
      showToast(`Record with Farm ID ${formValues.Farm_ID} already exists.`, 'error');
      return;
    }

    try {
      await createFarmRecord(formValues);
      addLog('create', `Created farm record ${formValues.Farm_ID} growing ${formValues.Crop_Type}.`);
      setShowAddModal(false);
      showToast(`✓ Farm Record Created Successfully: ${formValues.Farm_ID}`);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    }
  };

  // Update Submit
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateFarmRecord(editingRecordId, formValues);
      addLog('update', `Modified farm record ${formValues.Farm_ID} parameters.`);
      setShowEditDrawer(false);
      showToast(`✓ Farm Record Updated Successfully: ${formValues.Farm_ID}`);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    }
  };

  // Confirm Delete Drawer trigger
  const triggerDelete = (record) => {
    setDeleteConfirmTarget(record);
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    const target = deleteConfirmTarget;
    setDeleteConfirmTarget(null);

    try {
      await deleteFarmRecord(target.id);
      addLog('delete', `Deleted farm record ${target.Farm_ID} from the database.`);
      setLastDeletedRecord(target);
      
      // Close drawer if we were editing it
      if (editingRecordId === target.id) {
        setShowEditDrawer(false);
      }

      showToast(`✓ Farm Record ${target.Farm_ID} Deleted Successfully`, 'warning', target);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    }
  };

  // Undo Delete Handler
  const handleUndoDelete = async (record) => {
    if (!record) return;
    try {
      // Re-create the record
      const recordToRecreate = {
        Farm_ID: record.Farm_ID,
        Crop_Type: record.Crop_Type,
        'Farm_Area(acres)': record['Farm_Area(acres)'],
        Irrigation_Type: record.Irrigation_Type,
        'Fertilizer_Used(tons)': record['Fertilizer_Used(tons)'],
        'Pesticide_Used(kg)': record['Pesticide_Used(kg)'],
        'Yield(tons)': record['Yield(tons)'],
        Soil_Type: record.Soil_Type,
        Season: record.Season,
        'Water_Usage(cubic meters)': record['Water_Usage(cubic meters)']
      };
      await createFarmRecord(recordToRecreate);
      addLog('create', `Restored deleted farm record ${record.Farm_ID} via Undo.`);
      showToast(`✓ Farm Record ${record.Farm_ID} Restored Successfully!`);
      setLastDeletedRecord(null);
    } catch (err) {
      console.error(err);
      showToast("Restore failed: " + err.message, 'error');
    }
  };

  // Bulk CSV Upload
  const handleCSVUpload = async (e) => {
    e.preventDefault();
    if (!csvPasteText || !csvPasteText.trim()) {
      setUploadStatus({ type: 'error', msg: 'Please paste CSV content first.' });
      return;
    }

    try {
      setUploadStatus({ type: 'info', msg: 'Uploading and parsing CSV on backend...' });
      const response = await uploadCsvDataset(csvPasteText);
      addLog('import', `Bulk imported ${response.length} records into the database.`);
      setUploadStatus({ 
        type: 'success', 
        msg: `Successfully uploaded and seeded ${response.length} records in the backend database!` 
      });
      setCsvPasteText('');
      showToast(`✓ Bulk Import Completed: ${response.length} records loaded.`);
    } catch (err) {
      console.error(err);
      setUploadStatus({ type: 'error', msg: `Upload failed: ${err.message}` });
      showToast("CSV Import Failed: " + err.message, 'error');
    }
  };

  const loadPastingSample = () => {
    const sample = `Farm_ID,Crop_Type,Farm_Area(acres),Irrigation_Type,Fertilizer_Used(tons),Pesticide_Used(kg),Yield(tons),Soil_Type,Season,Water_Usage(cubic meters)
F101,Wheat,120.5,Drip,4.1,2.0,32.4,Loamy,Rabi,34000
F102,Maize,200.0,Flood,8.2,3.1,41.2,Clay,Kharif,82000
F103,Cotton,95.4,Sprinkler,3.8,1.2,19.5,Sandy,Zaid,28000`;
    setCsvPasteText(sample);
    setUploadStatus({ type: '', msg: '' });
  };

  // Style overrides for premium look
  const customStyles = `
    .premium-input {
      background: rgba(0,0,0,0.4) !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      color: #fff !important;
      border-radius: 8px !important;
      padding: 0.65rem 0.85rem !important;
      transition: all 0.2s;
    }
    .premium-input:focus {
      border-color: var(--primary) !important;
      box-shadow: 0 0 10px rgba(16,185,129,0.15) !important;
      outline: none;
    }
    .badge-role {
      font-size: 0.65rem;
      text-transform: uppercase;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }
    .badge-admin { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
    .badge-analyst { background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); }
    .badge-viewer { background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3); }
    
    .timeline-item {
      position: relative;
      padding-left: 24px;
      border-left: 1px dashed rgba(255,255,255,0.1);
      padding-bottom: 1rem;
    }
    .timeline-item:last-child {
      border-left: none;
      padding-bottom: 0;
    }
    .timeline-dot {
      position: absolute;
      left: -5px;
      top: 3px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }
  `;

  return (
    <div className="content-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 2rem' }}>
      <style>{customStyles}</style>

      {/* Header action bar */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2>Agricultural Database Operations</h2>
            <span className={`badge-role badge-${auth.role || 'viewer'}`}>
              {auth.role || 'viewer'} Account
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
            Add new farm coordinates, edit production yields, or run bulk dataset imports.
          </p>
        </div>

        <motion.button 
          whileHover={{ scale: 1.03, boxShadow: '0 0 15px rgba(16,185,129,0.3)' }}
          whileTap={{ scale: 0.98 }}
          className="btn btn-primary" 
          onClick={handleOpenAdd}
        >
          <Plus size={16} /> Add Farm Record
        </motion.button>
      </div>

      {/* Main split grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
        
        {/* Left Side: Table of All Records */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Active Farm Datatable</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Showing {dataset.length} geocoded locations
            </span>
          </div>

          <div className="table-wrapper" style={{ maxHeight: '460px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: '#070f0b' }}>
                  <th>Farm ID</th>
                  <th>Crop Type</th>
                  <th>Area (ac)</th>
                  <th>Irrigation</th>
                  <th>Yield (t)</th>
                  <th>Soil Type</th>
                  <th>Season</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {dataset.map(r => (
                    <motion.tr 
                      key={r.Farm_ID}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.015)' }}
                      style={{ transition: 'background-color 0.15s' }}
                    >
                      <td style={{ fontWeight: '700', color: 'var(--primary)' }}>{r.Farm_ID}</td>
                      <td style={{ fontWeight: '600' }}>{r.Crop_Type}</td>
                      <td>{r['Farm_Area(acres)'].toFixed(1)}</td>
                      <td>{r.Irrigation_Type}</td>
                      <td style={{ fontWeight: '700', color: 'var(--secondary)' }}>{r['Yield(tons)'].toFixed(1)}t</td>
                      <td>{r.Soil_Type}</td>
                      <td>{r.Season}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button 
                            className="btn btn-sm btn-outline" 
                            style={{ padding: '0.3rem 0.5rem' }}
                            onClick={() => handleOpenEdit(r)}
                            title="Edit Record Parameters"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            className="btn btn-sm btn-outline" 
                            style={{ padding: '0.3rem 0.5rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                            onClick={() => triggerDelete(r)}
                            title="Delete Record"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Bulk Uploader & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Bulk CSV Uploader */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3>CSV Bulk Importer</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Paste raw CSV spreadsheet rows with headers to append or update agricultural data records.
            </p>

            <form onSubmit={handleCSVUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <textarea 
                className="form-control premium-input"
                placeholder="Farm_ID,Crop_Type,Farm_Area(acres),..."
                value={csvPasteText}
                onChange={(e) => setCsvPasteText(e.target.value)}
                style={{ width: '100%', height: '110px', fontFamily: 'monospace', fontSize: '0.7rem', resize: 'none' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline"
                  onClick={loadPastingSample}
                  style={{ fontSize: '0.7rem' }}
                >
                  Load CSV Template
                </button>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.7rem' }}
                >
                  <Upload size={12} /> Import Dataset
                </button>
              </div>
            </form>

            {uploadStatus.msg && (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.65rem', 
                  borderRadius: '8px', 
                  fontSize: '0.75rem',
                  border: '1px solid',
                  backgroundColor: uploadStatus.type === 'success' ? 'rgba(16,185,129,0.08)' : uploadStatus.type === 'info' ? 'rgba(59,130,246,0.08)' : 'rgba(239,68,68,0.08)',
                  borderColor: uploadStatus.type === 'success' ? 'rgba(16,185,129,0.2)' : uploadStatus.type === 'info' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)',
                  color: uploadStatus.type === 'success' ? 'var(--primary)' : uploadStatus.type === 'info' ? '#3b82f6' : 'var(--danger)'
                }}
              >
                {uploadStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                <span>{uploadStatus.msg}</span>
              </div>
            )}
          </div>

          {/* Database timeline activity feed */}
          <div className="glass-card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
              <History size={16} style={{ color: 'var(--secondary)' }} /> Database Audit Timeline
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {activityLog.length === 0 ? (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textAlign: 'center', padding: '1rem' }}>No recent operations.</span>
              ) : (
                activityLog.map((log, idx) => {
                  let color = '#94a3b8';
                  if (log.type === 'create') color = '#10b981';
                  if (log.type === 'update') color = '#3b82f6';
                  if (log.type === 'delete') color = '#ef4444';
                  if (log.type === 'import') color = '#f59e0b';

                  return (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-dot" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ fontWeight: '600', color: '#fff' }}>{log.desc}</span>
                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginLeft: '8px' }}>{log.time}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ----------------- MODAL: Add Record ----------------- */}
      <AnimatePresence>
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <motion.div 
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              className="glass-card" 
              style={{ width: '100%', maxWidth: '640px', padding: '2rem', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                  <Plus size={20} /> Create New Agricultural Record
                </h3>
                <button className="btn btn-outline" style={{ padding: '0.25rem', border: 'none' }} onClick={() => setShowAddModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Farm ID *</label>
                    <input 
                      type="text" 
                      name="Farm_ID" 
                      className="premium-input" 
                      value={formValues.Farm_ID} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Crop Type</label>
                    <select name="Crop_Type" className="premium-input" value={formValues.Crop_Type} onChange={handleInputChange}>
                      {categories.crops.map(c => <option key={c} value={c} style={{ backgroundColor: '#0d1e17' }}>{c}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Farm Area (acres) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="Farm_Area(acres)" 
                      className="premium-input" 
                      value={formValues['Farm_Area(acres)']} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Irrigation Type</label>
                    <select name="Irrigation_Type" className="premium-input" value={formValues.Irrigation_Type} onChange={handleInputChange}>
                      {categories.irrigations.map(i => <option key={i} value={i} style={{ backgroundColor: '#0d1e17' }}>{i}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fertilizer Used (tons) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="Fertilizer_Used(tons)" 
                      className="premium-input" 
                      value={formValues['Fertilizer_Used(tons)']} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pesticide Used (kg) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="Pesticide_Used(kg)" 
                      className="premium-input" 
                      value={formValues['Pesticide_Used(kg)']} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Yield Output (tons) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="Yield(tons)" 
                      className="premium-input" 
                      value={formValues['Yield(tons)']} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Soil Type</label>
                    <select name="Soil_Type" className="premium-input" value={formValues.Soil_Type} onChange={handleInputChange}>
                      {categories.soils.map(s => <option key={s} value={s} style={{ backgroundColor: '#0d1e17' }}>{s}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Season</label>
                    <select name="Season" className="premium-input" value={formValues.Season} onChange={handleInputChange}>
                      {categories.seasons.map(s => <option key={s} value={s} style={{ backgroundColor: '#0d1e17' }}>{s}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Water Usage (m³) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="Water_Usage(cubic meters)" 
                      className="premium-input" 
                      value={formValues['Water_Usage(cubic meters)']} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>

                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flexGrow: 1 }} onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1.5 }}>
                    <Save size={16} /> Create Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- DRAWER: Edit Record ----------------- */}
      <AnimatePresence>
        {showEditDrawer && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="glass-card" 
              style={{ width: '100%', maxWidth: '440px', height: '100%', borderRadius: 0, padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
                  <Edit2 size={18} /> Edit Farm {formValues.Farm_ID}
                </h3>
                <button className="btn btn-outline" style={{ padding: '0.25rem', border: 'none' }} onClick={() => setShowEditDrawer(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Crop Type</label>
                    <select name="Crop_Type" className="premium-input" value={formValues.Crop_Type} onChange={handleInputChange}>
                      {categories.crops.map(c => <option key={c} value={c} style={{ backgroundColor: '#0d1e17' }}>{c}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Farm Area (acres) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="Farm_Area(acres)" 
                      className="premium-input" 
                      value={formValues['Farm_Area(acres)']} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Irrigation Type</label>
                    <select name="Irrigation_Type" className="premium-input" value={formValues.Irrigation_Type} onChange={handleInputChange}>
                      {categories.irrigations.map(i => <option key={i} value={i} style={{ backgroundColor: '#0d1e17' }}>{i}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fertilizer Used (tons) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="Fertilizer_Used(tons)" 
                      className="premium-input" 
                      value={formValues['Fertilizer_Used(tons)']} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pesticide Used (kg) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="Pesticide_Used(kg)" 
                      className="premium-input" 
                      value={formValues['Pesticide_Used(kg)']} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Yield Output (tons) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="Yield(tons)" 
                      className="premium-input" 
                      value={formValues['Yield(tons)']} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Soil Type</label>
                    <select name="Soil_Type" className="premium-input" value={formValues.Soil_Type} onChange={handleInputChange}>
                      {categories.soils.map(s => <option key={s} value={s} style={{ backgroundColor: '#0d1e17' }}>{s}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Season</label>
                    <select name="Season" className="premium-input" value={formValues.Season} onChange={handleInputChange}>
                      {categories.seasons.map(s => <option key={s} value={s} style={{ backgroundColor: '#0d1e17' }}>{s}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Water Usage (m³) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="Water_Usage(cubic meters)" 
                      className="premium-input" 
                      value={formValues['Water_Usage(cubic meters)']} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>

                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                    <Save size={16} /> Save Changes
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                    onClick={() => triggerDelete({ id: editingRecordId, Farm_ID: formValues.Farm_ID })}
                  >
                    <Trash2 size={16} /> Delete Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- MODAL: Delete Confirm ----------------- */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card" 
              style={{ width: '100%', maxWidth: '400px', padding: '2rem', border: '1px solid rgba(239,68,68,0.25)', textAlign: 'center' }}
            >
              <AlertOctagon size={44} style={{ color: '#ef4444', margin: '0 auto 1rem auto' }} />
              <h3>Confirm Deletion</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.75rem 0 1.5rem 0', lineHeight: 1.4 }}>
                Are you absolutely sure you want to delete farm record <strong style={{ color: '#fff' }}>{deleteConfirmTarget.Farm_ID}</strong>? This operation will remove geocoded points and regional stats.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-outline" style={{ flexGrow: 1 }} onClick={() => setDeleteConfirmTarget(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger" style={{ flexGrow: 1 }} onClick={handleConfirmDelete}>
                  Delete Farm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- NOTIFICATION TOASTS ----------------- */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1200, display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none' }}>
        <AnimatePresence>
          {toasts.map(toast => {
            let color = 'rgba(16,185,129,0.15)';
            let border = '1px solid rgba(16,185,129,0.3)';
            let text = 'var(--primary)';
            if (toast.type === 'error') {
              color = 'rgba(239,68,68,0.15)';
              border = '1px solid rgba(239,68,68,0.3)';
              text = 'var(--danger)';
            } else if (toast.type === 'warning') {
              color = 'rgba(245,158,11,0.15)';
              border = '1px solid rgba(245,158,11,0.3)';
              text = 'var(--warning)';
            }

            return (
              <motion.div 
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="glass-card" 
                style={{ 
                  pointerEvents: 'auto',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '1rem 1.25rem', 
                  width: '320px', 
                  background: 'rgba(10,20,15,0.85)', 
                  backdropFilter: 'blur(10px)',
                  border,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}
              >
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: text }}>
                    {toast.type === 'error' ? '✖ Operation Failed' : '✓ Success Notification'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#fff', lineHeight: 1.3 }}>{toast.message}</span>
                </div>

                {toast.undoData && (
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '3px 8px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '2px', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--warning)', background: 'rgba(245,158,11,0.05)' }}
                    onClick={() => handleUndoDelete(toast.undoData)}
                  >
                    <RotateCcw size={10} /> Undo
                  </button>
                )}

                <button 
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
}
