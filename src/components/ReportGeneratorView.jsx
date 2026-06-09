import React from 'react';
import { usePlatform } from '../context/PlatformContext';
import { exportToCSV } from '../services/dataManager';
import { 
  FileText, 
  Printer, 
  Download, 
  CheckCircle, 
  Sparkles 
} from 'lucide-react';
import { calculateSkewness, calculateKurtosis } from '../services/mlService';

export default function ReportGeneratorView() {
  const { filteredDataset, filters, kpis, rankings, recommendations, regressionMetrics, trainingTimes, API_BASE, auth } = usePlatform();

  // Print PDF Trigger
  const handlePrint = () => {
    window.print();
  };

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (filters.cropType && filters.cropType !== 'All') params.append('crop_type', filters.cropType);
    if (filters.soilType && filters.soilType !== 'All') params.append('soil_type', filters.soilType);
    if (filters.irrigationType && filters.irrigationType !== 'All') params.append('irrigation_type', filters.irrigationType);
    if (filters.season && filters.season !== 'All') params.append('season', filters.season);
    
    if (filters.yieldRange) {
      params.append('yield_min', filters.yieldRange[0]);
      params.append('yield_max', filters.yieldRange[1]);
    }
    if (filters.areaRange) {
      params.append('area_min', filters.areaRange[0]);
      params.append('area_max', filters.areaRange[1]);
    }
    if (filters.waterRange) {
      params.append('water_min', filters.waterRange[0]);
      params.append('water_max', filters.waterRange[1]);
    }
    if (filters.fertilizerRange) {
      params.append('fertilizer_min', filters.fertilizerRange[0]);
      params.append('fertilizer_max', filters.fertilizerRange[1]);
    }
    if (filters.pesticideRange) {
      params.append('pesticide_min', filters.pesticideRange[0]);
      params.append('pesticide_max', filters.pesticideRange[1]);
    }
    return params.toString();
  };

  // Download filtered CSV
  const handleDownloadCSV = () => {
    const csvContent = exportToCSV(filteredDataset);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `agri_filtered_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel XLS export calling backend api/reports/excel
  const handleDownloadExcel = async () => {
    try {
      const qps = buildQueryParams();
      const headers = {};
      if (auth?.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }
      const response = await fetch(`${API_BASE}/reports/excel?${qps}`, {
        headers
      });
      if (!response.ok) throw new Error("Excel export failed.");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `agri_exec_report_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Error generating Excel report from backend: " + err.message);
    }
  };

  // PDF report calling backend api/reports/pdf
  const handleDownloadPDF = async () => {
    try {
      const qps = buildQueryParams();
      const headers = {
        'Content-Type': 'application/json'
      };
      if (auth?.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }
      
      const payload = {
        totalFarms: kpis.totalFarms || 0,
        avgYield: kpis.avgYield || 0,
        avgWater: kpis.avgWater || 0,
        bestCrop: kpis.bestCrop || 'N/A',
        avgSustScore: kpis.avgSustScore || 0,
        bestSoil: kpis.bestSoil || 'N/A',
        bestSeason: kpis.bestSeason || 'N/A',
        recommendations: recommendations || []
      };
      
      const response = await fetch(`${API_BASE}/reports/pdf?${qps}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error("PDF export failed.");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `agri_exec_report_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Error generating PDF report from backend: " + err.message);
    }
  };


  // Calculate descriptive stats for report executive summary
  const yields = filteredDataset.map(r => r['Yield(tons)']);
  const meanYield = kpis.avgYield || 0;
  const stdYield = yields.length > 1 
    ? Math.sqrt(yields.reduce((a, b) => a + Math.pow(b - meanYield, 2), 0) / yields.length) 
    : 0;

  const skewYield = calculateSkewness(yields, meanYield, stdYield);
  const kurtYield = calculateKurtosis(yields, meanYield, stdYield);

  return (
    <div className="content-body">
      {/* Configuration panel */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={24} style={{ color: 'var(--primary)' }} /> Executive Report Compiler
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Generate, preview, and export comprehensive agronomy reports compile-checked against active filters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" onClick={handleDownloadCSV}>
            <Download size={14} /> Download CSV
          </button>
          <button className="btn btn-secondary" onClick={handleDownloadExcel}>
            <Download size={14} /> Download Excel
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPDF}>
            <Download size={14} /> Download PDF Report
          </button>
        </div>
      </div>

      {/* Compiled Report Preview */}
      <div className="glass-card" style={{ padding: '3rem', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Print watermark header */}
        <div style={{ borderBottom: '2px solid var(--primary)', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              AGRICULTURAL INTELLIGENCE EXECUTIVE REPORT
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Data-Driven Analytical Insights & Machine Learning Performance Diagnostics
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div>Date: {new Date().toLocaleDateString()}</div>
            <div>Source Database: Local CSV memory</div>
          </div>
        </div>

        {/* 1. Executive Summary */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={14} /> 1. EXECUTIVE SUMMARY
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', textAlign: 'justify' }}>
            This agricultural intelligence report compiles statistical observations across **{kpis.totalFarms} active farm fields** spanning a total area of **{(kpis.avgArea * kpis.totalFarms).toFixed(1)} acres**. 
            Our statistical analysis measures a baseline average crop yield of **{meanYield.toFixed(2)} tons** per farm, with a standard deviation of **{stdYield.toFixed(2)} tons**. 
            Yield skewness is evaluated at **{skewYield.toFixed(3)}** and excess kurtosis at **{kurtYield.toFixed(3)}**, indicating a {skewYield > 0 ? 'right-skewed (positive)' : 'left-skewed (negative)'} yield spread. 
            Overall water footprint allocations average **{kpis.avgWater?.toLocaleString(undefined, { maximumFractionDigits: 0 })} cubic meters** per crop season, showing optimal resource utilization.
          </p>
        </div>

        {/* 2. Filter section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>2. ACTIVE DATA FILTER SCHEME</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '0.75rem', borderRadius: '8px' }}>
            <div><strong>Crop Type:</strong> {filters.cropType}</div>
            <div><strong>Soil Type:</strong> {filters.soilType}</div>
            <div><strong>Irrigation:</strong> {filters.irrigationType}</div>
            <div><strong>Season:</strong> {filters.season}</div>
          </div>
        </div>

        {/* 3. KPIs Summary */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>3. KEY PERFORMANCE SUMMARY</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
            <div style={{ border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Farms Covered</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{kpis.totalFarms}</div>
            </div>
            <div style={{ border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Average Yield Output</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>{meanYield.toFixed(2)} tons</div>
            </div>
            <div style={{ border: '1px solid var(--panel-border)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Water Allocated</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--secondary)', marginTop: '0.25rem' }}>{kpis.avgWater?.toLocaleString(undefined, { maximumFractionDigits: 0 })} m³</div>
            </div>
          </div>
        </div>

        {/* 4. Top Rankings */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>4. AGRONOMIC EFFICIENCY RANKINGS (TOP 3)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Top Crop Types by Yield</span>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', fontSize: '0.8rem', lineHeight: '1.6' }}>
                {rankings.crops.slice(0, 3).map((c) => (
                  <li key={c.name}>
                    <strong>{c.name}</strong> - {c.avgYield.toFixed(2)} tons avg (Sust: {c.sustainabilityScore.toFixed(0)})
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Top Soil Performance</span>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', fontSize: '0.8rem', lineHeight: '1.6' }}>
                {rankings.soils.slice(0, 3).map((s) => (
                  <li key={s.name}>
                    <strong>{s.name}</strong> - {s.avgYield.toFixed(2)} tons avg
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 5. ML Results */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>5. MACHINE LEARNING BENCHMARKS</h4>
          <div className="table-wrapper">
            <table className="data-table" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>R² Score</th>
                  <th>MAE (tons)</th>
                  <th>RMSE (tons)</th>
                  <th>Fit Time</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Linear Regression (OLS)', key: 'linear' },
                  { name: 'Decision Tree Regressor', key: 'tree' },
                  { name: 'Random Forest Regressor', key: 'forest' },
                  { name: 'XGBoost (Gradient Boosted)', key: 'xgboost' }
                ].map(m => {
                  const metrics = regressionMetrics[m.key]?.metrics || { R2: 0, MAE: 0, RMSE: 0 };
                  return (
                    <tr key={m.key}>
                      <td style={{ fontWeight: '600' }}>{m.name}</td>
                      <td>{metrics.R2.toFixed(4)}</td>
                      <td>{metrics.MAE.toFixed(4)}</td>
                      <td>{metrics.RMSE.toFixed(4)}</td>
                      <td>{(trainingTimes[m.key] || 0).toFixed(1)} ms</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Recommendations */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>6. DECISION RECOMMENDATIONS</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
            {recommendations.slice(0, 3).map(rec => (
              <div key={rec.id} style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem', margin: '0.25rem 0' }}>
                <strong>{rec.title} ({rec.metric}):</strong> {rec.description.replace(/\*\*/g, '')}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1rem', marginTop: '3rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <p>© {new Date().getFullYear()} AI Agriculture Intelligence Platform. All rights reserved. Generated via browser-side calculations.</p>
        </div>
      </div>
    </div>
  );
}
