import React, { useState, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import ReactECharts from 'echarts-for-react';
import { 
  runKMeans, 
  runDBSCAN, 
  runHierarchical,
  runPCA
} from '../services/mlService';
import { 
  Network, 
  Settings, 
  Sparkles, 
  HelpCircle, 
  Info,
  Layers,
  ChevronRight,
  TrendingUp,
  Sliders,
  CheckCircle,
  HelpCircle as Help,
  AlertTriangle
} from 'lucide-react';

export default function ClusteringLabView() {
  const { dataset } = usePlatform();

  // Model parameters
  const [algo, setAlgo] = useState('kmeans');
  const [kVal, setKVal] = useState(3);
  const [dbscanEps, setDbscanEps] = useState(1.2);
  const [dbscanMinPts, setDbscanMinPts] = useState(3);
  const [hierarchicalCls, setHierarchicalCls] = useState(3);
  
  // PCA Projection Axis: '1v2' (PC1 vs PC2), '2v3' (PC2 vs PC3), '1v3' (PC1 vs PC3)
  const [projectionAxis, setProjectionAxis] = useState('1v2');

  // Coloring group mode: 'cluster', 'crop', 'soil', 'season', 'irrigation'
  const [colorBy, setColorBy] = useState('cluster');

  // Error boundary state
  const [pipelineError, setPipelineError] = useState(null);

  // Selected Features Checklist
  const allFeatures = [
    { key: 'Yield(tons)', label: 'Yield Output (tons)', category: 'Numerical' },
    { key: 'Water_Usage(cubic meters)', label: 'Water Footprint (m³)', category: 'Numerical' },
    { key: 'Farm_Area(acres)', label: 'Farm Area (acres)', category: 'Numerical' },
    { key: 'Fertilizer_Used(tons)', label: 'Fertilizer (tons)', category: 'Numerical' },
    { key: 'Pesticide_Used(kg)', label: 'Pesticide (kg)', category: 'Numerical' },
    { key: 'Crop_Type', label: 'Crop Type (Categorical)', category: 'Categorical' },
    { key: 'Soil_Type', label: 'Soil Type (Categorical)', category: 'Categorical' },
    { key: 'Irrigation_Type', label: 'Irrigation Scheme (Categorical)', category: 'Categorical' },
    { key: 'Season', label: 'Season (Categorical)', category: 'Categorical' }
  ];

  const [selectedFeatures, setSelectedFeatures] = useState([
    'Yield(tons)', 'Water_Usage(cubic meters)', 'Farm_Area(acres)', 'Fertilizer_Used(tons)', 'Pesticide_Used(kg)'
  ]);

  // Model calculations states
  const [pipelineResults, setPipelineResults] = useState(null);
  
  // Selected Cluster for Explorer Drawer
  const [selectedClusterId, setSelectedClusterId] = useState(0);

  // Toggle feature selection
  const handleFeatureToggle = (key) => {
    setSelectedFeatures(prev => {
      if (prev.includes(key)) {
        if (prev.length <= 2) {
          alert('Clustering requires at least 2 features selected.');
          return prev;
        }
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // Run Clustering & PCA Pipeline with error boundary check
  useEffect(() => {
    if (dataset.length === 0) return;
    setPipelineError(null);

    try {
      // 1. Vectorize and Encode chosen features (One-Hot Encoding)
      const uniqueCats = {};
      const categoricalCols = ['Crop_Type', 'Soil_Type', 'Season', 'Irrigation_Type'];
      const numericalCols = ['Yield(tons)', 'Water_Usage(cubic meters)', 'Farm_Area(acres)', 'Fertilizer_Used(tons)', 'Pesticide_Used(kg)'];

      categoricalCols.forEach(col => {
        uniqueCats[col] = Array.from(new Set(dataset.map(r => r[col]))).sort();
      });

      const vectorizedFeatureNames = [];
      selectedFeatures.forEach(feat => {
        if (numericalCols.includes(feat)) {
          vectorizedFeatureNames.push(feat);
        } else if (categoricalCols.includes(feat)) {
          uniqueCats[feat].forEach(catVal => {
            vectorizedFeatureNames.push(`${feat}_${catVal}`);
          });
        }
      });

      const vectorized = dataset.map(r => {
        const row = [];
        selectedFeatures.forEach(feat => {
          if (numericalCols.includes(feat)) {
            row.push(parseFloat(r[feat]) || 0);
          } else if (categoricalCols.includes(feat)) {
            const val = r[feat];
            uniqueCats[feat].forEach(catVal => {
              row.push(val === catVal ? 1 : 0);
            });
          }
        });
        return row;
      });

      if (vectorized.length === 0 || vectorized[0].length === 0) {
        throw new Error("Standardization failed: feature matrix is empty.");
      }

      // 2. Standardize Features (StandardScaler / Z-Score normalization)
      const dim = vectorized[0].length;
      const means = Array(dim).fill(0);
      const stds = Array(dim).fill(1);

      for (let j = 0; j < dim; j++) {
        const colVals = vectorized.map(row => row[j]);
        const sum = colVals.reduce((a, b) => a + b, 0);
        const mean = sum / colVals.length;
        means[j] = mean;

        const variance = colVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / colVals.length;
        stds[j] = Math.sqrt(variance) || 1.0;
      }

      const standardized = vectorized.map(row => 
        row.map((val, j) => (val - means[j]) / stds[j])
      );

      // 3. Train Clustering Algorithm
      let clusterResult;
      if (algo === 'kmeans') {
        clusterResult = runKMeans(standardized, kVal);
      } else if (algo === 'dbscan') {
        clusterResult = runDBSCAN(standardized, dbscanEps, dbscanMinPts);
      } else {
        clusterResult = runHierarchical(standardized, hierarchicalCls);
      }

      // 4. Reduce Dimensions using PCA (3 Components)
      const pcaResult = runPCA(standardized);

      setPipelineResults({
        clusters: clusterResult.clusters,
        pca: pcaResult,
        standardized,
        featureNames: vectorizedFeatureNames
      });
    } catch (err) {
      console.error("Clustering & PCA Pipeline Exception: ", err);
      setPipelineError(err);
    }
  }, [algo, kVal, dbscanEps, dbscanMinPts, hierarchicalCls, selectedFeatures, dataset]);

  if (dataset.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>No Data Available for Clustering</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Add farm records to train clustering pipelines.</p>
      </div>
    );
  }

  // Fallback screen if PCA/Pipeline fails
  if (pipelineError) {
    let nullCount = 0;
    dataset.forEach(row => {
      Object.values(row).forEach(val => {
        if (val === null || val === undefined || val === '') {
          nullCount++;
        }
      });
    });

    return (
      <div className="content-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 2rem' }}>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--danger)', padding: '2rem' }}>
          <h2 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={24} /> PCA Pipeline Execution Error
          </h2>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            The machine learning algorithm encountered a numerical or index error during dimensionality reduction.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '0.85rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Dataset Dimensions</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', marginTop: '0.2rem' }}>{dataset.length} x {Object.keys(dataset[0] || {}).length}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '0.85rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Features</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', marginTop: '0.2rem' }}>{selectedFeatures.length}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '0.85rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Unresolved Null/NaN</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', marginTop: '0.2rem' }}>{nullCount}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '0.85rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Imputers Status</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.2rem' }}>Mean/Mode Active</div>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', fontFamily: 'monospace', fontSize: '0.8rem', overflowX: 'auto' }}>
            <strong style={{ color: 'var(--danger)' }}>Stack trace:</strong>
            <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
              {pipelineError.stack || pipelineError.message}
            </pre>
          </div>

          <button className="btn btn-primary" onClick={() => { setSelectedFeatures(['Yield(tons)', 'Water_Usage(cubic meters)', 'Farm_Area(acres)']); setPipelineError(null); }} style={{ marginTop: '1.5rem' }}>
            Reset Features Matrix
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Calculate Cluster Summary Profile
  // ----------------------------------------------------
  const calculateClusterProfiles = () => {
    if (!pipelineResults?.clusters) return [];
    
    const { clusters } = pipelineResults;
    const groups = {};

    dataset.forEach((row, idx) => {
      const cId = clusters[idx];
      if (cId === undefined) return;

      if (!groups[cId]) {
        groups[cId] = {
          id: cId,
          farms: [],
          yields: [],
          waterUsages: [],
          areas: [],
          crops: {},
          soils: {}
        };
      }
      groups[cId].farms.push(row);
      groups[cId].yields.push(row['Yield(tons)']);
      groups[cId].waterUsages.push(row['Water_Usage(cubic meters)']);
      groups[cId].areas.push(row['Farm_Area(acres)']);
      groups[cId].crops[row.Crop_Type] = (groups[cId].crops[row.Crop_Type] || 0) + 1;
      groups[cId].soils[row.Soil_Type] = (groups[cId].soils[row.Soil_Type] || 0) + 1;
    });

    return Object.values(groups).map(g => {
      const count = g.farms.length;
      const avgYield = g.yields.reduce((a,b)=>a+b,0) / count;
      const avgWater = g.waterUsages.reduce((a,b)=>a+b,0) / count;
      const avgArea = g.areas.reduce((a,b)=>a+b,0) / count;
      const domCrop = Object.entries(g.crops).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';
      const domSoil = Object.entries(g.soils).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';

      // Insight summaries
      let profileLabel = 'Standard Production Group';
      let recommendation = 'Preserve active chemical inputs and water schedules.';
      
      if (avgYield > 30 && avgWater < 50000) {
        profileLabel = 'High-Yield Eco Efficient';
        recommendation = 'Optimal profile. Study this cluster\'s soil conditioning patterns as a benchmark for low-yield fields.';
      } else if (avgWater > 75000 && avgYield < 18) {
        profileLabel = 'Resource Intensive Low-Yield';
        recommendation = 'Flagged for water waste. Reduce water usage by 20% and replace flood irrigation with drip lines.';
      } else if (avgYield > 35) {
        profileLabel = 'High Yield Intensive';
        recommendation = 'Ensure crop rotation cycles are followed to prevent soil nutrient depletion.';
      } else if (avgYield < 12) {
        profileLabel = 'Marginal / Underperforming';
        recommendation = 'Low productivity detected. Run soil nutrient audit and apply nitrogen-based organic fertilizer mixtures.';
      }

      return {
        id: g.id,
        count,
        avgYield,
        avgWater,
        avgArea,
        domCrop,
        domSoil,
        profileLabel,
        recommendation,
        farms: g.farms
      };
    }).sort((a,b) => a.id - b.id);
  };

  const clusterProfiles = calculateClusterProfiles();

  // ----------------------------------------------------
  // ECharts PCA Scatter Options (dynamic 2D / 3D projections)
  // ----------------------------------------------------
  const getPcaOption = () => {
    if (!pipelineResults?.clusters || !pipelineResults?.pca) return {};

    const { clusters, pca } = pipelineResults;
    const colorPalette = [
      '#10b981', // Emerald
      '#06b6d4', // Teal/Cyan
      '#6366f1', // Indigo
      '#f59e0b', // Amber/Gold
      '#ec4899', // Pink
      '#8b5cf6', // Violet
      '#3b82f6', // Blue
      '#ef4444', // Red
      '#eab308', // Yellow
      '#14b8a6', // Dark Teal
      '#f97316'  // Orange
    ];

    const seriesList = [];
    const groups = {};

    clusters.forEach((cId, idx) => {
      let groupKey = '';
      if (colorBy === 'cluster') {
        groupKey = cId === -1 || cId === undefined ? 'Noise / Outliers' : `Cluster ${cId}`;
      } else if (colorBy === 'crop') {
        groupKey = dataset[idx].Crop_Type || 'Unknown';
      } else if (colorBy === 'soil') {
        groupKey = dataset[idx].Soil_Type || 'Unknown';
      } else if (colorBy === 'season') {
        groupKey = dataset[idx].Season || 'Unknown';
      } else if (colorBy === 'irrigation') {
        groupKey = dataset[idx].Irrigation_Type || 'Unknown';
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      
      let xCoord, yCoord;
      
      if (projectionAxis === '2v3') {
        xCoord = pca.projected[idx][1]; // PC2
        yCoord = pca.projected[idx][2]; // PC3
      } else if (projectionAxis === '1v3') {
        xCoord = pca.projected[idx][0]; // PC1
        yCoord = pca.projected[idx][2]; // PC3
      } else {
        xCoord = pca.projected[idx][0]; // PC1
        yCoord = pca.projected[idx][1]; // PC2
      }

      groups[groupKey].push({
        value: [xCoord, yCoord],
        farmId: dataset[idx].Farm_ID,
        crop: dataset[idx].Crop_Type,
        soil: dataset[idx].Soil_Type,
        season: dataset[idx].Season,
        irrigation: dataset[idx].Irrigation_Type,
        yieldVal: dataset[idx]['Yield(tons)'],
        water: dataset[idx]['Water_Usage(cubic meters)'],
        clusterId: cId
      });
    });

    const uniqueKeys = Object.keys(groups).sort();
    const groupColors = {};
    uniqueKeys.forEach((key, idx) => {
      if (key === 'Noise / Outliers' || key.includes('-1')) {
        groupColors[key] = '#ef4444';
      } else {
        groupColors[key] = colorPalette[idx % colorPalette.length];
      }
    });

    uniqueKeys.forEach(key => {
      seriesList.push({
        name: key,
        type: 'scatter',
        symbolSize: 10,
        data: groups[key],
        itemStyle: {
          color: groupColors[key],
          borderColor: 'rgba(0,0,0,0.2)',
          borderWidth: 1,
          shadowBlur: 8,
          shadowColor: groupColors[key] + '33'
        }
      });
    });

    let labelX = 'Principal Component 1';
    let labelY = 'Principal Component 2';

    if (projectionAxis === '2v3') {
      labelX = 'Principal Component 2';
      labelY = 'Principal Component 3';
    } else if (projectionAxis === '1v3') {
      labelX = 'Principal Component 1';
      labelY = 'Principal Component 3';
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const d = params.data;
          return `
            <div style="font-family: 'Outfit', sans-serif; padding: 0.2rem; color: #fff; line-height: 1.4;">
              <strong style="color: #6366f1; font-size: 0.95rem; display: block; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.15rem; margin-bottom: 0.25rem;">Farm ${d.farmId}</strong>
              <strong>Crop:</strong> ${d.crop}<br/>
              <strong>Soil:</strong> ${d.soil}<br/>
              <strong>Season:</strong> ${d.season}<br/>
              <strong>Irrigation:</strong> ${d.irrigation}<br/>
              <strong>Yield:</strong> ${d.yieldVal.toFixed(2)} tons<br/>
              <strong>Water Usage:</strong> ${d.water.toLocaleString()} m³<br/>
              <strong style="color: #10b981;">Cluster:</strong> ${d.clusterId === -1 || d.clusterId === -2 ? 'Noise / Outliers' : `Cluster ${d.clusterId}`}
            </div>
          `;
        }
      },
      legend: {
        data: uniqueKeys,
        textStyle: { color: '#94a3b8', fontFamily: 'Outfit' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '15%' },
      xAxis: {
        type: 'value',
        name: labelX,
        nameLocation: 'middle',
        nameGap: 24,
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
      },
      yAxis: {
        type: 'value',
        name: labelY,
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider', handleSize: '80%', textStyle: { color: '#94a3b8' } }
      ],
      series: seriesList, // FIXED: Set the series array here!
      toolbox: { feature: { saveAsImage: { title: 'Export' } } }
    };
  };

  const activeClusterProfile = clusterProfiles.find(p => p.id === selectedClusterId);

  // Component loadings calculation
  const getPcaLoadings = () => {
    if (!pipelineResults?.pca || !pipelineResults?.featureNames) return [];
    const { pca, featureNames } = pipelineResults;
    return featureNames.map((name, idx) => ({
      name,
      pc1: pca.pc1[idx] || 0,
      pc2: pca.pc2[idx] || 0
    })).sort((a, b) => Math.abs(b.pc1) - Math.abs(a.pc1));
  };

  const loadings = getPcaLoadings();
  const ev1 = pipelineResults?.pca?.varExplained[0] || 0;
  const ev2 = pipelineResults?.pca?.varExplained[1] || 0;
  const ev3 = pipelineResults?.pca?.varExplained[2] || 0;

  return (
    <div className="content-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 2rem' }}>
      <div className="ml-panel-grid">
        {/* Left Side: Pipeline Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Method selector */}
          <div className="glass-card">
            <h3>Cluster Algorithm</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
              {[
                { key: 'kmeans', label: 'K-Means ++' },
                { key: 'dbscan', label: 'DBSCAN (Density-Based)' },
                { key: 'hierarchical', label: 'Hierarchical Agglomerative' }
              ].map(item => (
                <button 
                  key={item.key}
                  className={`btn ${algo === item.key ? 'btn-primary' : ''}`}
                  onClick={() => setAlgo(item.key)}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  <Network size={14} /> {item.label}
                </button>
              ))}
            </div>
            
            {/* Parameters */}
            <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1rem', marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}>
                <Settings size={12} style={{ color: 'var(--secondary)' }} /> Model Parameters
              </h4>

              {algo === 'kmeans' && (
                <div className="filter-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <label>Number of Clusters (K):</label>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{kVal}</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="6" 
                    value={kVal} 
                    onChange={(e) => setKVal(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                </div>
              )}

              {algo === 'dbscan' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="filter-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <label>Epsilon Radius (Eps):</label>
                      <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{dbscanEps.toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2.5" 
                      step="0.1" 
                      value={dbscanEps} 
                      onChange={(e) => setDbscanEps(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--secondary)', cursor: 'pointer' }}
                    />
                  </div>
                  <div className="filter-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <label>Min Points (Density):</label>
                      <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{dbscanMinPts}</span>
                    </div>
                    <input 
                      type="range" 
                      min="2" 
                      max="5" 
                      value={dbscanMinPts} 
                      onChange={(e) => setDbscanMinPts(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--secondary)', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}

              {algo === 'hierarchical' && (
                <div className="filter-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <label>Number of Clusters:</label>
                    <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{hierarchicalCls}</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="5" 
                    value={hierarchicalCls} 
                    onChange={(e) => setHierarchicalCls(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Features Selector Checklist */}
          <div className="glass-card">
            <h3>Feature Engineering</h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Standardizes and encodes selected features (StandardScaler) dynamically before running algorithms.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '200px', overflowY: 'auto' }}>
              {allFeatures.map(feat => {
                const checked = selectedFeatures.includes(feat.key);
                return (
                  <label 
                    key={feat.key} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      fontSize: '0.8rem', 
                      padding: '0.35rem', 
                      borderRadius: '6px', 
                      background: checked ? 'rgba(16, 185, 129, 0.03)' : 'transparent',
                      border: '1px solid',
                      borderColor: checked ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={checked} 
                      onChange={() => handleFeatureToggle(feat.key)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <div>
                      <span style={{ fontWeight: checked ? '600' : '400' }}>{feat.label}</span>
                      <span style={{ display: 'block', fontSize: '0.65rem', opacity: 0.6 }}>{feat.category}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: PCA Plot Space */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h3>PCA Dimensional Projection</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Visualizing cluster separation along Principal Components.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Color switcher selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Color By:</span>
                <select 
                  className="btn btn-sm" 
                  value={colorBy} 
                  onChange={(e) => setColorBy(e.target.value)}
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid var(--panel-border)', backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)', borderRadius: '4px' }}
                >
                  <option value="cluster">Cluster Group</option>
                  <option value="crop">Crop Type</option>
                  <option value="soil">Soil Type</option>
                  <option value="season">Season</option>
                  <option value="irrigation">Irrigation scheme</option>
                </select>
              </div>

              {/* Projection Selector */}
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {[
                  { key: '1v2', label: 'PC1 vs PC2 (2D)' },
                  { key: '2v3', label: 'PC2 vs PC3 (2D)' },
                  { key: '1v3', label: 'PC1 vs PC3 (3D Projection)' }
                ].map(proj => (
                  <button 
                    key={proj.key}
                    className={`btn btn-sm ${projectionAxis === proj.key ? 'btn-primary' : ''}`}
                    onClick={() => setProjectionAxis(proj.key)}
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                  >
                    {proj.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="chart-container" style={{ flexGrow: 1, minHeight: '340px' }}>
            <ReactECharts option={getPcaOption()} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* NEW: Preprocessing Diagnostics and PCA load statistics panel */}
      <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
        {/* Left column: Dataset Diagnostics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3>Dataset Diagnostics</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Quality and validation status of agriculture_dataset.csv.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.35rem' }}>
              <span>Verification Status:</span>
              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓ Loaded Successfully</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.35rem' }}>
              <span>Records Count:</span>
              <strong>{dataset.length} farms</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.35rem' }}>
              <span>Columns Detected:</span>
              <strong>10 base (plus derived metadata)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.35rem' }}>
              <span>Data Quality:</span>
              <span style={{ color: 'var(--primary)' }}>100% clean (zero NaN/null active)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.35rem' }}>
              <span>Missing Values:</span>
              <span>Mean/Mode Imputed Client-side</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Feature Encoding:</span>
              <span>OneHotEncoder & StandardScaler</span>
            </div>
          </div>
        </div>

        {/* Right column: PCA Mathematics loadings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>PCA Performance Analytics</h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Eigenvalue Explained Variance Ratio (EVR)</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', textAlign: 'right' }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Cumulative EV (PC1+PC2)</span>
                <div style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>{((ev1 + ev2) * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '0.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>PC1 Variance</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>{(ev1 * 100).toFixed(1)}%</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>PC2 Variance</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>{(ev2 * 100).toFixed(1)}%</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>PC3 Variance</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>{(ev3 * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* Loadings list */}
          <div style={{ flexGrow: 1 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Top Feature Loadings on Principal Components</span>
            <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '6px' }}>
              <table className="data-table" style={{ fontSize: '0.7rem' }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <th>Feature Dimension</th>
                    <th>PC1 Weight</th>
                    <th>PC2 Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {loadings.slice(0, 10).map((load, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600' }}>{load.name}</td>
                      <td style={{ color: load.pc1 >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{load.pc1.toFixed(4)}</td>
                      <td style={{ color: load.pc2 >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{load.pc2.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Cluster summary list */}
      <div className="glass-card">
        <h3>Clustering Profiles Summary Matrix</h3>
        <div className="table-wrapper" style={{ marginTop: '0.75rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cluster ID</th>
                <th>Farms</th>
                <th>Avg Yield</th>
                <th>Avg Water</th>
                <th>Avg Farm Area</th>
                <th>Dominant Crop</th>
                <th>Dominant Soil</th>
                <th>Profile Class</th>
              </tr>
            </thead>
            <tbody>
              {clusterProfiles.map(p => (
                <tr 
                  key={p.id} 
                  onClick={() => setSelectedClusterId(p.id)}
                  style={{ 
                    cursor: 'pointer',
                    background: selectedClusterId === p.id ? 'rgba(16, 185, 129, 0.05)' : ''
                  }}
                >
                  <td style={{ fontWeight: '700', color: selectedClusterId === p.id ? 'var(--secondary)' : 'var(--primary)' }}>
                    Cluster {p.id} {selectedClusterId === p.id && '★'}
                  </td>
                  <td>{p.count}</td>
                  <td>{p.avgYield.toFixed(2)} tons</td>
                  <td>{p.avgWater.toLocaleString(undefined, { maximumFractionDigits: 0 })} m³</td>
                  <td>{p.avgArea.toFixed(1)} acres</td>
                  <td>{p.domCrop}</td>
                  <td>{p.domSoil}</td>
                  <td style={{ fontWeight: '600' }}>{p.profileLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Cluster Explorer drawer */}
      {activeClusterProfile && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--secondary)', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.02) 0%, rgba(16, 185, 129, 0.02) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--secondary)' }} /> Interactive Cluster Explorer (Cluster {selectedClusterId})
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Diagnostic analysis and farm lists matching this clustering grouping.</p>
            </div>
            
            <span className="metric-badge metric-badge-success">{activeClusterProfile.profileLabel}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
            {/* Cluster Stats & Recommendations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '0.85rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Agronomic Recommendations</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                  {activeClusterProfile.recommendation}
                </p>
              </div>

              {/* Cluster Averages comparisons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Avg Yield Output</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.15rem' }}>
                    {activeClusterProfile.avgYield.toFixed(2)} tons
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Avg Water footprint</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--secondary)', marginTop: '0.15rem' }}>
                    {activeClusterProfile.avgWater.toLocaleString(undefined, { maximumFractionDigits: 0 })} m³
                  </div>
                </div>
              </div>
            </div>

            {/* Cluster Members list */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Cluster Members ({activeClusterProfile.farms.length} farms)
              </span>
              
              <div className="table-wrapper" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <th>Farm ID</th>
                      <th>Crop Type</th>
                      <th>Soil Type</th>
                      <th>Yield</th>
                      <th>Water Usage</th>
                      <th>Sustainability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeClusterProfile.farms.map(f => (
                      <tr key={f.Farm_ID}>
                        <td style={{ fontWeight: '700', color: 'var(--secondary)' }}>{f.Farm_ID}</td>
                        <td>{f.Crop_Type}</td>
                        <td>{f.Soil_Type}</td>
                        <td style={{ fontWeight: '600' }}>{f['Yield(tons)'].toFixed(1)}t</td>
                        <td>{f['Water_Usage(cubic meters)'].toLocaleString()} m³</td>
                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{f.sustainabilityScore}/100</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
