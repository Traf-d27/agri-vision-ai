import React, { useState, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Map, 
  Droplet, 
  Activity, 
  TrendingUp, 
  Loader2, 
  Layers 
} from 'lucide-react';

export default function StateAnalyticsView() {
  const { API_BASE, auth } = usePlatform();
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [districts, setDistricts] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState(true);

  // Fetch all states
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const headers = auth?.token ? { 'Authorization': `Bearer ${auth.token}` } : {};
        const response = await fetch(`${API_BASE}/data/states`, { headers });
        if (response.ok) {
          const data = await response.json();
          setStates(data);
          if (data.length > 0) {
            setSelectedState(data[0].id.toString());
          }
        }
      } catch (err) {
        console.error("Failed to fetch states", err);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, [API_BASE, auth]);

  // Fetch districts & crops when state changes
  useEffect(() => {
    if (!selectedState) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = auth?.token ? { 'Authorization': `Bearer ${auth.token}` } : {};
        
        // Fetch districts
        const distRes = await fetch(`${API_BASE}/data/districts?state_id=${selectedState}`, { headers });
        const distData = distRes.ok ? await distRes.json() : [];
        setDistricts(distData);

        // Fetch crops
        const cropRes = await fetch(`${API_BASE}/data/crops?state_id=${selectedState}`, { headers });
        const cropData = cropRes.ok ? await cropRes.json() : [];
        setCrops(cropData);

      } catch (err) {
        console.error("Failed to fetch state data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedState, API_BASE, auth]);

  if (loadingStates) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  // Calculate summary metrics
  const totalArea = crops.reduce((sum, c) => sum + c.farm_area_acres, 0);
  const totalWater = crops.reduce((sum, c) => sum + c.water_usage_cubic_meters, 0);
  const avgYield = crops.length > 0 
    ? crops.reduce((sum, c) => sum + c.yield_tons, 0) / crops.length 
    : 0;

  // Chart options: Yield by Crop Type
  const getYieldByCropOption = () => {
    const cropYields = {};
    const cropCounts = {};
    crops.forEach(c => {
      cropYields[c.crop_type] = (cropYields[c.crop_type] || 0) + c.yield_tons;
      cropCounts[c.crop_type] = (cropCounts[c.crop_type] || 0) + 1;
    });

    const categories = Object.keys(cropYields);
    const data = categories.map(cat => (cropYields[cat] / cropCounts[cat]).toFixed(2));

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '10%' },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Avg Yield (tons)',
        nameTextStyle: { color: '#94a3b8', fontFamily: 'Outfit' },
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      series: [{
        data: data,
        type: 'bar',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#10b981' },
              { offset: 1, color: '#059669' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };
  };

  // Chart options: Crop Distribution by Acreage
  const getCropDistributionOption = () => {
    const cropAcreage = {};
    crops.forEach(c => {
      cropAcreage[c.crop_type] = (cropAcreage[c.crop_type] || 0) + c.farm_area_acres;
    });

    const data = Object.entries(cropAcreage).map(([name, value]) => ({
      name,
      value: Math.round(value)
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c} acres ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: 'rgba(15, 23, 42, 0.8)', borderWidth: 2 },
        label: { color: '#94a3b8', fontFamily: 'Outfit' },
        labelLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        data: data,
        color: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899']
      }]
    };
  };

  const selectedStateName = states.find(s => s.id.toString() === selectedState)?.name || '';

  return (
    <div className="content-body">
      {/* Selection Control Panel */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={24} style={{ color: 'var(--primary)' }} /> State Agricultural Analytics
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Observe state-wide productivity parameters, crop allocations, and district counts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select State:</span>
          <select 
            className="filter-select"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            {states.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <Loader2 className="animate-spin" size={36} style={{ color: 'var(--primary)' }} />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Metrics Panel */}
          <div className="kpi-grid" style={{ marginTop: '1.5rem' }}>
            <div className="glass-card kpi-card">
              <div className="kpi-info">
                <span className="kpi-label">Districts Seeded</span>
                <span className="kpi-value">{districts.length}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  Coverage complete
                </div>
              </div>
              <div className="kpi-icon-wrapper"><Map size={18} /></div>
            </div>

            <div className="glass-card kpi-card">
              <div className="kpi-info">
                <span className="kpi-label">Total Crop Area</span>
                <span className="kpi-value">{Math.round(totalArea).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>acres</span></span>
                <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  Under active cultivation
                </div>
              </div>
              <div className="kpi-icon-wrapper"><Layers size={18} /></div>
            </div>

            <div className="glass-card kpi-card">
              <div className="kpi-info">
                <span className="kpi-label">Average Crop Yield</span>
                <span className="kpi-value">{avgYield.toFixed(2)} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>tons</span></span>
                <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  Per crop record
                </div>
              </div>
              <div className="kpi-icon-wrapper"><Activity size={18} /></div>
            </div>

            <div className="glass-card kpi-card">
              <div className="kpi-info">
                <span className="kpi-label">State Water Allocation</span>
                <span className="kpi-value">{Math.round(totalWater).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>m³</span></span>
                <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  Aggregated seasonal footprint
                </div>
              </div>
              <div className="kpi-icon-wrapper"><Droplet size={18} /></div>
            </div>
          </div>

          {/* Visualizations Grid */}
          <div className="visuals-grid" style={{ marginTop: '1.5rem' }}>
            <div className="glass-card chart-card">
              <div className="chart-header">
                <span className="chart-title"><Activity size={16} /> Productivity by Crop Type in {selectedStateName}</span>
              </div>
              <div className="chart-container">
                {crops.length > 0 ? (
                  <ReactECharts option={getYieldByCropOption()} style={{ height: '100%', width: '100%' }} />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>No crop data available</div>
                )}
              </div>
            </div>

            <div className="glass-card chart-card">
              <div className="chart-header">
                <span className="chart-title"><Layers size={16} /> Crop Acreage Share in {selectedStateName}</span>
              </div>
              <div className="chart-container">
                {crops.length > 0 ? (
                  <ReactECharts option={getCropDistributionOption()} style={{ height: '100%', width: '100%' }} />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>No crop distribution available</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
