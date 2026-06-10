import React, { useState, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  CloudRain, 
  Thermometer, 
  Wind, 
  Compass, 
  Loader2, 
  ShieldAlert, 
  Droplet,
  Layers,
  Activity
} from 'lucide-react';

export default function DistrictAnalyticsView() {
  const { API_BASE, auth } = usePlatform();
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  
  const [weather, setWeather] = useState(null);
  const [soil, setSoil] = useState(null);
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

  // Fetch districts when state changes
  useEffect(() => {
    if (!selectedState) return;
    const fetchDistricts = async () => {
      try {
        const headers = auth?.token ? { 'Authorization': `Bearer ${auth.token}` } : {};
        const response = await fetch(`${API_BASE}/data/districts?state_id=${selectedState}`, { headers });
        if (response.ok) {
          const data = await response.json();
          setDistricts(data);
          if (data.length > 0) {
            setSelectedDistrict(data[0].id.toString());
          } else {
            setSelectedDistrict('');
            setWeather(null);
            setSoil(null);
            setCrops([]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch districts", err);
      }
    };
    fetchDistricts();
  }, [selectedState, API_BASE, auth]);

  // Fetch weather, soil, crops when district changes
  useEffect(() => {
    if (!selectedDistrict) return;
    const fetchDistrictData = async () => {
      setLoading(true);
      try {
        const headers = auth?.token ? { 'Authorization': `Bearer ${auth.token}` } : {};
        
        // Fetch weather
        const weatherRes = await fetch(`${API_BASE}/data/weather?district_id=${selectedDistrict}`, { headers });
        const weatherData = weatherRes.ok ? await weatherRes.json() : [];
        setWeather(weatherData.length > 0 ? weatherData[0] : null);

        // Fetch soil
        const soilRes = await fetch(`${API_BASE}/data/soil?district_id=${selectedDistrict}`, { headers });
        const soilData = soilRes.ok ? await soilRes.json() : [];
        setSoil(soilData.length > 0 ? soilData[0] : null);

        // Fetch crops
        const cropsRes = await fetch(`${API_BASE}/data/crops?district_id=${selectedDistrict}`, { headers });
        const cropsData = cropsRes.ok ? await cropsRes.json() : [];
        setCrops(cropsData);

      } catch (err) {
        console.error("Failed to fetch district data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDistrictData();
  }, [selectedDistrict, API_BASE, auth]);

  if (loadingStates) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  // Chart options: Comparative crop yield in this district
  const getCropsYieldOption = () => {
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '10%' },
      xAxis: {
        type: 'category',
        data: crops.map(c => c.crop_type),
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Yield (tons)',
        nameTextStyle: { color: '#94a3b8', fontFamily: 'Outfit' },
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      series: [{
        data: crops.map(c => c.yield_tons.toFixed(2)),
        type: 'bar',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#06b6d4' },
              { offset: 1, color: '#0891b2' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };
  };

  const getRiskColor = (risk) => {
    if (!risk) return 'var(--text-secondary)';
    const r = risk.toLowerCase();
    if (r === 'high') return '#ef4444';
    if (r === 'moderate') return '#f59e0b';
    return '#10b981';
  };

  const selectedDistrictName = districts.find(d => d.id.toString() === selectedDistrict)?.name || '';

  return (
    <div className="content-body">
      {/* Controls Card */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={24} style={{ color: 'var(--primary)' }} /> District Soil & Weather Intelligence
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Investigate regional microclimates, environmental hazards, soil indexes, and crop returns.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>State:</span>
            <select 
              className="filter-select"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              {states.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>District:</span>
            <select 
              className="filter-select"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{ minWidth: '150px' }}
              disabled={districts.length === 0}
            >
              {districts.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <Loader2 className="animate-spin" size={36} style={{ color: 'var(--primary)' }} />
        </div>
      ) : districts.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', marginTop: '1.5rem' }}>
          <ShieldAlert size={48} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
          <h3>No Districts Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            This state does not currently have district data configured.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Weather & Soil Profile Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            {/* Weather */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <CloudRain size={16} style={{ color: 'var(--primary)' }} /> Weather Metrics
              </h4>
              {weather ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Average Temperature</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }}>
                      <Thermometer size={14} /> {weather.avg_temp}°C
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Annual Rainfall</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }}>
                      <CloudRain size={14} /> {weather.annual_rainfall} mm
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Relative Humidity</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }}>
                      <Droplet size={14} /> {weather.avg_humidity}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Wind Speed</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }}>
                      <Wind size={14} /> {weather.avg_windspeed} km/h
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No weather telemetry available.</div>
              )}
            </div>

            {/* Soil Profile */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <Compass size={16} style={{ color: 'var(--primary)' }} /> Soil Chemistry Profile
              </h4>
              {soil ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Primary Soil Type</span>
                    <span style={{ fontWeight: 'bold' }}>{soil.soil_type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Soil Suitability Index</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{soil.soil_index} / 100</span>
                  </div>
                  {/* Visual index progress bar */}
                  <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden', marginTop: '0.25rem' }}>
                    <div style={{ width: `${soil.soil_index}%`, backgroundColor: 'var(--primary)', height: '100%' }}></div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No soil index reports available.</div>
              )}
            </div>

            {/* Risk Profiles */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <ShieldAlert size={16} style={{ color: 'var(--primary)' }} /> Environmental Risk Profiles
              </h4>
              {weather ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Drought Susceptibility</span>
                      <span style={{ fontWeight: 'bold', color: getRiskColor(weather.drought_risk) }}>{weather.drought_risk} Risk</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Flood Susceptibility</span>
                      <span style={{ fontWeight: 'bold', color: getRiskColor(weather.flood_risk) }}>{weather.flood_risk} Risk</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No risk parameters compiled.</div>
              )}
            </div>
          </div>

          {/* Crops & Charts */}
          <div className="visuals-grid" style={{ marginTop: '1.5rem' }}>
            {/* Crops list table */}
            <div className="glass-card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Layers size={16} style={{ color: 'var(--primary)' }} /> Cultivated Crops in {selectedDistrictName}
              </h4>
              <div className="table-wrapper">
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Crop Type</th>
                      <th>Season</th>
                      <th>Area (acres)</th>
                      <th>Irrigation</th>
                      <th>Avg Yield</th>
                      <th>Water Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crops.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '600' }}>{c.crop_type}</td>
                        <td>{c.season}</td>
                        <td>{Math.round(c.farm_area_acres).toLocaleString()}</td>
                        <td>{c.irrigation_type}</td>
                        <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{c.yield_tons.toFixed(2)} t</td>
                        <td style={{ color: 'var(--secondary)' }}>{Math.round(c.water_usage_cubic_meters).toLocaleString()} m³</td>
                      </tr>
                    ))}
                    {crops.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No crop statistics recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Yield comparisons chart */}
            <div className="glass-card chart-card">
              <div className="chart-header">
                <span className="chart-title"><Activity size={16} /> Comparative Crop Yields in {selectedDistrictName}</span>
              </div>
              <div className="chart-container">
                {crops.length > 0 ? (
                  <ReactECharts option={getCropsYieldOption()} style={{ height: '100%', width: '100%' }} />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>No crop comparison available</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
