import React, { useState, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import ReactECharts from 'echarts-for-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Droplet, 
  Sliders,
  Terminal,
  ChevronDown,
  ChevronUp,
  Award,
  Layers,
  AlertCircle
} from 'lucide-react';

export default function PredictionCenterView() {
  const { dataset, predictYield } = usePlatform();

  // Form input states
  const [formInput, setFormInput] = useState({
    Crop_Type: 'Rice',
    Soil_Type: 'Loamy',
    'Farm_Area(acres)': 120,
    'Water_Usage(cubic meters)': 45000,
    'Fertilizer_Used(tons)': 4.2,
    'Pesticide_Used(kg)': 2.5,
    Irrigation_Type: 'Drip',
    Season: 'Kharif'
  });

  const [categories, setCategories] = useState({
    crops: ['Cotton', 'Carrot', 'Sugarcane', 'Tomato', 'Soybean', 'Rice', 'Maize', 'Wheat', 'Barley', 'Potato'],
    soils: ['Loamy', 'Peaty', 'Silty', 'Clay', 'Sandy'],
    irrigations: ['Sprinkler', 'Manual', 'Flood', 'Rain-fed', 'Drip'],
    seasons: ['Kharif', 'Zaid', 'Rabi']
  });

  const [selectedModel, setSelectedModel] = useState('forest');
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState(null);
  const [debugExpanded, setDebugExpanded] = useState(false);

  // Forecasted values from API
  const [forecast, setForecast] = useState({
    yieldVal: 0,
    productivity: 0,
    efficiency: 0,
    confidence: 85,
    featureImportance: [],
    encodedFeatures: [],
    featureNames: [],
    metrics: { r2: 0.88, mae: 1.25, rmse: 1.62, train_samples: 800, test_samples: 200 },
    payload: null
  });

  // Extract categories dynamically from dataset
  useEffect(() => {
    if (dataset.length === 0) return;
    setCategories({
      crops: Array.from(new Set(dataset.map(r => r.Crop_Type))),
      soils: Array.from(new Set(dataset.map(r => r.Soil_Type))),
      irrigations: Array.from(new Set(dataset.map(r => r.Irrigation_Type))),
      seasons: Array.from(new Set(dataset.map(r => r.Season)))
    });
  }, [dataset]);

  // Run model prediction via API when input parameters or selected model changes
  useEffect(() => {
    let active = true;
    
    const triggerPrediction = async () => {
      setPredicting(true);
      setError(null);
      try {
        const payload = {
          crop_type: formInput.Crop_Type,
          soil_type: formInput.Soil_Type,
          irrigation_type: formInput.Irrigation_Type,
          season: formInput.Season,
          farm_area_acres: Number(formInput['Farm_Area(acres)']),
          water_usage_cubic_meters: Number(formInput['Water_Usage(cubic meters)']),
          fertilizer_used_tons: Number(formInput['Fertilizer_Used(tons)']),
          pesticide_used_kg: Number(formInput['Pesticide_Used(kg)']),
          model_name: selectedModel
        };
        
        const res = await predictYield(payload);
        
        if (active) {
          setForecast({
            yieldVal: res.predicted_yield,
            productivity: res.productivity_score,
            efficiency: res.efficiency_score,
            confidence: res.confidence_score,
            featureImportance: res.feature_importance || [],
            encodedFeatures: res.encoded_features || [],
            featureNames: res.feature_names || [],
            metrics: res.metrics || { r2: 0, mae: 0, rmse: 0, train_samples: 0, test_samples: 0 },
            payload: payload
          });
        }
      } catch (err) {
        console.error("Prediction API failed:", err);
        if (active) {
          setError(err.message || "Failed to retrieve ML prediction");
        }
      } finally {
        if (active) {
          setPredicting(false);
        }
      }
    };

    triggerPrediction();

    return () => {
      active = false;
    };
  }, [formInput, selectedModel, predictYield]);

  const handleSliderChange = (name, val) => {
    setFormInput(prev => ({ ...prev, [name]: parseFloat(val) }));
  };

  const handleSelectChange = (name, val) => {
    setFormInput(prev => ({ ...prev, [name]: val }));
  };

  // ECharts Configurations
  const getYieldGaugeOption = (value) => ({
    backgroundColor: 'transparent',
    tooltip: { show: false },
    series: [{
      type: 'gauge',
      startAngle: 190,
      endAngle: -10,
      min: 0,
      max: 60,
      splitNumber: 6,
      pointer: {
        icon: 'path://M12.8,0.7l12,20.1c0.6,1,0.3,2.3-0.7,2.9c-0.4,0.2-0.8,0.3-1.2,0.3h-24c-1.2,0-2.1-0.9-2.1-2.1c0-0.4,0.1-0.9,0.3-1.2l12-20.1C10.7-0.2,12-0.2,12.8,0.7z',
        length: '75%',
        width: 6,
        offsetCenter: [0, '5%'],
        itemStyle: { color: '#10b981' }
      },
      axisLine: {
        lineStyle: {
          width: 8,
          color: [
            [0.3, 'rgba(16, 185, 129, 0.2)'],
            [0.7, 'rgba(6, 182, 212, 0.4)'],
            [1, 'rgba(16, 185, 129, 1)']
          ]
        }
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        show: true,
        color: '#94a3b8',
        fontSize: 10,
        fontFamily: 'Outfit',
        distance: -20,
        formatter: (val) => `${val}`
      },
      detail: {
        valueAnimation: true,
        formatter: '{value|{value}} \n {unit|tons}',
        offsetCenter: [0, '25%'],
        rich: {
          value: { fontSize: 26, fontWeight: '800', color: '#f8fafc', fontFamily: 'Outfit' },
          unit: { fontSize: 11, color: '#94a3b8', padding: [4, 0] }
        }
      },
      data: [{ value: Number(value.toFixed(2)) }]
    }]
  });

  const getConfidenceGaugeOption = (value) => ({
    backgroundColor: 'transparent',
    tooltip: { show: false },
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      splitNumber: 4,
      pointer: { show: false },
      axisLine: {
        lineStyle: {
          width: 6,
          color: [
            [value / 100, '#06b6d4'],
            [1, 'rgba(255,255,255,0.05)']
          ]
        }
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        formatter: '{value}%',
        offsetCenter: [0, '-10%'],
        fontSize: 18,
        fontWeight: '800',
        color: '#06b6d4',
        fontFamily: 'Outfit'
      },
      data: [{ value: Math.round(value) }]
    }]
  });

  const getImportanceOption = (featImportance) => {
    if (!featImportance || featImportance.length === 0) {
      return {
        backgroundColor: 'transparent',
        title: { text: 'No contributions active', left: 'center', top: 'center', textStyle: { color: '#94a3b8', fontSize: 12 } }
      };
    }
    const topFeatures = [...featImportance].slice(0, 8).reverse();
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '12%', bottom: '3%', containLabel: true, top: '5%' },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
      },
      yAxis: {
        type: 'category',
        data: topFeatures.map(imp => imp.name.replace(/_/g, ' ')),
        axisLabel: { color: '#f8fafc', fontFamily: 'Outfit', fontSize: 10 },
        axisLine: { show: false }
      },
      series: [{
        name: 'Weight / Contribution',
        type: 'bar',
        data: topFeatures.map(imp => imp.score),
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: 'rgba(6, 182, 212, 0.3)' },
              { offset: 1, color: '#06b6d4' }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        }
      }]
    };
  };

  const getScatterOption = (dataset, currentWater, currentYield) => {
    if (!dataset || dataset.length === 0) return {};
    
    // Sample up to 150 points for visual curve representation
    const points = dataset.slice(0, 150).map(r => [
      r['Water_Usage(cubic meters)'],
      r['Yield(tons)']
    ]);
    
    // Simple visual regression trend line
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      sumX += points[i][0];
      sumY += points[i][1];
      sumXY += points[i][0] * points[i][1];
      sumXX += points[i][0] * points[i][0];
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    
    const minX = Math.min(...points.map(p => p[0]), currentWater);
    const maxX = Math.max(...points.map(p => p[0]), currentWater);
    
    const trendLine = [
      [minX, Math.max(0, slope * minX + intercept)],
      [maxX, Math.max(0, slope * maxX + intercept)]
    ];
    
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          if (params.seriesName === 'Current Simulation') {
            return `<b>Current Simulation State</b><br/>Water: ${params.data[0].toLocaleString()} m³<br/>Yield: ${params.data[1].toFixed(2)} tons`;
          }
          if (params.seriesName === 'Regression Fit') {
            return `Regression Fit`;
          }
          return `Water: ${params.data[0].toLocaleString()} m³<br/>Yield: ${params.data[1].toFixed(2)} tons`;
        }
      },
      legend: {
        data: ['Farms', 'Regression Fit', 'Current Simulation'],
        textStyle: { color: '#94a3b8', fontFamily: 'Outfit', fontSize: 10 },
        bottom: 0,
        itemWidth: 10,
        itemHeight: 10
      },
      grid: { left: '3%', right: '5%', bottom: '20%', containLabel: true, top: '10%' },
      xAxis: {
        name: 'Water (m³)',
        nameLocation: 'middle',
        nameGap: 20,
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        type: 'value',
        axisLabel: { color: '#94a3b8', formatter: (val) => `${(val / 1000).toFixed(0)}k` },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } }
      },
      yAxis: {
        name: 'Yield (tons)',
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        type: 'value',
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } }
      },
      series: [
        {
          name: 'Farms',
          type: 'scatter',
          data: points,
          symbolSize: 6,
          itemStyle: { color: 'rgba(6, 182, 212, 0.25)' }
        },
        {
          name: 'Regression Fit',
          type: 'line',
          data: trendLine,
          showSymbol: false,
          lineStyle: { color: 'rgba(245, 158, 11, 0.6)', width: 2, type: 'dashed' }
        },
        {
          name: 'Current Simulation',
          type: 'effectScatter',
          data: [[currentWater, currentYield]],
          symbolSize: 14,
          showEffectOn: 'render',
          rippleEffect: { brushType: 'stroke', scale: 3.5 },
          itemStyle: { color: '#10b981', shadowBlur: 10, shadowColor: '#10b981' },
          z: 10
        }
      ]
    };
  };

  // Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.985 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 25 }
    }
  };

  return (
    <motion.div 
      className="content-body"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Intro Gradient Banner */}
      <motion.div 
        className="glass-card" 
        variants={cardVariants}
        style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)' }}
      >
        <Sparkles size={28} style={{ color: 'var(--primary)', filter: 'drop-shadow(0 0 8px var(--primary-glow))' }} />
        <div>
          <h3>Interactive AI Prediction Center</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
            Adjust physical and chemical constraints to simulate yield forecasts. Toggle between multiple machine learning models trained dynamically on real dataset.
          </p>
        </div>
      </motion.div>

      {/* Model Selection Tabs and Diagnostics */}
      <motion.div 
        className="glass-card" 
        variants={cardVariants}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} style={{ color: 'var(--secondary)' }} />
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Select Predictive Engine</h4>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.02)', padding: '0.25rem', borderRadius: '8px' }}>
            {[
              { id: 'linear', label: 'Linear Regression' },
              { id: 'tree', label: 'Decision Tree' },
              { id: 'forest', label: 'Random Forest' },
              { id: 'xgboost', label: 'XGBoost' }
            ].map(m => (
              <motion.button 
                key={m.id}
                className={`btn ${selectedModel === m.id ? 'btn-primary' : ''}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
                onClick={() => setSelectedModel(m.id)}
                disabled={predicting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {m.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Model Metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '8px' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>R² SCORE</span>
            <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary)' }}>
              {forecast.metrics.r2.toFixed(4)}
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>MAE (tons)</span>
            <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--secondary)' }}>
              {forecast.metrics.mae.toFixed(3)}
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>RMSE (tons)</span>
            <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--warning)' }}>
              {forecast.metrics.rmse.toFixed(3)}
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>TRAIN SAMPLES</span>
            <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {forecast.metrics.train_samples}
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>TEST SAMPLES</span>
            <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {forecast.metrics.test_samples}
            </span>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div 
          className="glass-card" 
          variants={cardVariants}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)' }}
        >
          <AlertCircle size={20} style={{ color: 'var(--danger)' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</span>
        </motion.div>
      )}

      {/* Main Grid: Parameters & Core Output Gauges */}
      <div className="ml-panel-grid">
        {/* Left Side: Parameters Slider inputs */}
        <motion.div 
          className="glass-card" 
          variants={cardVariants}
          whileHover={{ borderColor: 'var(--panel-border-hover)' }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}
        >
          {predicting && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(1px)', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '16px', zIndex: 5 }}>
              <span className="spin" style={{ width: '24px', height: '24px', border: '3px solid transparent', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <Sliders size={16} style={{ color: 'var(--primary)' }} />
            <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Simulation Parameters</h4>
          </div>

          {/* Categoricals */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Crop Type</label>
              <select className="filter-select" style={{ padding: '0.4rem', fontSize: '0.8rem' }} value={formInput.Crop_Type} onChange={(e) => handleSelectChange('Crop_Type', e.target.value)}>
                {categories.crops.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Soil Type</label>
              <select className="filter-select" style={{ padding: '0.4rem', fontSize: '0.8rem' }} value={formInput.Soil_Type} onChange={(e) => handleSelectChange('Soil_Type', e.target.value)}>
                {categories.soils.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Irrigation</label>
              <select className="filter-select" style={{ padding: '0.4rem', fontSize: '0.8rem' }} value={formInput.Irrigation_Type} onChange={(e) => handleSelectChange('Irrigation_Type', e.target.value)}>
                {categories.irrigations.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Season</label>
              <select className="filter-select" style={{ padding: '0.4rem', fontSize: '0.8rem' }} value={formInput.Season} onChange={(e) => handleSelectChange('Season', e.target.value)}>
                {categories.seasons.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <hr style={{ border: 'none', borderBottom: '1px solid var(--panel-border)', margin: '0.25rem 0' }} />

          {/* Continuous Range Sliders */}
          <div className="filter-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <label>Farm Size (acres):</label>
              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formInput['Farm_Area(acres)'].toFixed(0)} ac</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="500" 
              step="5"
              value={formInput['Farm_Area(acres)']} 
              onChange={(e) => handleSliderChange('Farm_Area(acres)', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
          </div>

          <div className="filter-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <label>Water Allocated (m³):</label>
              <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{formInput['Water_Usage(cubic meters)'].toLocaleString()} m³</span>
            </div>
            <input 
              type="range" 
              min="5000" 
              max="100000" 
              step="1000"
              value={formInput['Water_Usage(cubic meters)']} 
              onChange={(e) => handleSliderChange('Water_Usage(cubic meters)', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--secondary)', cursor: 'pointer' }}
            />
          </div>

          <div className="filter-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <label>Fertilizer Intensity (tons):</label>
              <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>{formInput['Fertilizer_Used(tons)'].toFixed(1)} t</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="15.0" 
              step="0.1"
              value={formInput['Fertilizer_Used(tons)']} 
              onChange={(e) => handleSliderChange('Fertilizer_Used(tons)', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--warning)', cursor: 'pointer' }}
            />
          </div>

          <div className="filter-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <label>Pesticide Intensity (kg):</label>
              <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{formInput['Pesticide_Used(kg)'].toFixed(1)} kg</span>
            </div>
            <input 
              type="range" 
              min="0.0" 
              max="15.0" 
              step="0.1"
              value={formInput['Pesticide_Used(kg)']} 
              onChange={(e) => handleSliderChange('Pesticide_Used(kg)', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--danger)', cursor: 'pointer' }}
            />
          </div>
        </motion.div>

        {/* Right Side: Prediction Output Glass Gauges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Main Yield Forecast Card with ECharts Gauge */}
          <motion.div 
            className="glass-card" 
            variants={cardVariants}
            whileHover={{ y: -3, borderColor: 'var(--panel-border-hover)' }}
            style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem 2rem', textAlign: 'center' }}
          >
            <span className="kpi-label" style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>MODEL FORECASTED YIELD</span>
            
            <div style={{ height: '180px', width: '100%', maxWidth: '280px', margin: '-10px 0' }}>
              <ReactECharts option={getYieldGaugeOption(forecast.yieldVal)} style={{ height: '100%', width: '100%' }} />
            </div>
            
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '340px', margin: '0.5rem 0 0 0' }}>
              Consensus simulation computed dynamically via {selectedModel.toUpperCase()} regression algorithms.
            </p>
          </motion.div>

          {/* Dials Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1rem' }}>
            {/* Confidence Card with Meter */}
            <motion.div 
              className="glass-card" 
              variants={cardVariants}
              whileHover={{ scale: 1.02, borderColor: 'var(--panel-border-hover)' }}
              style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                <ShieldCheck size={12} style={{ color: 'var(--secondary)' }} />
                <span>CONFIDENCE</span>
              </div>
              <div style={{ height: '70px', width: '100px', margin: '5px 0 -15px 0' }}>
                <ReactECharts option={getConfidenceGaugeOption(forecast.confidence)} style={{ height: '100%', width: '100%' }} />
              </div>
            </motion.div>

            {/* Productivity & Efficiency Cards */}
            <motion.div 
              className="glass-card" 
              variants={cardVariants}
              whileHover={{ scale: 1.02, borderColor: 'var(--panel-border-hover)' }}
              style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.65rem' }}
            >
              {/* Productivity Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Activity size={10} style={{ color: 'var(--primary)' }} /> Productivity
                  </span>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{forecast.productivity}/100</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <motion.div 
                    style={{ height: '100%', background: 'var(--primary)', borderRadius: '3px' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${forecast.productivity}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                  />
                </div>
              </div>

              {/* Efficiency Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Droplet size={10} style={{ color: 'var(--warning)' }} /> Efficiency
                  </span>
                  <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>{forecast.efficiency}/100</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <motion.div 
                    style={{ height: '100%', background: 'var(--warning)', borderRadius: '3px' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${forecast.efficiency}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Premium Visualizations section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginTop: '1.25rem' }}>
        <motion.div className="glass-card" variants={cardVariants} whileHover={{ borderColor: 'var(--panel-border-hover)', y: -2 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <Award size={16} style={{ color: 'var(--secondary)' }} />
            <h4 style={{ fontSize: '0.9rem', margin: 0 }}>Feature Contributions</h4>
          </div>
          <div className="chart-container" style={{ height: '220px' }}>
            <ReactECharts option={getImportanceOption(forecast.featureImportance)} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

        <motion.div className="glass-card" variants={cardVariants} whileHover={{ borderColor: 'var(--panel-border-hover)', y: -2 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <Layers size={16} style={{ color: 'var(--warning)' }} />
            <h4 style={{ fontSize: '0.9rem', margin: 0 }}>Historic Deviation & Simulation Point</h4>
          </div>
          <div className="chart-container" style={{ height: '220px' }}>
            <ReactECharts option={getScatterOption(dataset, formInput['Water_Usage(cubic meters)'], forecast.yieldVal)} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>
      </div>

      {/* Detailed Debug Panel with clean toggle animation */}
      <motion.div 
        className="glass-card" 
        variants={cardVariants}
        style={{ marginTop: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.05)', overflow: 'hidden', padding: 0 }}
      >
        <button 
          onClick={() => setDebugExpanded(!debugExpanded)}
          style={{ width: '100%', background: 'rgba(255,255,255,0.01)', border: 'none', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#f8fafc' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: '700', fontSize: '0.85rem', letterSpacing: '0.05em' }}>PREDICTION ENGINE DEBUG PANEL</span>
          </div>
          {debugExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <AnimatePresence>
          {debugExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '1.25rem', background: '#090d16', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--secondary)', display: 'block', marginBottom: '0.5rem' }}>
                      SIMULATION INPUT PAYLOAD
                    </span>
                    <pre style={{ margin: 0, padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.7rem', color: '#a78bfa', fontFamily: 'monospace', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.03)' }}>
                      {JSON.stringify(forecast.payload, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>
                      ENCODED FEATURES & CONTRIBUTIONS
                    </span>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                            <th style={{ textAlign: 'left', padding: '4px 0' }}>Feature Name</th>
                            <th style={{ textAlign: 'right', padding: '4px 0' }}>Encoded Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forecast.featureNames.map((name, idx) => (
                            <tr key={name} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                              <td style={{ color: '#94a3b8', padding: '4px 0' }}>{name}</td>
                              <td style={{ textAlign: 'right', color: '#10b981', padding: '4px 0' }}>
                                {forecast.encodedFeatures[idx]?.toFixed(4) || '0.0000'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--warning)', display: 'block', marginBottom: '0.5rem' }}>
                    PREDICTOR RESPONSE DIAGNOSTIC
                  </span>
                  <pre style={{ margin: 0, padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.7rem', color: '#34d399', fontFamily: 'monospace', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.03)' }}>
                    {JSON.stringify({
                      predicted_yield: forecast.yieldVal,
                      productivity_score: forecast.productivity,
                      efficiency_score: forecast.efficiency,
                      confidence_score: forecast.confidence,
                      model_used: selectedModel,
                      dataset_records: dataset.length
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
