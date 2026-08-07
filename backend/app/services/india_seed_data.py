"""
India Agricultural Intelligence Seed Data
Comprehensive data for all Indian states, districts, soil types, crops, and mappings.
Includes realistic agro-ecological data based on India's known agricultural zones.
"""
from sqlalchemy.orm import Session
from app.models.agricultural_data import State, District
from app.models.india_intelligence import (
    SoilType, CropType, SoilCropMapping, SatelliteMetric, YieldPrediction
)
import logging

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# INDIA STATES — 28 states + major UTs with centroids
# ─────────────────────────────────────────────────────────────
INDIA_STATES = [
    # North India
    {"name": "Punjab",          "lat": 31.1471, "lon": 75.3412, "area_km2": 50362,  "region": "North"},
    {"name": "Haryana",         "lat": 29.0588, "lon": 76.0856, "area_km2": 44212,  "region": "North"},
    {"name": "Uttar Pradesh",   "lat": 26.8467, "lon": 80.9462, "area_km2": 240928, "region": "North"},
    {"name": "Uttarakhand",     "lat": 30.0668, "lon": 79.0193, "area_km2": 53483,  "region": "North"},
    {"name": "Himachal Pradesh","lat": 31.1048, "lon": 77.1734, "area_km2": 55673,  "region": "North"},
    {"name": "Jammu & Kashmir", "lat": 33.7782, "lon": 76.5762, "area_km2": 42241,  "region": "North"},
    # West India
    {"name": "Rajasthan",       "lat": 27.0238, "lon": 74.2179, "area_km2": 342239, "region": "West"},
    {"name": "Gujarat",         "lat": 22.2587, "lon": 71.1924, "area_km2": 196024, "region": "West"},
    {"name": "Maharashtra",     "lat": 19.7515, "lon": 75.7139, "area_km2": 307713, "region": "West"},
    {"name": "Goa",             "lat": 15.2993, "lon": 74.1240, "area_km2": 3702,   "region": "West"},
    # Central India
    {"name": "Madhya Pradesh",  "lat": 22.9734, "lon": 78.6569, "area_km2": 308252, "region": "Central"},
    {"name": "Chhattisgarh",    "lat": 21.2787, "lon": 81.8661, "area_km2": 135192, "region": "Central"},
    # East India
    {"name": "Bihar",           "lat": 25.0961, "lon": 85.3131, "area_km2": 94163,  "region": "East"},
    {"name": "Jharkhand",       "lat": 23.6102, "lon": 85.2799, "area_km2": 79716,  "region": "East"},
    {"name": "West Bengal",     "lat": 22.9868, "lon": 87.8550, "area_km2": 88752,  "region": "East"},
    {"name": "Odisha",          "lat": 20.9517, "lon": 85.0985, "area_km2": 155707, "region": "East"},
    # Northeast India
    {"name": "Assam",           "lat": 26.2006, "lon": 92.9376, "area_km2": 78438,  "region": "Northeast"},
    {"name": "Manipur",         "lat": 24.6637, "lon": 93.9063, "area_km2": 22327,  "region": "Northeast"},
    {"name": "Meghalaya",       "lat": 25.4670, "lon": 91.3662, "area_km2": 22429,  "region": "Northeast"},
    {"name": "Nagaland",        "lat": 26.1584, "lon": 94.5624, "area_km2": 16579,  "region": "Northeast"},
    {"name": "Mizoram",         "lat": 23.1645, "lon": 92.9376, "area_km2": 21081,  "region": "Northeast"},
    {"name": "Tripura",         "lat": 23.9408, "lon": 91.9882, "area_km2": 10486,  "region": "Northeast"},
    {"name": "Arunachal Pradesh","lat": 28.2180,"lon": 94.7278, "area_km2": 83743,  "region": "Northeast"},
    {"name": "Sikkim",          "lat": 27.5330, "lon": 88.5122, "area_km2": 7096,   "region": "Northeast"},
    # South India
    {"name": "Karnataka",       "lat": 15.3173, "lon": 75.7139, "area_km2": 191791, "region": "South"},
    {"name": "Andhra Pradesh",  "lat": 15.9129, "lon": 79.7400, "area_km2": 162975, "region": "South"},
    {"name": "Telangana",       "lat": 18.1124, "lon": 79.0193, "area_km2": 112077, "region": "South"},
    {"name": "Tamil Nadu",      "lat": 11.1271, "lon": 78.6569, "area_km2": 130058, "region": "South"},
    {"name": "Kerala",          "lat": 10.8505, "lon": 76.2711, "area_km2": 38852,  "region": "South"},
]

# ─────────────────────────────────────────────────────────────
# DISTRICTS — major districts per state (lat/lon centroids)
# ─────────────────────────────────────────────────────────────
INDIA_DISTRICTS = {
    "Punjab": [
        ("Ludhiana", 30.9010, 75.8573), ("Amritsar", 31.6340, 74.8723),
        ("Jalandhar", 31.3260, 75.5762), ("Patiala", 30.3398, 76.3869),
        ("Bathinda", 30.2110, 74.9455), ("Hoshiarpur", 31.5143, 75.9110),
        ("Gurdaspur", 32.0393, 75.4013), ("Firozpur", 30.9293, 74.6090),
    ],
    "Haryana": [
        ("Hisar", 29.1492, 75.7217), ("Rohtak", 28.8955, 76.6066),
        ("Karnal", 29.6857, 76.9905), ("Ambala", 30.3782, 76.7767),
        ("Gurgaon", 28.4595, 77.0266), ("Faridabad", 28.4089, 77.3178),
        ("Panipat", 29.3909, 76.9635), ("Sonipat", 28.9933, 77.0151),
    ],
    "Uttar Pradesh": [
        ("Lucknow", 26.8467, 80.9462), ("Varanasi", 25.3176, 82.9739),
        ("Agra", 27.1767, 78.0081), ("Kanpur", 26.4499, 80.3319),
        ("Meerut", 28.9845, 77.7064), ("Allahabad", 25.4358, 81.8463),
        ("Gorakhpur", 26.7606, 83.3732), ("Mathura", 27.4924, 77.6737),
        ("Bareilly", 28.3670, 79.4304), ("Muzaffarnagar", 29.4727, 77.7085),
    ],
    "Rajasthan": [
        ("Jaipur", 26.9124, 75.7873), ("Jodhpur", 26.2389, 73.0243),
        ("Udaipur", 24.5854, 73.7125), ("Kota", 25.2138, 75.8648),
        ("Bikaner", 28.0229, 73.3119), ("Ajmer", 26.4499, 74.6399),
        ("Alwar", 27.5530, 76.6346), ("Bharatpur", 27.2152, 77.4940),
    ],
    "Gujarat": [
        ("Ahmedabad", 23.0225, 72.5714), ("Surat", 21.1702, 72.8311),
        ("Vadodara", 22.3072, 73.1812), ("Rajkot", 22.3039, 70.8022),
        ("Anand", 22.5645, 72.9289), ("Mehsana", 23.5880, 72.3693),
        ("Amreli", 21.6048, 71.2206), ("Junagadh", 21.5222, 70.4579),
    ],
    "Maharashtra": [
        ("Mumbai", 19.0760, 72.8777), ("Pune", 18.5204, 73.8567),
        ("Nagpur", 21.1458, 79.0882), ("Nashik", 19.9975, 73.7898),
        ("Aurangabad", 19.8762, 75.3433), ("Solapur", 17.6805, 75.9064),
        ("Amravati", 20.9374, 77.7796), ("Kolhapur", 16.7050, 74.2433),
        ("Ahmednagar", 19.0952, 74.7496), ("Latur", 18.4088, 76.5604),
    ],
    "Madhya Pradesh": [
        ("Bhopal", 23.2599, 77.4126), ("Indore", 22.7196, 75.8577),
        ("Jabalpur", 23.1815, 79.9864), ("Gwalior", 26.2183, 78.1828),
        ("Rewa", 24.5362, 81.2963), ("Sagar", 23.8388, 78.7378),
        ("Ujjain", 23.1765, 75.7885), ("Dewas", 22.9676, 76.0534),
    ],
    "Karnataka": [
        ("Bengaluru", 12.9716, 77.5946), ("Mysuru", 12.2958, 76.6394),
        ("Hubli-Dharwad", 15.3647, 75.1240), ("Mangaluru", 12.9141, 74.8560),
        ("Belagavi", 15.8497, 74.4977), ("Ballari", 15.1394, 76.9214),
        ("Tumkur", 13.3379, 77.1173), ("Davangere", 14.4644, 75.9218),
        ("Shivamogga", 13.9299, 75.5681), ("Raichur", 16.2120, 77.3566),
    ],
    "Andhra Pradesh": [
        ("Visakhapatnam", 17.6868, 83.2185), ("Vijayawada", 16.5062, 80.6480),
        ("Guntur", 16.3067, 80.4365), ("Tirupati", 13.6288, 79.4192),
        ("Kurnool", 15.8281, 78.0373), ("Kakinada", 16.9891, 82.2475),
        ("Nellore", 14.4426, 79.9865), ("Kadapa", 14.4673, 78.8242),
    ],
    "Tamil Nadu": [
        ("Chennai", 13.0827, 80.2707), ("Coimbatore", 11.0168, 76.9558),
        ("Madurai", 9.9252, 78.1198), ("Tiruchirappalli", 10.7905, 78.7047),
        ("Salem", 11.6643, 78.1460), ("Tirunelveli", 8.7139, 77.7567),
        ("Erode", 11.3410, 77.7172), ("Vellore", 12.9165, 79.1325),
        ("Thanjavur", 10.7902, 79.1378), ("Dindigul", 10.3624, 77.9695),
    ],
    "West Bengal": [
        ("Kolkata", 22.5726, 88.3639), ("Howrah", 22.5958, 88.2636),
        ("Asansol", 23.6739, 86.9524), ("Siliguri", 26.7271, 88.3953),
        ("Burdwan", 23.2324, 87.8615), ("Malda", 25.0108, 88.1435),
        ("Nadia", 23.4654, 88.5584), ("Murshidabad", 24.1788, 88.2718),
    ],
    "Bihar": [
        ("Patna", 25.5941, 85.1376), ("Gaya", 24.7955, 85.0002),
        ("Muzaffarpur", 26.1197, 85.3910), ("Bhagalpur", 25.2425, 86.9842),
        ("Darbhanga", 26.1542, 85.8918), ("Purnia", 25.7771, 87.4753),
        ("Nawada", 24.8875, 85.5441), ("Begusarai", 25.4182, 86.1272),
    ],
    "Odisha": [
        ("Bhubaneswar", 20.2961, 85.8245), ("Cuttack", 20.4625, 85.8828),
        ("Rourkela", 22.2604, 84.8536), ("Berhampur", 19.3150, 84.7941),
        ("Sambalpur", 21.4669, 83.9756), ("Balasore", 21.4934, 86.9337),
        ("Baripada", 21.9323, 86.7284), ("Koraput", 18.8122, 82.7126),
    ],
    "Assam": [
        ("Guwahati", 26.1445, 91.7362), ("Dibrugarh", 27.4728, 94.9120),
        ("Silchar", 24.8333, 92.7789), ("Jorhat", 26.7509, 94.2037),
        ("Nagaon", 26.3478, 92.6833), ("Tinsukia", 27.4930, 95.3601),
        ("Barpeta", 26.3193, 91.0073), ("Dhubri", 26.0227, 89.9781),
    ],
    "Kerala": [
        ("Thiruvananthapuram", 8.5241, 76.9366), ("Kochi", 9.9312, 76.2673),
        ("Kozhikode", 11.2588, 75.7804), ("Thrissur", 10.5276, 76.2144),
        ("Kannur", 11.8745, 75.3704), ("Palakkad", 10.7867, 76.6548),
        ("Alappuzha", 9.4981, 76.3388), ("Malappuram", 11.0510, 76.0711),
    ],
    "Telangana": [
        ("Hyderabad", 17.3850, 78.4867), ("Warangal", 17.9784, 79.5941),
        ("Nizamabad", 18.6725, 78.0941), ("Khammam", 17.2473, 80.1514),
        ("Karimnagar", 18.4386, 79.1288), ("Nalgonda", 17.0575, 79.2671),
        ("Adilabad", 19.6640, 78.5320), ("Mahbubnagar", 16.7488, 78.0028),
    ],
    "Chhattisgarh": [
        ("Raipur", 21.2514, 81.6296), ("Bilaspur", 22.0797, 82.1409),
        ("Durg", 21.1904, 81.2849), ("Rajnandgaon", 21.0972, 81.0317),
        ("Jagdalpur", 19.0730, 82.0220), ("Ambikapur", 23.1196, 83.1972),
    ],
    "Jharkhand": [
        ("Ranchi", 23.3441, 85.3096), ("Jamshedpur", 22.8046, 86.2029),
        ("Dhanbad", 23.7957, 86.4304), ("Bokaro", 23.6693, 86.1511),
        ("Hazaribagh", 23.9925, 85.3637), ("Giridih", 24.1919, 86.2980),
    ],
    "Himachal Pradesh": [
        ("Shimla", 31.1048, 77.1734), ("Dharamsala", 32.2190, 76.3234),
        ("Mandi", 31.7086, 76.9318), ("Solan", 30.9045, 77.0967),
        ("Una", 31.4683, 76.2701), ("Kullu", 31.9579, 77.1095),
    ],
    "Uttarakhand": [
        ("Dehradun", 30.3165, 78.0322), ("Haridwar", 29.9457, 78.1642),
        ("Roorkee", 29.8543, 77.8880), ("Haldwani", 29.2183, 79.5130),
        ("Rudrapur", 28.9842, 79.4017), ("Nainital", 29.3803, 79.4636),
    ],
    "Goa": [
        ("Panaji", 15.4909, 73.8278), ("Margao", 15.2993, 73.9862),
        ("Vasco da Gama", 15.3958, 73.8158), ("Mapusa", 15.5937, 73.8087),
    ],
    "Manipur": [
        ("Imphal", 24.8170, 93.9368), ("Churachandpur", 24.3330, 93.6832),
        ("Thoubal", 24.6342, 94.0155), ("Bishnupur", 24.6280, 93.7769),
    ],
    "Meghalaya": [
        ("Shillong", 25.5788, 91.8933), ("Tura", 25.5143, 90.2143),
        ("Jowai", 25.4537, 92.2026), ("Nongpoh", 25.9108, 91.8680),
    ],
    "Nagaland": [
        ("Kohima", 25.6751, 94.1086), ("Dimapur", 25.9001, 93.7220),
        ("Mokokchung", 26.3240, 94.5234), ("Wokha", 26.0957, 94.2593),
    ],
    "Mizoram": [
        ("Aizawl", 23.7307, 92.7173), ("Lunglei", 22.8920, 92.7373),
        ("Champhai", 23.4579, 93.3280), ("Kolasib", 24.2276, 92.6756),
    ],
    "Tripura": [
        ("Agartala", 23.8315, 91.2868), ("Dharmanagar", 24.3830, 92.1656),
        ("Kailashahar", 24.3334, 92.0013), ("Udaipur", 23.5380, 91.4807),
    ],
    "Arunachal Pradesh": [
        ("Itanagar", 27.0844, 93.6053), ("Naharlagun", 27.1046, 93.6949),
        ("Pasighat", 28.0659, 95.3258), ("Bomdila", 27.2645, 92.4161),
    ],
    "Sikkim": [
        ("Gangtok", 27.3314, 88.6138), ("Namchi", 27.1670, 88.3641),
        ("Gyalshing", 27.2885, 88.2576), ("Mangan", 27.5133, 88.5239),
    ],
    "Jammu & Kashmir": [
        ("Srinagar", 34.0837, 74.7973), ("Jammu", 32.7266, 74.8570),
        ("Anantnag", 33.7311, 75.1487), ("Baramulla", 34.2073, 74.3438),
    ],
}

# ─────────────────────────────────────────────────────────────
# SOIL TYPES — 12 major Indian soil types
# ─────────────────────────────────────────────────────────────
INDIA_SOIL_TYPES = [
    {
        "name": "Alluvial Soil",
        "description": "Most widespread soil in India, found in Indo-Gangetic plains. Rich in potash, phosphoric acid, and lime. Highly fertile.",
        "texture": "Loamy to Sandy Loam",
        "ph_min": 6.5, "ph_max": 7.5,
        "water_retention": "Medium",
        "organic_matter": "Medium",
        "fertility": "High",
        "color_hex": "#C4A35A",
        "area_million_ha": 143.0,
    },
    {
        "name": "Black Cotton Soil",
        "description": "Also known as Regur. Self-ploughing, moisture-retentive, formed from Deccan trap lava. Ideal for cotton and dryland crops.",
        "texture": "Clayey",
        "ph_min": 7.2, "ph_max": 8.5,
        "water_retention": "High",
        "organic_matter": "Medium",
        "fertility": "Medium",
        "color_hex": "#3D2B1F",
        "area_million_ha": 73.0,
    },
    {
        "name": "Red Soil",
        "description": "Formed from weathered crystalline rocks. Porous, friable, low in lime, phosphate, and organic matter. Deficient in nitrogen.",
        "texture": "Sandy Loam",
        "ph_min": 5.5, "ph_max": 7.0,
        "water_retention": "Low",
        "organic_matter": "Low",
        "fertility": "Low",
        "color_hex": "#C0392B",
        "area_million_ha": 69.0,
    },
    {
        "name": "Laterite Soil",
        "description": "Formed under high rainfall and high temperature leaching. Rich in iron and aluminum. Found in Western Ghats, Eastern Ghats, and Northeast.",
        "texture": "Clayey",
        "ph_min": 4.5, "ph_max": 6.5,
        "water_retention": "Low",
        "organic_matter": "Low",
        "fertility": "Low",
        "color_hex": "#E07B39",
        "area_million_ha": 26.0,
    },
    {
        "name": "Desert Soil",
        "description": "Found in arid regions. Sandy, low in organic matter, poor moisture retention, contains soluble salts. Rajasthan desert soils.",
        "texture": "Sandy",
        "ph_min": 7.0, "ph_max": 9.0,
        "water_retention": "Low",
        "organic_matter": "Low",
        "fertility": "Low",
        "color_hex": "#F4D03F",
        "area_million_ha": 14.0,
    },
    {
        "name": "Mountain Soil",
        "description": "Found in hilly and mountainous regions. Rich in humus but deficient in potash, phosphorus, lime. Suitable for horticulture.",
        "texture": "Loamy to Silty",
        "ph_min": 4.5, "ph_max": 6.5,
        "water_retention": "Medium",
        "organic_matter": "High",
        "fertility": "Medium",
        "color_hex": "#6D4C41",
        "area_million_ha": 18.0,
    },
    {
        "name": "Peaty Soil",
        "description": "Found in humid regions. High organic matter (10-40%), acidic. Kerala backwaters and mangrove areas.",
        "texture": "Organic",
        "ph_min": 3.5, "ph_max": 5.5,
        "water_retention": "High",
        "organic_matter": "High",
        "fertility": "Medium",
        "color_hex": "#4A235A",
        "area_million_ha": 2.5,
    },
    {
        "name": "Saline Soil",
        "description": "Contains excess soluble salts, forms in arid/semi-arid regions and coastal areas. Needs treatment for cultivation.",
        "texture": "Sandy to Loamy",
        "ph_min": 7.5, "ph_max": 9.5,
        "water_retention": "Low",
        "organic_matter": "Low",
        "fertility": "Low",
        "color_hex": "#A9CCE3",
        "area_million_ha": 7.5,
    },
    {
        "name": "Alkaline Soil",
        "description": "Found in drier parts of Gujarat, Rajasthan, Punjab, Haryana. High sodium, poor drainage. Reclaimed with gypsum.",
        "texture": "Clayey to Loamy",
        "ph_min": 8.0, "ph_max": 10.0,
        "water_retention": "Medium",
        "organic_matter": "Low",
        "fertility": "Low",
        "color_hex": "#D5DBDB",
        "area_million_ha": 5.6,
    },
    {
        "name": "Forest & Jungle Soil",
        "description": "Rich in humus under forest cover. Highly heterogeneous. Found in forests of Odisha, MP, Maharashtra, Northeast.",
        "texture": "Loamy",
        "ph_min": 5.0, "ph_max": 7.0,
        "water_retention": "High",
        "organic_matter": "High",
        "fertility": "High",
        "color_hex": "#1E8449",
        "area_million_ha": 40.0,
    },
    {
        "name": "Sub-Mountain Soil",
        "description": "Loamy yellow-brown soils of Himalayan foothills and Terai. Suitable for tea, jute, rice cultivation.",
        "texture": "Loamy",
        "ph_min": 5.5, "ph_max": 7.0,
        "water_retention": "Medium",
        "organic_matter": "Medium",
        "fertility": "Medium",
        "color_hex": "#82966A",
        "area_million_ha": 12.0,
    },
    {
        "name": "Coastal Soil",
        "description": "Sandy to loamy soils along coastline. Salt-influenced, well-drained. Suitable for coconut, cashew, paddy.",
        "texture": "Sandy to Loamy",
        "ph_min": 6.0, "ph_max": 8.0,
        "water_retention": "Low",
        "organic_matter": "Low",
        "fertility": "Low",
        "color_hex": "#F0E68C",
        "area_million_ha": 8.5,
    },
]

# ─────────────────────────────────────────────────────────────
# CROP TYPES — 28 major Indian crops
# ─────────────────────────────────────────────────────────────
INDIA_CROP_TYPES = [
    # Cereals
    {"name": "Wheat",      "category": "Cereal",     "season": "Rabi",     "water_requirement": "Medium", "growing_period_days": 120, "avg_yield_tons_ha": 3.1,  "icon": "🌾", "description": "India's second most important food crop. Grown in Punjab, Haryana, UP."},
    {"name": "Rice",       "category": "Cereal",     "season": "Kharif",   "water_requirement": "High",   "growing_period_days": 140, "avg_yield_tons_ha": 2.6,  "icon": "🍚", "description": "India's most important food crop. Grown across all states."},
    {"name": "Maize",      "category": "Cereal",     "season": "Kharif",   "water_requirement": "Medium", "growing_period_days": 90,  "avg_yield_tons_ha": 2.8,  "icon": "🌽", "description": "Third most grown cereal. Karnataka, Rajasthan, MP major producers."},
    {"name": "Sorghum",    "category": "Cereal",     "season": "Kharif",   "water_requirement": "Low",    "growing_period_days": 100, "avg_yield_tons_ha": 1.0,  "icon": "🌿", "description": "Also known as Jowar. Dryland crop in Maharashtra, Karnataka, AP."},
    {"name": "Pearl Millet","category": "Cereal",    "season": "Kharif",   "water_requirement": "Low",    "growing_period_days": 75,  "avg_yield_tons_ha": 1.2,  "icon": "🌿", "description": "Bajra — drought-tolerant. Rajasthan, Gujarat, Haryana growers."},
    {"name": "Ragi",       "category": "Cereal",     "season": "Kharif",   "water_requirement": "Low",    "growing_period_days": 130, "avg_yield_tons_ha": 2.3,  "icon": "🌾", "description": "Finger millet. Major crop of Karnataka and Tamil Nadu."},
    {"name": "Barley",     "category": "Cereal",     "season": "Rabi",     "water_requirement": "Low",    "growing_period_days": 100, "avg_yield_tons_ha": 2.0,  "icon": "🌾", "description": "Drought resistant Rabi crop. UP, Rajasthan, MP."},
    # Pulses
    {"name": "Chickpea",   "category": "Pulse",      "season": "Rabi",     "water_requirement": "Low",    "growing_period_days": 110, "avg_yield_tons_ha": 1.0,  "icon": "🫘", "description": "Chana — India's largest pulse crop. MP, Rajasthan, UP."},
    {"name": "Lentil",     "category": "Pulse",      "season": "Rabi",     "water_requirement": "Low",    "growing_period_days": 100, "avg_yield_tons_ha": 0.85, "icon": "🫘", "description": "Masoor dal. Major crop of Bihar, UP, MP."},
    {"name": "Pigeonpea",  "category": "Pulse",      "season": "Kharif",   "water_requirement": "Low",    "growing_period_days": 160, "avg_yield_tons_ha": 0.75, "icon": "🫘", "description": "Tur/Arhar. Maharashtra, Karnataka, UP key states."},
    # Oilseeds
    {"name": "Groundnut",  "category": "Oilseed",    "season": "Kharif",   "water_requirement": "Medium", "growing_period_days": 120, "avg_yield_tons_ha": 1.5,  "icon": "🥜", "description": "India's largest oilseed crop. Gujarat, Rajasthan, AP."},
    {"name": "Mustard",    "category": "Oilseed",    "season": "Rabi",     "water_requirement": "Low",    "growing_period_days": 100, "avg_yield_tons_ha": 1.3,  "icon": "🌼", "description": "Sarson — second largest oilseed. Rajasthan, UP, Haryana."},
    {"name": "Soybean",    "category": "Oilseed",    "season": "Kharif",   "water_requirement": "Medium", "growing_period_days": 100, "avg_yield_tons_ha": 1.2,  "icon": "🌱", "description": "MP, Maharashtra biggest soybean states in India."},
    {"name": "Sunflower",  "category": "Oilseed",    "season": "Rabi",     "water_requirement": "Medium", "growing_period_days": 90,  "avg_yield_tons_ha": 0.95, "icon": "🌻", "description": "Karnataka, Andhra Pradesh, Maharashtra growers."},
    # Cash Crops
    {"name": "Sugarcane",  "category": "Cash Crop",  "season": "Perennial","water_requirement": "High",   "growing_period_days": 365, "avg_yield_tons_ha": 70.0, "icon": "🎋", "description": "UP contributes ~40% of India's sugarcane production."},
    {"name": "Cotton",     "category": "Cash Crop",  "season": "Kharif",   "water_requirement": "Medium", "growing_period_days": 180, "avg_yield_tons_ha": 0.48, "icon": "☁️", "description": "White gold. Gujarat, Maharashtra, Telangana main states."},
    {"name": "Jute",       "category": "Cash Crop",  "season": "Kharif",   "water_requirement": "High",   "growing_period_days": 120, "avg_yield_tons_ha": 2.5,  "icon": "🌿", "description": "Golden fibre. West Bengal produces 75% of India's jute."},
    {"name": "Tobacco",    "category": "Cash Crop",  "season": "Rabi",     "water_requirement": "Medium", "growing_period_days": 110, "avg_yield_tons_ha": 1.8,  "icon": "🌿", "description": "Andhra Pradesh leads tobacco production in India."},
    # Horticulture
    {"name": "Tomato",     "category": "Horticulture","season": "Zaid",    "water_requirement": "High",   "growing_period_days": 80,  "avg_yield_tons_ha": 25.0, "icon": "🍅", "description": "Maharashtra, Karnataka, Andhra Pradesh major producers."},
    {"name": "Potato",     "category": "Horticulture","season": "Rabi",    "water_requirement": "High",   "growing_period_days": 75,  "avg_yield_tons_ha": 23.0, "icon": "🥔", "description": "UP, West Bengal, Bihar produce most of India's potatoes."},
    {"name": "Onion",      "category": "Horticulture","season": "Rabi",    "water_requirement": "Medium", "growing_period_days": 120, "avg_yield_tons_ha": 18.0, "icon": "🧅", "description": "Maharashtra is the largest onion producer in India."},
    {"name": "Banana",     "category": "Horticulture","season": "Perennial","water_requirement": "High",  "growing_period_days": 365, "avg_yield_tons_ha": 37.0, "icon": "🍌", "description": "Tamil Nadu, Maharashtra, AP main producers."},
    # Plantation
    {"name": "Tea",        "category": "Plantation", "season": "Perennial","water_requirement": "High",   "growing_period_days": 365, "avg_yield_tons_ha": 2.0,  "icon": "🍵", "description": "Assam and West Bengal produce 70% of India's tea."},
    {"name": "Coffee",     "category": "Plantation", "season": "Perennial","water_requirement": "High",   "growing_period_days": 365, "avg_yield_tons_ha": 0.95, "icon": "☕", "description": "Karnataka produces 70% of India's coffee output."},
    {"name": "Coconut",    "category": "Plantation", "season": "Perennial","water_requirement": "High",   "growing_period_days": 365, "avg_yield_tons_ha": 10.2, "icon": "🥥", "description": "Kerala, Tamil Nadu, Karnataka key coconut states."},
    # Spices
    {"name": "Turmeric",   "category": "Spice",      "season": "Kharif",   "water_requirement": "Medium", "growing_period_days": 270, "avg_yield_tons_ha": 6.5,  "icon": "🌿", "description": "Andhra Pradesh, Telangana, Odisha largest producers."},
    {"name": "Chilli",     "category": "Spice",      "season": "Kharif",   "water_requirement": "Medium", "growing_period_days": 120, "avg_yield_tons_ha": 2.5,  "icon": "🌶️", "description": "Andhra Pradesh leads India's chilli production."},
    {"name": "Ginger",     "category": "Spice",      "season": "Kharif",   "water_requirement": "High",   "growing_period_days": 240, "avg_yield_tons_ha": 18.0, "icon": "🌿", "description": "Kerala, Assam, Meghalaya major ginger growers."},
]

# ─────────────────────────────────────────────────────────────
# SOIL-CROP MAPPINGS — suitability matrix
# ─────────────────────────────────────────────────────────────
SOIL_CROP_SUITABILITY = {
    "Alluvial Soil": {
        "Wheat": 0.95, "Rice": 0.92, "Sugarcane": 0.90, "Maize": 0.88,
        "Mustard": 0.85, "Chickpea": 0.80, "Potato": 0.87, "Onion": 0.83,
        "Lentil": 0.78, "Barley": 0.80, "Pigeonpea": 0.70, "Cotton": 0.65,
    },
    "Black Cotton Soil": {
        "Cotton": 0.95, "Soybean": 0.88, "Wheat": 0.82, "Sorghum": 0.85,
        "Sunflower": 0.80, "Chickpea": 0.75, "Groundnut": 0.70, "Lentil": 0.72,
        "Maize": 0.70, "Pigeonpea": 0.78,
    },
    "Red Soil": {
        "Groundnut": 0.88, "Ragi": 0.90, "Tobacco": 0.85, "Maize": 0.80,
        "Sorghum": 0.80, "Cotton": 0.72, "Chilli": 0.75, "Sunflower": 0.70,
        "Chickpea": 0.65, "Potato": 0.68,
    },
    "Laterite Soil": {
        "Tea": 0.90, "Coffee": 0.85, "Coconut": 0.88, "Ragi": 0.82,
        "Cashew": 0.85, "Turmeric": 0.75, "Ginger": 0.72, "Banana": 0.70,
        "Rice": 0.65, "Maize": 0.60,
    },
    "Desert Soil": {
        "Pearl Millet": 0.88, "Sorghum": 0.80, "Groundnut": 0.70,
        "Mustard": 0.72, "Barley": 0.65, "Chickpea": 0.60,
    },
    "Mountain Soil": {
        "Tea": 0.85, "Ginger": 0.82, "Potato": 0.88, "Barley": 0.78,
        "Rice": 0.70, "Maize": 0.75, "Wheat": 0.80, "Coffee": 0.72,
    },
    "Peaty Soil": {
        "Rice": 0.88, "Jute": 0.85, "Coconut": 0.75, "Tea": 0.70,
        "Banana": 0.65,
    },
    "Saline Soil": {
        "Rice": 0.70, "Barley": 0.65, "Sugarcane": 0.60, "Cotton": 0.55,
    },
    "Alkaline Soil": {
        "Rice": 0.65, "Wheat": 0.60, "Sugarcane": 0.58, "Barley": 0.62,
    },
    "Forest & Jungle Soil": {
        "Coffee": 0.90, "Tea": 0.88, "Banana": 0.85, "Turmeric": 0.82,
        "Ginger": 0.80, "Maize": 0.75, "Rice": 0.70, "Chilli": 0.72,
    },
    "Sub-Mountain Soil": {
        "Tea": 0.92, "Jute": 0.88, "Rice": 0.85, "Maize": 0.80,
        "Ginger": 0.78, "Banana": 0.75, "Potato": 0.82,
    },
    "Coastal Soil": {
        "Coconut": 0.95, "Cashew": 0.88, "Rice": 0.80, "Banana": 0.82,
        "Groundnut": 0.72, "Turmeric": 0.68, "Chilli": 0.65,
    },
}

# ─────────────────────────────────────────────────────────────
# STATE → SOIL TYPE DISTRIBUTION
# ─────────────────────────────────────────────────────────────
STATE_SOIL_DISTRIBUTION = {
    "Punjab":           ["Alluvial Soil", "Sub-Mountain Soil"],
    "Haryana":          ["Alluvial Soil", "Desert Soil", "Alkaline Soil"],
    "Uttar Pradesh":    ["Alluvial Soil", "Black Cotton Soil", "Alkaline Soil"],
    "Uttarakhand":      ["Mountain Soil", "Alluvial Soil", "Forest & Jungle Soil"],
    "Himachal Pradesh": ["Mountain Soil", "Sub-Mountain Soil", "Forest & Jungle Soil"],
    "Jammu & Kashmir":  ["Mountain Soil", "Alluvial Soil"],
    "Rajasthan":        ["Desert Soil", "Alluvial Soil", "Black Cotton Soil", "Alkaline Soil"],
    "Gujarat":          ["Black Cotton Soil", "Alluvial Soil", "Desert Soil", "Saline Soil"],
    "Maharashtra":      ["Black Cotton Soil", "Red Soil", "Laterite Soil", "Alluvial Soil"],
    "Goa":              ["Laterite Soil", "Coastal Soil"],
    "Madhya Pradesh":   ["Black Cotton Soil", "Alluvial Soil", "Red Soil", "Forest & Jungle Soil"],
    "Chhattisgarh":     ["Red Soil", "Forest & Jungle Soil", "Alluvial Soil", "Black Cotton Soil"],
    "Bihar":            ["Alluvial Soil", "Sub-Mountain Soil"],
    "Jharkhand":        ["Red Soil", "Forest & Jungle Soil", "Laterite Soil"],
    "West Bengal":      ["Alluvial Soil", "Sub-Mountain Soil", "Laterite Soil", "Peaty Soil"],
    "Odisha":           ["Red Soil", "Laterite Soil", "Alluvial Soil", "Forest & Jungle Soil"],
    "Assam":            ["Sub-Mountain Soil", "Alluvial Soil", "Forest & Jungle Soil", "Peaty Soil"],
    "Manipur":          ["Forest & Jungle Soil", "Mountain Soil"],
    "Meghalaya":        ["Forest & Jungle Soil", "Laterite Soil", "Mountain Soil"],
    "Nagaland":         ["Forest & Jungle Soil", "Mountain Soil"],
    "Mizoram":          ["Forest & Jungle Soil", "Laterite Soil"],
    "Tripura":          ["Forest & Jungle Soil", "Alluvial Soil"],
    "Arunachal Pradesh":["Forest & Jungle Soil", "Mountain Soil"],
    "Sikkim":           ["Mountain Soil", "Forest & Jungle Soil"],
    "Karnataka":        ["Red Soil", "Laterite Soil", "Black Cotton Soil", "Alluvial Soil"],
    "Andhra Pradesh":   ["Alluvial Soil", "Red Soil", "Black Cotton Soil", "Laterite Soil"],
    "Telangana":        ["Black Cotton Soil", "Red Soil", "Alluvial Soil"],
    "Tamil Nadu":       ["Red Soil", "Alluvial Soil", "Laterite Soil", "Coastal Soil", "Black Cotton Soil"],
    "Kerala":           ["Laterite Soil", "Coastal Soil", "Peaty Soil", "Forest & Jungle Soil"],
}

# ─────────────────────────────────────────────────────────────
# STATE → SATELLITE METRICS (agro-ecological zone estimates)
# ─────────────────────────────────────────────────────────────
STATE_SATELLITE_METRICS = {
    "Punjab":             {"ndvi": 0.72, "evi": 0.55, "ndwi": 0.21, "crop_cover_pct": 84, "rainfall_mm": 700,  "temp_avg_c": 23.5},
    "Haryana":            {"ndvi": 0.65, "evi": 0.48, "ndwi": 0.15, "crop_cover_pct": 78, "rainfall_mm": 550,  "temp_avg_c": 25.2},
    "Uttar Pradesh":      {"ndvi": 0.68, "evi": 0.52, "ndwi": 0.18, "crop_cover_pct": 76, "rainfall_mm": 900,  "temp_avg_c": 26.0},
    "Uttarakhand":        {"ndvi": 0.74, "evi": 0.58, "ndwi": 0.30, "crop_cover_pct": 45, "rainfall_mm": 1500, "temp_avg_c": 18.0},
    "Himachal Pradesh":   {"ndvi": 0.76, "evi": 0.61, "ndwi": 0.32, "crop_cover_pct": 38, "rainfall_mm": 1400, "temp_avg_c": 14.5},
    "Jammu & Kashmir":    {"ndvi": 0.58, "evi": 0.44, "ndwi": 0.25, "crop_cover_pct": 28, "rainfall_mm": 1100, "temp_avg_c": 10.5},
    "Rajasthan":          {"ndvi": 0.28, "evi": 0.18, "ndwi": -0.12,"crop_cover_pct": 35, "rainfall_mm": 320,  "temp_avg_c": 30.5},
    "Gujarat":            {"ndvi": 0.48, "evi": 0.35, "ndwi": 0.08, "crop_cover_pct": 58, "rainfall_mm": 650,  "temp_avg_c": 28.5},
    "Maharashtra":        {"ndvi": 0.55, "evi": 0.42, "ndwi": 0.10, "crop_cover_pct": 60, "rainfall_mm": 1100, "temp_avg_c": 27.0},
    "Goa":                {"ndvi": 0.82, "evi": 0.66, "ndwi": 0.42, "crop_cover_pct": 48, "rainfall_mm": 2800, "temp_avg_c": 26.5},
    "Madhya Pradesh":     {"ndvi": 0.58, "evi": 0.44, "ndwi": 0.12, "crop_cover_pct": 65, "rainfall_mm": 1100, "temp_avg_c": 26.8},
    "Chhattisgarh":       {"ndvi": 0.68, "evi": 0.52, "ndwi": 0.22, "crop_cover_pct": 55, "rainfall_mm": 1400, "temp_avg_c": 27.5},
    "Bihar":              {"ndvi": 0.70, "evi": 0.54, "ndwi": 0.24, "crop_cover_pct": 80, "rainfall_mm": 1100, "temp_avg_c": 25.8},
    "Jharkhand":          {"ndvi": 0.66, "evi": 0.50, "ndwi": 0.20, "crop_cover_pct": 42, "rainfall_mm": 1200, "temp_avg_c": 26.0},
    "West Bengal":        {"ndvi": 0.76, "evi": 0.60, "ndwi": 0.35, "crop_cover_pct": 72, "rainfall_mm": 1700, "temp_avg_c": 26.5},
    "Odisha":             {"ndvi": 0.70, "evi": 0.54, "ndwi": 0.28, "crop_cover_pct": 60, "rainfall_mm": 1500, "temp_avg_c": 27.5},
    "Assam":              {"ndvi": 0.78, "evi": 0.62, "ndwi": 0.38, "crop_cover_pct": 68, "rainfall_mm": 2400, "temp_avg_c": 24.5},
    "Manipur":            {"ndvi": 0.74, "evi": 0.58, "ndwi": 0.30, "crop_cover_pct": 38, "rainfall_mm": 1500, "temp_avg_c": 20.5},
    "Meghalaya":          {"ndvi": 0.84, "evi": 0.68, "ndwi": 0.45, "crop_cover_pct": 32, "rainfall_mm": 3000, "temp_avg_c": 18.0},
    "Nagaland":           {"ndvi": 0.78, "evi": 0.62, "ndwi": 0.35, "crop_cover_pct": 30, "rainfall_mm": 2000, "temp_avg_c": 18.5},
    "Mizoram":            {"ndvi": 0.80, "evi": 0.64, "ndwi": 0.40, "crop_cover_pct": 26, "rainfall_mm": 2500, "temp_avg_c": 20.0},
    "Tripura":            {"ndvi": 0.76, "evi": 0.60, "ndwi": 0.32, "crop_cover_pct": 48, "rainfall_mm": 2200, "temp_avg_c": 24.0},
    "Arunachal Pradesh":  {"ndvi": 0.85, "evi": 0.70, "ndwi": 0.48, "crop_cover_pct": 22, "rainfall_mm": 2800, "temp_avg_c": 16.5},
    "Sikkim":             {"ndvi": 0.80, "evi": 0.64, "ndwi": 0.40, "crop_cover_pct": 18, "rainfall_mm": 2500, "temp_avg_c": 14.0},
    "Karnataka":          {"ndvi": 0.56, "evi": 0.42, "ndwi": 0.15, "crop_cover_pct": 62, "rainfall_mm": 1200, "temp_avg_c": 24.5},
    "Andhra Pradesh":     {"ndvi": 0.58, "evi": 0.44, "ndwi": 0.14, "crop_cover_pct": 65, "rainfall_mm": 1000, "temp_avg_c": 28.5},
    "Telangana":          {"ndvi": 0.52, "evi": 0.38, "ndwi": 0.10, "crop_cover_pct": 60, "rainfall_mm": 900,  "temp_avg_c": 28.8},
    "Tamil Nadu":         {"ndvi": 0.60, "evi": 0.46, "ndwi": 0.18, "crop_cover_pct": 68, "rainfall_mm": 980,  "temp_avg_c": 29.5},
    "Kerala":             {"ndvi": 0.88, "evi": 0.72, "ndwi": 0.52, "crop_cover_pct": 52, "rainfall_mm": 3000, "temp_avg_c": 27.5},
}


# ─────────────────────────────────────────────────────────────
# SEED FUNCTION
# ─────────────────────────────────────────────────────────────
def seed_india_intelligence(db: Session):
    """Seed all India intelligence data. Idempotent — runs checks before inserting."""

    # Skip if already seeded
    if db.query(SoilType).count() > 0:
        logger.info("India intelligence data already seeded — skipping.")
        return

    logger.info("Seeding India intelligence data...")

    # 1. Soil Types
    soil_type_map = {}
    for soil_data in INDIA_SOIL_TYPES:
        soil = SoilType(**soil_data)
        db.add(soil)
        db.flush()
        soil_type_map[soil.name] = soil

    # 2. Crop Types
    crop_type_map = {}
    for crop_data in INDIA_CROP_TYPES:
        crop = CropType(**crop_data)
        db.add(crop)
        db.flush()
        crop_type_map[crop.name] = crop

    # 3. Soil-Crop Mappings
    for soil_name, crop_scores in SOIL_CROP_SUITABILITY.items():
        soil_obj = soil_type_map.get(soil_name)
        if not soil_obj:
            continue
        for crop_name, score in crop_scores.items():
            crop_obj = crop_type_map.get(crop_name)
            if not crop_obj:
                continue
            mapping = SoilCropMapping(
                soil_type_id=soil_obj.id,
                crop_type_id=crop_obj.id,
                suitability_score=score,
            )
            db.add(mapping)

    # 4. States (upsert by name)
    state_obj_map = {}
    for state_data in INDIA_STATES:
        existing = db.query(State).filter(State.name == state_data["name"]).first()
        if existing:
            existing.latitude = state_data["lat"]
            existing.longitude = state_data["lon"]
            existing.area_km2 = state_data["area_km2"]
            existing.region = state_data["region"]
            state_obj = existing
        else:
            state_obj = State(
                name=state_data["name"],
                latitude=state_data["lat"],
                longitude=state_data["lon"],
                area_km2=state_data["area_km2"],
                region=state_data["region"],
            )
            db.add(state_obj)
        db.flush()
        state_obj_map[state_data["name"]] = state_obj

    # 5. Districts
    district_obj_map = {}
    for state_name, districts in INDIA_DISTRICTS.items():
        state_obj = state_obj_map.get(state_name)
        if not state_obj:
            continue
        for dist_name, lat, lon in districts:
            existing_dist = db.query(District).filter(
                District.name == dist_name,
                District.state_id == state_obj.id
            ).first()
            if existing_dist:
                existing_dist.latitude = lat
                existing_dist.longitude = lon
                dist_obj = existing_dist
            else:
                dist_obj = District(
                    name=dist_name,
                    state_id=state_obj.id,
                    latitude=lat,
                    longitude=lon,
                )
                db.add(dist_obj)
            db.flush()
            district_obj_map[(state_name, dist_name)] = dist_obj

    # 6. Satellite Metrics per State
    for state_name, metrics in STATE_SATELLITE_METRICS.items():
        state_obj = state_obj_map.get(state_name)
        if not state_obj:
            continue
        existing_metric = db.query(SatelliteMetric).filter(
            SatelliteMetric.state_id == state_obj.id,
            SatelliteMetric.district_id == None
        ).first()
        if not existing_metric:
            metric = SatelliteMetric(
                state_id=state_obj.id,
                ndvi=metrics["ndvi"],
                evi=metrics["evi"],
                ndwi=metrics["ndwi"],
                crop_cover_pct=metrics["crop_cover_pct"],
                rainfall_mm=metrics["rainfall_mm"],
                temp_avg_c=metrics["temp_avg_c"],
                source="synthetic",
            )
            db.add(metric)

    db.commit()
    logger.info(f"India intelligence seeded: {len(INDIA_STATES)} states, "
                f"{sum(len(v) for v in INDIA_DISTRICTS.values())} districts, "
                f"{len(INDIA_SOIL_TYPES)} soil types, {len(INDIA_CROP_TYPES)} crops.")


def seed_crop_details(db: Session, csv_path: str):
    from pathlib import Path
    import pandas as pd
    from app.models.india_intelligence import CropDetail

    try:
        if db.query(CropDetail).count() > 0:
            logger.info("CropDetail dataset already seeded.")
            return
    except Exception:
        pass

    path_obj = Path(csv_path)
    if not path_obj.exists():
        logger.warning(f"Crop_details CSV not found at {csv_path}")
        return

    try:
        df = pd.read_csv(csv_path)
        records = []
        for _, row in df.iterrows():
            img_path = str(row.get('path', ''))
            crop_name = str(row.get('crop', '')).strip()
            crop_lbl = int(row.get('croplabel', 0))
            records.append(CropDetail(image_path=img_path, crop=crop_name, croplabel=crop_lbl))

        if records:
            db.bulk_save_objects(records)
            db.commit()
            logger.info(f"Successfully seeded {len(records)} CropDetail records into database.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding crop details dataset: {e}")

