import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store/useStore';

const PlatformContext = createContext();

const getApiBase = () => {
  let url = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  url = url.trim();
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  if (!url.endsWith("/api")) {
    url += "/api";
  }
  return url;
};

const API_BASE = getApiBase();


const buildQueryParams = (filters) => {
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

export const PlatformProvider = ({ children }) => {
  const { filters, setFilter, resetFilters, auth, login, logout } = useStore();
  const queryClient = useQueryClient();
  
  const [activityLog, setActivityLog] = useState([
    { time: new Date().toLocaleTimeString(), type: 'system', desc: 'Full-stack platform initialized. Backend active.' }
  ]);

  const addLog = (type, desc) => {
    setActivityLog(prev => [{ time: new Date().toLocaleTimeString(), type, desc }, ...prev].slice(0, 30));
  };

  const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }
    return headers;
  };

  // 1. Fetch filtered farm records
  const queryParams = buildQueryParams(filters);
  const { data: farmsData = [], isLoading: farmsLoading } = useQuery({
    queryKey: ['farms', filters],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/farms/?${queryParams}`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to fetch records.");
      const items = await response.json();
      // Remap keys to match old JS dataset property names in frontend components
      return items.map(item => ({
        id: item.id,
        Farm_ID: item.farm_id,
        Crop_Type: item.crop_type,
        'Farm_Area(acres)': item.farm_area_acres,
        Irrigation_Type: item.irrigation_type,
        'Fertilizer_Used(tons)': item.fertilizer_used_tons,
        'Pesticide_Used(kg)': item.pesticide_used_kg,
        'Yield(tons)': item.yield_tons,
        Soil_Type: item.soil_type,
        Season: item.season,
        'Water_Usage(cubic meters)': item.water_usage_cubic_meters,
        State: item.state,
        City: item.city,
        GeoConfidence: item.geo_confidence,
        Latitude: item.latitude,
        Longitude: item.longitude,
        ndvi: item.ndvi,
        vhi: item.vhi,
        cropHealth: item.crop_health,
        waterStress: item.water_stress,
        waterEfficiency: item.water_efficiency,
        inputEfficiency: item.input_efficiency,
        sustainabilityScore: item.sustainability_score,
        yieldSustainabilityScore: item.yield_sustainability_score,
        irrigationScore: item.irrigation_score,
        soilScore: item.soil_score
      }));
    }
  });

  // 2. Fetch KPIs
  const { data: kpis = {}, isLoading: kpisLoading } = useQuery({
    queryKey: ['kpis', filters],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/kpis?${queryParams}`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to fetch KPIs.");
      return response.json();
    }
  });

  // 3. Fetch Rankings
  const { data: rankings = { crops: [], soils: [], irrigations: [], farms: [], states: [], cities: [] } } = useQuery({
    queryKey: ['rankings', filters],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/rankings?${queryParams}`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to fetch rankings.");
      return response.json();
    }
  });

  // 4. Fetch Recommendations
  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendations', filters],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/recommendations?${queryParams}`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to fetch recommendations.");
      return response.json();
    }
  });

  // 5. Fetch Insights
  const { data: aiInsights = [] } = useQuery({
    queryKey: ['insights', filters],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/insights?${queryParams}`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to fetch insights.");
      return response.json();
    }
  });

  // 6. Fetch OLS regressions (Yield vs Water, Yield vs Fertilizer, Yield vs Area)
  const { data: regWater = null } = useQuery({
    queryKey: ['regRegression', 'water', filters],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/regression?x_metric=water&${queryParams}`, { headers: getHeaders() });
      return response.ok ? response.json() : null;
    }
  });

  const { data: regFert = null } = useQuery({
    queryKey: ['regRegression', 'fertilizer', filters],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/regression?x_metric=fertilizer&${queryParams}`, { headers: getHeaders() });
      return response.ok ? response.json() : null;
    }
  });

  const { data: regArea = null } = useQuery({
    queryKey: ['regRegression', 'area', filters],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/analytics/regression?x_metric=area&${queryParams}`, { headers: getHeaders() });
      return response.ok ? response.json() : null;
    }
  });

  // 7. ML Retrain mutation
  const trainMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/ml/train?${queryParams}`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to train regression models.");
      return response.json();
    },
    onSuccess: (data) => {
      addLog('ml', 'Regression models retrained successfully.');
    }
  });

  const trainClassifierMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/ml/train-classifier?${queryParams}`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to train classification models.");
      return response.json();
    },
    onSuccess: () => {
      addLog('ml', 'Classification models retrained successfully.');
    }
  });

  const predictYield = async (payload) => {
    const response = await fetch(`${API_BASE}/ml/predict?${queryParams}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to predict yield.");
    }
    return response.json();
  };

  // 8. Clustering calculation mutation
  const [clusteringResults, setClusteringResults] = useState(null);
  const [clusteringLoading, setClusteringLoading] = useState(false);

  const fetchClustering = async (selectedFeatures, algo, k, eps, minPts, numClusters) => {
    setClusteringLoading(true);
    try {
      const response = await fetch(`${API_BASE}/ml/clustering?${queryParams}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          selected_features: selectedFeatures.map(f => {
            if (f === 'Yield(tons)') return 'yield_tons';
            if (f === 'Water_Usage(cubic meters)') return 'water_usage_cubic_meters';
            if (f === 'Farm_Area(acres)') return 'farm_area_acres';
            if (f === 'Fertilizer_Used(tons)') return 'fertilizer_used_tons';
            if (f === 'Pesticide_Used(kg)') return 'pesticide_used_kg';
            if (f === 'Crop_Type') return 'crop_type';
            if (f === 'Soil_Type') return 'soil_type';
            if (f === 'Season') return 'season';
            if (f === 'Irrigation_Type') return 'irrigation_type';
            return f;
          }),
          algo,
          k,
          eps,
          min_pts: minPts,
          num_clusters: numClusters
        })
      });
      if (!response.ok) throw new Error("Failed to calculate clusters.");
      const data = await response.json();
      setClusteringResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setClusteringLoading(false);
    }
  };

  const askAssistant = async (message) => {
    try {
      const response = await fetch(`${API_BASE}/assistant/ask`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message })
      });
      if (!response.ok) throw new Error("Assistant request failed.");
      const data = await response.json();
      return data.response;
    } catch (err) {
      console.error(err);
      return "I encountered an error querying the database assistant: " + err.message;
    }
  };

  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['farms'] });
    queryClient.invalidateQueries({ queryKey: ['kpis'] });
    queryClient.invalidateQueries({ queryKey: ['rankings'] });
    queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    queryClient.invalidateQueries({ queryKey: ['insights'] });
    queryClient.invalidateQueries({ queryKey: ['regRegression'] });
  };

  const createFarmRecord = async (record) => {
    const backendData = {
      farm_id: record.Farm_ID,
      crop_type: record.Crop_Type,
      farm_area_acres: Number(record['Farm_Area(acres)']),
      irrigation_type: record.Irrigation_Type,
      fertilizer_used_tons: Number(record['Fertilizer_Used(tons)']),
      pesticide_used_kg: Number(record['Pesticide_Used(kg)']),
      yield_tons: Number(record['Yield(tons)']),
      soil_type: record.Soil_Type,
      season: record.Season,
      water_usage_cubic_meters: Number(record['Water_Usage(cubic meters)'])
    };
    const response = await fetch(`${API_BASE}/farms/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(backendData)
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to create farm record.");
    }
    invalidateAllQueries();
    return response.json();
  };

  const updateFarmRecord = async (id, record) => {
    const backendData = {
      farm_id: record.Farm_ID,
      crop_type: record.Crop_Type,
      farm_area_acres: Number(record['Farm_Area(acres)']),
      irrigation_type: record.Irrigation_Type,
      fertilizer_used_tons: Number(record['Fertilizer_Used(tons)']),
      pesticide_used_kg: Number(record['Pesticide_Used(kg)']),
      yield_tons: Number(record['Yield(tons)']),
      soil_type: record.Soil_Type,
      season: record.Season,
      water_usage_cubic_meters: Number(record['Water_Usage(cubic meters)'])
    };
    const response = await fetch(`${API_BASE}/farms/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(backendData)
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to update farm record.");
    }
    invalidateAllQueries();
    return response.json();
  };

  const deleteFarmRecord = async (id) => {
    const response = await fetch(`${API_BASE}/farms/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to delete farm record.");
    }
    invalidateAllQueries();
  };

  const uploadCsvDataset = async (csvText) => {
    const formData = new FormData();
    formData.append('file', new Blob([csvText], { type: 'text/csv' }), 'upload.csv');
    
    const headers = {};
    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }
    
    const response = await fetch(`${API_BASE}/farms/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to upload CSV.");
    }
    invalidateAllQueries();
    return response.json();
  };

  // Expose filter options dynamically based on full records
  const [filterOptions, setFilterOptions] = useState({
    crops: [], soils: [], irrigations: [], seasons: [],
    ranges: {
      yield: { min: 0, max: 100 },
      area: { min: 0, max: 1000 },
      fertilizer: { min: 0, max: 50 },
      pesticide: { min: 0, max: 50 },
      water: { min: 0, max: 200000 }
    }
  });

  useEffect(() => {
    if (farmsData.length === 0) return;
    const crops = Array.from(new Set(farmsData.map(r => r.Crop_Type))).sort();
    const soils = Array.from(new Set(farmsData.map(r => r.Soil_Type))).sort();
    const irrigations = Array.from(new Set(farmsData.map(r => r.Irrigation_Type))).sort();
    const seasons = Array.from(new Set(farmsData.map(r => r.Season))).sort();
    
    setFilterOptions({
      crops, soils, irrigations, seasons,
      ranges: {
        yield: { min: 0, max: 100 },
        area: { min: 0, max: 1000 },
        fertilizer: { min: 0, max: 50 },
        pesticide: { min: 0, max: 50 },
        water: { min: 0, max: 200000 }
      }
    });
  }, [farmsData]);

  // Expose API utilities to other components
  const value = {
    dataset: farmsData,
    filteredDataset: farmsData,
    loading: farmsLoading,
    filters: {
      cropType: filters.cropType,
      soilType: filters.soilType,
      irrigationType: filters.irrigationType,
      season: filters.season,
      yieldRange: filters.yieldRange,
      areaRange: filters.areaRange,
      fertilizerRange: filters.fertilizerRange,
      pesticideRange: filters.pesticideRange,
      waterRange: filters.waterRange
    },
    updateFilter: (key, val) => setFilter(key, val),
    resetFilters,
    filterOptions,
    kpis,
    rankings,
    recommendations,
    aiInsights,
    singleRegressions: {
      water: regWater,
      fertilizer: regFert,
      area: regArea
    },
    mlLoading: trainMutation.isPending || trainClassifierMutation.isPending,
    runMLModeling: async () => {
      const reg = await trainMutation.mutateAsync();
      const cls = await trainClassifierMutation.mutateAsync();
      return { reg, cls };
    },
    regressionMetrics: trainMutation.data?.models || {},
    classificationMetrics: trainClassifierMutation.data?.models || {},
    trainingTimes: {
      linear: trainMutation.data?.models?.linear?.training_time_ms || 1.2,
      tree: trainMutation.data?.models?.tree?.training_time_ms || 1.8,
      forest: trainMutation.data?.models?.forest?.training_time_ms || 5.6,
      xgboost: trainMutation.data?.models?.xgboost?.training_time_ms || 12.4
    },
    clusteringResults,
    clusteringLoading,
    fetchClustering,
    activityLog,
    addLog,
    askAssistant,
    createFarmRecord,
    updateFarmRecord,
    deleteFarmRecord,
    uploadCsvDataset,
    auth,
    login,
    logout,
    API_BASE,
    predictYield
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => useContext(PlatformContext);
