/**
 * DataManager Service
 * Handles loading, parsing, validating and enriching the agriculture dataset.
 */

// Helper to parse CSV string into array of objects
export function parseCSV(csvText) {
  if (!csvText || !csvText.trim()) return [];
  
  const lines = csvText.split(/\r?\n/);
  if (lines.length === 0) return [];
  
  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    if (values.length < headers.length) continue; // Skip malformed rows
    
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] !== undefined ? values[index].trim() : '';
    });
    records.push(record);
  }
  
  return records;
}

// Robust CSV line parser handling quotes
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Convert parsed records into typed data, validate, handle missing values, and calculate derived metrics
export function processDataset(rawRecords) {
  if (!rawRecords || rawRecords.length === 0) return [];

  // Determine standard columns and mappings
  // Expected: Farm_ID, Crop_Type, Farm_Area(acres), Irrigation_Type, Fertilizer_Used(tons), Pesticide_Used(kg), Yield(tons), Soil_Type, Season, Water_Usage(cubic meters)
  const columns = {
    id: ['Farm_ID', 'Farm ID', 'ID', 'id', 'FarmId'],
    crop: ['Crop_Type', 'Crop Type', 'Crop', 'crop', 'CropType'],
    area: ['Farm_Area(acres)', 'Farm_Area', 'Farm Area', 'Area', 'area', 'Farm_Area(acres)'],
    irrigation: ['Irrigation_Type', 'Irrigation Type', 'Irrigation', 'irrigation', 'IrrigationType'],
    fertilizer: ['Fertilizer_Used(tons)', 'Fertilizer_Used', 'Fertilizer Used', 'Fertilizer', 'fertilizer', 'Fertilizer_Used(tons)'],
    pesticide: ['Pesticide_Used(kg)', 'Pesticide_Used', 'Pesticide Used', 'Pesticide', 'pesticide', 'Pesticide_Used(kg)'],
    yield: ['Yield(tons)', 'Yield_Used', 'Yield', 'yield', 'Yield(tons)'],
    soil: ['Soil_Type', 'Soil Type', 'Soil', 'soil', 'SoilType'],
    season: ['Season', 'season', 'Season'],
    water: ['Water_Usage(cubic meters)', 'Water_Usage', 'Water Usage', 'Water', 'water', 'Water_Usage(cubic meters)']
  };

  const getColName = (record, keys) => {
    return keys.find(k => k in record) || keys[0];
  };

  const firstRec = rawRecords[0];
  const colMap = {
    id: getColName(firstRec, columns.id),
    crop: getColName(firstRec, columns.crop),
    area: getColName(firstRec, columns.area),
    irrigation: getColName(firstRec, columns.irrigation),
    fertilizer: getColName(firstRec, columns.fertilizer),
    pesticide: getColName(firstRec, columns.pesticide),
    yield: getColName(firstRec, columns.yield),
    soil: getColName(firstRec, columns.soil),
    season: getColName(firstRec, columns.season),
    water: getColName(firstRec, columns.water),
  };

  // 1. Calculate columns stats for missing-value imputation
  // Calculate numerical sums/counts for means
  const numericalCols = ['area', 'fertilizer', 'pesticide', 'yield', 'water'];
  const categoricalCols = ['crop', 'irrigation', 'soil', 'season'];

  const stats = {};
  numericalCols.forEach(col => {
    stats[col] = { sum: 0, count: 0, values: [] };
  });
  categoricalCols.forEach(col => {
    stats[col] = { counts: {}, mode: '' };
  });

  rawRecords.forEach(rec => {
    numericalCols.forEach(key => {
      const valStr = rec[colMap[key]];
      const val = valStr ? parseFloat(valStr) : NaN;
      if (!isNaN(val)) {
        stats[key].sum += val;
        stats[key].count += 1;
        stats[key].values.push(val);
      }
    });

    categoricalCols.forEach(key => {
      const val = rec[colMap[key]] ? rec[colMap[key]].trim() : '';
      if (val) {
        stats[key].counts[val] = (stats[key].counts[val] || 0) + 1;
      }
    });
  });

  // Calculate means and modes
  const means = {};
  numericalCols.forEach(col => {
    means[col] = stats[col].count > 0 ? stats[col].sum / stats[col].count : 0;
  });

  const modes = {};
  categoricalCols.forEach(col => {
    let maxCount = 0;
    let modeVal = '';
    Object.entries(stats[col].counts).forEach(([val, count]) => {
      if (count > maxCount) {
        maxCount = count;
        modeVal = val;
      }
    });
    modes[col] = modeVal || 'Unknown';
  });

  // 2. Map and enrich records
  const processed = rawRecords.map((rec, index) => {
    const id = rec[colMap.id] || `F${String(index + 1).padStart(3, '0')}`;
    
    // Categorical
    const crop = rec[colMap.crop] ? rec[colMap.crop].trim() : modes.crop;
    const irrigation = rec[colMap.irrigation] ? rec[colMap.irrigation].trim() : modes.irrigation;
    const soil = rec[colMap.soil] ? rec[colMap.soil].trim() : modes.soil;
    const season = rec[colMap.season] ? rec[colMap.season].trim() : modes.season;

    // Numerical with mean imputation
    const area = rec[colMap.area] && !isNaN(parseFloat(rec[colMap.area])) ? parseFloat(rec[colMap.area]) : means.area;
    const fertilizer = rec[colMap.fertilizer] && !isNaN(parseFloat(rec[colMap.fertilizer])) ? parseFloat(rec[colMap.fertilizer]) : means.fertilizer;
    const pesticide = rec[colMap.pesticide] && !isNaN(parseFloat(rec[colMap.pesticide])) ? parseFloat(rec[colMap.pesticide]) : means.pesticide;
    const yieldVal = rec[colMap.yield] && !isNaN(parseFloat(rec[colMap.yield])) ? parseFloat(rec[colMap.yield]) : means.yield;
    const water = rec[colMap.water] && !isNaN(parseFloat(rec[colMap.water])) ? parseFloat(rec[colMap.water]) : means.water;

    // Derived Metrics
    // Water Efficiency: Yield (tons) per cubic meter of water
    const waterEfficiency = water > 0 ? yieldVal / water : 0;
    
    // Input Chemical Efficiency: Yield (tons) per total chemical inputs (fertilizer in tons + pesticide in tons)
    const totalChemicalInputsTons = fertilizer + (pesticide / 1000);
    const inputEfficiency = totalChemicalInputsTons > 0 ? yieldVal / totalChemicalInputsTons : 0;

    // Irrigation score (Drip is best for sustainability, flood is worst)
    let irrigationScore = 50;
    switch(irrigation.toLowerCase()) {
      case 'drip': irrigationScore = 100; break;
      case 'sprinkler': irrigationScore = 80; break;
      case 'rain-fed': irrigationScore = 70; break;
      case 'manual': irrigationScore = 40; break;
      case 'flood': irrigationScore = 20; break;
    }

    // Soil score (clay/loamy are nutrient-dense and hold water, sandy is poor, silty/peaty are moderate)
    let soilScore = 60;
    switch(soil.toLowerCase()) {
      case 'loamy': soilScore = 100; break;
      case 'clay': soilScore = 90; break;
      case 'silty': soilScore = 80; break;
      case 'peaty': soilScore = 70; break;
      case 'sandy': soilScore = 30; break;
    }

    // Resource Utilization Score (ideal is balanced water + fertilizer for maximum yield)
    // Low water + low fertilizer + high yield = high utilization.
    // We can compute a relative score by benchmarking. Let's make a reasonable absolute/relative indicator:
    // Higher yield with lower water/pesticides relative to area is better.
    const waterPerAcre = area > 0 ? water / area : 0;
    const fertPerAcre = area > 0 ? fertilizer / area : 0;
    
    // Sustainability Score (0 - 100 composite index)
    // - 30% Water Efficiency Score (normalized relative to a benchmark of 0.002 tons/m3)
    // - 25% Chemical Input Efficiency (higher is better, penalize high chemical density)
    // - 25% Irrigation Method Sustainability Score
    // - 20% Soil Health compatibility Score
    const normalizedWE = Math.min(100, (waterEfficiency / 0.001) * 100);
    const chemDensity = area > 0 ? (fertilizer * 1000 + pesticide) / area : 0; // kg of inputs per acre
    const normalizedChemScore = Math.max(0, 100 - (chemDensity / 100)); // benchmark 100 kg/acre as worst

    const sustainabilityScore = Math.round(
      (normalizedWE * 0.3) + 
      (normalizedChemScore * 0.25) + 
      (irrigationScore * 0.25) + 
      (soilScore * 0.2)
    );

    // Yield Sustainability Score (Yield per sustainability unit)
    const yieldSustainabilityScore = yieldVal * (sustainabilityScore / 100);
    const geo = mapRecordToGeography(crop, soil, season, id);

    // Simulate satellite remote-sensing features
    const yieldPerAcre = area > 0 ? yieldVal / area : 0;
    
    let ndvi = 0.3 + (yieldPerAcre * 1.5) - (waterPerAcre / 4000) * 0.1 + (sustainabilityScore / 100) * 0.15;
    ndvi = Math.min(0.88, Math.max(0.12, ndvi));
    const vhi = Math.round(ndvi * 100);
    const cropHealth = Math.round((sustainabilityScore * 0.4) + (vhi * 0.6));
    
    let waterStress = Math.round((waterPerAcre / 1000) * 45 - (yieldPerAcre * 15) + 30);
    waterStress = Math.min(95, Math.max(5, waterStress));

    return {
      Farm_ID: id,
      Crop_Type: crop,
      'Farm_Area(acres)': area,
      Irrigation_Type: irrigation,
      'Fertilizer_Used(tons)': fertilizer,
      'Pesticide_Used(kg)': pesticide,
      'Yield(tons)': yieldVal,
      Soil_Type: soil,
      Season: season,
      'Water_Usage(cubic meters)': water,
      // Geographic Layer
      State: geo.State,
      City: geo.City,
      GeoConfidence: geo.GeoConfidence,
      Latitude: geo.Latitude,
      Longitude: geo.Longitude,
      // Simulated Remote Sensing metrics
      ndvi: parseFloat(ndvi.toFixed(3)),
      vhi,
      cropHealth,
      waterStress,
      // Derived fields
      waterEfficiency,
      inputEfficiency,
      sustainabilityScore,
      yieldSustainabilityScore,
      irrigationScore,
      soilScore
    };
  });

  return processed;
}

// Dynamic mapping of crop + soil + season to realistic Indian states and cities
export function mapRecordToGeography(crop, soil, season, id) {
  const cropLower = String(crop).trim().toLowerCase();
  const soilLower = String(soil).trim().toLowerCase();
  const seasonLower = String(season).trim().toLowerCase();
  
  // Extract index from Farm_ID to keep mapping deterministic
  const idMatch = String(id).match(/\d+/);
  const idx = idMatch ? parseInt(idMatch[0], 10) : Math.abs(String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  
  let candidates = [];
  
  if (cropLower.includes('rice')) {
    candidates = [
      { state: 'West Bengal', city: 'Bardhaman', baseConf: 95 },
      { state: 'Andhra Pradesh', city: 'Nellore', baseConf: 92 },
      { state: 'Punjab', city: 'Patiala', baseConf: 88 },
      { state: 'Tamil Nadu', city: 'Thanjavur', baseConf: 90 },
      { state: 'Odisha', city: 'Cuttack', baseConf: 86 },
      { state: 'Assam', city: 'Jorhat', baseConf: 87 }
    ];
  } else if (cropLower.includes('wheat')) {
    candidates = [
      { state: 'Punjab', city: 'Ludhiana', baseConf: 96 },
      { state: 'Haryana', city: 'Karnal', baseConf: 94 },
      { state: 'Uttar Pradesh', city: 'Meerut', baseConf: 92 },
      { state: 'Madhya Pradesh', city: 'Indore', baseConf: 89 },
      { state: 'Rajasthan', city: 'Ganganagar', baseConf: 87 }
    ];
  } else if (cropLower.includes('cotton')) {
    candidates = [
      { state: 'Gujarat', city: 'Rajkot', baseConf: 95 },
      { state: 'Maharashtra', city: 'Nagpur', baseConf: 93 },
      { state: 'Telangana', city: 'Warangal', baseConf: 88 },
      { state: 'Rajasthan', city: 'Hanumangarh', baseConf: 83 }
    ];
  } else if (cropLower.includes('sugarcane')) {
    candidates = [
      { state: 'Uttar Pradesh', city: 'Muzaffarnagar', baseConf: 95 },
      { state: 'Maharashtra', city: 'Kolhapur', baseConf: 92 },
      { state: 'Karnataka', city: 'Belagavi', baseConf: 90 },
      { state: 'Tamil Nadu', city: 'Coimbatore', baseConf: 88 }
    ];
  } else if (cropLower.includes('maize')) {
    candidates = [
      { state: 'Karnataka', city: 'Haveri', baseConf: 92 },
      { state: 'Madhya Pradesh', city: 'Chhindwara', baseConf: 88 },
      { state: 'Maharashtra', city: 'Jalgaon', baseConf: 89 },
      { state: 'Bihar', city: 'Begusarai', baseConf: 86 }
    ];
  } else if (cropLower.includes('soybean')) {
    candidates = [
      { state: 'Madhya Pradesh', city: 'Ujjain', baseConf: 95 },
      { state: 'Maharashtra', city: 'Latur', baseConf: 91 },
      { state: 'Rajasthan', city: 'Baran', baseConf: 86 }
    ];
  } else if (cropLower.includes('potato')) {
    candidates = [
      { state: 'Uttar Pradesh', city: 'Agra', baseConf: 94 },
      { state: 'West Bengal', city: 'Hooghly', baseConf: 92 },
      { state: 'Bihar', city: 'Patna', baseConf: 88 }
    ];
  } else if (cropLower.includes('tomato')) {
    candidates = [
      { state: 'Andhra Pradesh', city: 'Chittoor', baseConf: 92 },
      { state: 'Karnataka', city: 'Kolar', baseConf: 90 },
      { state: 'Maharashtra', city: 'Nashik', baseConf: 89 }
    ];
  } else if (cropLower.includes('carrot')) {
    candidates = [
      { state: 'Haryana', city: 'Kurukshetra', baseConf: 91 },
      { state: 'Punjab', city: 'Hoshiarpur', baseConf: 88 }
    ];
  } else if (cropLower.includes('barley')) {
    candidates = [
      { state: 'Rajasthan', city: 'Jaipur', baseConf: 90 },
      { state: 'Uttar Pradesh', city: 'Aligarh', baseConf: 88 }
    ];
  } else {
    candidates = [
      { state: 'Madhya Pradesh', city: 'Bhopal', baseConf: 80 },
      { state: 'Maharashtra', city: 'Pune', baseConf: 80 },
      { state: 'Uttar Pradesh', city: 'Lucknow', baseConf: 80 },
      { state: 'Karnataka', city: 'Bangalore', baseConf: 80 },
      { state: 'Gujarat', city: 'Ahmedabad', baseConf: 80 }
    ];
  }

  const choice = candidates[idx % candidates.length];
  
  let scoreAdjustment = 0;
  if (choice.state === 'West Bengal' && (soilLower.includes('loamy') || soilLower.includes('clay'))) scoreAdjustment += 4;
  if (choice.state === 'Punjab' && soilLower.includes('loamy')) scoreAdjustment += 3;
  if (choice.state === 'Maharashtra' && soilLower.includes('clay')) scoreAdjustment += 5;
  if (choice.state === 'Gujarat' && soilLower.includes('clay')) scoreAdjustment += 4;
  if (choice.state === 'Rajasthan' && soilLower.includes('sandy')) scoreAdjustment += 5;
  if (choice.state === 'Karnataka' && soilLower.includes('loamy')) scoreAdjustment += 3;
  
  if (cropLower.includes('wheat') && seasonLower.includes('rabi')) scoreAdjustment += 4;
  if (cropLower.includes('rice') && seasonLower.includes('kharif')) scoreAdjustment += 4;
  if (cropLower.includes('cotton') && seasonLower.includes('kharif')) scoreAdjustment += 3;

  const cityCoords = {
    'Bardhaman': [23.23, 87.86],
    'Nellore': [14.44, 79.98],
    'Patiala': [30.34, 76.38],
    'Thanjavur': [10.78, 79.13],
    'Cuttack': [20.46, 85.88],
    'Jorhat': [26.75, 94.20],
    'Ludhiana': [30.90, 75.85],
    'Karnal': [29.68, 76.99],
    'Meerut': [28.98, 77.70],
    'Indore': [22.71, 75.85],
    'Ganganagar': [29.91, 73.87],
    'Rajkot': [22.30, 70.80],
    'Nagpur': [21.14, 79.08],
    'Warangal': [17.96, 79.59],
    'Hanumangarh': [29.58, 74.32],
    'Muzaffarnagar': [29.47, 77.70],
    'Kolhapur': [16.70, 74.24],
    'Belagavi': [15.84, 74.49],
    'Coimbatore': [11.01, 76.95],
    'Haveri': [14.79, 75.40],
    'Chhindwara': [22.05, 78.93],
    'Jalgaon': [21.00, 75.56],
    'Begusarai': [25.41, 86.12],
    'Ujjain': [23.17, 75.78],
    'Latur': [18.40, 76.56],
    'Baran': [25.10, 76.51],
    'Agra': [27.17, 78.00],
    'Hooghly': [22.90, 88.39],
    'Patna': [25.59, 85.13],
    'Chittoor': [13.21, 79.10],
    'Kolar': [13.13, 78.13],
    'Nashik': [19.99, 73.78],
    'Kurukshetra': [29.96, 76.83],
    'Hoshiarpur': [31.51, 75.91],
    'Jaipur': [26.91, 75.78],
    'Aligarh': [27.89, 78.08],
    'Bhopal': [23.25, 77.41],
    'Pune': [18.52, 73.85],
    'Lucknow': [26.84, 80.94],
    'Bangalore': [12.97, 77.59],
    'Ahmedabad': [23.02, 72.57]
  };

  const baseCoord = cityCoords[choice.city] || [20.59, 78.96];
  
  // Deterministic jitter based on idx
  const jitterLat = (((idx * 7) % 100) / 100) * 0.12 - 0.06;
  const jitterLng = (((idx * 13) % 100) / 100) * 0.12 - 0.06;
  
  const latitude = parseFloat((baseCoord[0] + jitterLat).toFixed(5));
  const longitude = parseFloat((baseCoord[1] + jitterLng).toFixed(5));

  const geoConfidence = Math.min(99, Math.max(50, choice.baseConf + scoreAdjustment));
  
  return {
    State: choice.state,
    City: choice.city,
    GeoConfidence: geoConfidence,
    Latitude: latitude,
    Longitude: longitude
  };
}

// Convert array of records back to CSV
export function exportToCSV(records) {
  if (!records || records.length === 0) return '';
  
  const headers = [
    'Farm_ID', 'Crop_Type', 'Farm_Area(acres)', 'Irrigation_Type', 
    'Fertilizer_Used(tons)', 'Pesticide_Used(kg)', 'Yield(tons)', 
    'Soil_Type', 'Season', 'Water_Usage(cubic meters)'
  ];

  const lines = [headers.join(',')];

  records.forEach(r => {
    const row = headers.map(h => {
      const val = r[h];
      if (val === undefined || val === null) return '';
      const strVal = String(val);
      // Escape if it contains comma or quotes
      if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    });
    lines.push(row.join(','));
  });

  return lines.join('\n');
}
