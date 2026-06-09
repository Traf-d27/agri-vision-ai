import React, { useState, useEffect, useRef } from 'react';
import { usePlatform } from '../context/PlatformContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Radar, 
  Map as MapIcon, 
  Layers, 
  Eye, 
  Droplet, 
  Activity, 
  Heart, 
  Sparkles,
  ExternalLink,
  Info,
  Maximize2
} from 'lucide-react';

export default function SatelliteMonitoringView() {
  const { filteredDataset } = usePlatform();
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  
  // Active Tile Layer: 'satellite', 'osm', 'terrain'
  const [activeTile, setActiveTile] = useState('satellite');
  
  // Active Marker Layer metric: 'ndvi', 'cropHealth', 'yield', 'water', 'waterStress'
  const [markerMetric, setMarkerMetric] = useState('ndvi');
  
  // Selected farm details
  const [selectedFarm, setSelectedFarm] = useState(null);
  
  const markersLayerRef = useRef(L.layerGroup());

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Map instance centered in Central India
    const leafletMap = L.map(mapContainerRef.current, {
      center: [22.9734, 78.6569],
      zoom: 5,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);
    setMap(leafletMap);

    return () => {
      leafletMap.remove();
    };
  }, []);

  // Switch Tile Layer
  useEffect(() => {
    if (!map) return;

    // Remove old tiles
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let url = '';
    let attribution = '';

    if (activeTile === 'osm') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap';
    } else if (activeTile === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS, GeoEye';
    } else {
      url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = 'Map data: &copy; OpenStreetMap, SRTM | Style: &copy; OpenTopoMap';
    }

    L.tileLayer(url, {
      attribution,
      maxZoom: 18
    }).addTo(map);
  }, [map, activeTile]);

  // Update Markers when dataset or metric changes
  useEffect(() => {
    if (!map || filteredDataset.length === 0) return;

    // Clear old markers
    markersLayerRef.current.clearLayers();
    map.removeLayer(markersLayerRef.current);

    filteredDataset.forEach(farm => {
      if (!farm.Latitude || !farm.Longitude) return;

      let color = '#10b981';
      let valueLabel = '';

      if (markerMetric === 'ndvi') {
        const val = farm.ndvi || 0.4;
        color = val > 0.6 ? '#10b981' : val > 0.4 ? '#f59e0b' : '#ef4444';
        valueLabel = `NDVI: ${val.toFixed(3)}`;
      } else if (markerMetric === 'cropHealth') {
        const val = farm.cropHealth || 70;
        color = val > 75 ? '#10b981' : val > 50 ? '#f59e0b' : '#ef4444';
        valueLabel = `Crop Health: ${val}%`;
      } else if (markerMetric === 'yield') {
        const val = farm['Yield(tons)'] || 0;
        color = val > 30 ? '#10b981' : val > 15 ? '#f59e0b' : '#ef4444';
        valueLabel = `Yield: ${val.toFixed(1)} tons`;
      } else if (markerMetric === 'water') {
        const val = farm['Water_Usage(cubic meters)'] || 0;
        color = val < 40000 ? '#10b981' : val < 75000 ? '#f59e0b' : '#ef4444';
        valueLabel = `Water Footprint: ${val.toLocaleString()} m³`;
      } else {
        const val = farm.waterStress || 20;
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
          Region: ${farm.City}, ${farm.State}<br/>
          <strong>${valueLabel}</strong>
        </div>
      `);

      marker.on('click', () => {
        setSelectedFarm(farm);
      });

      markersLayerRef.current.addLayer(marker);
    });

    markersLayerRef.current.addTo(map);

    // Set map view to first farm if selected farm is null
    if (!selectedFarm && filteredDataset.length > 0) {
      const firstFarm = filteredDataset.find(f => f.Latitude && f.Longitude);
      if (firstFarm) {
        setSelectedFarm(firstFarm);
        map.setView([firstFarm.Latitude, firstFarm.Longitude], 7);
      }
    }
  }, [map, filteredDataset, markerMetric]);

  // Handle flyTo when selected farm changes
  const flyToFarm = (farm) => {
    if (!map || !farm.Latitude || !farm.Longitude) return;
    map.setView([farm.Latitude, farm.Longitude], 12);
    setSelectedFarm(farm);
  };

  // Remote sensing diagnostic summaries
  const calculateDiagnosticAverages = () => {
    if (filteredDataset.length === 0) return { ndvi: 0, vhi: 0, health: 0, stress: 0 };
    const n = filteredDataset.length;
    const ndvi = filteredDataset.reduce((a, b) => a + (b.ndvi || 0), 0) / n;
    const vhi = filteredDataset.reduce((a, b) => a + (b.vhi || 0), 0) / n;
    const health = filteredDataset.reduce((a, b) => a + (b.cropHealth || 0), 0) / n;
    const stress = filteredDataset.reduce((a, b) => a + (b.waterStress || 0), 0) / n;

    return { ndvi, vhi, health, stress };
  };

  const diagStats = calculateDiagnosticAverages();

  return (
    <div className="content-body" style={{ height: 'calc(100vh - 120px)', padding: '0 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style>{`
        .custom-satellite-leaflet-marker div:hover {
          transform: scale(1.4);
          box-shadow: 0 0 15px currentColor !important;
        }
        .leaflet-container {
          background: #040906 !important;
        }
      `}</style>

      {/* Satellite diagnostics KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '0.85rem 1.25rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Eye size={12} style={{ color: 'var(--primary)' }} /> Average NDVI Score
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: diagStats.ndvi > 0.5 ? 'var(--primary)' : 'var(--warning)', marginTop: '0.2rem' }}>
            {diagStats.ndvi.toFixed(3)}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Simulated vegetation index</div>
        </div>

        <div className="glass-card" style={{ padding: '0.85rem 1.25rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Heart size={12} style={{ color: 'var(--primary)' }} /> Vegetation Health (VHI)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: diagStats.vhi > 60 ? 'var(--primary)' : 'var(--warning)', marginTop: '0.2rem' }}>
            {diagStats.vhi.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Canopy chlorophyll estimation</div>
        </div>

        <div className="glass-card" style={{ padding: '0.85rem 1.25rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={12} style={{ color: 'var(--secondary)' }} /> Crop Health Score
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: diagStats.health > 60 ? 'var(--secondary)' : 'var(--warning)', marginTop: '0.2rem' }}>
            {diagStats.health.toFixed(1)}/100
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Derived eco-index score</div>
        </div>

        <div className="glass-card" style={{ padding: '0.85rem 1.25rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Droplet size={12} style={{ color: 'var(--warning)' }} /> Regional Water Stress
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: diagStats.stress > 60 ? 'var(--danger)' : 'var(--primary)', marginTop: '0.2rem' }}>
            {diagStats.stress.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Transpiration moisture deficit</div>
        </div>
      </div>

      {/* Main Map workspace split */}
      <div style={{ display: 'flex', flexGrow: 1, gap: '1rem', minHeight: '0' }}>
        {/* Left Side: Map Container */}
        <div className="glass-card" style={{ flexGrow: 1, padding: 0, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Map floating toolbar controls */}
          <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 400, display: 'flex', gap: '0.5rem', background: 'rgba(5, 10, 8, 0.85)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--panel-border)', backdropFilter: 'blur(10px)' }}>
            {/* Tile switcher */}
            <div style={{ display: 'flex', borderRight: '1px solid var(--panel-border)', paddingRight: '0.5rem', gap: '0.25rem' }}>
              <button className={`btn btn-sm ${activeTile === 'satellite' ? 'btn-primary' : ''}`} onClick={() => setActiveTile('satellite')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                Satellite
              </button>
              <button className={`btn btn-sm ${activeTile === 'osm' ? 'btn-primary' : ''}`} onClick={() => setActiveTile('osm')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                OpenStreetMap
              </button>
              <button className={`btn btn-sm ${activeTile === 'terrain' ? 'btn-primary' : ''}`} onClick={() => setActiveTile('terrain')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                Terrain
              </button>
            </div>

            {/* Metric Layer Switcher */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {[
                { key: 'ndvi', label: 'NDVI' },
                { key: 'cropHealth', label: 'Crop Health' },
                { key: 'yield', label: 'Yield Output' },
                { key: 'water', label: 'Water Usage' },
                { key: 'waterStress', label: 'Water Stress' }
              ].map(item => (
                <button 
                  key={item.key}
                  className={`btn btn-sm ${markerMetric === item.key ? 'btn-secondary' : ''}`}
                  onClick={() => setMarkerMetric(item.key)}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Leaflet container */}
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>
        </div>

        {/* Right Side: Farm Profile inspect panel */}
        <div className="glass-card" style={{ width: '360px', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          <h3>Satellite Diagnostics</h3>
          
          {selectedFarm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
                <div>
                  <h4 style={{ color: 'var(--secondary)' }}>Farm {selectedFarm.Farm_ID}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>District: {selectedFarm.City}, {selectedFarm.State}</span>
                </div>
                
                <button className="btn btn-sm" onClick={() => flyToFarm(selectedFarm)} title="Center map">
                  <MapIcon size={12} /> Center
                </button>
              </div>

              {/* Crop details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div><strong>Crop Type:</strong> {selectedFarm.Crop_Type}</div>
                <div><strong>Soil Type:</strong> {selectedFarm.Soil_Type}</div>
                <div><strong>Area:</strong> {selectedFarm['Farm_Area(acres)']} ac</div>
                <div><strong>Season:</strong> {selectedFarm.Season}</div>
              </div>

              {/* NDVI Diagnostic Gauge card */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.8rem' }}>NDVI Vegetation Density</span>
                  <span style={{ fontWeight: '800', color: selectedFarm.ndvi > 0.6 ? 'var(--primary)' : 'var(--warning)' }}>
                    {selectedFarm.ndvi.toFixed(3)}
                  </span>
                </div>
                <div style={{ position: 'relative', height: '18px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '2px', 
                    left: '2px', 
                    bottom: '2px', 
                    width: `${((selectedFarm.ndvi - 0.1) / 0.8) * 100}%`, 
                    backgroundColor: selectedFarm.ndvi > 0.6 ? 'var(--primary)' : selectedFarm.ndvi > 0.4 ? 'var(--warning)' : 'var(--danger)',
                    borderRadius: '2px',
                    boxShadow: `0 0 8px ${selectedFarm.ndvi > 0.6 ? 'var(--primary-glow)' : 'var(--warning)'}`
                  }}></div>
                </div>

                {/* Scale description */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  <span>0.1 (Bare Soil)</span>
                  <span>0.5 (Moderate)</span>
                  <span>0.9 (Dense)</span>
                </div>
              </div>

              {/* Ecology Metrics list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* VHI */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '500' }}>
                    <span>Vegetation Health Index (VHI)</span>
                    <span>{selectedFarm.vhi}%</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.2rem' }}>
                    <div style={{ width: `${selectedFarm.vhi}%`, height: '100%', backgroundColor: 'var(--primary)' }}></div>
                  </div>
                </div>

                {/* Crop Health */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '500' }}>
                    <span>Ecology Crop Health Score</span>
                    <span>{selectedFarm.cropHealth}/100</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.2rem' }}>
                    <div style={{ width: `${selectedFarm.cropHealth}%`, height: '100%', backgroundColor: 'var(--secondary)' }}></div>
                  </div>
                </div>

                {/* Water Stress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '500' }}>
                    <span>Canopy Water Stress %</span>
                    <span style={{ color: selectedFarm.waterStress > 60 ? 'var(--danger)' : 'var(--primary)' }}>{selectedFarm.waterStress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.2rem' }}>
                    <div style={{ width: `${selectedFarm.waterStress}%`, height: '100%', backgroundColor: selectedFarm.waterStress > 60 ? 'var(--danger)' : 'var(--primary)' }}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <Info size={28} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.8rem' }}>No farm selected. Select a farm marker on the map to display diagnostic remote sensing metrics.</p>
            </div>
          )}

          {/* Future Ready API Integrations hooks */}
          <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1rem', marginTop: 'auto' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Remote Sensing Integrations</span>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="btn btn-sm" onClick={() => alert('Sentinel-2 Hub Exporter: Downloading GEE Javascript API script templates for farm query...')} style={{ justifyContent: 'flex-start', fontSize: '0.65rem' }}>
                <ExternalLink size={10} /> Sentinel-2
              </button>
              <button className="btn btn-sm" onClick={() => alert('NASA EarthData Connector: Compiling bounding box metadata query...')} style={{ justifyContent: 'flex-start', fontSize: '0.65rem' }}>
                <ExternalLink size={10} /> NASA EarthData
              </button>
              <button className="btn btn-sm" onClick={() => alert('GEE Exporter: Syncing crop coordinates and generating dynamic polygon assets...')} style={{ justifyContent: 'flex-start', fontSize: '0.65rem' }}>
                <ExternalLink size={10} /> GEE Script
              </button>
              <button className="btn btn-sm" onClick={() => alert('ISRO Bhuvan: Syncing regional districts for remote sensing imagery download...')} style={{ justifyContent: 'flex-start', fontSize: '0.65rem' }}>
                <ExternalLink size={10} /> Bhuvan Geo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
