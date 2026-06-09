/**
 * ML Service - Pure Client-side Machine Learning in JavaScript
 * Upgraded with:
 * 1. Skewness and Kurtosis calculators
 * 2. Training speed stopwatch (milliseconds)
 * 3. Random Forest tree-by-tree prediction variance (confidence scores)
 * 4. Single variable linear regression with standard error confidence bands and residuals
 */

// ==========================================
// 1. Matrix & Vector Mathematics Helpers
// ==========================================

export const matrixHelpers = {
  transpose(A) {
    const m = A.length;
    const n = A[0].length;
    const AT = Array(n).fill(0).map(() => Array(m).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        AT[j][i] = A[i][j];
      }
    }
    return AT;
  },

  multiply(A, B) {
    const isBVector = !Array.isArray(B[0]);
    if (isBVector) {
      const m = A.length;
      const n = A[0].length;
      const result = Array(m).fill(0);
      for (let i = 0; i < m; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
          sum += A[i][j] * B[j];
        }
        result[i] = sum;
      }
      return result;
    } else {
      const m = A.length;
      const n = A[0].length;
      const p = B[0].length;
      const result = Array(m).fill(0).map(() => Array(p).fill(0));
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < p; j++) {
          let sum = 0;
          for (let k = 0; k < n; k++) {
            sum += A[i][k] * B[k][j];
          }
          result[i][j] = sum;
        }
      }
      return result;
    }
  },

  invert(A, lambda = 1e-4) {
    const n = A.length;
    const M = Array(n).fill(0).map((_, i) => {
      const row = [...A[i]];
      row[i] += lambda;
      const identity = Array(n).fill(0);
      identity[i] = 1;
      return [...row, ...identity];
    });

    for (let i = 0; i < n; i++) {
      let maxEl = Math.abs(M[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxEl) {
          maxEl = Math.abs(M[k][i]);
          maxRow = k;
        }
      }

      const temp = M[maxRow];
      M[maxRow] = M[i];
      M[i] = temp;

      const pivot = M[i][i];
      if (Math.abs(pivot) < 1e-9) return null;

      for (let j = i; j < 2 * n; j++) {
        M[i][j] /= pivot;
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = M[k][i];
          for (let j = i; j < 2 * n; j++) {
            M[k][j] -= factor * M[i][j];
          }
        }
      }
    }

    const inv = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        inv[i][j] = M[i][j + n];
      }
    }
    return inv;
  }
};

// ==========================================
// 2. Statistical Analysis Calculations
// ==========================================

export function calculateSkewness(vals, mean, stdDev) {
  if (vals.length < 3 || stdDev === 0) return 0;
  const n = vals.length;
  const sumCubedDev = vals.reduce((a, b) => a + Math.pow(b - mean, 3), 0);
  return (sumCubedDev / n) / Math.pow(stdDev, 3);
}

export function calculateKurtosis(vals, mean, stdDev) {
  if (vals.length < 4 || stdDev === 0) return 0;
  const n = vals.length;
  const sumFourthDev = vals.reduce((a, b) => a + Math.pow(b - mean, 4), 0);
  return ((sumFourthDev / n) / Math.pow(stdDev, 4)) - 3; // Excess Kurtosis
}

// Fit single variable linear regression with confidence intervals
export function fitSingleRegression(X_vals, Y_vals) {
  const n = X_vals.length;
  if (n < 3) return null;

  const meanX = X_vals.reduce((a, b) => a + b, 0) / n;
  const meanY = Y_vals.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  let sumSqX = 0;

  for (let i = 0; i < n; i++) {
    const dx = X_vals[i] - meanX;
    const dy = Y_vals[i] - meanY;
    num += dx * dy;
    den += dx * dx;
    sumSqX += dx * dx;
  }

  const slope = den !== 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;

  // Calculate stats
  const predictions = X_vals.map(x => slope * x + intercept);
  const residuals = Y_vals.map((y, i) => y - predictions[i]);
  const sumSqRes = residuals.reduce((a, b) => a + b * b, 0);
  
  // Standard error of regression estimate
  const se = Math.sqrt(sumSqRes / (n - 2)) || 1e-4;

  const meanSqTotal = Y_vals.reduce((a, b) => a + Math.pow(b - meanY, 2), 0);
  const r2 = meanSqTotal !== 0 ? 1 - (sumSqRes / meanSqTotal) : 0;
  const correlation = Math.sign(slope) * Math.sqrt(Math.max(0, r2));

  // Compute confidence interval bands for each X point (95% CI)
  // Confidence interval for mean: y_hat +/- t * se * sqrt(1/n + (x - meanX)^2 / sumSqX)
  // We use critical t = 2.0 (approx for 95% CI at N > 30)
  const confidenceBands = X_vals.map((x, i) => {
    const yHat = predictions[i];
    const stdErrPred = se * Math.sqrt(1 / n + Math.pow(x - meanX, 2) / (sumSqX || 1));
    const margin = 2.0 * stdErrPred;
    return {
      x,
      y: Y_vals[i],
      yPred: yHat,
      residual: residuals[i],
      lower: yHat - margin,
      upper: yHat + margin
    };
  });

  return {
    slope,
    intercept,
    r2,
    correlation,
    se,
    confidenceBands,
    equation: `Yield = ${slope.toFixed(4)} * X + ${intercept.toFixed(2)}`
  };
}

// ==========================================
// 3. Data Preparation & Feature Encoding
// ==========================================

export function prepareData(records, targetCol, featureCols, isClassification = false, classificationThresholds = null) {
  if (!records || records.length === 0) return null;

  const categoricalMappings = {};
  const numericalStats = {};

  featureCols.forEach(col => {
    const sampleVal = records[0][col];
    const isNum = typeof sampleVal === 'number' && !isNaN(sampleVal);
    
    if (!isNum) {
      const uniqueVals = Array.from(new Set(records.map(r => String(r[col]))));
      categoricalMappings[col] = uniqueVals.sort();
    } else {
      const vals = records.map(r => r[col]);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
      const std = Math.sqrt(variance) || 1.0;
      numericalStats[col] = { mean, std };
    }
  });

  let targetClasses = [];
  let targetStats = null;
  
  if (isClassification) {
    if (classificationThresholds) {
      targetClasses = ['Low Yield', 'Medium Yield', 'High Yield'];
    } else {
      const yields = records.map(r => r[targetCol]).sort((a, b) => a - b);
      const lowThresh = yields[Math.floor(yields.length * 0.33)];
      const highThresh = yields[Math.floor(yields.length * 0.66)];
      classificationThresholds = { low: lowThresh, high: highThresh };
      targetClasses = ['Low Yield', 'Medium Yield', 'High Yield'];
    }
  } else {
    const yields = records.map(r => r[targetCol]);
    const mean = yields.reduce((a, b) => a + b, 0) / yields.length;
    targetStats = { mean };
  }

  const featureNames = [];
  featureCols.forEach(col => {
    if (categoricalMappings[col]) {
      categoricalMappings[col].forEach(val => {
        featureNames.push(`${col}_${val}`);
      });
    } else {
      featureNames.push(col);
    }
  });

  const X = [];
  const y = [];

  records.forEach(rec => {
    const row = [];
    featureCols.forEach(col => {
      if (categoricalMappings[col]) {
        const val = String(rec[col]);
        categoricalMappings[col].forEach(c => {
          row.push(val === c ? 1 : 0);
        });
      } else {
        const val = rec[col];
        const { mean, std } = numericalStats[col];
        row.push((val - mean) / std);
      }
    });
    X.push(row);

    const targetVal = rec[targetCol];
    if (isClassification) {
      if (targetVal <= classificationThresholds.low) {
        y.push(0);
      } else if (targetVal <= classificationThresholds.high) {
        y.push(1);
      } else {
        y.push(2);
      }
    } else {
      y.push(targetVal);
    }
  });

  return {
    X,
    y,
    featureNames,
    featureCols,
    targetCol,
    isClassification,
    categoricalMappings,
    numericalStats,
    classificationThresholds,
    targetClasses,
    targetStats,
    vectorizeRecord(rec) {
      const row = [];
      featureCols.forEach(col => {
        if (categoricalMappings[col]) {
          const val = String(rec[col] !== undefined ? rec[col] : categoricalMappings[col][0]);
          categoricalMappings[col].forEach(c => {
            row.push(val === c ? 1 : 0);
          });
        } else {
          const val = rec[col] !== undefined ? parseFloat(rec[col]) : 0;
          const { mean, std } = numericalStats[col];
          row.push((val - mean) / std);
        }
      });
      return row;
    }
  };
}

// Evaluate Regression performance
export function evaluateRegression(yTrue, yPred) {
  const n = yTrue.length;
  let sumError = 0;
  let sumAbsError = 0;
  let sumSqError = 0;
  let sumTrue = 0;

  for (let i = 0; i < n; i++) {
    const error = yPred[i] - yTrue[i];
    sumError += error;
    sumAbsError += Math.abs(error);
    sumSqError += error * error;
    sumTrue += yTrue[i];
  }

  const meanTrue = sumTrue / n;
  let sumSqTotal = 0;
  for (let i = 0; i < n; i++) {
    const dev = yTrue[i] - meanTrue;
    sumSqTotal += dev * dev;
  }

  const MAE = sumAbsError / n;
  const RMSE = Math.sqrt(sumSqError / n);
  const R2 = sumSqTotal > 0 ? 1 - (sumSqError / sumSqTotal) : 0;

  return { R2, MAE, RMSE };
}

// Evaluate Classification performance
export function evaluateClassification(yTrue, yPred, numClasses = 3) {
  const n = yTrue.length;
  let correct = 0;
  
  const confusionMatrix = Array(numClasses).fill(0).map(() => Array(numClasses).fill(0));
  
  for (let i = 0; i < n; i++) {
    const t = yTrue[i];
    const p = yPred[i];
    confusionMatrix[t][p]++;
    if (t === p) correct++;
  }

  const accuracy = correct / n;
  
  const classMetrics = [];
  for (let c = 0; c < numClasses; c++) {
    let tp = confusionMatrix[c][c];
    let fp = 0;
    let fn = 0;
    
    for (let i = 0; i < numClasses; i++) {
      if (i !== c) {
        fp += confusionMatrix[i][c];
        fn += confusionMatrix[c][i];
      }
    }
    
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1 = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    
    classMetrics.push({ precision, recall, f1 });
  }

  const precision = classMetrics.reduce((a, b) => a + b.precision, 0) / numClasses;
  const recall = classMetrics.reduce((a, b) => a + b.recall, 0) / numClasses;
  const f1 = classMetrics.reduce((a, b) => a + b.f1, 0) / numClasses;

  return {
    accuracy,
    precision,
    recall,
    f1,
    confusionMatrix,
    classMetrics
  };
}

// ==========================================
// 4. REGRESSION ALGORITHMS
// ==========================================

export class LinearRegression {
  constructor(lambda = 1e-4) {
    this.lambda = lambda;
    this.weights = null;
  }

  train(X, y) {
    const n = X.length;
    const p = X[0].length;
    const X_bias = X.map(row => [1, ...row]);
    
    const XT = matrixHelpers.transpose(X_bias);
    const XTX = matrixHelpers.multiply(XT, X_bias);
    const XTy = matrixHelpers.multiply(XT, y);
    
    const XTX_inv = matrixHelpers.invert(XTX, this.lambda);
    if (!XTX_inv) {
      this.weights = Array(p + 1).fill(0);
      this.weights[0] = y.reduce((a, b) => a + b, 0) / n;
      return;
    }
    
    this.weights = matrixHelpers.multiply(XTX_inv, XTy);
  }

  predict(X) {
    return X.map(row => {
      let pred = this.weights[0];
      for (let j = 0; j < row.length; j++) {
        pred += row[j] * this.weights[j + 1];
      }
      return pred;
    });
  }

  getFeatureImportance(featureNames) {
    if (!this.weights) return [];
    
    const importance = featureNames.map((name, idx) => ({
      name,
      score: Math.abs(this.weights[idx + 1])
    }));
    
    const sum = importance.reduce((a, b) => a + b.score, 0) || 1;
    importance.forEach(imp => imp.score /= sum);
    
    return importance.sort((a, b) => b.score - a.score);
  }
}

class TreeNode {
  constructor(options = {}) {
    this.featureIdx = options.featureIdx !== undefined ? options.featureIdx : null;
    this.threshold = options.threshold !== undefined ? options.threshold : null;
    this.left = options.left || null;
    this.right = options.right || null;
    this.value = options.value !== undefined ? options.value : null;
    this.isLeaf = options.isLeaf || false;
    this.impurityReduction = options.impurityReduction || 0;
  }
}

export class DecisionTree {
  constructor(isClassification = false, maxDepth = 5, minSamplesSplit = 2) {
    this.isClassification = isClassification;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.root = null;
    this.featureImportances = null;
  }

  train(X, y) {
    const numFeatures = X[0].length;
    this.featureImportances = Array(numFeatures).fill(0);
    this.root = this.buildTree(X, y, 0);
    
    const sum = this.featureImportances.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      this.featureImportances = this.featureImportances.map(v => v / sum);
    }
  }

  buildTree(X, y, depth) {
    const numSamples = X.length;
    const numFeatures = X[0].length;
    
    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || this.isPure(y)) {
      return new TreeNode({ isLeaf: true, value: this.calculateLeafValue(y) });
    }

    let bestSplit = { featureIdx: -1, threshold: 0, impurity: Infinity, leftIdx: [], rightIdx: [], score: 0 };
    const currentImpurity = this.calculateImpurity(y);

    for (let f = 0; f < numFeatures; f++) {
      const uniqueVals = Array.from(new Set(X.map(row => row[f]))).sort((a, b) => a - b);
      
      for (let i = 0; i < uniqueVals.length - 1; i++) {
        const threshold = (uniqueVals[i] + uniqueVals[i + 1]) / 2;
        const leftIdx = [];
        const rightIdx = [];
        
        for (let s = 0; s < numSamples; s++) {
          if (X[s][f] <= threshold) leftIdx.push(s);
          else rightIdx.push(s);
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        const leftY = leftIdx.map(idx => y[idx]);
        const rightY = rightIdx.map(idx => y[idx]);
        
        const leftImp = this.calculateImpurity(leftY);
        const rightImp = this.calculateImpurity(rightY);
        
        const weightedImp = (leftY.length / numSamples) * leftImp + (rightY.length / numSamples) * rightImp;
        const score = currentImpurity - weightedImp;

        if (weightedImp < bestSplit.impurity) {
          bestSplit = {
            featureIdx: f,
            threshold,
            impurity: weightedImp,
            leftIdx,
            rightIdx,
            score
          };
        }
      }
    }

    if (bestSplit.featureIdx === -1) {
      return new TreeNode({ isLeaf: true, value: this.calculateLeafValue(y) });
    }

    this.featureImportances[bestSplit.featureIdx] += (numSamples / X.length) * bestSplit.score;

    const leftX = bestSplit.leftIdx.map(idx => X[idx]);
    const leftY = bestSplit.leftIdx.map(idx => y[idx]);
    const rightX = bestSplit.rightIdx.map(idx => X[idx]);
    const rightY = bestSplit.rightIdx.map(idx => y[idx]);

    const leftChild = this.buildTree(leftX, leftY, depth + 1);
    const rightChild = this.buildTree(rightX, rightY, depth + 1);

    return new TreeNode({
      featureIdx: bestSplit.featureIdx,
      threshold: bestSplit.threshold,
      left: leftChild,
      right: rightChild,
      isLeaf: false,
      impurityReduction: bestSplit.score
    });
  }

  isPure(y) {
    if (this.isClassification) {
      return new Set(y).size <= 1;
    } else {
      if (y.length <= 1) return true;
      const mean = y.reduce((a, b) => a + b, 0) / y.length;
      const variance = y.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / y.length;
      return variance < 1e-6;
    }
  }

  calculateImpurity(y) {
    if (y.length === 0) return 0;
    if (this.isClassification) {
      const counts = {};
      y.forEach(v => counts[v] = (counts[v] || 0) + 1);
      let sumSq = 0;
      Object.values(counts).forEach(c => {
        const p = c / y.length;
        sumSq += p * p;
      });
      return 1 - sumSq;
    } else {
      const mean = y.reduce((a, b) => a + b, 0) / y.length;
      return y.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / y.length;
    }
  }

  calculateLeafValue(y) {
    if (y.length === 0) return 0;
    if (this.isClassification) {
      const counts = {};
      y.forEach(v => counts[v] = (counts[v] || 0) + 1);
      let maxCount = 0;
      let mode = y[0];
      Object.entries(counts).forEach(([v, c]) => {
        if (c > maxCount) {
          maxCount = c;
          mode = parseInt(v);
        }
      });
      return mode;
    } else {
      return y.reduce((a, b) => a + b, 0) / y.length;
    }
  }

  predictRow(row, node = this.root) {
    if (node.isLeaf) return node.value;
    if (row[node.featureIdx] <= node.threshold) {
      return this.predictRow(row, node.left);
    } else {
      return this.predictRow(row, node.right);
    }
  }

  predict(X) {
    return X.map(row => this.predictRow(row));
  }

  getFeatureImportance(featureNames) {
    if (!this.featureImportances) return [];
    return featureNames.map((name, idx) => ({
      name,
      score: this.featureImportances[idx] || 0
    })).sort((a, b) => b.score - a.score);
  }
}

export class RandomForest {
  constructor(isClassification = false, numTrees = 15, maxDepth = 5, minSamplesSplit = 2) {
    this.isClassification = isClassification;
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.trees = [];
    this.featureImportances = null;
  }

  train(X, y) {
    const numSamples = X.length;
    const numFeatures = X[0].length;
    this.trees = [];
    this.featureImportances = Array(numFeatures).fill(0);

    for (let t = 0; t < this.numTrees; t++) {
      const bootX = [];
      const bootY = [];
      for (let s = 0; s < numSamples; s++) {
        const randIdx = Math.floor(Math.random() * numSamples);
        bootX.push(X[randIdx]);
        bootY.push(y[randIdx]);
      }

      const tree = new DecisionTree(this.isClassification, this.maxDepth, this.minSamplesSplit);
      tree.train(bootX, bootY);
      this.trees.push(tree);

      for (let f = 0; f < numFeatures; f++) {
        this.featureImportances[f] += tree.featureImportances[f] || 0;
      }
    }

    const sum = this.featureImportances.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      this.featureImportances = this.featureImportances.map(v => v / sum);
    }
  }

  // Predict and return average as well as variance for prediction confidence estimation
  predictWithVariance(X) {
    const treePredictions = this.trees.map(tree => tree.predict(X));
    const numSamples = X.length;
    
    const means = [];
    const variances = [];

    for (let s = 0; s < numSamples; s++) {
      const samplePreds = this.trees.map((_, tIdx) => treePredictions[tIdx][s]);
      
      if (this.isClassification) {
        const counts = {};
        samplePreds.forEach(p => counts[p] = (counts[p] || 0) + 1);
        let maxVotes = 0;
        let votedClass = samplePreds[0];
        Object.entries(counts).forEach(([c, votes]) => {
          if (votes > maxVotes) {
            maxVotes = votes;
            votedClass = parseInt(c);
          }
        });
        means.push(votedClass);
        // Variance of classes can represent disagreement rate (0 to 1)
        const disagreement = 1 - (maxVotes / this.numTrees);
        variances.push(disagreement);
      } else {
        const avg = samplePreds.reduce((a, b) => a + b, 0) / samplePreds.length;
        const variance = samplePreds.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / samplePreds.length;
        means.push(avg);
        variances.push(variance);
      }
    }

    return { predictions: means, variances };
  }

  predict(X) {
    return this.predictWithVariance(X).predictions;
  }

  getFeatureImportance(featureNames) {
    if (!this.featureImportances) return [];
    return featureNames.map((name, idx) => ({
      name,
      score: this.featureImportances[idx] || 0
    })).sort((a, b) => b.score - a.score);
  }
}

export class XGBoost {
  constructor(numEstimators = 15, learningRate = 0.1, maxDepth = 3) {
    this.numEstimators = numEstimators;
    this.learningRate = learningRate;
    this.maxDepth = maxDepth;
    this.basePrediction = 0;
    this.trees = [];
    this.featureImportances = null;
  }

  train(X, y) {
    const numSamples = X.length;
    const numFeatures = X[0].length;
    this.trees = [];
    this.featureImportances = Array(numFeatures).fill(0);

    this.basePrediction = y.reduce((a, b) => a + b, 0) / numSamples;
    const currentPred = Array(numSamples).fill(this.basePrediction);

    for (let t = 0; t < this.numEstimators; t++) {
      const residuals = [];
      for (let i = 0; i < numSamples; i++) {
        residuals.push(y[i] - currentPred[i]);
      }

      const tree = new DecisionTree(false, this.maxDepth, 2);
      tree.train(X, residuals);
      this.trees.push(tree);

      const treePreds = tree.predict(X);
      for (let i = 0; i < numSamples; i++) {
        currentPred[i] += this.learningRate * treePreds[i];
      }

      for (let f = 0; f < numFeatures; f++) {
        this.featureImportances[f] += tree.featureImportances[f] || 0;
      }
    }

    const sum = this.featureImportances.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      this.featureImportances = this.featureImportances.map(v => v / sum);
    }
  }

  predict(X) {
    const numSamples = X.length;
    const predictions = Array(numSamples).fill(this.basePrediction);
    
    this.trees.forEach(tree => {
      const treePreds = tree.predict(X);
      for (let i = 0; i < numSamples; i++) {
        predictions[i] += this.learningRate * treePreds[i];
      }
    });

    return predictions;
  }

  getFeatureImportance(featureNames) {
    if (!this.featureImportances) return [];
    return featureNames.map((name, idx) => ({
      name,
      score: this.featureImportances[idx] || 0
    })).sort((a, b) => b.score - a.score);
  }
}

// ==========================================
// 5. CLUSTERING ALGORITHMS
// ==========================================

export function runKMeans(data, k = 3, maxIter = 100) {
  const n = data.length;
  const d = data[0].length;
  
  const centroids = [];
  centroids.push([...data[Math.floor(Math.random() * n)]]);

  while (centroids.length < k) {
    const dists = data.map(point => {
      let minDist = Infinity;
      centroids.forEach(c => {
        let dist = 0;
        for (let j = 0; j < d; j++) {
          dist += Math.pow(point[j] - c[j], 2);
        }
        if (dist < minDist) minDist = dist;
      });
      return minDist;
    });

    const totalDist = dists.reduce((a, b) => a + b, 0);
    let randVal = Math.random() * totalDist;
    let selectedIdx = 0;
    for (let i = 0; i < n; i++) {
      randVal -= dists[i];
      if (randVal <= 0) {
        selectedIdx = i;
        break;
      }
    }
    centroids.push([...data[selectedIdx]]);
  }

  let clusters = Array(n).fill(0);
  let changed = true;
  let iterations = 0;

  while (changed && iterations < maxIter) {
    changed = false;
    iterations++;

    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let minCluster = 0;
      const point = data[i];

      for (let c = 0; c < k; c++) {
        const centroid = centroids[c];
        let dist = 0;
        for (let j = 0; j < d; j++) {
          dist += Math.pow(point[j] - centroid[j], 2);
        }
        if (dist < minDist) {
          minDist = dist;
          minCluster = c;
        }
      }

      if (clusters[i] !== minCluster) {
        clusters[i] = minCluster;
        changed = true;
      }
    }

    const centroidSums = Array(k).fill(0).map(() => Array(d).fill(0));
    const centroidCounts = Array(k).fill(0);

    for (let i = 0; i < n; i++) {
      const c = clusters[i];
      centroidCounts[c]++;
      for (let j = 0; j < d; j++) {
        centroidSums[c][j] += data[i][j];
      }
    }

    for (let c = 0; c < k; c++) {
      if (centroidCounts[c] > 0) {
        for (let j = 0; j < d; j++) {
          centroids[c][j] = centroidSums[c][j] / centroidCounts[c];
        }
      }
    }
  }

  return { clusters, centroids };
}

export function runDBSCAN(data, epsilon = 1.0, minPts = 3) {
  const n = data.length;
  const d = data[0].length;
  
  const clusters = Array(n).fill(-2);
  let clusterId = 0;

  const getDistance = (p1, p2) => {
    let sum = 0;
    for (let i = 0; i < d; i++) {
      sum += Math.pow(p1[i] - p2[i], 2);
    }
    return Math.sqrt(sum);
  };

  const getNeighbors = (idx) => {
    const neighbors = [];
    for (let i = 0; i < n; i++) {
      if (getDistance(data[idx], data[i]) <= epsilon) {
        neighbors.push(i);
      }
    }
    return neighbors;
  };

  for (let i = 0; i < n; i++) {
    if (clusters[i] !== -2) continue;

    const neighbors = getNeighbors(i);
    
    if (neighbors.length < minPts) {
      clusters[i] = -1;
    } else {
      clusters[i] = clusterId;
      expandCluster(i, neighbors, clusterId);
      clusterId++;
    }
  }

  function expandCluster(pointIdx, neighbors, cId) {
    const queue = [...neighbors];
    
    for (let q = 0; q < queue.length; q++) {
      const neighborIdx = queue[q];
      
      if (clusters[neighborIdx] === -1) {
        clusters[neighborIdx] = cId;
      }
      
      if (clusters[neighborIdx] !== -2) continue;
      
      clusters[neighborIdx] = cId;
      
      const nextNeighbors = getNeighbors(neighborIdx);
      if (nextNeighbors.length >= minPts) {
        nextNeighbors.forEach(idx => {
          if (!queue.includes(idx)) {
            queue.push(idx);
          }
        });
      }
    }
  }

  const uniqueIds = Array.from(new Set(clusters)).filter(id => id >= 0);
  const remappedClusters = clusters.map(c => {
    if (c === -1) return -1;
    return uniqueIds.indexOf(c);
  });

  return { clusters: remappedClusters, numClusters: uniqueIds.length };
}

export function runHierarchical(data, numClusters = 3) {
  const n = data.length;
  const d = data[0].length;

  const getDistance = (p1, p2) => {
    let sum = 0;
    for (let i = 0; i < d; i++) {
      sum += Math.pow(p1[i] - p2[i], 2);
    }
    return Math.sqrt(sum);
  };

  const distMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dVal = getDistance(data[i], data[j]);
      distMatrix[i][j] = dVal;
      distMatrix[j][i] = dVal;
    }
  }

  let currentClusters = Array(n).fill(0).map((_, i) => [i]);

  while (currentClusters.length > numClusters) {
    let minD = Infinity;
    let mergeIdxA = -1;
    let mergeIdxB = -1;

    for (let i = 0; i < currentClusters.length; i++) {
      for (let j = i + 1; j < currentClusters.length; j++) {
        let sumD = 0;
        const clA = currentClusters[i];
        const clB = currentClusters[j];
        
        clA.forEach(a => {
          clB.forEach(b => {
            sumD += distMatrix[a][b];
          });
        });
        
        const avgD = sumD / (clA.length * clB.length);

        if (avgD < minD) {
          minD = avgD;
          mergeIdxA = i;
          mergeIdxB = j;
        }
      }
    }

    if (mergeIdxA === -1 || mergeIdxB === -1) break;

    const newCluster = [...currentClusters[mergeIdxA], ...currentClusters[mergeIdxB]];
    currentClusters[mergeIdxA] = newCluster;
    currentClusters.splice(mergeIdxB, 1);
  }

  const assignments = Array(n).fill(0);
  currentClusters.forEach((cl, cId) => {
    cl.forEach(itemIdx => {
      assignments[itemIdx] = cId;
    });
  });

  return { clusters: assignments };
}

// ==========================================
// 6. PRINCIPAL COMPONENT ANALYSIS (PCA)
// ==========================================

export function runPCA(data) {
  const n = data.length;
  const d = data[0].length;

  const means = Array(d).fill(0);
  for (let j = 0; j < d; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += data[i][j];
    }
    means[j] = sum / n;
  }

  const X_centered = data.map(row => row.map((val, j) => val - means[j]));

  const XT = matrixHelpers.transpose(X_centered);
  const C = matrixHelpers.multiply(XT, X_centered);
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      C[i][j] /= (n - 1) || 1;
    }
  }

  const powerIteration = (CovMat, maxIter = 100, tol = 1e-6) => {
    const dim = CovMat.length;
    let v = Array(dim).fill(0).map(() => Math.random() - 0.5);
    let norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1.0;
    v = v.map(x => x / norm);

    let iter = 0;
    let diff = 1.0;
    
    while (diff > tol && iter < maxIter) {
      iter++;
      const w = Array(dim).fill(0);
      for (let i = 0; i < dim; i++) {
        let sum = 0;
        for (let j = 0; j < dim; j++) {
          sum += CovMat[i][j] * v[j];
        }
        w[i] = sum;
      }

      const nextNorm = Math.sqrt(w.reduce((a, b) => a + b * b, 0)) || 1.0;
      const nextV = w.map(x => x / nextNorm);

      diff = 0;
      for (let i = 0; i < dim; i++) {
        diff += Math.pow(Math.abs(nextV[i]) - Math.abs(v[i]), 2);
      }
      
      v = nextV;
      norm = nextNorm;
    }

    return { eigenvector: v, eigenvalue: norm };
  };

  const pc1 = powerIteration(C);
  
  const C_deflated = Array(d).fill(0).map(() => Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      C_deflated[i][j] = C[i][j] - pc1.eigenvalue * pc1.eigenvector[i] * pc1.eigenvector[j];
    }
  }

  const pc2 = powerIteration(C_deflated);

  const C_deflated_2 = Array(d).fill(0).map(() => Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      C_deflated_2[i][j] = C_deflated[i][j] - pc2.eigenvalue * pc2.eigenvector[i] * pc2.eigenvector[j];
    }
  }

  const pc3 = powerIteration(C_deflated_2);

  const projected = X_centered.map(row => {
    let pc1_proj = 0;
    let pc2_proj = 0;
    let pc3_proj = 0;
    for (let j = 0; j < d; j++) {
      pc1_proj += row[j] * pc1.eigenvector[j];
      pc2_proj += row[j] * pc2.eigenvector[j];
      pc3_proj += row[j] * pc3.eigenvector[j];
    }
    return [pc1_proj, pc2_proj, pc3_proj];
  });

  let totalVariance = 0;
  for (let i = 0; i < d; i++) {
    totalVariance += C[i][i];
  }

  const varExplained1 = pc1.eigenvalue / (totalVariance || 1.0);
  const varExplained2 = pc2.eigenvalue / (totalVariance || 1.0);
  const varExplained3 = pc3.eigenvalue / (totalVariance || 1.0);

  return {
    projected,
    pc1: pc1.eigenvector,
    pc2: pc2.eigenvector,
    pc3: pc3.eigenvector,
    varExplained: [varExplained1, varExplained2, varExplained3]
  };
}
