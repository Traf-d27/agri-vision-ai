import React, { useState } from 'react';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardView from './components/DashboardView';
import DatasetExplorerView from './components/DatasetExplorerView';
import AnalyticsView from './components/AnalyticsView';
import MlLabView from './components/MlLabView';
import ClusteringLabView from './components/ClusteringLabView';
import SustainabilityHubView from './components/SustainabilityHubView';
import RecommendationsView from './components/RecommendationsView';
import PredictionCenterView from './components/PredictionCenterView';
import CrudView from './components/CrudView';
import ReportGeneratorView from './components/ReportGeneratorView';
import ChatbotOverlay from './components/ChatbotOverlay';
import GeoIntelligenceView from './components/GeoIntelligenceView';
import SatelliteMonitoringView from './components/SatelliteMonitoringView';
import AuthGate from './components/AuthGate';
import StateAnalyticsView from './components/StateAnalyticsView';
import DistrictAnalyticsView from './components/DistrictAnalyticsView';

import { 
  LayoutDashboard, 
  Table, 
  BarChart2, 
  Brain, 
  Network, 
  Heart, 
  Lightbulb, 
  Cpu,
  Settings2, 
  FileText, 
  Filter, 
  RefreshCw, 
  Sprout,
  ChevronLeft,
  Bell,
  CheckCircle,
  Globe,
  Radar,
  Building2,
  MapPin
} from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filterExpanded, setFilterExpanded] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Notification menu state
  const [notifOpen, setNotifOpen] = useState(false);
  
  const { 
    filterOptions, 
    filters, 
    updateFilter, 
    resetFilters,
    filteredDataset,
    trainingTimes,
    auth,
    logout
  } = usePlatform();

  if (!auth?.isAuthenticated) {
    return <AuthGate />;
  }

  // Sidebar navigation menu
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="nav-item-icon" /> },
    { id: 'explorer', label: 'Dataset Explorer', icon: <Table className="nav-item-icon" /> },
    { id: 'analytics', label: 'Advanced Stats', icon: <BarChart2 className="nav-item-icon" /> },
    { id: 'state_analytics', label: 'State Analytics', icon: <Building2 className="nav-item-icon" /> },
    { id: 'district_analytics', label: 'District Analytics', icon: <MapPin className="nav-item-icon" /> },
    { id: 'geo', label: 'Regional Intel', icon: <Globe className="nav-item-icon" /> },
    { id: 'satellite', label: 'Satellite Monitor', icon: <Radar className="nav-item-icon" /> },
    { id: 'ml', label: 'AI & ML Modeling', icon: <Brain className="nav-item-icon" /> },
    { id: 'clustering', label: 'Clustering Lab', icon: <Network className="nav-item-icon" /> },
    { id: 'sustainability', label: 'Sustainability Hub', icon: <Heart className="nav-item-icon" /> },
    { id: 'recommendations', label: 'AI Decisions', icon: <Lightbulb className="nav-item-icon" /> },
    { id: 'prediction', label: 'Prediction Center', icon: <Cpu className="nav-item-icon" /> },
    { id: 'crud', label: 'Records CRUD', icon: <Settings2 className="nav-item-icon" /> },
    { id: 'report', label: 'Report Generator', icon: <FileText className="nav-item-icon" /> }
  ];

  // Render active component
  const renderView = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'explorer': return <DatasetExplorerView setActiveTab={setActiveTab} />;
      case 'analytics': return <AnalyticsView />;
      case 'state_analytics': return <StateAnalyticsView />;
      case 'district_analytics': return <DistrictAnalyticsView />;
      case 'geo': return <GeoIntelligenceView />;
      case 'satellite': return <SatelliteMonitoringView />;
      case 'ml': return <MlLabView />;
      case 'clustering': return <ClusteringLabView />;
      case 'sustainability': return <SustainabilityHubView />;
      case 'recommendations': return <RecommendationsView />;
      case 'prediction': return <PredictionCenterView />;
      case 'crud': return <CrudView />;
      case 'report': return <ReportGeneratorView />;
      default: return <DashboardView />;
    }
  };

  const activeLabel = menuItems.find(item => item.id === activeTab)?.label || 'Dashboard';

  // Active notifications (dynamic messages based on ML training times)
  const notifications = [
    { id: 1, title: 'Models Retrained', desc: `Random Forest compiled in ${(trainingTimes.forest || 2.4).toFixed(1)}ms.` },
    { id: 2, title: 'CSV Import Ready', desc: 'Dataset verified and loaded client-side.' },
    { id: 3, title: 'AI Advisory Active', desc: '4 sustainability recommendations generated.' }
  ];

  return (
    <div className="app-container" style={{ 
      '--sidebar-width': sidebarCollapsed ? '70px' : '260px'
    }}>
      {/* 1. Animated Gradient Mesh Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        pointerEvents: 'none',
        background: 'radial-gradient(circle at 10% 20%, rgba(27,67,50,0.18) 0%, rgba(7,10,14,0.98) 90%)'
      }}>
        {/* Glowing floating orbs */}
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '15%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, rgba(16,185,129,0) 70%)',
          filter: 'blur(40px)',
          animation: 'floatOrb 14s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.03) 0%, rgba(6,182,212,0) 70%)',
          filter: 'blur(50px)',
          animation: 'floatOrb 18s ease-in-out infinite alternate-reverse'
        }}></div>
      </div>

      {/* 2. Sidebar Navigation with sliding active pill */}
      <aside className="sidebar" style={{ 
        width: sidebarCollapsed ? '70px' : '260px',
        padding: sidebarCollapsed ? '1rem 0.5rem' : '1.5rem'
      }}>
        <div className="logo-container" style={{ 
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          marginBottom: '2rem'
        }}>
          <Sprout className="logo-icon" size={28} />
          {!sidebarCollapsed && <span className="logo-text">AgriIntel AI</span>}
        </div>
        
        <ul className="nav-menu">
          {menuItems.map(item => (
            <li 
              key={item.id} 
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              style={{ 
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                padding: sidebarCollapsed ? '0.75rem 0' : '0.75rem 1rem',
                position: 'relative'
              }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeNavIndicator"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    zIndex: -1
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              {item.icon}
              {!sidebarCollapsed && <span>{item.label}</span>}
            </li>
          ))}
        </ul>

        {/* Sidebar Collapse Button with micro scale effect */}
        <motion.button 
          className="btn btn-sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.06)' }}
          whileTap={{ scale: 0.95 }}
          style={{ 
            marginTop: '1rem', 
            borderRadius: '50%', 
            width: '32px', 
            height: '32px', 
            padding: 0, 
            alignSelf: 'center', 
            background: 'rgba(255,255,255,0.02)' 
          }}
        >
          {sidebarCollapsed ? <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} /> : <ChevronLeft size={14} />}
        </motion.button>
      </aside>

      {/* 3. Main content area wrapper */}
      <div className="main-wrapper" style={{
        marginLeft: sidebarCollapsed ? '70px' : '260px',
        width: sidebarCollapsed ? 'calc(100% - 70px)' : 'calc(100% - 260px)'
      }}>
        {/* Topbar */}
        <header className="topbar">
          <div className="page-title">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {activeLabel}
            </h1>
            <p>{filteredDataset.length} fields matching filters</p>
          </div>

          <div className="topbar-actions" style={{ position: 'relative' }}>
            <motion.button 
              className="btn btn-secondary" 
              onClick={() => setFilterExpanded(!filterExpanded)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Filter size={14} /> {filterExpanded ? 'Hide Filters' : 'Show Filters'}
            </motion.button>
            <motion.button 
              className="btn" 
              onClick={resetFilters}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw size={14} /> Reset
            </motion.button>

            {/* Notification Bell */}
            <motion.button 
              className="btn btn-secondary" 
              onClick={() => setNotifOpen(!notifOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ padding: '0.5rem', borderRadius: '50%', position: 'relative' }}
            >
              <Bell size={16} />
              <span style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></span>
            </motion.button>

            {/* Notifications Dropdown Panel */}
            <AnimatePresence>
              {notifOpen && (
                <motion.div 
                  className="glass-card" 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: 'absolute',
                    top: '50px',
                    right: '0',
                    width: '300px',
                    zIndex: 150,
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                >
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
                    <CheckCircle size={14} style={{ color: 'var(--primary)' }} /> System Status Notifications
                  </h4>
                  {notifications.map(n => (
                    <div key={n.id} style={{ fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{n.title}</div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{n.desc}</div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* User Session card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--panel-border)', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{auth?.email}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: '600' }}>{auth?.role}</div>
              </div>
              <motion.button 
                className="btn btn-secondary btn-sm" 
                onClick={logout}
                whileHover={{ scale: 1.03, background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                whileTap={{ scale: 0.97 }}
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
              >
                Sign Out
              </motion.button>
            </div>
          </div>
        </header>

        {/* Global Filter Engine with slide down transition */}
        <AnimatePresence>
          {filterExpanded && (
            <motion.div 
              className="global-filter-bar"
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: '1.5rem' }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="filter-header">
                <span className="filter-title">
                  <Filter size={16} /> Global Filter Engine
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Updates KPIs, ECharts, statistical matrix, clustering models, and AI forecasts.
                </span>
              </div>

              <div className="filter-grid">
                {/* Categorical Dropdowns */}
                <div className="filter-group">
                  <label>Crop Type</label>
                  <select 
                    className="filter-select" 
                    value={filters.cropType} 
                    onChange={(e) => updateFilter('cropType', e.target.value)}
                  >
                    <option value="All">All Crops</option>
                    {filterOptions.crops.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Soil Type</label>
                  <select 
                    className="filter-select" 
                    value={filters.soilType} 
                    onChange={(e) => updateFilter('soilType', e.target.value)}
                  >
                    <option value="All">All Soils</option>
                    {filterOptions.soils.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Irrigation Scheme</label>
                  <select 
                    className="filter-select" 
                    value={filters.irrigationType} 
                    onChange={(e) => updateFilter('irrigationType', e.target.value)}
                  >
                    <option value="All">All Irrigations</option>
                    {filterOptions.irrigations.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Season</label>
                  <select 
                    className="filter-select" 
                    value={filters.season} 
                    onChange={(e) => updateFilter('season', e.target.value)}
                  >
                    <option value="All">All Seasons</option>
                    {filterOptions.seasons.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Numeric Ranges */}
                <div className="filter-group range-slider-group">
                  <label>Yield Output (tons)</label>
                  <div className="range-inputs-numeric">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={filters.yieldRange[0]} 
                      onChange={(e) => updateFilter('yieldRange', [e.target.value === '' ? 0 : parseFloat(e.target.value), filters.yieldRange[1]])}
                    />
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={filters.yieldRange[1]} 
                      onChange={(e) => updateFilter('yieldRange', [filters.yieldRange[0], e.target.value === '' ? 0 : parseFloat(e.target.value)])}
                    />
                  </div>
                </div>

                <div className="filter-group range-slider-group">
                  <label>Farm Area (acres)</label>
                  <div className="range-inputs-numeric">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={filters.areaRange[0]} 
                      onChange={(e) => updateFilter('areaRange', [e.target.value === '' ? 0 : parseFloat(e.target.value), filters.areaRange[1]])}
                    />
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={filters.areaRange[1]} 
                      onChange={(e) => updateFilter('areaRange', [filters.areaRange[0], e.target.value === '' ? 0 : parseFloat(e.target.value)])}
                    />
                  </div>
                </div>

                <div className="filter-group range-slider-group">
                  <label>Fertilizer Used (tons)</label>
                  <div className="range-inputs-numeric">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={filters.fertilizerRange[0]} 
                      onChange={(e) => updateFilter('fertilizerRange', [e.target.value === '' ? 0 : parseFloat(e.target.value), filters.fertilizerRange[1]])}
                    />
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={filters.fertilizerRange[1]} 
                      onChange={(e) => updateFilter('fertilizerRange', [filters.fertilizerRange[0], e.target.value === '' ? 0 : parseFloat(e.target.value)])}
                    />
                  </div>
                </div>

                <div className="filter-group range-slider-group">
                  <label>Water Usage (m³)</label>
                  <div className="range-inputs-numeric">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={filters.waterRange[0]} 
                      onChange={(e) => updateFilter('waterRange', [e.target.value === '' ? 0 : parseFloat(e.target.value), filters.waterRange[1]])}
                    />
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={filters.waterRange[1]} 
                      onChange={(e) => updateFilter('waterRange', [filters.waterRange[0], e.target.value === '' ? 0 : parseFloat(e.target.value)])}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View body with route scale/fade transitions */}
        <main style={{ width: '100%' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.985 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* AI Assistant Chatbot Overlay */}
        <ChatbotOverlay />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <PlatformProvider>
      <AppContent />
    </PlatformProvider>
  );
}
