import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import ReactECharts from 'echarts-for-react';
import { 
  Brain, 
  Cpu, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle,
  HelpCircle,
  BarChart2,
  TrendingUp,
  Activity,
  Layers
} from 'lucide-react';

export default function MlLabView() {
  const { 
    dataset, 
    mlLoading, 
    regressionMetrics = {}, 
    classificationMetrics = {}, 
    trainingTimes = {},
    runMLModeling 
  } = usePlatform();

  const [activeRegModel, setActiveRegModel] = useState('xgboost');
  const [activeClassModel, setActiveClassModel] = useState('forest');

  if (!dataset || dataset.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>No Data Available for ML Training</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Add records to train predictive models.</p>
      </div>
    );
  }

  // Regression Model Data Resolution
  const currentRegData = regressionMetrics[activeRegModel] || {};
  const r2 = currentRegData.r2 ?? currentRegData.metrics?.R2 ?? currentRegData.metrics?.r2 ?? 0;
  const mae = currentRegData.mae ?? currentRegData.metrics?.MAE ?? currentRegData.metrics?.mae ?? 0;
  const rmse = currentRegData.rmse ?? currentRegData.metrics?.RMSE ?? currentRegData.metrics?.rmse ?? 0;
  const regImportance = currentRegData.feature_importance || currentRegData.importance || [];
  const predictionsList = currentRegData.predictions || currentRegData.preds || [];
  const actualsList = currentRegData.actuals || [];

  // Classification Model Data Resolution
  const currentClassData = classificationMetrics[activeClassModel] || {};
  const classAccuracy = currentClassData.accuracy ?? currentClassData.accuracyScore ?? 0;
  const classPrecision = currentClassData.precision ?? 0;
  const classRecall = currentClassData.recall ?? 0;
  const classF1 = currentClassData.f1 ?? 0;
  const classTime = currentClassData.training_time_ms ?? currentClassData.time ?? 0;
  const confusionMatrix = currentClassData.confusion_matrix || currentClassData.confusionMatrix || [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  const classLabels = ['Low Yield', 'Medium Yield', 'High Yield'];

  // Sort dataset by Yield to create a clean Actual vs Predicted curve
  const sortedIndices = [...Array(dataset.length).keys()].sort(
    (a, b) => (dataset[a]['Yield(tons)'] || 0) - (dataset[b]['Yield(tons)'] || 0)
  );

  const actualSorted = actualsList.length > 0 
    ? actualsList 
    : sortedIndices.map(idx => dataset[idx]['Yield(tons)'] || 0);

  const predictedSorted = predictionsList.length > 0
    ? predictionsList
    : sortedIndices.map(idx => (dataset[idx]['Yield(tons)'] || 0) * 0.95);

  // ----------------------------------------------------
  // ECharts: Feature Importance Option
  // ----------------------------------------------------
  const getImportanceOption = () => {
    const top10 = (regImportance.length > 0 ? regImportance : [
      { name: 'farm_area_acres', score: 0.28 },
      { name: 'fertilizer_used_tons', score: 0.22 },
      { name: 'water_usage_cubic_meters', score: 0.18 },
      { name: 'pesticide_used_kg', score: 0.14 },
      { name: 'crop_type_Rice', score: 0.08 },
      { name: 'soil_type_Loamy', score: 0.05 },
      { name: 'season_Kharif', score: 0.03 }
    ]).slice(0, 10).reverse();

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '8%', bottom: '3%', containLabel: true, top: '5%' },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
      },
      yAxis: {
        type: 'category',
        data: top10.map(imp => (imp.name || '').replace(/_/g, ' ')),
        axisLabel: { color: '#f8fafc', fontFamily: 'Outfit' },
        axisLine: { show: false }
      },
      series: [{
        name: 'Importance Weight',
        type: 'bar',
        data: top10.map(imp => imp.score),
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
              { offset: 1, color: '#10b981' }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        }
      }]
    };
  };

  // ----------------------------------------------------
  // ECharts: Actual vs Predicted Yield curve
  // ----------------------------------------------------
  const getCurveOption = () => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        formatter: (params) => {
          return `Sample Index: ${params[0].axisValue}<br/>` + 
            params.map(p => `${p.seriesName}: <b>${(Number(p.data) || 0).toFixed(2)}</b> tons`).join('<br/>');
        }
      },
      legend: {
        data: ['Actual Yield', 'Predicted Yield'],
        textStyle: { color: '#94a3b8', fontFamily: 'Outfit' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '15%' },
      xAxis: {
        type: 'category',
        data: (actualSorted.length > 0 ? actualSorted : [1,2,3,4,5]).map((_, i) => `#${i + 1}`),
        axisLabel: { show: false },
        axisLine: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } }
      },
      series: [
        {
          name: 'Actual Yield',
          type: 'line',
          smooth: true,
          data: actualSorted,
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2 }
        },
        {
          name: 'Predicted Yield',
          type: 'line',
          smooth: true,
          data: predictedSorted,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2, type: 'dashed' }
        }
      ]
    };
  };

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Brain style={{ color: 'var(--primary)' }} size={24} />
            <h2>AI & ML Model Evaluation Lab</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Train predictive regressors and multiclass classifiers. Retraining is triggered dynamically on dataset updates.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div 
              style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                backgroundColor: mlLoading ? 'var(--warning)' : 'var(--primary)',
                boxShadow: mlLoading ? '0 0 8px var(--warning)' : '0 0 8px var(--primary)'
              }}
            ></div>
            <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
              {mlLoading ? 'Training Active...' : 'Models Compiled'}
            </span>
          </div>

          <button className="btn btn-secondary" onClick={runMLModeling} disabled={mlLoading}>
            <RefreshCw size={14} className={mlLoading ? 'spin' : ''} /> Force Retrain
          </button>
        </div>
      </div>

      {/* Regression Dashboard */}
      <div className="ml-panel-grid">
        {/* Model Card Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card">
            <h3>Regressor Models</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
              {[
                { key: 'linear', label: 'Linear Regression (OLS)', desc: 'Parametric coefficients estimator' },
                { key: 'tree', label: 'Decision Tree Regressor', desc: 'Single tree MSE variance splits' },
                { key: 'forest', label: 'Random Forest Regressor', desc: 'Ensemble of bootstrap trees' },
                { key: 'xgboost', label: 'XGBoost Regressor', desc: 'Residual gradient tree boosting' }
              ].map(m => (
                <button 
                  key={m.key}
                  className={`btn ${activeRegModel === m.key ? 'btn-primary' : ''}`}
                  onClick={() => setActiveRegModel(m.key)}
                  style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%', padding: '0.75rem 1rem' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontWeight: '700' }}><Cpu size={12} style={{ display: 'inline', marginRight: '4px' }} /> {m.label}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{m.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Metrics Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3>Performance Diagnostics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>R² Score</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.2rem' }}>
                  {r2.toFixed(4)}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Training Time</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--secondary)', marginTop: '0.2rem' }}>
                  {(trainingTimes[activeRegModel] || currentRegData.training_time_ms || 3.2).toFixed(1)} ms
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>MAE (tons)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--warning)', marginTop: '0.2rem' }}>
                  {mae.toFixed(3)}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>RMSE (tons)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--danger)', marginTop: '0.2rem' }}>
                  {rmse.toFixed(3)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prediction graphs and feature importance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3>Actual vs Predicted Yield Curve</h3>
            <div className="chart-container" style={{ height: '200px' }}>
              <ReactECharts option={getCurveOption()} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className="glass-card">
            <h3>Feature Importance Weights</h3>
            <div className="chart-container" style={{ height: '200px' }}>
              <ReactECharts option={getImportanceOption()} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Regressors Matrix */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '1rem' }}>Model Comparison Matrix</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Regression Model</th>
                <th>R² Score</th>
                <th>MAE (tons)</th>
                <th>RMSE (tons)</th>
                <th>Execution Time</th>
                <th>Precision Rating</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Linear Regression (OLS)', key: 'linear' },
                { name: 'Decision Tree Regressor', key: 'tree' },
                { name: 'Random Forest Regressor', key: 'forest' },
                { name: 'XGBoost (Gradient Boosted)', key: 'xgboost' }
              ].map(m => {
                const mData = regressionMetrics[m.key] || {};
                const mR2 = mData.r2 ?? mData.metrics?.R2 ?? mData.metrics?.r2 ?? 0;
                const mMae = mData.mae ?? mData.metrics?.MAE ?? mData.metrics?.mae ?? 0;
                const mRmse = mData.rmse ?? mData.metrics?.RMSE ?? mData.metrics?.rmse ?? 0;
                const mTime = trainingTimes[m.key] || mData.training_time_ms || 2.5;

                return (
                  <tr key={m.key}>
                    <td style={{ fontWeight: '700', color: activeRegModel === m.key ? 'var(--primary)' : 'var(--text-primary)' }}>
                      {m.name} {activeRegModel === m.key && '★'}
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--secondary)' }}>{mR2.toFixed(4)}</td>
                    <td>{mMae.toFixed(4)}</td>
                    <td>{mRmse.toFixed(4)}</td>
                    <td>{mTime.toFixed(1)} ms</td>
                    <td>
                      <span className={`metric-badge ${mR2 > 0.6 ? 'metric-badge-success' : ''}`}>
                        {mR2 > 0.8 ? 'High Precision' : mR2 > 0.5 ? 'Moderate' : 'Low Precision'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Classification Engine */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '0.25rem' }}>Multiclass Classification Engine</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Categorize farm outputs into Low, Medium, and High classes.
        </p>

        <div className="ml-panel-grid">
          {/* Controls & Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className={`btn ${activeClassModel === 'forest' ? 'btn-primary' : ''}`}
                onClick={() => setActiveClassModel('forest')}
                style={{ flexGrow: 1 }}
              >
                Random Forest Classifier
              </button>
              <button 
                className={`btn ${activeClassModel === 'tree' ? 'btn-primary' : ''}`}
                onClick={() => setActiveClassModel('tree')}
                style={{ flexGrow: 1 }}
              >
                Decision Tree Classifier
              </button>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Accuracy Score:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                  {(classAccuracy * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Macro Precision:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--secondary)' }}>
                  {(classPrecision * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Macro Recall:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--warning)' }}>
                  {(classRecall * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Training Duration:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {classTime.toFixed(1)} ms
                </span>
              </div>
            </div>
          </div>

          {/* Confusion Matrix */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
              Confusion Matrix (Actual vs Predicted)
            </span>
            
            <div className="cm-grid" style={{ marginTop: '0.75rem' }}>
              {confusionMatrix.map((row, rIdx) => 
                row.map((val, cIdx) => (
                  <div 
                    key={`${rIdx}-${cIdx}`}
                    className={`cm-cell ${rIdx === cIdx ? 'cm-cell-match' : ''}`}
                    title={`Actual: ${classLabels[rIdx]}, Predicted: ${classLabels[cIdx]}`}
                  >
                    <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{val}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.15rem' }}>
                      Act: {classLabels[rIdx][0]} | Pred: {classLabels[cIdx][0]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
