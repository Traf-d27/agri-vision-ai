# 🌾 Agri-Vision AI — National Agricultural Intelligence & Predictive Analytics Platform

[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![XGBoost](https://img.shields.io/badge/ML-XGBoost_%2B_Scikit--Learn-FF6F00?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![Leaflet](https://img.shields.io/badge/Geospatial-Leaflet-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Agri-Vision AI** is an enterprise-grade full-stack Agricultural Intelligence and Machine Learning platform designed for data-driven farming, yield optimization, geospatial satellite metric analysis, and sustainability tracking across Indian states and districts.

---

## 🌟 Key Features

### 1. 🇮🇳 National Geo-Spatial & Live Satellite Intelligence
- **Interactive GeoJSON Maps**: Dynamic state and district boundary mapping using Leaflet and ECharts.
- **Satellite Metric Overlays**: Heatmap layers for **NDVI** (Normalized Difference Vegetation Index), **VHI** (Vegetation Health Index), Rainfall (mm), Land Temperature (°C), and Crop Cover Percentage.
- **Live Weather Integration**: Open-Meteo API connection providing current weather conditions (temperature, humidity, wind, precipitation) with 3-day forecasts and TTL caching.

### 2. 🤖 Advanced Machine Learning Engine
- **Yield Regression Suite**: Compares **Linear Regression**, **Decision Trees**, **Random Forests**, and **XGBoost** side-by-side. Evaluates $R^2$, MAE, RMSE, training latencies, and Feature Importance (e.g., fertilizer impact vs. water usage).
- **Multi-Class Yield Classification**: Classifies farms into *Low*, *Medium*, or *High* yield brackets with Accuracy, Precision, Recall, F1-Scores, and interactive Confusion Matrix visualization.
- **Unsupervised Clustering Lab & 3D PCA**: Groups farm profiles using **K-Means**, **DBSCAN**, and **Agglomerative Clustering**, combined with **3D Principal Component Analysis (PCA)** for $PC_1, PC_2, PC_3$ dimensional reduction visualizers.

### 3. 🔮 Interactive Real-Time Prediction & Simulation Center
- **On-the-Fly ML Inference**: Allows agronomists and farmers to input custom farm parameters (acres, water volume, fertilizer, pesticide, crop type, soil type, season).
- **Multi-Dimensional Scoring**: Computes predicted yield (tons), **Productivity Score**, **Resource Efficiency Score**, and **Model Confidence Score** instantly.

### 4. 📊 Sustainability Hub & AI Agronomic Advisory
- **Environmental Tracking**: Calculates carbon footprint, chemical application density (kg/acre), and water usage ratios.
- **AI Chatbot Overlay**: Integrated assistant for querying farm records, optimization strategies, and pest management.
- **Executive Report Generation**: Dynamic generation and export of analytical reports in PDF and CSV formats.

### 5. ⚡ High-Performance Caching & Architecture
- **In-Memory Backend Cache**: Built-in TTL parameter-hashing cache in FastAPI for sub-2ms response times on repeated analytical queries.
- **Optimized Frontend Sync**: React Query cache configuration with 5-minute stale-times to prevent redundant network fetches.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite, Framer Motion (Glassmorphism & animations) |
| **Data Visualization** | ECharts (`echarts-for-react`), Leaflet (`react-leaflet`), Lucide Icons |
| **State & Cache Management** | TanStack React Query v5, Zustand |
| **Backend API Framework** | Python 3.10+, FastAPI, Uvicorn, Pydantic |
| **Machine Learning Suite** | Scikit-Learn, XGBoost, Pandas, NumPy |
| **Database & ORM** | SQLite / PostgreSQL, SQLAlchemy |
| **Containerization & Serve** | Docker, Docker Compose, Nginx |

---

## 📂 Repository Structure

```
agri-vision-ai/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # REST endpoints (farms, analytics, ml, india, assistant)
│   │   ├── core/                # Configuration, security, in-memory cache
│   │   ├── db/                  # Database session & engine setup
│   │   ├── models/              # SQLAlchemy models (FarmRecord, State, District, SoilType)
│   │   ├── schemas/             # Pydantic validation schemas
│   │   ├── services/            # ML training pipeline, data manager, ETL seeds
│   │   └── main.py              # FastAPI application entrypoint & static SPA mount
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Backend container configuration
├── public/                      # Agriculture datasets (agriculture_dataset.csv, Crop_details.csv)
├── src/
│   ├── assets/                  # Styling & image assets
│   ├── components/              # View modules (IndiaIntel, MlLab, PredictionCenter, Dashboard)
│   ├── context/                 # React Query & PlatformContext provider
│   ├── services/                # API fetch helpers & chart configs
│   ├── store/                   # Zustand global state store
│   ├── App.jsx                  # Main application wrapper
│   └── index.css                # Custom CSS design system (tokens, utilities, glassmorphic themes)
├── docker-compose.yml           # Full-stack Docker compose configuration
├── nginx.conf                   # Nginx reverse proxy configuration
├── package.json                 # Frontend dependencies & build scripts
└── vite.config.js               # Vite bundler configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0 or higher
- **Python**: v3.10 or higher
- **Git**

---

### 1. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create a Python Virtual Environment**:
   ```bash
   python -m venv .venv
   ```

3. **Activate the Virtual Environment**:
   - **Windows**:
     ```powershell
     .\.venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```

4. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Start the FastAPI Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   > The backend API will be available at `http://localhost:8000`. API docs can be viewed at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

1. **Navigate to the project root directory**:
   ```bash
   cd ..
   ```

2. **Install Node Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   > The web application will launch at `http://localhost:5173`.

---

### 3. Docker Setup (Optional)

To run the entire full-stack application inside isolated containers:

```bash
docker-compose up --build
```
> Access the application at `http://localhost:80`.

---

## 📡 Core API Endpoint Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/farms/` | List & filter farm crop records |
| `GET` | `/api/analytics/kpis` | Summary KPIs (total yield, average water, top crop/soil) |
| `GET` | `/api/analytics/rankings` | Ranked agricultural performance by crop, soil, and region |
| `GET` | `/api/analytics/insights` | Automated analytical insights (correlation, scale drop) |
| `POST` | `/api/ml/train` | Train regression ML models (Linear, Tree, Forest, XGBoost) |
| `POST` | `/api/ml/train-classifier` | Train multi-class yield classifier models |
| `POST` | `/api/ml/clustering` | Execute KMeans / DBSCAN / Agglomerative with 3D PCA |
| `POST` | `/api/ml/predict` | Run real-time simulation yield prediction |
| `GET` | `/api/india/states` | Fetch geospatial state boundaries and satellite indicators |
| `POST` | `/api/assistant/ask` | Submit query to the agricultural AI assistant |

---

