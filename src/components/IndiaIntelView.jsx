import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Eye, Heart, Sparkles, ExternalLink, Maximize2, Building2, MapPin
} from 'lucide-react';
import {
  fetchAllStates, fetchStateDetail, fetchHeatmapLayer,
  fetchLiveWeather, fetchSoilDetail, fetchAllSoils, fetchCropClassification,
  ndviToColor, rainfallToColor, tempToColor, cropCoverToColor, normalizeValue, LAYER_CONFIGS,
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

// ─── MAP CHOROPLETH LAYER ────────────────────────────────────
function ChoroplethLayer({ geoJson, statesData, activeLayer, selectedStateId, onStateClick, stateCropCoverMap }) {
  const getLayerValue = useCallback((stateName) => {
    const s = statesData.find(st => st.name === stateName || st.name?.toLowerCase() === stateName?.toLowerCase());
    if (activeLayer === 'crop_cover') {
      if (s && (s.crop_cover_pct || s.crop_cover)) return s.crop_cover_pct || s.crop_cover;
      const key = stateName?.toLowerCase();
      if (key && stateCropCoverMap && stateCropCoverMap[key]) return stateCropCoverMap[key];
      return 64.5;
    }
    if (!s) return null;
    const layerKey = {
      ndvi: 'ndvi', evi: 'evi', ndwi: 'ndwi',
      rainfall: 'rainfall_mm', temperature: 'temp_avg_c',
    }[activeLayer];
    return layerKey ? s[layerKey] : s.ndvi;
  }, [statesData, activeLayer, stateCropCoverMap]);

  const getColor = useCallback((stateName) => {
    const val = getLayerValue(stateName);
    if (val === null) return '#374151';
    if (activeLayer === 'rainfall') return rainfallToColor(val);
    if (activeLayer === 'temperature') return tempToColor(val);
    if (activeLayer === 'crop_cover') return cropCoverToColor(val);
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

// ─── MAIN UNIFIED ALL-IN-ONE COMPONENT ───────────────────────
export default function IndiaIntelView({ initialMode = 'national' }) {
  const { API_BASE, auth, filteredDataset = [], rankings = { states: [] } } = usePlatform();

  const resolveMode = (m) => {
    if (m === 'state' || m === 'state_analytics' || m === 'regional_intel' || m === 'geo') return 'state_analytics';
    if (m === 'district' || m === 'district_analytics') return 'district_analytics';
    if (m === 'regional_forecast') return 'regional_forecast';
    if (m === 'satellite') return 'satellite';
    return m || 'national';
  };

  // Mode: 'national', 'satellite', 'state_analytics', 'district_analytics', 'regional_forecast'
  const [viewMode, setViewMode] = useState(() => resolveMode(initialMode));

  useEffect(() => {
    if (initialMode) {
      setViewMode(resolveMode(initialMode));
    }
  }, [initialMode]);

  // States & DB Data
  const [statesData, setStatesData] = useState([]);
  const [geoJson, setGeoJson] = useState(null);
  const [activeLayer, setActiveLayer] = useState('ndvi');
  const [activeMapStyle, setActiveMapStyle] = useState('dark');
  
  // Satellite Markers State
  const [markerMetric, setMarkerMetric] = useState('ndvi');
  const [selectedFarm, setSelectedFarm] = useState(null);

  // State & District Analytics States
  const [apiStates, setApiStates] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState('1');
  const [apiDistricts, setApiDistricts] = useState([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState('1');

  const [stateCrops, setStateCrops] = useState([]);
  const [districtWeather, setDistrictWeather] = useState(null);
  const [districtSoil, setDistrictSoil] = useState(null);

  const [selectedState, setSelectedState] = useState(null);
  const [stateDetail, setStateDetail] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [cropClassification, setCropClassification] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [farmDrawerOpen, setFarmDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Regional Heatmap & 5-Year Forecast States
  const [selectedStateName, setSelectedStateName] = useState('Punjab');
  const [forecastPoints, setForecastPoints] = useState([]);

  // Stylized SVG State Polygons
  const statePolygons = [
    { id: 'Punjab', name: 'Punjab', abbrev: 'PB', points: '150,110 185,115 190,145 155,150' },
    { id: 'Haryana', name: 'Haryana', abbrev: 'HR', points: '172,152 195,147 205,178 180,185' },
    { id: 'Rajasthan', name: 'Rajasthan', abbrev: 'RJ', points: '80,160 160,150 170,210 100,230 75,200' },
    { id: 'Gujarat', name: 'Gujarat', abbrev: 'GJ', points: '45,250 100,240 120,270 105,300 55,290' },
    { id: 'Madhya Pradesh', name: 'Madhya Pradesh', abbrev: 'MP', points: '145,220 245,210 265,280 155,290' },
    { id: 'Uttar Pradesh', name: 'Uttar Pradesh', abbrev: 'UP', points: '190,170 280,150 300,200 210,220' },
    { id: 'Maharashtra', name: 'Maharashtra', abbrev: 'MH', points: '115,300 205,290 225,370 135,380' },
    { id: 'Karnataka', name: 'Karnataka', abbrev: 'KA', points: '135,385 175,380 185,470 145,460' },
    { id: 'Andhra Pradesh', name: 'Andhra Pradesh', abbrev: 'AP', points: '190,380 225,360 245,440 200,460' },
    { id: 'Tamil Nadu', name: 'Tamil Nadu', abbrev: 'TN', points: '155,465 195,465 205,520 170,520' },
    { id: 'Bihar', name: 'Bihar', abbrev: 'BR', points: '285,190 345,185 355,220 295,230' },
    { id: 'West Bengal', name: 'West Bengal', abbrev: 'WB', points: '340,220 375,215 385,290 360,290' },
    { id: 'Odisha', name: 'Odisha', abbrev: 'OD', points: '255,285 315,280 335,330 275,340' },
    { id: 'Assam', name: 'Assam', abbrev: 'AS', points: '395,180 455,175 465,200 405,210' }
  ];

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
          fetchAllStates().catch(() => null),
          fetch('/india-states.json').then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (states && Array.isArray(states)) {
          setStatesData(states);
        }
        setGeoJson(geo);

        // Fetch DB States for State/District Analytics
        try {
          const headers = auth?.token ? { 'Authorization': `Bearer ${auth.token}` } : {};
          const response = await fetch(`${API_BASE}/data/states`, { headers });
          if (response.ok) {
            const dbStates = await response.json();
            if (dbStates && dbStates.length > 0) {
              setApiStates(dbStates);
              setSelectedStateId(dbStates[0].id.toString());
            }
          }
        } catch (err) {
          console.warn("Could not fetch DB states, using fallback list:", err);
        }

      } catch (e) {
        console.error("Initialization error:", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [API_BASE, auth]);

  // Combined robust state options list
  const stateOptions = useMemo(() => {
    const list = [];
    const namesSeen = new Set();

    apiStates.forEach(s => {
      if (s.name && !namesSeen.has(s.name.toLowerCase())) {
        namesSeen.add(s.name.toLowerCase());
        list.push({ id: s.id?.toString() || s.name, name: s.name });
      }
    });

    statesData.forEach(s => {
      if (s.name && !namesSeen.has(s.name.toLowerCase())) {
        namesSeen.add(s.name.toLowerCase());
        list.push({ id: s.id?.toString() || s.name, name: s.name });
      }
    });

    filteredDataset.forEach(f => {
      if (f.State && !namesSeen.has(f.State.toLowerCase())) {
        namesSeen.add(f.State.toLowerCase());
        list.push({ id: f.State, name: f.State });
      }
    });

    if (list.length === 0) {
      ['Punjab', 'Haryana', 'Uttar Pradesh', 'Maharashtra', 'Gujarat', 'Rajasthan', 'West Bengal', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Bihar', 'Madhya Pradesh', 'Odisha', 'Assam'].forEach(st => {
        list.push({ id: st, name: st });
      });
    }

    return list;
  }, [apiStates, statesData, filteredDataset]);

  // Fallback states for National Map list
  const displayStatesData = useMemo(() => {
    if (statesData && statesData.length > 0) return statesData;
    return stateOptions.map((st, idx) => ({
      id: st.id || (idx + 1),
      name: st.name,
      ndvi: 0.45 + (idx % 5) * 0.08,
      evi: 0.38 + (idx % 4) * 0.07,
      ndwi: 0.22 + (idx % 3) * 0.05,
      rainfall_mm: 750 + (idx % 8) * 120,
      temp_avg_c: 24 + (idx % 6) * 1.5,
      crop_cover_pct: 38 + (idx % 10) * 5.2,
      area_km2: 50000 + (idx % 10) * 15000,
      region: ['North', 'West', 'South', 'East', 'Central'][idx % 5]
    }));
  }, [statesData, stateOptions]);

  // Derive crop cover percentage (%) dynamically from dataset (CSV)
  const stateCropCoverMap = useMemo(() => {
    const map = {};
    if (!filteredDataset || filteredDataset.length === 0) return map;
    
    const stateTotals = {};
    let maxArea = 0;
    
    filteredDataset.forEach(d => {
      if (!d.State) return;
      const st = d.State.toLowerCase();
      const area = d['Farm_Area(acres)'] || 100;
      if (!stateTotals[st]) stateTotals[st] = 0;
      stateTotals[st] += area;
      if (stateTotals[st] > maxArea) maxArea = stateTotals[st];
    });

    Object.keys(stateTotals).forEach(st => {
      const pct = maxArea > 0 ? 38 + (stateTotals[st] / maxArea) * 50 : 62;
      map[st] = +pct.toFixed(1);
    });

    return map;
  }, [filteredDataset]);

  const filteredStates = useMemo(() => {
    return displayStatesData.filter(s =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [displayStatesData, searchTerm]);

  // Set default selected state ID if not in options
  useEffect(() => {
    if (stateOptions.length > 0 && !stateOptions.find(s => s.id === selectedStateId)) {
      setSelectedStateId(stateOptions[0].id);
    }
  }, [stateOptions, selectedStateId]);

  const activeStateName = useMemo(() => {
    const match = stateOptions.find(s => s.id === selectedStateId || s.name === selectedStateId);
    return match ? match.name : selectedStateName || 'Punjab';
  }, [stateOptions, selectedStateId, selectedStateName]);

  // Fetch Districts & State Crops when selectedStateId changes
  useEffect(() => {
    if (!selectedStateId) return;
    const fetchStateDetails = async () => {
      try {
        const headers = auth?.token ? { 'Authorization': `Bearer ${auth.token}` } : {};
        const distRes = await fetch(`${API_BASE}/data/districts?state_id=${selectedStateId}`, { headers });
        const distData = distRes.ok ? await distRes.json() : [];
        setApiDistricts(distData);
        if (distData.length > 0) {
          setSelectedDistrictId(distData[0].id.toString());
        }

        const cropRes = await fetch(`${API_BASE}/data/crops?state_id=${selectedStateId}`, { headers });
        const cropData = cropRes.ok ? await cropRes.json() : [];
        setStateCrops(cropData);

      } catch (err) {
        console.error("Failed to fetch state analytics data", err);
      }
    };
    fetchStateDetails();
  }, [selectedStateId, API_BASE, auth]);

  // Fallback crops for selected state
  const cropsForSelectedState = useMemo(() => {
    if (stateCrops.length > 0) return stateCrops;
    const match = filteredDataset.filter(f => f.State?.toLowerCase() === activeStateName.toLowerCase());
    if (match.length > 0) {
      return match.map(m => ({
        crop_type: m.Crop_Type,
        yield_tons: m['Yield(tons)'] || 25,
        farm_area_acres: m['Farm_Area(acres)'] || 120,
        water_usage_cubic_meters: m['Water_Usage(cubic meters)'] || 45000
      }));
    }
    return filteredDataset.slice(0, 15).map(m => ({
      crop_type: m.Crop_Type,
      yield_tons: m['Yield(tons)'] || 25,
      farm_area_acres: m['Farm_Area(acres)'] || 120,
      water_usage_cubic_meters: m['Water_Usage(cubic meters)'] || 45000
    }));
  }, [stateCrops, filteredDataset, activeStateName]);

  // Fallback districts for selected state
  const districtsForSelectedState = useMemo(() => {
    if (apiDistricts.length > 0) return apiDistricts;
    const match = filteredDataset.filter(f => f.State?.toLowerCase() === activeStateName.toLowerCase());
    const uniqueCities = Array.from(new Set(match.map(m => m.City).filter(Boolean)));
    if (uniqueCities.length > 0) return uniqueCities.map((c, i) => ({ id: (i + 1).toString(), name: c }));
    return [
      { id: '1', name: `${activeStateName} Central District` },
      { id: '2', name: `${activeStateName} North District` },
      { id: '3', name: `${activeStateName} South District` },
      { id: '4', name: `${activeStateName} Agri Zone` }
    ];
  }, [apiDistricts, filteredDataset, activeStateName]);

  const activeDistrictName = useMemo(() => {
    const match = districtsForSelectedState.find(d => d.id === selectedDistrictId || d.name === selectedDistrictId || d.id?.toString() === selectedDistrictId?.toString());
    return match ? match.name : districtsForSelectedState[0]?.name || `${activeStateName} District`;
  }, [districtsForSelectedState, selectedDistrictId, activeStateName]);

  // Fetch Weather & Soil when selectedDistrictId changes
  useEffect(() => {
    if (!selectedDistrictId) return;
    const fetchDistrictDetails = async () => {
      try {
        const headers = auth?.token ? { 'Authorization': `Bearer ${auth.token}` } : {};
        const weatherRes = await fetch(`${API_BASE}/data/weather?district_id=${selectedDistrictId}`, { headers });
        const weatherData = weatherRes.ok ? await weatherRes.json() : [];
        setDistrictWeather(weatherData.length > 0 ? weatherData[0] : null);

        const soilRes = await fetch(`${API_BASE}/data/soil?district_id=${selectedDistrictId}`, { headers });
        const soilData = soilRes.ok ? await soilRes.json() : [];
        setDistrictSoil(soilData.length > 0 ? soilData[0] : null);
      } catch (err) {
        console.error("Failed to fetch district details", err);
      }
    };
    fetchDistrictDetails();
  }, [selectedDistrictId, API_BASE, auth]);

  // State click handler on Map
  const handleStateClick = useCallback(async (state) => {
    setSelectedState(state);
    setPanelOpen(true);
    setFarmDrawerOpen(false);
    setStateDetail(null);
    setWeather(null);
    setCropClassification(null);

    try {
      const [detail, classification] = await Promise.all([
        fetchStateDetail(state.id).catch(() => null),
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
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    clearIndiaCache();
    try {
      const states = await fetchAllStates().catch(() => null);
      if (states && Array.isArray(states)) {
        setStatesData(states);
      }
      if (selectedState) {
        handleStateClick(selectedState);
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedState, handleStateClick]);

  // Forecast points for Regional mode
  useEffect(() => {
    const futureYears = [2026, 2027, 2028, 2029, 2030];
    const avgYield = 28.5;
    const points = futureYears.map((year, yrIdx) => ({
      year,
      yieldVal: +(avgYield * (1 + (yrIdx + 1) * 0.035)).toFixed(2),
      waterVal: +(48000 * (1 - yrIdx * 0.015)).toFixed(0)
    }));
    setForecastPoints(points);
  }, [selectedStateName]);

  const layerKeys = ['ndvi', 'evi', 'ndwi', 'rainfall', 'temperature', 'crop_cover'];

  const getYieldByCropOption = () => {
    const cropYields = {};
    const cropCounts = {};
    cropsForSelectedState.forEach(c => {
      const type = c.crop_type || 'Wheat';
      cropYields[type] = (cropYields[type] || 0) + (c.yield_tons || 20);
      cropCounts[type] = (cropCounts[type] || 0) + 1;
    });

    const categories = Object.keys(cropYields);
    const data = categories.map(cat => +(cropYields[cat] / cropCounts[cat]).toFixed(2));

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '10%' },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Yield (tons)',
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
      },
      series: [{
        name: 'Average Yield',
        type: 'bar',
        data: data,
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#059669' }]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };
  };

  const getForecastOption = () => {
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['Projected Yield (tons)', 'Water Demand (m³)'], textStyle: { color: '#94a3b8' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '15%' },
      xAxis: { type: 'category', data: forecastPoints.map(p => p.year), axisLabel: { color: '#94a3b8' } },
      yAxis: [
        { type: 'value', name: 'Yield (tons)', axisLabel: { color: '#10b981' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } } },
        { type: 'value', name: 'Water (m³)', axisLabel: { color: '#3b82f6' }, splitLine: { show: false } }
      ],
      series: [
        { name: 'Projected Yield (tons)', type: 'line', smooth: true, data: forecastPoints.map(p => p.yieldVal), itemStyle: { color: '#10b981' } },
        { name: 'Water Demand (m³)', type: 'bar', yAxisIndex: 1, data: forecastPoints.map(p => p.waterVal), itemStyle: { color: 'rgba(59, 130, 246, 0.4)', borderRadius: [4,4,0,0] } }
      ]
    };
  };

  return (
    <div className="content-body" style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>

      {/* ── TOP UNIFIED NAVIGATION CONTROL BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem',
        borderBottom: '1px solid var(--panel-border)',
        background: 'rgba(7,10,14,0.95)',
        flexWrap: 'wrap',
        zIndex: 100,
      }}>
        {/* Platform Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
          <Globe size={18} style={{ color: '#10b981' }} />
          <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>AgriSpatial Intelligence Platform</span>
          <span style={{ fontSize: '0.65rem', color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px', padding: '1px 8px', fontWeight: '700' }}>
            ALL-IN-1
          </span>
        </div>

        {/* 5-in-1 Master Mode Switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', gap: '2px' }}>
          {[
            { id: 'national', label: '🇮🇳 National Map', icon: <Globe size={12} />, color: '#10b981' },
            { id: 'satellite', label: '🛰️ Satellite Monitor', icon: <Radar size={12} />, color: '#06b6d4' },
            { id: 'state_analytics', label: '🏢 State Analytics', icon: <Building2 size={12} />, color: '#f59e0b' },
            { id: 'district_analytics', label: '📍 District Intelligence', icon: <MapPin size={12} />, color: '#ec4899' },
            { id: 'regional_forecast', label: '🗺️ Regional AI Forecasts', icon: <Cpu size={12} />, color: '#8b5cf6' }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                border: 'none',
                background: viewMode === m.id ? m.color : 'transparent',
                color: viewMode === m.id ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                fontFamily: 'Outfit',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Layer toggles for National Map */}
        {viewMode === 'national' && (
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {layerKeys.map(lk => {
              const cfg = LAYER_CONFIGS[lk] || { icon: '🌿', label: lk };
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
        )}

        {/* Base Map Style (for Map Modes) */}
        {(viewMode === 'national' || viewMode === 'satellite') && (
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
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* ── LEAFLET MAP MODES (NATIONAL & SATELLITE) ── */}
        {(viewMode === 'national' || viewMode === 'satellite') && (
          <>
            {/* Left State/Farm Sidebar */}
            <div style={{
              width: '240px',
              flexShrink: 0,
              borderRight: '1px solid var(--panel-border)',
              background: 'rgba(7,10,14,0.95)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 50,
            }}>
              <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)' }}>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={viewMode === 'national' ? "Search states…" : "Search farms…"}
                  style={{
                    width: '100%', padding: '0.4rem 0.5rem',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.72rem',
                    fontFamily: 'Outfit', outline: 'none',
                  }}
                />
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                {viewMode === 'national' ? (
                  filteredStates.map(state => (
                    <div
                      key={state.id}
                      onClick={() => handleStateClick(state)}
                      style={{
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginBottom: '2px',
                        border: selectedState?.id === state.id ? '1px solid #10b981' : '1px solid transparent',
                        background: selectedState?.id === state.id ? 'rgba(16,185,129,0.1)' : 'transparent',
                        fontSize: '0.75rem',
                        color: selectedState?.id === state.id ? '#10b981' : 'var(--text-primary)'
                      }}
                    >
                      <b>{state.name}</b> (NDVI {state.ndvi?.toFixed(2) || '0.52'})
                    </div>
                  ))
                ) : (
                  filteredDataset.map(farm => (
                    <div
                      key={farm.id || farm.Farm_ID}
                      onClick={() => handleFarmSelect(farm)}
                      style={{
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginBottom: '4px',
                        border: selectedFarm?.Farm_ID === farm.Farm_ID ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.04)',
                        background: selectedFarm?.Farm_ID === farm.Farm_ID ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.02)',
                        fontSize: '0.75rem'
                      }}
                    >
                      <b style={{ color: '#06b6d4' }}>Farm {farm.Farm_ID}</b> ({farm.Crop_Type})<br/>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{farm.City}, {farm.State}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Leaflet Map */}
            <div style={{ flex: 1, position: 'relative', zIndex: 10 }}>
              <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ width: '100%', height: '100%' }} zoomControl={false}>
                <TileLayer url={TILE_LAYERS[activeMapStyle].url} attribution={TILE_LAYERS[activeMapStyle].attr} />
                {viewMode === 'national' && geoJson && (
                  <ChoroplethLayer geoJson={geoJson} statesData={displayStatesData} activeLayer={activeLayer} selectedStateId={selectedState?.id} onStateClick={handleStateClick} stateCropCoverMap={stateCropCoverMap} />
                )}
                {viewMode === 'satellite' && (
                  <SatelliteMarkersLayer farms={filteredDataset} metric={markerMetric} onFarmSelect={handleFarmSelect} />
                )}
              </MapContainer>
            </div>
          </>
        )}

        {/* ── STATE ANALYTICS MODE ── */}
        {viewMode === 'state_analytics' && (
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: '700', fontSize: '0.9rem' }}>Target State:</label>
              <select className="select-input" value={selectedStateId} onChange={(e) => setSelectedStateId(e.target.value)} style={{ minWidth: '220px' }}>
                {stateOptions.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                Active Region: <strong style={{ color: '#10b981' }}>{activeStateName}</strong>
              </span>
            </div>

            {/* State KPI Summary Metric Cards */}
            <div className="grid-4">
              <div className="glass-card stat-card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Active Districts</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981', marginTop: '0.25rem' }}>{districtsForSelectedState.length}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Tracked zones in {activeStateName}</div>
              </div>

              <div className="glass-card stat-card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>State Farm Records</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#06b6d4', marginTop: '0.25rem' }}>{cropsForSelectedState.length}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Sampled crop production entries</div>
              </div>

              <div className="glass-card stat-card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Avg Yield Output</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f59e0b', marginTop: '0.25rem' }}>
                  {(cropsForSelectedState.reduce((acc, c) => acc + (c.yield_tons || 0), 0) / (cropsForSelectedState.length || 1)).toFixed(1)} <span style={{ fontSize: '1rem' }}>tons</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Average seasonal harvest</div>
              </div>

              <div className="glass-card stat-card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Vegetation Index</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ec4899', marginTop: '0.25rem' }}>
                  {stateCropCoverMap[activeStateName.toLowerCase()] || 64.5}%
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Agricultural canopy cover</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="glass-card">
                <h3>State Yield Breakdown by Crop Type ({activeStateName})</h3>
                <div className="chart-container" style={{ height: '260px', marginTop: '0.5rem' }}>
                  <ReactECharts option={getYieldByCropOption()} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              <div className="glass-card">
                <h3>Districts & Agricultural Zones in {activeStateName} ({districtsForSelectedState.length})</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Select a district to view localized climate diagnostics and soil health indicators.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                  {districtsForSelectedState.map(d => (
                    <span 
                      key={d.id} 
                      onClick={() => {
                        setSelectedDistrictId(d.id.toString());
                        setViewMode('district_analytics');
                      }}
                      style={{ 
                        padding: '0.5rem 0.85rem', 
                        borderRadius: '8px', 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid var(--panel-border)', 
                        fontSize: '0.8rem', 
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                      className="hover-card"
                    >
                      📍 {d.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DISTRICT INTELLIGENCE MODE ── */}
        {viewMode === 'district_analytics' && (
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label style={{ fontWeight: '700', marginRight: '0.5rem', fontSize: '0.85rem' }}>State:</label>
                <select className="select-input" value={selectedStateId} onChange={(e) => setSelectedStateId(e.target.value)} style={{ minWidth: '180px' }}>
                  {stateOptions.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: '700', marginRight: '0.5rem', fontSize: '0.85rem' }}>Target District:</label>
                <select className="select-input" value={selectedDistrictId} onChange={(e) => setSelectedDistrictId(e.target.value)} style={{ minWidth: '180px' }}>
                  {districtsForSelectedState.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                Active District: <strong style={{ color: '#06b6d4' }}>{activeDistrictName}</strong> ({activeStateName})
              </span>
            </div>

            <div className="grid-2">
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3><CloudRain size={18} style={{ color: '#06b6d4', display: 'inline', marginRight: '6px' }} /> Climate Diagnostics ({activeDistrictName})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '600' }}>TEMPERATURE</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>{districtWeather?.avg_temp || 26.4}°C</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Seasonal mean</div>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '600' }}>ANNUAL RAINFALL</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>{districtWeather?.annual_rainfall || 840} mm</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Precipitation level</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--panel-border)', fontSize: '0.85rem' }}>
                  <span>Drought Risk Index: <b style={{ color: '#10b981' }}>{districtWeather?.drought_risk || 'Low'}</b></span>
                  <span>Flood Risk Index: <b style={{ color: '#f59e0b' }}>{districtWeather?.flood_risk || 'Moderate'}</b></span>
                </div>
              </div>

              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3><Layers size={18} style={{ color: '#10b981', display: 'inline', marginRight: '6px' }} /> Soil Profile ({activeDistrictName})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>DOMINANT SOIL TYPE</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>{districtSoil?.soil_type || 'Alluvial & Fertile Loamy Soil'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>High nutrient retention capacity</div>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: '600' }}>SOIL QUALITY INDEX</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>{districtSoil?.soil_index || 84} / 100</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Optimal pH range (6.5 - 7.2)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REGIONAL AI FORECAST MODE ── */}
        {viewMode === 'regional_forecast' && (
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="grid-2">
              <div className="glass-card">
                <h3>Interactive SVG State Map</h3>
                <div style={{ display: 'flex', justifyContent: 'center', height: '320px', marginTop: '1rem' }}>
                  <svg viewBox="0 0 500 550" style={{ width: '100%', height: '100%' }}>
                    {statePolygons.map(p => (
                      <polygon
                        key={p.id}
                        points={p.points}
                        fill={selectedStateName === p.name ? '#10b981' : 'rgba(255,255,255,0.05)'}
                        stroke="#34d399"
                        strokeWidth={selectedStateName === p.name ? 2.5 : 1}
                        onClick={() => setSelectedStateName(p.name)}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </svg>
                </div>
              </div>

              <div className="glass-card">
                <h3>5-Year Crop Yield Forecasts ({selectedStateName})</h3>
                <div className="chart-container" style={{ height: '280px', marginTop: '1rem' }}>
                  <ReactECharts option={getForecastOption()} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
