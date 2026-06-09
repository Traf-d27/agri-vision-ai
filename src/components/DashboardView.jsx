import React, { useState, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { 
  Sprout, 
  Droplet, 
  Maximize2, 
  Map, 
  Activity, 
  TrendingUp, 
  Clock, 
  ShieldAlert, 
  Layers, 
  Heart,
  TrendingDown
} from 'lucide-react';

// Animated Counter Component
const AnimatedCounter = ({ value, isInt = false, suffix = '' }) => {
  const [currentVal, setCurrentVal] = useState(0);

  useEffect(() => {
    if (isNaN(value) || value === undefined) return;
    const duration = 800; // ms
    const startTime = performance.now();
    const startValue = currentVal;
    const endValue = value;

    let animId;
    const updateCount = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      const current = startValue + (endValue - startValue) * easeProgress;
      setCurrentVal(current);

      if (progress < 1) {
        animId = requestAnimationFrame(updateCount);
      } else {
        setCurrentVal(endValue);
      }
    };

    animId = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  const displayVal = isInt 
    ? Math.round(currentVal).toLocaleString()
    : currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return <span>{displayVal}{suffix}</span>;
};

// Custom Sparkline Component using ECharts
const Sparkline = ({ data, color = '#10b981' }) => {
  const option = {
    grid: { left: 0, right: 0, top: 2, bottom: 2 },
    xAxis: { type: 'category', show: false },
    yAxis: { type: 'value', show: false },
    series: [{
      data,
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 1.5, color },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '22' },
            { offset: 1, color: color + '00' }
          ]
        }
      }
    }]
  };
  return <ReactECharts option={option} style={{ height: '32px', width: '70px' }} />;
};

export default function DashboardView() {
  const { filteredDataset, kpis } = usePlatform();

  if (filteredDataset.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <ShieldAlert size={48} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
        <h3>No Data Matches the Current Filters</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Try resetting the global filters above to display dashboard analytics.
        </p>
      </div>
    );
  }

  const getSparklineData = (key) => {
    return filteredDataset.slice(-12).map(r => r[key]);
  };

  // ECharts options
  const getCropDistOption = () => {
    const counts = {};
    filteredDataset.forEach(r => counts[r.Crop_Type] = (counts[r.Crop_Type] || 0) + 1);
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '10%' },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      toolbox: { feature: { saveAsImage: { title: 'Export', name: 'Crop_Distribution' } } },
      series: [{
        data: data.map(d => d.value),
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

  const getSoilDistOption = () => {
    const counts = {};
    filteredDataset.forEach(r => counts[r.Soil_Type] = (counts[r.Soil_Type] || 0) + 1);
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      toolbox: { feature: { saveAsImage: { title: 'Export', name: 'Soil_Distribution' } } },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: 'rgba(15, 23, 42, 0.8)', borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        data: data,
        color: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899']
      }]
    };
  };

  const getSeasonDistOption = () => {
    const counts = {};
    filteredDataset.forEach(r => counts[r.Season] = (counts[r.Season] || 0) + 1);
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      toolbox: { feature: { saveAsImage: { title: 'Export', name: 'Season_Distribution' } } },
      series: [{
        type: 'pie',
        radius: '65%',
        center: ['50%', '50%'],
        data: data,
        roseType: 'radius',
        label: { color: '#94a3b8', fontFamily: 'Outfit' },
        labelLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        color: ['#6366f1', '#f59e0b', '#10b981']
      }]
    };
  };

  const getIrrDistOption = () => {
    const counts = {};
    filteredDataset.forEach(r => counts[r.Irrigation_Type] = (counts[r.Irrigation_Type] || 0) + 1);
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '10%' },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      toolbox: { feature: { saveAsImage: { title: 'Export', name: 'Irrigation_Distribution' } } },
      series: [{
        data: data.map(d => d.value),
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

  const getHistogramOption = (key, title, colorStart, colorEnd) => {
    const vals = filteredDataset.map(r => r[key]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const binCount = 7;
    const binSize = (max - min) / binCount;
    
    const bins = Array(binCount).fill(0);
    const labels = [];
    
    for (let i = 0; i < binCount; i++) {
      const binMin = min + i * binSize;
      const binMax = binMin + binSize;
      labels.push(`${binMin.toFixed(0)}-${binMax.toFixed(0)}`);
    }

    filteredDataset.forEach(r => {
      const val = r[key];
      let binIdx = Math.floor((val - min) / binSize);
      if (binIdx >= binCount) binIdx = binCount - 1;
      if (binIdx < 0) binIdx = 0;
      bins[binIdx]++;
    });

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '10%' },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      toolbox: { feature: { saveAsImage: { title: 'Export', name: `${title}_Distribution` } } },
      series: [{
        name: 'Farms Count',
        data: bins,
        type: 'bar',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: colorStart },
              { offset: 1, color: colorEnd }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };
  };

  const getScatterOption = (xKey, yKey, labelX, labelY, color) => {
    const points = filteredDataset.map(r => [r[xKey], r[yKey], r.Farm_ID]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          return `${params.data[2]}<br/>${labelX}: ${params.data[0].toLocaleString()}<br/>${labelY}: ${params.data[1].toFixed(2)} tons`;
        },
        textStyle: { fontFamily: 'Outfit' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '12%' },
      xAxis: {
        type: 'value',
        name: labelX,
        nameLocation: 'middle',
        nameGap: 24,
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      yAxis: {
        type: 'value',
        name: labelY,
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      dataZoom: [
        { type: 'inside', filterMode: 'none' },
        { type: 'slider', filterMode: 'none', handleSize: '80%', textStyle: { color: '#94a3b8' } }
      ],
      toolbox: { feature: { saveAsImage: { title: 'Export' } } },
      series: [{
        type: 'scatter',
        symbolSize: 10,
        data: points,
        itemStyle: {
          color: color,
          borderColor: 'rgba(0,0,0,0.2)',
          borderWidth: 1,
          shadowBlur: 8,
          shadowColor: color + '44'
        }
      }]
    };
  };

  const getSeasonYieldOption = () => {
    const sums = {};
    const counts = {};
    filteredDataset.forEach(r => {
      sums[r.Season] = (sums[r.Season] || 0) + r['Yield(tons)'];
      counts[r.Season] = (counts[r.Season] || 0) + 1;
    });
    const seasons = Object.keys(sums);
    const avgs = seasons.map(k => sums[k] / counts[k]);

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '10%' },
      xAxis: {
        type: 'category',
        data: seasons,
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      series: [{
        data: avgs,
        type: 'bar',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#ec4899' },
              { offset: 1, color: '#be185d' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };
  };

  // Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  return (
    <div className="content-body">
      {/* KPI Stats Panel with Sparklines & Growth */}
      <motion.div 
        className="kpi-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* KPI 1 */}
        <motion.div 
          className="glass-card kpi-card" 
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.015, borderColor: 'var(--panel-border-hover)', boxShadow: '0 8px 30px rgba(16, 185, 129, 0.08)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div className="kpi-info">
              <span className="kpi-label">Total Farms</span>
              <span className="kpi-value" style={{ textShadow: '0 0 10px rgba(248, 250, 252, 0.15)' }}>
                <AnimatedCounter value={kpis.totalFarms} isInt={true} />
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                <TrendingUp size={10} />
                <span>+100% database match</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <div className="kpi-icon-wrapper"><Layers size={18} /></div>
              <Sparkline data={getSparklineData('Farm_Area(acres)')} color="#10b981" />
            </div>
          </div>
        </motion.div>

        {/* KPI 2 */}
        <motion.div 
          className="glass-card kpi-card" 
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.015, borderColor: 'var(--panel-border-hover)', boxShadow: '0 8px 30px rgba(6, 182, 212, 0.08)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div className="kpi-info">
              <span className="kpi-label">Average Yield</span>
              <span className="kpi-value" style={{ textShadow: '0 0 10px rgba(6, 182, 212, 0.15)' }}>
                <AnimatedCounter value={kpis.avgYield} /> <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>tons</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                <TrendingUp size={10} />
                <span>Steady growth</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <div className="kpi-icon-wrapper"><Activity size={18} /></div>
              <Sparkline data={getSparklineData('Yield(tons)')} color="#06b6d4" />
            </div>
          </div>
        </motion.div>

        {/* KPI 3 */}
        <motion.div 
          className="glass-card kpi-card" 
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.015, borderColor: 'var(--panel-border-hover)', boxShadow: '0 8px 30px rgba(245, 158, 11, 0.08)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div className="kpi-info">
              <span className="kpi-label">Avg Water Footprint</span>
              <span className="kpi-value" style={{ textShadow: '0 0 10px rgba(245, 158, 11, 0.15)' }}>
                <AnimatedCounter value={kpis.avgWater} /> <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>m³</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--warning)', marginTop: '0.25rem' }}>
                <TrendingDown size={10} />
                <span>Controlled usage</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <div className="kpi-icon-wrapper"><Droplet size={18} /></div>
              <Sparkline data={getSparklineData('Water_Usage(cubic meters)')} color="#f59e0b" />
            </div>
          </div>
        </motion.div>

        {/* KPI 4 */}
        <motion.div 
          className="glass-card kpi-card" 
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.015, borderColor: 'var(--panel-border-hover)', boxShadow: '0 8px 30px rgba(16, 185, 129, 0.08)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div className="kpi-info">
              <span className="kpi-label">Sustainability Index</span>
              <span className="kpi-value" style={{ textShadow: '0 0 10px rgba(16, 185, 129, 0.15)' }}>
                <AnimatedCounter value={kpis.avgSustScore} /> <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>/100</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                <Heart size={10} />
                <span>Eco-compliance optimal</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <div className="kpi-icon-wrapper"><Heart size={18} /></div>
              <Sparkline data={getSparklineData('sustainabilityScore')} color="#10b981" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Visualizations Grid */}
      <motion.div 
        className="visuals-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Crop Distribution */}
        <motion.div className="glass-card chart-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.01, borderColor: 'var(--panel-border-hover)' }}>
          <div className="chart-header">
            <span className="chart-title"><Sprout size={16} /> Crop Distribution</span>
          </div>
          <div className="chart-container">
            <ReactECharts option={getCropDistOption()} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

        {/* Soil Distribution */}
        <motion.div className="glass-card chart-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.01, borderColor: 'var(--panel-border-hover)' }}>
          <div className="chart-header">
            <span className="chart-title"><Map size={16} /> Soil Composition Analysis</span>
          </div>
          <div className="chart-container">
            <ReactECharts option={getSoilDistOption()} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

        {/* Season Distribution */}
        <motion.div className="glass-card chart-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.01, borderColor: 'var(--panel-border-hover)' }}>
          <div className="chart-header">
            <span className="chart-title"><Clock size={16} /> Seasonal Land Occupancy</span>
          </div>
          <div className="chart-container">
            <ReactECharts option={getSeasonDistOption()} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

        {/* Irrigation Distribution */}
        <motion.div className="glass-card chart-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.01, borderColor: 'var(--panel-border-hover)' }}>
          <div className="chart-header">
            <span className="chart-title"><Droplet size={16} /> Irrigation Method Allocation</span>
          </div>
          <div className="chart-container">
            <ReactECharts option={getIrrDistOption()} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

        {/* Yield Distribution */}
        <motion.div className="glass-card chart-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.01, borderColor: 'var(--panel-border-hover)' }}>
          <div className="chart-header">
            <span className="chart-title"><Activity size={16} /> Yield Output Spread</span>
          </div>
          <div className="chart-container">
            <ReactECharts option={getHistogramOption('Yield(tons)', 'Yield', '#6366f1', '#4338ca')} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

        {/* Water Usage Distribution */}
        <motion.div className="glass-card chart-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.01, borderColor: 'var(--panel-border-hover)' }}>
          <div className="chart-header">
            <span className="chart-title"><Droplet size={16} /> Water Allocation Spread</span>
          </div>
          <div className="chart-container">
            <ReactECharts option={getHistogramOption('Water_Usage(cubic meters)', 'Water_Usage', '#f59e0b', '#d97706')} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

        {/* Yield vs Water */}
        <motion.div className="glass-card chart-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.01, borderColor: 'var(--panel-border-hover)' }}>
          <div className="chart-header">
            <span className="chart-title"><Droplet size={16} /> Yield vs Water Usage Scatter</span>
          </div>
          <div className="chart-container">
            <ReactECharts option={getScatterOption('Water_Usage(cubic meters)', 'Yield(tons)', 'Water Usage (m³)', 'Yield', '#06b6d4')} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

        {/* Yield vs Fertilizer */}
        <motion.div className="glass-card chart-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.01, borderColor: 'var(--panel-border-hover)' }}>
          <div className="chart-header">
            <span className="chart-title"><Sprout size={16} /> Yield vs Fertilizer Usage Scatter</span>
          </div>
          <div className="chart-container">
            <ReactECharts option={getScatterOption('Fertilizer_Used(tons)', 'Yield(tons)', 'Fertilizer (tons)', 'Yield', '#10b981')} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

        {/* Yield vs Farm Area */}
        <motion.div className="glass-card chart-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.01, borderColor: 'var(--panel-border-hover)' }}>
          <div className="chart-header">
            <span className="chart-title"><Maximize2 size={16} /> Yield vs Farm Area Scatter</span>
          </div>
          <div className="chart-container">
            <ReactECharts option={getScatterOption('Farm_Area(acres)', 'Yield(tons)', 'Farm Area (acres)', 'Yield', '#6366f1')} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

        {/* Season vs Yield */}
        <motion.div className="glass-card chart-card" variants={cardVariants} whileHover={{ y: -4, scale: 1.01, borderColor: 'var(--panel-border-hover)' }}>
          <div className="chart-header">
            <span className="chart-title"><Clock size={16} /> Seasonal Productivity Benchmark</span>
          </div>
          <div className="chart-container">
            <ReactECharts option={getSeasonYieldOption()} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
