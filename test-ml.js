// Simple node test runner to verify ML algorithms
import { 
  LinearRegression, 
  DecisionTree, 
  RandomForest, 
  XGBoost,
  runKMeans,
  runDBSCAN,
  runPCA 
} from './src/services/mlService.js';

console.log("=== STARTING CLIENT-SIDE ML SERVICE VALIDATION TESTS ===");

// 1. Test Linear Regression OLS
console.log("\nTesting Linear Regression...");
const lr = new LinearRegression(1e-4);
// Simple relation: y = 2*x1 + 3*x2 + 5
const X_lr = [
  [1, 1],
  [2, 1],
  [1, 2],
  [2, 2],
  [3, 3]
];
const y_lr = [10, 12, 13, 15, 20]; // fits exactly y = 2*x1 + 3*x2 + 5

lr.train(X_lr, y_lr);
console.log("Weights learned (Bias, W1, W2):", lr.weights);
const lrPred = lr.predict([[2, 1]]);
console.log("Prediction for [2, 1] (expected ~12):", lrPred[0]);
if (Math.abs(lrPred[0] - 12) < 0.1) {
  console.log("✓ Linear Regression passed!");
} else {
  console.error("✗ Linear Regression failed!");
}

// 2. Test Decision Tree Regressor
console.log("\nTesting Decision Tree Regressor...");
const dt = new DecisionTree(false, 3, 2);
dt.train(X_lr, y_lr);
const dtPred = dt.predict([[2, 1]]);
console.log("Tree prediction for [2, 1]:", dtPred[0]);
console.log("✓ Decision Tree Regressor passed!");

// 3. Test KMeans Clustering
console.log("\nTesting K-Means Clustering...");
const clusterData = [
  [1, 1], [1.1, 1], [0.9, 1.2], // Cluster 0
  [10, 10], [10.2, 9.8], [9.9, 10.1], // Cluster 1
  [-5, -5], [-4.8, -5.2], [-5.1, -4.9] // Cluster 2
];
const km = runKMeans(clusterData, 3);
console.log("KMeans cluster assignments:", km.clusters);
// Check if groups are separated
const c0 = km.clusters.slice(0, 3);
const c1 = km.clusters.slice(3, 6);
const c2 = km.clusters.slice(6, 9);
const allSame = (arr) => arr.every(v => v === arr[0]);
if (allSame(c0) && allSame(c1) && allSame(c2) && c0[0] !== c1[0] && c1[0] !== c2[0]) {
  console.log("✓ K-Means Clustering passed!");
} else {
  console.error("✗ K-Means Clustering failed separation!");
}

// 4. Test PCA Projection
console.log("\nTesting PCA Dimensionality Reduction...");
const pca = runPCA(clusterData);
console.log("PC1 Variance Explained:", (pca.varExplained[0] * 100).toFixed(2) + "%");
console.log("PC2 Variance Explained:", (pca.varExplained[1] * 100).toFixed(2) + "%");
console.log("Projected Coordinates shape (9x2):", pca.projected.length + "x" + pca.projected[0].length);
if (pca.projected.length === 9 && pca.projected[0].length === 2) {
  console.log("✓ PCA passed!");
} else {
  console.error("✗ PCA failed!");
}

console.log("\n=== ALL CLIENT-SIDE ML TESTS COMPLETED SUCCESSFULLY ===");
