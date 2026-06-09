import time
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.decomposition import PCA
from sklearn.metrics import r2_score, mean_absolute_error, accuracy_score, precision_recall_fscore_support, confusion_matrix
import xgboost as xgb

def preprocess_features(df: pd.DataFrame, feature_cols: List[str]) -> Tuple[np.ndarray, List[str], ColumnTransformer]:
    numerical_cols = [c for c in feature_cols if c in ['farm_area_acres', 'water_usage_cubic_meters', 'fertilizer_used_tons', 'pesticide_used_kg', 'yield_tons']]
    categorical_cols = [c for c in feature_cols if c in ['crop_type', 'soil_type', 'season', 'irrigation_type']]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_cols),
            ('cat', OneHotEncoder(sparse_output=False, handle_unknown='ignore'), categorical_cols)
        ]
    )
    
    X_processed = preprocessor.fit_transform(df)
    
    cat_encoder = preprocessor.named_transformers_['cat']
    encoded_cat_names = []
    if len(categorical_cols) > 0 and hasattr(cat_encoder, 'get_feature_names_out'):
        encoded_cat_names = list(cat_encoder.get_feature_names_out(categorical_cols))
        
    feature_names = numerical_cols + encoded_cat_names
    return X_processed, feature_names, preprocessor

def train_regression_models(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    df = pd.DataFrame(records)
    if df.empty or len(df) < 5:
        return {"error": "Insufficient data to train models."}
        
    feature_cols = ['farm_area_acres', 'water_usage_cubic_meters', 'fertilizer_used_tons', 'pesticide_used_kg', 'crop_type', 'soil_type', 'season', 'irrigation_type']
    target_col = 'yield_tons'
    
    X, feature_names, preprocessor = preprocess_features(df, feature_cols)
    y = df[target_col].values
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    models = {
        'linear': LinearRegression(),
        'tree': DecisionTreeRegressor(max_depth=5, random_state=42),
        'forest': RandomForestRegressor(n_estimators=15, max_depth=5, random_state=42),
        'xgboost': xgb.XGBRegressor(n_estimators=15, max_depth=3, learning_rate=0.1, random_state=42)
    }
    
    results = {}
    comparison = []
    
    for name, model in models.items():
        t0 = time.perf_counter()
        model.fit(X_train, y_train)
        train_time_ms = (time.perf_counter() - t0) * 1000.0
        
        preds = model.predict(X_test)
        
        r2 = r2_score(y_test, preds)
        mae = mean_absolute_error(y_test, preds)
        rmse = float(np.sqrt(np.mean((y_test - preds) ** 2)))
        
        importances = []
        if name == 'linear':
            coefs = np.abs(model.coef_)
            sum_coefs = np.sum(coefs) if np.sum(coefs) > 0 else 1.0
            importances = coefs / sum_coefs
        elif hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            
        feat_imp_list = [
            {"name": f_name, "score": float(imp)}
            for f_name, imp in zip(feature_names, importances)
        ]
        feat_imp_list = sorted(feat_imp_list, key=lambda x: x['score'], reverse=True)
        
        results[name] = {
            "r2": float(r2),
            "mae": float(mae),
            "rmse": float(rmse),
            "training_time_ms": float(train_time_ms),
            "feature_importance": feat_imp_list[:10],
            "predictions": [float(p) for p in preds[:15]],
            "actuals": [float(a) for a in y_test[:15]]
        }
        
        comparison.append({
            "name": name.capitalize(),
            "r2": float(r2),
            "mae": float(mae),
            "rmse": float(rmse),
            "time": float(train_time_ms)
        })
        
    return {"models": results, "comparison": comparison}

def train_classification_models(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    df = pd.DataFrame(records)
    if df.empty or len(df) < 5:
        return {"error": "Insufficient data to train classification models."}
        
    feature_cols = ['farm_area_acres', 'water_usage_cubic_meters', 'fertilizer_used_tons', 'pesticide_used_kg', 'crop_type', 'soil_type', 'season', 'irrigation_type']
    target_col = 'yield_tons'
    
    yields = df[target_col].values
    low_thresh = np.percentile(yields, 33.3)
    high_thresh = np.percentile(yields, 66.6)
    
    def classify_yield(val):
        if val <= low_thresh:
            return 0
        elif val <= high_thresh:
            return 1
        return 2
        
    df['yield_class'] = df[target_col].apply(classify_yield)
    y = df['yield_class'].values
    
    X, feature_names, preprocessor = preprocess_features(df, feature_cols)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    class_labels = ['Low Yield', 'Medium Yield', 'High Yield']
    
    models = {
        'forest': RandomForestClassifier(n_estimators=15, max_depth=5, random_state=42),
        'tree': DecisionTreeClassifier(max_depth=5, random_state=42),
        'xgboost': xgb.XGBClassifier(n_estimators=15, max_depth=3, learning_rate=0.1, random_state=42)
    }
    
    results = {}
    
    for name, model in models.items():
        t0 = time.perf_counter()
        model.fit(X_train, y_train)
        train_time_ms = (time.perf_counter() - t0) * 1000.0
        
        preds = model.predict(X_test)
        
        acc = accuracy_score(y_test, preds)
        precision, recall, f1, _ = precision_recall_fscore_support(y_test, preds, average='macro', zero_division=0)
        cm = confusion_matrix(y_test, preds)
        
        results[name] = {
            "accuracy": float(acc),
            "precision": float(precision),
            "recall": float(recall),
            "f1": float(f1),
            "training_time_ms": float(train_time_ms),
            "confusion_matrix": cm.tolist()
        }
        
    return {"models": results, "thresholds": {"low": float(low_thresh), "high": float(high_thresh)}, "classes": class_labels}

def run_clustering_lab(records: List[Dict[str, Any]], selected_features: List[str], algo: str, k: int, eps: float, min_pts: int, num_clusters: int) -> Dict[str, Any]:
    df = pd.DataFrame(records)
    if df.empty or len(df) < 3:
        return {"error": "Insufficient data to run clustering."}
        
    X, feature_names, preprocessor = preprocess_features(df, selected_features)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    if algo == 'kmeans':
        model = KMeans(n_clusters=k, random_state=42, n_init='auto')
        labels = model.fit_predict(X_scaled)
    elif algo == 'dbscan':
        model = DBSCAN(eps=eps, min_samples=min_pts)
        labels = model.fit_predict(X_scaled)
    else:
        model = AgglomerativeClustering(n_clusters=num_clusters)
        labels = model.fit_predict(X_scaled)
        
    # PCA
    pca = PCA(n_components=3)
    X_pca = pca.fit_transform(X_scaled)
    evr = pca.explained_variance_ratio_
    
    projected = X_pca.tolist()
    
    loadings = []
    for i, name in enumerate(feature_names):
        loadings.append({
            "name": name,
            "pc1": float(pca.components_[0][i]),
            "pc2": float(pca.components_[1][i]),
            "pc3": float(pca.components_[2][i])
        })
        
    labels_list = [int(l) for l in labels]
    
    return {
        "labels": labels_list,
        "pca": {
            "projected": projected,
            "explained_variance": [float(v) for v in evr],
            "loadings": loadings
        }
    }

def predict_yield_on_fly(records: List[Dict[str, Any]], input_data: Dict[str, Any], model_name: str) -> Dict[str, Any]:
    df = pd.DataFrame(records)
    if df.empty:
        return {"error": "No data available."}
        
    feature_cols = ['farm_area_acres', 'water_usage_cubic_meters', 'fertilizer_used_tons', 'pesticide_used_kg', 'crop_type', 'soil_type', 'season', 'irrigation_type']
    target_col = 'yield_tons'
    
    # Preprocess feature matrix
    X_processed, feature_names, preprocessor = preprocess_features(df, feature_cols)
    y = df[target_col].values
    
    # Split into train/test to evaluate metrics
    X_train, X_test, y_train, y_test = train_test_split(X_processed, y, test_size=0.2, random_state=42)
    
    # Train selected model on train set to get metrics
    if model_name == 'linear':
        model = LinearRegression()
    elif model_name == 'tree':
        model = DecisionTreeRegressor(max_depth=5, random_state=42)
    elif model_name == 'forest':
        model = RandomForestRegressor(n_estimators=15, max_depth=5, random_state=42)
    else: # xgboost
        model = xgb.XGBRegressor(n_estimators=15, max_depth=3, learning_rate=0.1, random_state=42)
        
    model.fit(X_train, y_train)
    
    # Evaluate
    preds_test = model.predict(X_test)
    r2 = r2_score(y_test, preds_test)
    mae = mean_absolute_error(y_test, preds_test)
    rmse = float(np.sqrt(np.mean((y_test - preds_test) ** 2)))
    
    # Retrieve feature importance on train model
    importances = []
    if model_name == 'linear':
        coefs = np.abs(model.coef_)
        sum_coefs = np.sum(coefs) if np.sum(coefs) > 0 else 1.0
        importances = coefs / sum_coefs
    elif hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
    else:
        importances = [1.0 / len(feature_names)] * len(feature_names)
        
    feat_imp_list = [
        {"name": f_name, "score": float(imp)}
        for f_name, imp in zip(feature_names, importances)
    ]
    feat_imp_list = sorted(feat_imp_list, key=lambda x: x['score'], reverse=True)
    
    # Refit on full dataset for final simulation prediction
    model.fit(X_processed, y)
    
    # Preprocess simulation input
    input_df = pd.DataFrame([input_data])
    # Ensure numerical columns are floats, categoricals are strings
    for col in ['farm_area_acres', 'water_usage_cubic_meters', 'fertilizer_used_tons', 'pesticide_used_kg']:
        input_df[col] = pd.to_numeric(input_df[col], errors='coerce').fillna(0.0)
    for col in ['crop_type', 'soil_type', 'season', 'irrigation_type']:
        input_df[col] = input_df[col].astype(str)
        
    X_input = preprocessor.transform(input_df)
    
    # Predict simulation yield
    pred = model.predict(X_input)[0]
    predicted_yield = float(max(0.0, pred))
    
    # Calculate scores
    # 1. Productivity Score: percentage of maximum historical yield
    max_yield = float(df[target_col].max()) if target_col in df.columns else 50.0
    productivity_score = min(100.0, (predicted_yield / max_yield) * 100.0) if max_yield > 0 else 0.0
    
    # 2. Efficiency Score: Yield relative to resource footprint
    water_used = input_data['water_usage_cubic_meters']
    fertilizer = input_data['fertilizer_used_tons']
    pesticide = input_data['pesticide_used_kg']
    area = input_data['farm_area_acres']
    
    total_chem = fertilizer + (pesticide / 1000.0)
    chem_density = total_chem / area if area > 0 else 0.0
    water_per_acre = water_used / area if area > 0 else 0.0
    
    # Normalized scores based on historical distributions
    chem_pen = max(0.0, 50.0 - (chem_density * 400.0))
    water_pen = max(0.0, 50.0 - (water_per_acre / 1500.0) * 50.0)
    efficiency_score = min(100.0, max(10.0, chem_pen + water_pen))
    
    # 3. Confidence score: based on trees standard deviation or R2
    if model_name == 'forest':
        # RandomForest prediction agreement
        preds = [tree.predict(X_input)[0] for tree in model.estimators_]
        std_dev = np.std(preds) if len(preds) > 0 else 0.0
        cv = std_dev / predicted_yield if predicted_yield > 0 else 0.0
        confidence_score = max(15.0, min(98.0, 100.0 - (cv * 180.0)))
    else:
        r2_pct = max(0.0, min(1.0, r2))
        confidence_score = max(50.0, min(98.0, r2_pct * 40.0 + 58.0))
        
    return {
        "predicted_yield": predicted_yield,
        "productivity_score": round(productivity_score, 1),
        "efficiency_score": round(efficiency_score, 1),
        "confidence_score": round(confidence_score, 1),
        "encoded_features": [float(x) for x in X_input[0]],
        "feature_names": feature_names,
        "model_used": model_name,
        "metrics": {
            "r2": float(r2),
            "mae": float(mae),
            "rmse": float(rmse),
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test))
        },
        "feature_importance": feat_imp_list
    }

