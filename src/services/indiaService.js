/**
 * India Agricultural Intelligence API Service
 * Client-side wrapper for all /api/v1/india/* endpoints with caching.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API = `${BASE_URL}/api/v1/india`;

// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchCached(url, options = {}) {
  const cacheKey = url;
  const now = Date.now();
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (now - timestamp < CACHE_TTL) return data;
  }
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) throw new Error(`API error ${response.status}: ${response.statusText}`);
  const data = await response.json();
  cache.set(cacheKey, { data, timestamp: now });
  return data;
}

/** Get all Indian states with satellite metrics */
export async function fetchAllStates() {
  return fetchCached(`${API}/states`);
}

/** Get full state detail by ID */
export async function fetchStateDetail(stateId) {
  return fetchCached(`${API}/states/${stateId}`);
}

/** Get districts, optionally filtered by stateId */
export async function fetchDistricts(stateId = null) {
  const url = stateId ? `${API}/districts?state_id=${stateId}` : `${API}/districts`;
  return fetchCached(url);
}

/** Get district detail */
export async function fetchDistrictDetail(districtId) {
  return fetchCached(`${API}/districts/${districtId}`);
}

/** Get all soil types */
export async function fetchAllSoils() {
  return fetchCached(`${API}/soils`);
}

/** Get soil type detail */
export async function fetchSoilDetail(soilId) {
  return fetchCached(`${API}/soils/${soilId}`);
}

/** Get all crop types */
export async function fetchAllCrops() {
  return fetchCached(`${API}/crops`);
}

/** Get crop detail */
export async function fetchCropDetail(cropId) {
  return fetchCached(`${API}/crops/${cropId}`);
}

/** Get satellite metrics for a state */
export async function fetchSatelliteMetrics(stateId) {
  return fetchCached(`${API}/satellite-metrics?state_id=${stateId}`);
}

/** Get live weather for a state (via Open-Meteo) */
export async function fetchLiveWeather(stateName) {
  // Weather has shorter TTL — bypass cache with fresh fetch
  const url = `${API}/weather?state=${encodeURIComponent(stateName)}`;
  const now = Date.now();
  const WEATHER_TTL = 30 * 60 * 1000; // 30 min for weather
  if (cache.has(url)) {
    const { data, timestamp } = cache.get(url);
    if (now - timestamp < WEATHER_TTL) return data;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error('Weather fetch failed');
  const data = await response.json();
  cache.set(url, { data, timestamp: now });
  return data;
}

/** Get heatmap data for a layer */
export async function fetchHeatmapLayer(layer) {
  return fetchCached(`${API}/heatmap/${layer}`);
}

/** Get crop classification for a state */
export async function fetchCropClassification(stateName) {
  return fetchCached(`${API}/crop-classification?state=${encodeURIComponent(stateName)}`);
}

/** Clear the service cache (for refresh) */
export function clearIndiaCache() {
  cache.clear();
}

/** NDVI value to color (green gradient) */
export function ndviToColor(ndvi) {
  if (ndvi === null || ndvi === undefined) return '#374151';
  if (ndvi < 0) return '#ef4444';
  if (ndvi < 0.2) return '#fbbf24';
  if (ndvi < 0.4) return '#84cc16';
  if (ndvi < 0.6) return '#22c55e';
  if (ndvi < 0.75) return '#16a34a';
  return '#14532d';
}

/** Rainfall value to color (blue gradient) */
export function rainfallToColor(mm) {
  if (!mm) return '#374151';
  if (mm < 300) return '#fef3c7';
  if (mm < 700) return '#93c5fd';
  if (mm < 1200) return '#3b82f6';
  if (mm < 2000) return '#1d4ed8';
  return '#1e3a8a';
}

/** Temperature to color */
export function tempToColor(c) {
  if (!c) return '#374151';
  if (c < 10) return '#bfdbfe';
  if (c < 18) return '#60a5fa';
  if (c < 24) return '#86efac';
  if (c < 28) return '#fbbf24';
  return '#ef4444';
}

/** Crop Cover percentage (0-100%) to color */
export function cropCoverToColor(pct) {
  if (pct === null || pct === undefined) return '#374151';
  const val = pct > 1 ? pct : pct * 100;
  if (val < 30) return '#fef08a';
  if (val < 48) return '#a3e635';
  if (val < 65) return '#22c55e';
  if (val < 80) return '#16a34a';
  return '#15803d';
}

/** Generic value normalizer: returns 0–1 opacity */
export function normalizeValue(value, min, max) {
  if (max === min) return 0.5;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

export const LAYER_CONFIGS = {
  ndvi:          { label: 'NDVI',         unit: '',    colorFn: ndviToColor,     icon: '🌿', description: 'Vegetation health index' },
  evi:           { label: 'EVI',          unit: '',    colorFn: ndviToColor,     icon: '🍃', description: 'Enhanced vegetation index' },
  ndwi:          { label: 'Water Stress', unit: '',    colorFn: ndviToColor,     icon: '💧', description: 'Normalized water index' },
  rainfall:      { label: 'Rainfall',     unit: 'mm',  colorFn: rainfallToColor, icon: '🌧️', description: 'Annual rainfall (mm)' },
  temperature:   { label: 'Temperature',  unit: '°C',  colorFn: tempToColor,     icon: '🌡️', description: 'Average temperature (°C)' },
  crop_cover:    { label: 'Crop Cover',   unit: '%',   colorFn: cropCoverToColor,icon: '🌾', description: '% area under cultivation' },
  yield:         { label: 'Yield',        unit: 't/ha',colorFn: ndviToColor,     icon: '📊', description: 'Average yield (tons/ha)' },
  soil_fertility:{ label: 'Soil Fertility',unit: '',   colorFn: ndviToColor,     icon: '🪨', description: 'Soil fertility index' },
};
