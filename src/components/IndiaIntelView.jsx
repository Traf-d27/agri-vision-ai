import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, Tooltip, useMap } from 'react-leaflet';
import ReactECharts from 'echarts-for-react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Globe, Layers, Droplet, Thermometer, Wind, Cloud, CloudRain,
  Leaf, BarChart2, Map, ChevronRight, ChevronLeft, X, RefreshCw,
  Sprout, Activity, Info, TrendingUp, Award, Cpu, Search
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
  const layerRef = useRef(null);

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

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function IndiaIntelView() {
  const [statesData, setStatesData] = useState([]);
  const [geoJson, setGeoJson] = useState(null);
  const [activeLayer, setActiveLayer] = useState('ndvi');
  const [activeMapStyle, setActiveMapStyle] = useState('dark');
  const [selectedState, setSelectedState] = useState(null);
  const [stateDetail, setStateDetail] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [selectedSoil, setSelectedSoil] = useState(null);
  const [soilDetail, setSoilDetail] = useState(null);
  const [cropClassification, setCropClassification] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [soilDrawerOpen, setSoilDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const TILE_LAYERS = {
    dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '©OpenStreetMap ©CartoDB' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '©Esri' },
    terrain:   { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: '©OpenTopoMap' },
  };

  // ── Load states + GeoJSON on mount ──
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

  // ── State click handler ──
  const handleStateClick = useCallback(async (state) => {
    setSelectedState(state);
    setPanelOpen(true);
    setSoilDrawerOpen(false);
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

    // Fetch live weather
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

  // ── Soil click handler ──
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

  // ── NDVI bar chart for top states ──
  const getNdviChartOption = () => {
    const sorted = [...statesData].sort((a, b) => (b.ndvi || 0) - (a.ndvi || 0)).slice(0, 10);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (p) => `${p[0].name}: NDVI ${p[0].value}` },
      grid: { left: '2%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
      xAxis: {
        type: 'category',
        data: sorted.map(s => s.name.split(' ')[0]),
        axisLabel: { color: '#64748b', fontSize: 9, rotate: 35, fontFamily: 'Outfit' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      yAxis: {
        type: 'value',
        min: 0, max: 1,
        axisLabel: { color: '#64748b', fontSize: 9 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      },
      series: [{
        type: 'bar',
        data: sorted.map(s => ({
          value: +(s.ndvi || 0).toFixed(3),
          itemStyle: {
            color: ndviToColor(s.ndvi),
            borderRadius: [4, 4, 0, 0],
          }
        })),
        barMaxWidth: 28,
      }],
    };
  };

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
          <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>India Agri Intelligence</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '1px 8px' }}>
            LIVE
          </span>
        </div>

        {/* Layer toggles */}
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

        {/* ── LEFT SIDEBAR (state list) ── */}
        <div style={{
          width: '220px',
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
                placeholder="Search states…"
                style={{
                  width: '100%', padding: '0.4rem 0.5rem 0.4rem 1.75rem',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.72rem',
                  fontFamily: 'Outfit', outline: 'none',
                }}
              />
            </div>
          </div>
          {/* State list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {loading ? (
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
            })}
          </div>
          {/* NDVI legend */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--panel-border)' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              {LAYER_CONFIGS[activeLayer]?.label} Legend
            </div>
            <div style={{ display: 'flex', gap: '2px', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              {['#ef4444','#fbbf24','#84cc16','#22c55e','#16a34a','#14532d'].map((c, i) => (
                <div key={i} style={{ flex: 1, background: c }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>Low</span>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>High</span>
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
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading India Intelligence Map…</span>
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
              {geoJson && statesData.length > 0 && (
                <ChoroplethLayer
                  geoJson={geoJson}
                  statesData={statesData}
                  activeLayer={activeLayer}
                  selectedStateId={selectedState?.id}
                  onStateClick={handleStateClick}
                />
              )}
            </MapContainer>
          )}

          {/* Fallback if no GeoJSON: show circle markers */}
          {!geoJson && !loading && statesData.length > 0 && (
            <div style={{
              position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '8px', padding: '6px 14px', fontSize: '0.7rem', color: '#f59e0b',
            }}>
              ⚠️ GeoJSON not found — click states in the left sidebar
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: STATE DETAIL ── */}
        <AnimatePresence>
          {panelOpen && selectedState && (
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
                {/* Header */}
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: '#3b82f6' }}>{selectedState.rainfall_mm?.toFixed(0) || '—'}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>🌧️ Rainfall mm/yr</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: '#f59e0b' }}>{selectedState.temp_avg_c?.toFixed(1) || '—'}°C</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>🌡️ Avg Temperature</div>
                    </div>
                  </div>
                </div>

                {/* Live Weather */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CloudRain size={11} /> Live Weather (Open-Meteo)
                  </div>
                  {weatherLoading ? (
                    <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}>
                        <RefreshCw size={14} />
                      </motion.div>
                      {' '}Fetching live weather…
                    </div>
                  ) : weather && !weather.error ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <WeatherIcon code={weather.current?.weather_code} />
                        <div>
                          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1 }}>
                            {weather.current?.temperature_2m?.toFixed(1)}°C
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            Feels: {weather.current?.relative_humidity_2m}% humidity
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
                        {[
                          { label: 'Wind', value: `${weather.current?.wind_speed_10m?.toFixed(0)} km/h`, icon: '💨' },
                          { label: 'Rain', value: `${weather.current?.precipitation?.toFixed(1)} mm`, icon: '🌧️' },
                          { label: 'Humidity', value: `${weather.current?.relative_humidity_2m}%`, icon: '💧' },
                        ].map(item => (
                          <div key={item.label} style={{ textAlign: 'center', padding: '0.4rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.9rem' }}>{item.icon}</div>
                            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-primary)' }}>{item.value}</div>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem' }}>
                      Weather unavailable
                    </div>
                  )}
                </div>

                {/* Soil Types */}
                {stateDetail && (
                  <>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Map size={11} /> Soil Types Present
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {(stateDetail.soil_types || []).map(soil => (
                          <motion.button
                            key={soil.id || soil.name}
                            onClick={() => handleSoilClick(soil.id, soil.name)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              padding: '0.3rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.68rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              border: `1px solid ${soil.color_hex || '#10b981'}44`,
                              background: `${soil.color_hex || '#10b981'}18`,
                              color: soil.color_hex || '#10b981',
                              fontFamily: 'Outfit',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: soil.color_hex || '#10b981', display: 'inline-block' }} />
                            {soil.name}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Major Crops */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Sprout size={11} /> Major Crops
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {(stateDetail.major_crops || []).slice(0, 8).map((crop, i) => (
                          <span key={i} style={{
                            padding: '0.3rem 0.65rem',
                            borderRadius: '20px',
                            fontSize: '0.68rem',
                            fontWeight: '600',
                            border: '1px solid rgba(245,158,11,0.25)',
                            background: 'rgba(245,158,11,0.08)',
                            color: '#f59e0b',
                            fontFamily: 'Outfit',
                          }}>
                            {crop.icon || '🌾'} {crop.name}
                            {crop.season && <span style={{ fontSize: '0.55rem', opacity: 0.7, marginLeft: '4px' }}>({crop.season})</span>}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Crop Classification AI */}
                    {cropClassification && (
                      <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.65rem', color: '#a78bfa', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Cpu size={11} /> AI Crop Classification
                        </div>
                        {cropClassification.classifications?.slice(0, 2).map((cls, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                              🌾 {cls.crop}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${cls.confidence * 100}%`, height: '100%', background: i === 0 ? '#a78bfa' : '#7c3aed', borderRadius: '2px' }} />
                              </div>
                              <span style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: '700' }}>{(cls.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Soil: {cropClassification.primary_soil} · NDVI: {cropClassification.ndvi?.toFixed(2)}
                        </div>
                      </div>
                    )}

                    {/* Districts */}
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Map size={11} /> Districts ({stateDetail.districts?.length || 0})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '100px', overflowY: 'auto' }}>
                        {(stateDetail.districts || []).map(d => (
                          <span key={d.id} style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.62rem',
                            border: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(255,255,255,0.02)',
                            color: 'var(--text-secondary)',
                          }}>
                            {d.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SOIL INTELLIGENCE DRAWER ── */}
        <AnimatePresence>
          {soilDrawerOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: '220px',
                right: panelOpen ? '380px' : 0,
                height: '340px',
                background: 'rgba(7,10,14,0.98)',
                borderTop: '1px solid var(--panel-border)',
                zIndex: 200,
                padding: '1rem 1.5rem',
                overflow: 'hidden',
              }}
            >
              {soilDetail ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '1.5rem', height: '100%' }}>
                  {/* Soil info */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: soilDetail.color_hex, display: 'inline-block' }} />
                          <h3 style={{ fontSize: '1rem', fontWeight: '800' }}>{soilDetail.name}</h3>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Fertility: <b style={{ color: '#f59e0b' }}>{soilDetail.fertility}</b> · pH {soilDetail.ph_min}–{soilDetail.ph_max}
                        </div>
                      </div>
                      <motion.button onClick={() => setSoilDrawerOpen(false)} whileHover={{ scale: 1.1 }}
                        style={{ border: 'none', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', cursor: 'pointer', padding: '6px', color: 'var(--text-secondary)' }}>
                        <X size={14} />
                      </motion.button>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '0.75rem' }}>
                      {soilDetail.description}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.5rem' }}>
                      {[
                        { label: 'Texture', value: soilDetail.texture },
                        { label: 'Water Retention', value: soilDetail.water_retention },
                        { label: 'Area', value: `${soilDetail.area_million_ha}M ha` },
                        { label: 'Avg NDVI', value: soilDetail.avg_ndvi?.toFixed(2) },
                      ].map(item => (
                        <div key={item.label} style={{ padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>{item.label}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{item.value || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suitable crops */}
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem' }}>
                      ✅ Suitable Crops ({soilDetail.suitable_crops?.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', overflowY: 'auto', maxHeight: '240px' }}>
                      {(soilDetail.suitable_crops || []).map(crop => (
                        <div key={crop.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '1rem' }}>{crop.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-primary)' }}>{crop.name}</div>
                            <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>{crop.season} · {crop.water_requirement} water</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '40px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${crop.suitability_score * 100}%`, height: '100%', background: '#10b981', borderRadius: '2px' }} />
                            </div>
                            <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: '700' }}>{(crop.suitability_score * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* States with this soil */}
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '0.5rem' }}>
                      📍 States with {soilDetail.name}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', overflowY: 'auto', maxHeight: '240px' }}>
                      {(soilDetail.states || []).map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-primary)' }}>{s.name}</div>
                            <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>{s.region}</div>
                          </div>
                          <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '700' }}>NDVI {s.ndvi?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '0.5rem' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                    <Leaf size={32} style={{ color: '#10b981', opacity: 0.5 }} />
                  </motion.div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Loading {selectedSoil} intelligence…</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM STATS STRIP ── */}
      <div style={{
        borderTop: '1px solid var(--panel-border)',
        background: 'rgba(7,10,14,0.95)',
        padding: '0.5rem 1.25rem',
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
        zIndex: 100,
      }}>
        <div style={{ height: '60px', flex: 1 }}>
          <ReactECharts option={getNdviChartOption()} style={{ height: '100%', width: '100%' }} />
        </div>
        {[
          { label: 'States', value: statesData.length, icon: '🗺️' },
          { label: 'Avg NDVI', value: statesData.length ? (statesData.reduce((a, b) => a + (b.ndvi || 0), 0) / statesData.length).toFixed(2) : '—', icon: '🌿' },
          { label: 'Avg Rainfall', value: statesData.length ? `${(statesData.reduce((a, b) => a + (b.rainfall_mm || 0), 0) / statesData.length).toFixed(0)} mm` : '—', icon: '🌧️' },
          { label: 'Highest NDVI', value: statesData.length ? `${[...statesData].sort((a, b) => (b.ndvi || 0) - (a.ndvi || 0))[0]?.name?.split(' ')[0]}` : '—', icon: '🏆' },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center', minWidth: '90px' }}>
            <div style={{ fontSize: '0.75rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
