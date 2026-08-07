import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, Tooltip, useMap } from 'react-leaflet';
import ReactECharts from 'echarts-for-react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { usePlatform } from '../context/PlatformContext';
import {
  Globe, Layers, Droplet, Thermometer, Wind, Cloud, CloudRain,
  Leaf, BarChart2, Map, ChevronRight, ChevronLeft, X, RefreshCw,
  Sprout, Activity, Info, TrendingUp, Award, Cpu, Search, Radar,
  Eye, Heart, Sparkles, ExternalLink, Maximize2
} from 'lucide-react';
import {
  fetchAllStates, fetchStateDetail, fetchHeatmapLayer,
  fetchLiveWeather, fetchSoilDetail, fetchAllSoils, fetchCropClassification,
  ndviToColor, rainfallToColor, tempToColor, normalizeValue, LAYER_CONFIGS,
  clearIndiaCache
} from '../services/indiaService';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── MINI GAUGE CHART ─────────────────────────────────────────
function GaugeChart({ value, max = 1, label, color = '#10b981', unit = '' }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const option = {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 200, endAngle: -20,
      min: 0, max: max,
      splitNumber: 4,
      radius: '90%',
      axisLine: {
        lineStyle: {
          width: 12,
          color: [[pct, color], [1, 'rgba(255,255,255,0.06)']],
        }
      },
      pointer: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: true,
        formatter: `{value}${unit}`,
        color: color,
        fontSize: 13,
        fontWeight: 'bold',
        offsetCenter: [0, '20%'],
        fontFamily: 'Outfit',
      },
      data: [{ value: parseFloat(value?.toFixed ? value.toFixed(2) : value || 0) }],
    }],
  };
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ height: 90 }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '-8px', fontWeight: '600', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

// ─── WEATHER ICON HELPER ──────────────────────────────────────
function WeatherIcon({ code }) {
  const icons = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 61: '🌧️', 80: '🌦️', 95: '⛈️' };
  const match = Object.entries(icons).sort((a, b) => b[0] - a[0]).find(([k]) => code >= +k);
  return <span style={{ fontSize: '1.8rem' }}>{match ? match[1] : '🌡️'}</span>;
}

// ─── MAP CHOROPLETH LAYER ────────────────────────────────────
function ChoroplethLayer({ geoJson, statesData, activeLayer, selectedStateId, onStateClick }) {
  const getLayerValue = useCallback((stateName) => {
    const s = statesData.find(st => st.name === stateName || st.name?.toLowerCase() === stateName?.toLowerCase());
    if (!s) return null;
    const layerKey = {
      ndvi: 'ndvi', evi: 'evi', ndwi: 'ndwi',
      rainfall: 'rainfall_mm', temperature: 'temp_avg_c',
      crop_cover: 'crop_cover_pct',
    }[activeLayer];
    return layerKey ? s[layerKey] : s.ndvi;
  }, [statesData, activeLayer]);

  const getColor = useCallback((stateName) => {
    const val = getLayerValue(stateName);
    if (val === null) return '#374151';
    if (activeLayer === 'rainfall') return rainfallToColor(val);
    if (activeLayer === 'temperature') return tempToColor(val);
    return ndviToColor(val);
  }, [getLayerValue, activeLayer]);

  const styleFeature = useCallback((feature) => {
    const name = feature.properties?.NAME_1 || feature.properties?.st_nm || feature.properties?.name;
    const s = statesData.find(st => st.name === name || name?.includes(st.name?.split(' ')[0]));
    const isSelected = s && s.id === selectedStateId;
    return {
      fillColor: getColor(name),
      weight: isSelected ? 2.5 : 1,
      opacity: 1,
      color: isSelected ? '#06b6d4' : 'rgba(255,255,255,0.2)',
      fillOpacity: isSelected ? 0.85 : 0.65,
    };
  }, [getColor, selectedStateId, statesData]);

  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties?.NAME_1 || feature.properties?.st_nm || feature.properties?.name;
    const s = statesData.find(st => st.name === name || name?.includes(st.name?.split(' ')[0]));
    const val = getLayerValue(name);
    const layerCfg = LAYER_CONFIGS[activeLayer] || LAYER_CONFIGS.ndvi;

    layer.bindTooltip(`
      <div style="font-family:'Outfit',sans-serif;padding:4px 8px;background:rgba(7,10,14,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;">
        <b style="color:#10b981">${name || 'Unknown'}</b><br/>
        <span style="color:#94a3b8;font-size:11px">${layerCfg.icon} ${layerCfg.label}: </span>
        <b>${val !== null ? (val + (layerCfg.unit || '')).toString().slice(0,7) : 'N/A'}</b>
      </div>
    `, { sticky: true, opacity: 1, className: 'india-tooltip' });

    layer.on({
      click: () => { if (s) onStateClick(s); },
      mouseover: (e) => { e.target.setStyle({ weight: 2.5, fillOpacity: 0.9 }); },
      mouseout: (e) => { e.target.setStyle(styleFeature(feature)); },
    });
  }, [statesData, activeLayer, getLayerValue, onStateClick, styleFeature]);

  if (!geoJson) return null;

  return (
    <GeoJSON
      key={`${activeLayer}-${selectedStateId}`}
      data={geoJson}
      style={styleFeature}
      onEachFeature={onEachFeature}
    />
  );
}

// ─── FARM SATELLITE MARKERS LAYER ─────────────────────────────
function SatelliteMarkersLayer({ farms, metric, onFarmSelect }) {
  const map = useMap();
  const layerRef = useRef(L.layerGroup());

  useEffect(() => {
    if (!map || !farms || farms.length === 0) return;

    layerRef.current.clearLayers();

    farms.forEach(farm => {
      if (!farm.Latitude || !farm.Longitude) return;

      let color = '#10b981';
      let valueLabel = '';

      if (metric === 'ndvi') {
        const val = farm.ndvi || 0.45;
        color = val > 0.6 ? '#10b981' : val > 0.4 ? '#f59e0b' : '#ef4444';
        valueLabel = `NDVI: ${val.toFixed(3)}`;
      } else if (metric === 'cropHealth') {
        const val = farm.cropHealth || 75;
        color = val > 75 ? '#10b981' : val > 50 ? '#f59e0b' : '#ef4444';
        valueLabel = `Crop Health: ${val}%`;
      } else if (metric === 'yield') {
        const val = farm['Yield(tons)'] || 0;
        color = val > 30 ? '#10b981' : val > 15 ? '#f59e0b' : '#ef4444';
        valueLabel = `Yield: ${val.toFixed(1)} tons`;
      } else if (metric === 'water') {
        const val = farm['Water_Usage(cubic meters)'] || 0;
        color = val < 40000 ? '#10b981' : val < 75000 ? '#f59e0b' : '#ef4444';
        valueLabel = `Water Footprint: ${val.toLocaleString()} m³`;
      } else {
        const val = farm.waterStress || 25;
        color = val < 40 ? '#10b981' : val < 70 ? '#f59e0b' : '#ef4444';
        valueLabel = `Water Stress: ${val}%`;
      }

      const customIcon = L.divIcon({
        className: 'custom-satellite-leaflet-marker',
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}; transition: all 0.2s;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([farm.Latitude, farm.Longitude], { icon: customIcon });

      marker.bindPopup(`
        <div style="font-family: 'Outfit', sans-serif; color: #000; font-size: 0.8rem; padding: 0.2rem;">
          <strong style="font-size: 0.9rem;">Farm ${farm.Farm_ID}</strong> (${farm.Crop_Type})<br/>
          Location: ${farm.City || ''}, ${farm.State || ''}<br/>
          <strong>${valueLabel}</strong>
        </div>
      `);

      marker.on('click', () => {
        onFarmSelect(farm);
      });

      layerRef.current.addLayer(marker);
    });

    layerRef.current.addTo(map);

    return () => {
      map.removeLayer(layerRef.current);
    };
  }, [map, farms, metric, onFarmSelect]);

  return null;
}

// ─── MAIN UNIFIED COMPONENT ──────────────────────────────────
export default function IndiaIntelView({ initialMode = 'national' }) {
  const { filteredDataset = [] } = usePlatform();

  // Mode: 'national' (State Level Intelligence) or 'satellite' (Farm Level Satellite Telemetry)
  const [viewMode, setViewMode] = useState(initialMode);

  const [statesData, setStatesData] = useState([]);
  const [geoJson, setGeoJson] = useState(null);
  const [activeLayer, setActiveLayer] = useState('ndvi');
  const [activeMapStyle, setActiveMapStyle] = useState('dark');
  
  // Satellite Marker Metric: 'ndvi', 'cropHealth', 'yield', 'water', 'waterStress'
  const [markerMetric, setMarkerMetric] = useState('ndvi');
  const [selectedFarm, setSelectedFarm] = useState(null);

  const [selectedState, setSelectedState] = useState(null);
  const [stateDetail, setStateDetail] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [selectedSoil, setSelectedSoil] = useState(null);
  const [soilDetail, setSoilDetail] = useState(null);
  const [cropClassification, setCropClassification] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [soilDrawerOpen, setSoilDrawerOpen] = useState(false);
  const [farmDrawerOpen, setFarmDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const TILE_LAYERS = {
    dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '©OpenStreetMap ©CartoDB' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '©Esri' },
    terrain:   { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: '©OpenTopoMap' },
  };

  // Load states + GeoJSON on mount
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [states, geo] = await Promise.all([
          fetchAllStates(),
          fetch('/india-states.json').then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        setStatesData(states);
        setGeoJson(geo);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // State click handler
  const handleStateClick = useCallback(async (state) => {
    setSelectedState(state);
    setPanelOpen(true);
    setSoilDrawerOpen(false);
    setFarmDrawerOpen(false);
    setStateDetail(null);
    setWeather(null);
    setCropClassification(null);

    try {
      const [detail, classification] = await Promise.all([
        fetchStateDetail(state.id),
        fetchCropClassification(state.name).catch(() => null),
      ]);
      setStateDetail(detail);
      setCropClassification(classification);
    } catch (e) {
      console.error('State detail fetch error:', e);
    }

    setWeatherLoading(true);
    try {
      const wx = await fetchLiveWeather(state.name);
      setWeather(wx);
    } catch (e) {
      console.error('Weather fetch error:', e);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // Farm selection handler
  const handleFarmSelect = useCallback((farm) => {
    setSelectedFarm(farm);
    setFarmDrawerOpen(true);
    setPanelOpen(false);
    setSoilDrawerOpen(false);
  }, []);

  // Soil click handler
  const handleSoilClick = useCallback(async (soilId, soilName) => {
    setSelectedSoil(soilName);
    setSoilDrawerOpen(true);
    setSoilDetail(null);
    try {
      const detail = await fetchSoilDetail(soilId);
      setSoilDetail(detail);
    } catch (e) {
      console.error('Soil detail error:', e);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    clearIndiaCache();
    try {
      const states = await fetchAllStates();
      setStatesData(states);
      if (selectedState) {
        handleStateClick(selectedState);
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedState, handleStateClick]);

  const filteredStates = statesData.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const layerKeys = ['ndvi', 'evi', 'ndwi', 'rainfall', 'temperature', 'crop_cover'];

  // Calculate diagnostic averages for satellite telemetry
  const calculateSatelliteStats = () => {
    if (!filteredDataset || filteredDataset.length === 0) return { ndvi: 0.52, vhi: 68, health: 74, stress: 28 };
    const n = filteredDataset.length;
    const ndvi = filteredDataset.reduce((a, b) => a + (b.ndvi || 0.5), 0) / n;
    const vhi = filteredDataset.reduce((a, b) => a + (b.vhi || 65), 0) / n;
    const health = filteredDataset.reduce((a, b) => a + (b.cropHealth || 70), 0) / n;
    const stress = filteredDataset.reduce((a, b) => a + (b.waterStress || 30), 0) / n;
    return { ndvi, vhi, health, stress };
  };

  const satStats = calculateSatelliteStats();

  return (
    <div className="content-body" style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>

      {/* ── TOP CONTROL BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem',
        borderBottom: '1px solid var(--panel-border)',
        background: 'rgba(7,10,14,0.95)',
        flexWrap: 'wrap',
        zIndex: 100,
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
          <Globe size={18} style={{ color: '#10b981' }} />
          <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>India & Satellite Intelligence</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '1px 8px' }}>
            UNIFIED
          </span>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setViewMode('national')}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none',
              background: viewMode === 'national' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'national' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
              fontFamily: 'Outfit',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Globe size={12} /> National Choropleth
          </button>
          <button
            onClick={() => setViewMode('satellite')}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none',
              background: viewMode === 'satellite' ? '#06b6d4' : 'transparent',
              color: viewMode === 'satellite' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
              fontFamily: 'Outfit',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Radar size={12} /> Farm Satellite Telemetry
          </button>
        </div>

        {/* Layer / Metric Toggles based on View Mode */}
        {viewMode === 'national' ? (
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {layerKeys.map(lk => {
              const cfg = LAYER_CONFIGS[lk];
              return (
                <button
                  key={lk}
                  onClick={() => setActiveLayer(lk)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: activeLayer === lk ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                    background: activeLayer === lk ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                    color: activeLayer === lk ? '#10b981' : 'var(--text-secondary)',
                    transition: 'all 0.2s',
                    fontFamily: 'Outfit',
                  }}
                >
                  {cfg.icon} {cfg.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { key: 'ndvi', label: 'NDVI Index', icon: '🌿' },
              { key: 'cropHealth', label: 'Crop Health', icon: '💚' },
              { key: 'yield', label: 'Yield Output', icon: '🌾' },
              { key: 'water', label: 'Water Footprint', icon: '💧' },
              { key: 'waterStress', label: 'Water Stress', icon: '⚠️' }
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setMarkerMetric(m.key)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: markerMetric === m.key ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)',
                  background: markerMetric === m.key ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
                  color: markerMetric === m.key ? '#06b6d4' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                  fontFamily: 'Outfit',
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Map style */}
        <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
          {['dark', 'satellite', 'terrain'].map(style => (
            <button key={style}
              onClick={() => setActiveMapStyle(style)}
              style={{
                padding: '0.3rem 0.65rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '600',
                cursor: 'pointer', border: activeMapStyle === style ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.06)',
                background: activeMapStyle === style ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.02)',
                color: activeMapStyle === style ? '#06b6d4' : 'var(--text-secondary)', fontFamily: 'Outfit',
              }}>
              {style === 'dark' ? '🌑' : style === 'satellite' ? '🛰️' : '🗺️'} {style}
            </button>
          ))}
          <motion.button
            onClick={handleRefresh}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{
              padding: '0.3rem 0.65rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '600',
              cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'Outfit',
              background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)',
            }}>
            <RefreshCw size={11} style={{ display: 'inline', marginRight: '4px', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* ── LEFT SIDEBAR (state list / farm list) ── */}
        <div style={{
          width: '240px',
          flexShrink: 0,
          borderRight: '1px solid var(--panel-border)',
          background: 'rgba(7,10,14,0.95)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
        }}>
          {/* Search */}
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={viewMode === 'national' ? "Search states…" : "Filter regions…"}
                style={{
                  width: '100%', padding: '0.4rem 0.5rem 0.4rem 1.75rem',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.72rem',
                  fontFamily: 'Outfit', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* State / Farm List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {viewMode === 'national' ? (
              loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Loading states…
                </div>
              ) : filteredStates.map(state => {
                const isSelected = selectedState?.id === state.id;
                const ndviColor = ndviToColor(state.ndvi);
                return (
                  <motion.div
                    key={state.id}
                    onClick={() => handleStateClick(state)}
                    whileHover={{ x: 3 }}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      marginBottom: '2px',
                      border: isSelected ? '1px solid rgba(16,185,129,0.35)' : '1px solid transparent',
                      background: isSelected ? 'rgba(16,185,129,0.08)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ndviColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: isSelected ? '700' : '500', color: isSelected ? '#10b981' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {state.name}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                        NDVI {state.ndvi?.toFixed(2)} · {state.region}
                      </div>
                    </div>
                    {isSelected && <ChevronRight size={12} style={{ color: '#10b981', flexShrink: 0 }} />}
                  </motion.div>
                );
              })
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', padding: '0.2rem 0.4rem' }}>
                  Satellite Farms ({filteredDataset.length})
                </div>
                {filteredDataset.map(farm => {
                  const isSelected = selectedFarm?.Farm_ID === farm.Farm_ID;
                  return (
                    <motion.div
                      key={farm.id || farm.Farm_ID}
                      onClick={() => handleFarmSelect(farm)}
                      whileHover={{ x: 3 }}
                      style={{
                        padding: '0.5rem 0.65rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: isSelected ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.04)',
                        background: isSelected ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isSelected ? '#06b6d4' : 'var(--text-primary)' }}>
                          Farm {farm.Farm_ID}
                        </span>
                        <span style={{ fontSize: '0.6rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '1px 6px', borderRadius: '10px' }}>
                          NDVI {farm.ndvi?.toFixed(2) || '0.52'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                        {farm.Crop_Type} · {farm.City}, {farm.State}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Satellite Telemetry Footer Stats */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              📡 Telemetry Averages
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.35rem', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#10b981' }}>{satStats.ndvi.toFixed(3)}</div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>Mean NDVI</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.35rem', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#06b6d4' }}>{satStats.health.toFixed(0)}%</div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>Health Index</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAP ── */}
        <div style={{ flex: 1, position: 'relative', zIndex: 10 }}>
          {loading ? (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(7,10,14,0.9)', flexDirection: 'column', gap: '1rem',
            }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                <Globe size={48} style={{ color: '#10b981', opacity: 0.7 }} />
              </motion.div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading Satellite & Intelligence Map…</span>
            </div>
          ) : (
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                key={activeMapStyle}
                url={TILE_LAYERS[activeMapStyle].url}
                attribution={TILE_LAYERS[activeMapStyle].attr}
              />
              
              {/* Render GeoJSON Choropleth in National Mode */}
              {viewMode === 'national' && geoJson && statesData.length > 0 && (
                <ChoroplethLayer
                  geoJson={geoJson}
                  statesData={statesData}
                  activeLayer={activeLayer}
                  selectedStateId={selectedState?.id}
                  onStateClick={handleStateClick}
                />
              )}

              {/* Render Satellite Farm Markers Layer in Satellite Mode */}
              {viewMode === 'satellite' && (
                <SatelliteMarkersLayer
                  farms={filteredDataset}
                  metric={markerMetric}
                  onFarmSelect={handleFarmSelect}
                />
              )}
            </MapContainer>
          )}
        </div>

        {/* ── RIGHT PANEL: STATE DETAIL ── */}
        <AnimatePresence>
          {panelOpen && selectedState && viewMode === 'national' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '380px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{
                flexShrink: 0,
                borderLeft: '1px solid var(--panel-border)',
                background: 'rgba(7,10,14,0.98)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                overflowX: 'hidden',
                zIndex: 50,
              }}
            >
              <div style={{ padding: '1rem', minWidth: '380px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {selectedState.name}
                    </h2>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', borderRadius: '20px', padding: '2px 8px', fontWeight: '600' }}>
                        {selectedState.region || 'India'}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', borderRadius: '20px', padding: '2px 8px' }}>
                        {selectedState.area_km2?.toLocaleString()} km²
                      </span>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setPanelOpen(false)}
                    whileHover={{ scale: 1.1, background: 'rgba(239,68,68,0.1)' }}
                    style={{ border: 'none', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', cursor: 'pointer', padding: '6px', color: 'var(--text-secondary)' }}
                  >
                    <X size={14} />
                  </motion.button>
                </div>

                {/* Satellite Metrics Gauges */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Activity size={11} /> Satellite Intelligence
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.25rem' }}>
                    <GaugeChart value={selectedState.ndvi || 0} max={1} label="NDVI" color="#10b981" />
                    <GaugeChart value={selectedState.evi || 0} max={1} label="EVI" color="#22c55e" />
                    <GaugeChart value={Math.max(0, selectedState.ndwi || 0)} max={1} label="NDWI" color="#06b6d4" />
                  </div>
                </div>

                {/* Live Weather */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CloudRain size={11} /> Live Weather (Open-Meteo)
                  </div>
                  {weatherLoading ? (
                    <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Fetching live weather…
                    </div>
                  ) : weather && !weather.error ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <WeatherIcon code={weather.current?.weather_code} />
                        <div>
                          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1 }}>
                            {weather.current?.temperature_2m?.toFixed(1)}°C
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem' }}>
                      Weather unavailable
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── RIGHT PANEL: FARM SATELLITE DETAIL ── */}
        <AnimatePresence>
          {farmDrawerOpen && selectedFarm && viewMode === 'satellite' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '380px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{
                flexShrink: 0,
                borderLeft: '1px solid var(--panel-border)',
                background: 'rgba(7,10,14,0.98)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                overflowX: 'hidden',
                zIndex: 50,
              }}
            >
              <div style={{ padding: '1rem', minWidth: '380px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      Farm {selectedFarm.Farm_ID}
                    </h2>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', color: '#06b6d4', borderRadius: '20px', padding: '2px 8px', fontWeight: '600' }}>
                        {selectedFarm.Crop_Type}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', borderRadius: '20px', padding: '2px 8px' }}>
                        {selectedFarm.City}, {selectedFarm.State}
                      </span>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setFarmDrawerOpen(false)}
                    whileHover={{ scale: 1.1, background: 'rgba(239,68,68,0.1)' }}
                    style={{ border: 'none', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', cursor: 'pointer', padding: '6px', color: 'var(--text-secondary)' }}
                  >
                    <X size={14} />
                  </motion.button>
                </div>

                {/* Satellite Remote Sensing Diagnostics */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Radar size={11} /> Remote Sensing Spectral Telemetry
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981' }}>
                        {(selectedFarm.ndvi || 0.52).toFixed(3)}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>NDVI Vegetation Index</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#06b6d4' }}>
                        {selectedFarm.cropHealth || 75}%
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Crop Canopy Health</div>
                    </div>
                  </div>
                </div>

                {/* Farm Resource Footprint */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Droplet size={11} /> Farm Operations & Resource Input
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Farm Area:</span>
                      <span style={{ fontWeight: '700' }}>{selectedFarm['Farm_Area(acres)']} acres</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Water Footprint:</span>
                      <span style={{ fontWeight: '700', color: '#3b82f6' }}>{(selectedFarm['Water_Usage(cubic meters)'] || 0).toLocaleString()} m³</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Fertilizer Used:</span>
                      <span style={{ fontWeight: '700' }}>{selectedFarm['Fertilizer_Used(tons)']} tons</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Soil & Irrigation:</span>
                      <span style={{ fontWeight: '700' }}>{selectedFarm.Soil_Type} · {selectedFarm.Irrigation_Type}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
