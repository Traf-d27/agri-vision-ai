import React from 'react';
import { usePlatform } from '../context/PlatformContext';
import ReactECharts from 'echarts-for-react';
import { 
  Heart, 
  Droplets, 
  Wind, 
  TrendingUp, 
  ShieldAlert, 
  Zap 
} from 'lucide-react';

export default function SustainabilityHubView() {
  const { filteredDataset } = usePlatform();

  if (filteredDataset.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>No Data Available for Sustainability Analysis</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Adjust filters to load farm records.</p>
      </div>
    );
  }

  // ----------------------------------------------------
  // Score Calculations
  // ----------------------------------------------------
  const calculateSustainabilityMetrics = (data) => {
    const n = data.length;
    
    // 1. Water Score
    const avgWE = data.reduce((a, b) => a + b.waterEfficiency, 0) / n;
    const waterScore = Math.min(100, Math.round((avgWE / 0.001) * 100)) || 0;

    // 2. Chemical Input footprint Score
    const avgChemDensity = data.reduce((a, b) => {
      const chemInKg = b['Fertilizer_Used(tons)'] * 1000 + b['Pesticide_Used(kg)'];
      const density = b['Farm_Area(acres)'] > 0 ? chemInKg / b['Farm_Area(acres)'] : 0;
      return a + density;
    }, 0) / n;
    const inputScore = Math.max(0, Math.round(100 - (avgChemDensity / 1.5))) || 0;

    // 3. Resource Score
    const avgIrrigationScore = data.reduce((a, b) => a + b.irrigationScore, 0) / n;
    const avgSoilScore = data.reduce((a, b) => a + b.soilScore, 0) / n;
    const resourceScore = Math.round((avgIrrigationScore + avgSoilScore) / 2) || 0;

    // 4. Yield score
    const yieldScore = Math.min(100, Math.round(
      data.reduce((a, b) => a + b.sustainabilityScore * (b['Yield(tons)'] / 25), 0) / n
    )) || 0;

    // Overall index
    const overallIndex = Math.round(
      waterScore * 0.3 + 
      inputScore * 0.25 + 
      resourceScore * 0.25 + 
      yieldScore * 0.2
    ) || 0;

    return {
      waterScore,
      inputScore,
      resourceScore,
      yieldScore,
      overallIndex
    };
  };

  const scores = calculateSustainabilityMetrics(filteredDataset);

  // ----------------------------------------------------
  // ECharts: Gauge Dial Option
  // ----------------------------------------------------
  const getGaugeOption = () => {
    const getScoreColor = (score) => {
      if (score >= 80) return '#10b981';
      if (score >= 50) return '#f59e0b';
      return '#ef4444';
    };

    const color = getScoreColor(scores.overallIndex);

    return {
      backgroundColor: 'transparent',
      series: [{
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        radius: '100%',
        center: ['50%', '70%'],
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [scores.overallIndex / 100, color],
              [1, 'rgba(255, 255, 255, 0.04)']
            ]
          }
        },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          offsetCenter: [0, '-10%'],
          valueAnimation: true,
          formatter: () => `{val|${scores.overallIndex}}{unit|/100}`,
          rich: {
            val: { fontSize: 38, fontWeight: '800', color: color, fontFamily: 'Outfit' },
            unit: { fontSize: 14, color: '#94a3b8', padding: [0, 0, 5, 2], fontFamily: 'Outfit' }
          }
        },
        data: [{ value: scores.overallIndex }]
      }]
    };
  };

  // ----------------------------------------------------
  // ECharts: Radar Option
  // ----------------------------------------------------
  const getRadarOption = () => {
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      radar: {
        indicator: [
          { name: 'Water Efficiency', max: 100 },
          { name: 'Chemical Input Efficiency', max: 100 },
          { name: 'Resource Utilization', max: 100 },
          { name: 'Yield Sustainability', max: 100 }
        ],
        center: ['50%', '50%'],
        radius: '70%',
        axisName: { color: '#94a3b8', fontFamily: 'Outfit', fontSize: 11 },
        splitArea: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } },
        angleLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } }
      },
      series: [{
        name: 'Sustainability Ratings',
        type: 'radar',
        data: [{
          value: [
            scores.waterScore,
            scores.inputScore,
            scores.resourceScore,
            scores.yieldScore
          ],
          name: 'Active Scheme',
          areaStyle: { color: 'rgba(16, 185, 129, 0.15)' },
          lineStyle: { color: '#10b981', width: 2 },
          itemStyle: { color: '#10b981' }
        }]
      }]
    };
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--primary)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="content-body">
      <div className="sustainability-grid">
        {/* Overall Sustainability Index */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3>Sustainability Index</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem' }}>
            Composite performance index indicating eco-efficiency and resource utilization rates.
          </p>

          <div className="score-gauge-container" style={{ width: '220px', height: '180px' }}>
            <ReactECharts option={getGaugeOption()} style={{ height: '100%', width: '100%' }} />
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <span className="metric-badge metric-badge-success" style={{ 
              backgroundColor: scores.overallIndex >= 70 ? '' : scores.overallIndex >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
              borderColor: scores.overallIndex >= 70 ? '' : scores.overallIndex >= 50 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)',
              color: getScoreColor(scores.overallIndex)
            }}>
              {scores.overallIndex >= 70 ? 'Excellent Status' : scores.overallIndex >= 50 ? 'Needs Attention' : 'Critical Hazard'}
            </span>
          </div>
        </div>

        {/* Radar Map */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3>Subscore Radar Map</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Visual distribution of ecological criteria. A balanced, wide shape indicates standard efficiency.
          </p>
          <div className="chart-container" style={{ height: '260px' }}>
            <ReactECharts option={getRadarOption()} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Subscore Indicators */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '1.25rem' }}>Ecology Scorecard Indicators</h3>
        
        <div className="sustainability-subscores">
          {/* Water Efficiency Score */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Droplets size={16} style={{ color: 'var(--secondary)' }} />
                <span style={{ fontWeight: '600' }}>Water Efficiency Score</span>
              </div>
              <span style={{ fontWeight: '700', color: getScoreColor(scores.waterScore) }}>{scores.waterScore}/100</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${scores.waterScore}%`, backgroundColor: getScoreColor(scores.waterScore) }}></div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Measures crop yield per cubic meter of water. High scores represent modern micro-irrigation installations (e.g., drip lines).
            </p>
          </div>

          {/* Input Chemical Footprint */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={16} style={{ color: 'var(--warning)' }} />
                <span style={{ fontWeight: '600' }}>Chemical Input Footprint Score</span>
              </div>
              <span style={{ fontWeight: '700', color: getScoreColor(scores.inputScore) }}>{scores.inputScore}/100</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${scores.inputScore}%`, backgroundColor: getScoreColor(scores.inputScore) }}></div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Evaluates pesticide and fertilizer density levels per acre. Lower chemical input density scores higher.
            </p>
          </div>

          {/* Resource Utilization */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wind size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: '600' }}>Resource Utilization Score</span>
              </div>
              <span style={{ fontWeight: '700', color: getScoreColor(scores.resourceScore) }}>{scores.resourceScore}/100</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${scores.resourceScore}%`, backgroundColor: getScoreColor(scores.resourceScore) }}></div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Reflects soil-type health preservation and irrigation method compatibility scores.
            </p>
          </div>

          {/* Yield Sustainability */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: '600' }}>Yield Sustainability Score</span>
              </div>
              <span style={{ fontWeight: '700', color: getScoreColor(scores.yieldScore) }}>{scores.yieldScore}/100</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${scores.yieldScore}%`, backgroundColor: getScoreColor(scores.yieldScore) }}></div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Measures relative yield output achieved per unit of chemical input and water resources consumed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
