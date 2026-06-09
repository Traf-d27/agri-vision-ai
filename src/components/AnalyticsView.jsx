import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import ReactECharts from 'echarts-for-react';
import { 
  BarChart2, 
  HelpCircle, 
  Settings, 
  Sliders,
  TrendingUp,
  Activity,
  GitCommit
} from 'lucide-react';
import { calculateSkewness, calculateKurtosis } from '../services/mlService';

export default function AnalyticsView() {
  const { filteredDataset, singleRegressions } = usePlatform();
  const [activeRegTarget, setActiveRegTarget] = useState('water'); // 'water', 'fertilizer', 'area'

  if (filteredDataset.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>No Data Available for Statistical Analysis</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Please adjust global filters to include records.
        </p>
      </div>
    );
  }

  const numericalKeys = [
    { key: 'Farm_Area(acres)', label: 'Farm Area (acres)', unit: 'ac' },
    { key: 'Fertilizer_Used(tons)', label: 'Fertilizer (tons)', unit: 't' },
    { key: 'Pesticide_Used(kg)', label: 'Pesticide (kg)', unit: 'kg' },
    { key: 'Yield(tons)', label: 'Yield (tons)', unit: 't' },
    { key: 'Water_Usage(cubic meters)', label: 'Water Usage (m³)', unit: 'm³' }
  ];

  // ----------------------------------------------------
  // Statistics Calculations
  // ----------------------------------------------------
  const calculateStats = (key) => {
    const vals = filteredDataset.map(r => r[key]).filter(v => typeof v === 'number' && !isNaN(v));
    if (vals.length === 0) return {};

    const n = vals.length;
    const sorted = [...vals].sort((a, b) => a - b);
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    
    let median;
    if (n % 2 === 0) {
      median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    } else {
      median = sorted[Math.floor(n / 2)];
    }

    const counts = {};
    let maxCount = 0;
    let mode = sorted[0];
    sorted.forEach(v => {
      counts[v] = (counts[v] || 0) + 1;
      if (counts[v] > maxCount) {
        maxCount = counts[v];
        mode = v;
      }
    });
    const modeStr = maxCount > 1 ? mode.toFixed(2) : 'No Mode';

    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Skewness and Kurtosis
    const skewness = calculateSkewness(vals, mean, stdDev);
    const kurtosis = calculateKurtosis(vals, mean, stdDev);

    const getPercentile = (p) => {
      const idx = (n - 1) * p;
      const base = Math.floor(idx);
      const rest = idx - base;
      if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
      }
      return sorted[base];
    };

    const q1 = getPercentile(0.25);
    const q3 = getPercentile(0.75);
    const iqr = q3 - q1;

    const lowBound = q1 - 1.5 * iqr;
    const highBound = q3 + 1.5 * iqr;
    const outliers = vals.filter(v => v < lowBound || v > highBound);

    return {
      mean,
      median,
      mode: modeStr,
      variance,
      stdDev,
      skewness,
      kurtosis,
      min: sorted[0],
      max: sorted[n - 1],
      q1,
      q3,
      iqr,
      outliers
    };
  };

  const columnStats = {};
  numericalKeys.forEach(col => {
    columnStats[col.key] = calculateStats(col.key);
  });

  // ----------------------------------------------------
  // Pearson Correlation Coefficient Matrix (ECharts Heatmap)
  // ----------------------------------------------------
  const calculateCorrelation = (key1, key2) => {
    const x = filteredDataset.map(r => r[key1]);
    const y = filteredDataset.map(r => r[key2]);
    const n = x.length;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let denX = 0;
    let denY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    if (denX === 0 || denY === 0) return 0;
    return num / Math.sqrt(denX * denY);
  };

  const getCorrelationHeatmapOption = () => {
    const data = [];
    const xAxisData = numericalKeys.map(k => k.label.split(' ')[0]);
    
    numericalKeys.forEach((row, rowIdx) => {
      numericalKeys.forEach((col, colIdx) => {
        const val = calculateCorrelation(row.key, col.key);
        data.push([colIdx, rowIdx, parseFloat(val.toFixed(3))]);
      });
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        formatter: (params) => {
          const rowName = numericalKeys[params.data[1]].label;
          const colName = numericalKeys[params.data[0]].label;
          return `${rowName} vs ${colName}<br/>Correlation: <b>${params.data[2]}</b>`;
        }
      },
      grid: { height: '80%', top: '10%', bottom: '10%' },
      xAxis: {
        type: 'category',
        data: xAxisData,
        splitArea: { show: true },
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        axisLine: { show: false }
      },
      yAxis: {
        type: 'category',
        data: numericalKeys.map(k => k.label),
        splitArea: { show: true },
        axisLabel: { color: '#94a3b8', fontFamily: 'Outfit' },
        axisLine: { show: false }
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#ef4444', 'rgba(15,23,42,0.65)', '#10b981'] // Red to Slate to Emerald
        },
        textStyle: { color: '#94a3b8' }
      },
      series: [{
        name: 'Correlation',
        type: 'heatmap',
        data: data,
        label: { show: true, color: '#f8fafc', fontWeight: 'bold' },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  };

  // ----------------------------------------------------
  // Regression & Confidence Band Chart
  // ----------------------------------------------------
  const getRegressionChartOption = () => {
    const reg = singleRegressions[activeRegTarget];
    if (!reg) return {};

    // Sort confidence band values by X ascending to draw continuous lines
    const sortedBands = [...reg.confidenceBands].sort((a, b) => a.x - b.x);

    const xVals = sortedBands.map(pt => pt.x);
    const yPreds = sortedBands.map(pt => pt.yPred);
    const lowers = sortedBands.map(pt => pt.lower);
    const uppers = sortedBands.map(pt => pt.upper);
    const difference = uppers.map((up, i) => up - lowers[i]); // Stack difference

    const labelMap = {
      water: 'Water Usage (m³)',
      fertilizer: 'Fertilizer Used (tons)',
      area: 'Farm Area (acres)'
    };

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params) => {
          let html = `X: ${params[0].axisValue.toLocaleString()}<br/>`;
          params.forEach(p => {
            if (p.seriesName === 'Raw Data') {
              html += `Actual Yield: ${p.data[1].toFixed(2)} tons (Farm ${p.data[2]})<br/>`;
            } else if (p.seriesName === 'Regression Fit') {
              html += `Predicted Yield: <b>${p.data.toFixed(2)}</b> tons<br/>`;
            } else if (p.seriesName === 'Upper Bound') {
              // Re-calculate upper from difference stack
              const idx = p.dataIndex;
              html += `95% Confidence: [${lowers[idx].toFixed(2)} - ${uppers[idx].toFixed(2)}] tons<br/>`;
            }
          });
          return html;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        name: labelMap[activeRegTarget],
        nameLocation: 'middle',
        nameGap: 24,
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Yield (tons)',
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      toolbox: { feature: { saveAsImage: { title: 'Export' } } },
      series: [
        // 1. Raw Data Points
        {
          name: 'Raw Data',
          type: 'scatter',
          data: sortedBands.map(pt => [pt.x, pt.y, pt.x]),
          symbolSize: 8,
          itemStyle: { color: '#06b6d4', opacity: 0.65 }
        },
        // 2. OLS regression line
        {
          name: 'Regression Fit',
          type: 'line',
          data: yPreds,
          symbol: 'none',
          lineStyle: { color: '#10b981', width: 2.5 },
          z: 5
        },
        // 3. Lower Bound (Stacked baseline)
        {
          name: 'Lower Bound',
          type: 'line',
          data: lowers,
          symbol: 'none',
          lineStyle: { opacity: 0 },
          stack: 'confidence',
          z: 1
        },
        // 4. Upper Bound (Stacked fill)
        {
          name: 'Upper Bound',
          type: 'line',
          data: difference,
          symbol: 'none',
          lineStyle: { opacity: 0 },
          stack: 'confidence',
          areaStyle: { color: 'rgba(16, 185, 129, 0.12)' },
          z: 1
        }
      ]
    };
  };

  // ----------------------------------------------------
  // Residuals vs Fitted values plot
  // ----------------------------------------------------
  const getResidualsChartOption = () => {
    const reg = singleRegressions[activeRegTarget];
    if (!reg) return {};

    const points = reg.confidenceBands.map(pt => [pt.yPred, pt.residual]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params) => `Predicted: ${params.data[0].toFixed(2)}<br/>Residual: <b>${params.data[1].toFixed(2)}</b> tons`
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Fitted (Predicted) Yield',
        nameLocation: 'middle',
        nameGap: 24,
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Residuals (Y - Y_pred)',
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      series: [
        {
          type: 'scatter',
          symbolSize: 8,
          data: points,
          itemStyle: { color: '#f59e0b', opacity: 0.7 }
        },
        // Zero residuals line
        {
          type: 'line',
          data: [[Math.min(...points.map(p => p[0])), 0], [Math.max(...points.map(p => p[0])), 0]],
          symbol: 'none',
          lineStyle: { color: 'rgba(255,255,255,0.3)', width: 1.5, type: 'dashed' }
        }
      ]
    };
  };

  const regInfo = singleRegressions[activeRegTarget] || { slope: 0, intercept: 0, r2: 0, correlation: 0, equation: '' };

  return (
    <div className="content-body">
      {/* 1. Statistics Summary */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 size={18} style={{ color: 'var(--primary)' }} /> Advanced Statistical Matrix
        </h3>
        
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Continuous Feature</th>
                <th>Mean</th>
                <th>Median</th>
                <th>Mode</th>
                <th>Std Dev</th>
                <th>Variance</th>
                <th>Skewness</th>
                <th>Kurtosis</th>
                <th>IQR Bounds (Outliers)</th>
              </tr>
            </thead>
            <tbody>
              {numericalKeys.map(col => {
                const s = columnStats[col.key];
                if (!s.mean) return null;
                return (
                  <tr key={col.key}>
                    <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{col.label}</td>
                    <td>{s.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{s.median.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{s.mode}</td>
                    <td>{s.stdDev.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{s.variance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td style={{ color: Math.abs(s.skewness) > 1 ? 'var(--warning)' : 'var(--text-primary)' }}>
                      {s.skewness.toFixed(3)}
                    </td>
                    <td style={{ color: Math.abs(s.kurtosis) > 1 ? 'var(--warning)' : 'var(--text-primary)' }}>
                      {s.kurtosis.toFixed(3)}
                    </td>
                    <td>
                      {s.q1.toFixed(1)} - {s.q3.toFixed(1)}
                      <span className="metric-badge" style={{ marginLeft: '0.5rem', background: s.outliers.length > 0 ? 'rgba(239,68,68,0.15)' : '', borderColor: s.outliers.length > 0 ? 'rgba(239,68,68,0.3)' : '', color: s.outliers.length > 0 ? 'var(--danger)' : '' }}>
                        {s.outliers.length} outliers
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Heatmap & custom box plots */}
      <div className="stats-grid">
        {/* Heatmap */}
        <div className="glass-card" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h3>Pearson Correlation Heatmap</h3>
          <div style={{ flexGrow: 1, height: '0' }}>
            <ReactECharts option={getCorrelationHeatmapOption()} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        {/* Dynamic Box Plots */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ marginBottom: '1rem' }}>Visual Box Plots</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {numericalKeys.map(col => {
              const s = columnStats[col.key];
              if (!s.mean) return null;

              const range = s.max - s.min || 1.0;
              const q1Pct = ((s.q1 - s.min) / range) * 100;
              const medPct = ((s.median - s.min) / range) * 100;
              const q3Pct = ((s.q3 - s.min) / range) * 100;

              return (
                <div key={col.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '500' }}>
                    <span>{col.label}</span>
                    <span style={{ color: 'var(--secondary)' }}>
                      Min: {s.min.toFixed(0)} | Q1: {s.q1.toFixed(0)} | Med: {s.median.toFixed(1)} | Q3: {s.q3.toFixed(0)} | Max: {s.max.toFixed(0)}
                    </span>
                  </div>
                  
                  <div style={{ position: 'relative', height: '22px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>
                    {/* Range Line */}
                    <div style={{ position: 'absolute', top: '10px', left: '0', right: '0', height: '2px', background: 'rgba(255,255,255,0.15)' }}></div>
                    
                    {/* IQR Box */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '3px', 
                      left: `${q1Pct}%`, 
                      width: `${q3Pct - q1Pct}%`, 
                      height: '14px', 
                      background: 'rgba(16, 185, 129, 0.2)', 
                      border: '1px solid var(--primary)', 
                      borderRadius: '3px' 
                    }}></div>
                    
                    {/* Median Line */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '1px', 
                      left: `${medPct}%`, 
                      width: '2px', 
                      height: '18px', 
                      background: 'var(--secondary)',
                      boxShadow: '0 0 4px var(--secondary)'
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. OLS Regression Dashboard */}
      <div className="glass-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem' }}>
          <div>
            <h3>OLS Linear Regression Fitting</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Fit single variables against crop Yield output to extract regression equations and shaded 95% confidence bounds.
            </p>
          </div>

          {/* Controller */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { key: 'water', label: 'Yield vs Water' },
              { key: 'fertilizer', label: 'Yield vs Fertilizer' },
              { key: 'area', label: 'Yield vs Farm Area' }
            ].map(b => (
              <button 
                key={b.key} 
                className={`btn btn-sm ${activeRegTarget === b.key ? 'btn-primary' : ''}`}
                onClick={() => setActiveRegTarget(b.key)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Fitted Equation</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.35rem', fontFamily: 'monospace' }}>
              {regInfo.equation}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Correlation Coefficient (r)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--secondary)', marginTop: '0.2rem' }}>
              {regInfo.correlation.toFixed(4)}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>R² Fit Score</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--warning)', marginTop: '0.2rem' }}>
              {regInfo.r2.toFixed(4)}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Residual Standard Error (se)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {regInfo.se.toFixed(4)}
            </div>
          </div>
        </div>

        {/* Charts: Regression Curve & Residuals plot side-by-side */}
        <div className="visuals-grid">
          <div className="glass-card" style={{ height: '340px', background: 'rgba(0,0,0,0.15)' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>95% Confidence Band Regression Curve</h4>
            <div style={{ height: '280px' }}>
              <ReactECharts option={getRegressionChartOption()} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className="glass-card" style={{ height: '340px', background: 'rgba(0,0,0,0.15)' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>Residuals vs Fitted (Predicted) Values</h4>
            <div style={{ height: '280px' }}>
              <ReactECharts option={getResidualsChartOption()} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
