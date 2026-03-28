import datetime
import os
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

class Settings(BaseSettings):
    # This will look for the pkl file in the same directory as main.py
    model_path: str = os.path.join(SCRIPT_DIR, "arogya_link_ensemble_model2.pkl")
    mongodb_uri: Optional[str] = None
    database_name: str = "arogya_link"
    risk_warning_threshold: float = 35.0
    risk_critical_threshold: float = 65.0
    allow_origins: List[str] = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()


FEATURE_ORDER = [
    "Age",
    "Sex",
    "Cholesterol",
    "Heart Rate",
    "Diabetes",
    "Smoking",
    "Obesity",
    "Alcohol Consumption",
    "Exercise Hours Per Week",
    "Previous Heart Problems",
    "Medication Use",
    "Stress Level",
    "Sedentary Hours Per Day",
    "BMI",
    "Triglycerides",
    "Physical Activity Days Per Week",
    "Sleep Hours Per Day",
    "Systolic",
    "Diastolic",
    "Diet_Average",
    "Diet_Healthy",
    "Diet_Unhealthy",
]

# Conservative fallback values (approximate medians) used only if a field is missing
FALLBACKS: Dict[str, float] = {
    "Age": 45,
    "Sex": 1,
    "Cholesterol": 200,
    "Heart Rate": 78,
    "Diabetes": 0,
    "Smoking": 0,
    "Obesity": 0,
    "Alcohol Consumption": 0,
    "Exercise Hours Per Week": 2.0,
    "Previous Heart Problems": 0,
    "Medication Use": 0,
    "Stress Level": 5,
    "Sedentary Hours Per Day": 8.0,
    "BMI": 26.0,
    "Triglycerides": 150,
    "Physical Activity Days Per Week": 3,
    "Sleep Hours Per Day": 7.0,
    "Systolic": 120,
    "Diastolic": 80,
    "Diet_Average": 1,
    "Diet_Healthy": 0,
    "Diet_Unhealthy": 0,
}

app = FastAPI(title="Arogya Link API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VitalsPayload(BaseModel):
    age: Optional[float] = Field(None, description="Age in years")
    sex: Optional[int] = Field(None, description="1=Male, 0=Female")
    cholesterol: Optional[float] = Field(None, description="Cholesterol mg/dL")
    heart_rate: Optional[float] = Field(None, description="Heart rate BPM")
    diabetes: Optional[int] = Field(None, description="1=yes, 0=no")
    smoking: Optional[int] = Field(None, description="1=yes, 0=no")
    obesity: Optional[int] = Field(None, description="1=yes, 0=no")
    alcohol_consumption: Optional[int] = Field(None, description="1=yes, 0=no")
    exercise_hours_per_week: Optional[float] = Field(None, description="Hours of exercise per week")
    previous_heart_problems: Optional[int] = Field(None, description="1=yes, 0=no")
    medication_use: Optional[int] = Field(None, description="1=yes, 0=no")
    stress_level: Optional[float] = Field(None, description="1-10 scale")
    sedentary_hours_per_day: Optional[float] = Field(None, description="Hours seated per day")
    bmi: Optional[float] = Field(None, description="Body Mass Index")
    triglycerides: Optional[float] = Field(None, description="Triglycerides mg/dL")
    physical_activity_days_per_week: Optional[int] = Field(None, description="Days active per week")
    sleep_hours_per_day: Optional[float] = Field(None, description="Sleep hours per day")
    systolic: Optional[float] = Field(None, description="Systolic BP")
    diastolic: Optional[float] = Field(None, description="Diastolic BP")
    diet_average: Optional[int] = Field(None, description="1 if average diet")
    diet_healthy: Optional[int] = Field(None, description="1 if healthy diet")
    diet_unhealthy: Optional[int] = Field(None, description="1 if unhealthy diet")

    def to_frame(self) -> pd.DataFrame:
        mapping = {
            "age": "Age",
            "sex": "Sex",
            "cholesterol": "Cholesterol",
            "heart_rate": "Heart Rate",
            "diabetes": "Diabetes",
            "smoking": "Smoking",
            "obesity": "Obesity",
            "alcohol_consumption": "Alcohol Consumption",
            "exercise_hours_per_week": "Exercise Hours Per Week",
            "previous_heart_problems": "Previous Heart Problems",
            "medication_use": "Medication Use",
            "stress_level": "Stress Level",
            "sedentary_hours_per_day": "Sedentary Hours Per Day",
            "bmi": "BMI",
            "triglycerides": "Triglycerides",
            "physical_activity_days_per_week": "Physical Activity Days Per Week",
            "sleep_hours_per_day": "Sleep Hours Per Day",
            "systolic": "Systolic",
            "diastolic": "Diastolic",
            "diet_average": "Diet_Average",
            "diet_healthy": "Diet_Healthy",
            "diet_unhealthy": "Diet_Unhealthy",
        }

        row: Dict[str, float] = {}
        for field, column in mapping.items():
            value = getattr(self, field)
            if value is None:
                value = FALLBACKS[column]
            row[column] = float(value)

        df = pd.DataFrame([row], columns=FEATURE_ORDER)
        return df


class PredictRequest(BaseModel):
    vitals: VitalsPayload
    source: str = Field("manual", description="manual|smartwatch|demo")
    user_id: Optional[str] = Field("global", description="Target user for the prediction update")


class PredictResponse(BaseModel):
    risk_score: float
    status: str
    prediction: int
    explanation: str
    timestamp: datetime.datetime


class User(BaseModel):
    name: str
    age: int
    email: Optional[str] = None
    emergency_contacts: Optional[List[Dict[str, str]]] = None


# ----------------------------
# Model loading
# ----------------------------


def load_model(path: str):
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Model file not found at {path}. Export it from the notebook as 'arogya_link_ensemble_model2.pkl'."
        )
    return joblib.load(path)


try:
    model = load_model(settings.model_path)
except Exception as exc:  # pragma: no cover - startup guard
    model = None
    load_error = exc
else:
    load_error = None


# ----------------------------
# Persistence (Mongo + memory fallback)
# ----------------------------

mongo_client: Optional[AsyncIOMotorClient] = None
vitals_buffer: List[Dict] = []
alerts_buffer: List[Dict] = []
users_buffer: List[Dict] = []


async def get_db():
    global mongo_client
    if settings.mongodb_uri:
        if mongo_client is None:
            mongo_client = AsyncIOMotorClient(settings.mongodb_uri)
        return mongo_client[settings.database_name]
    return None


async def persist(collection: str, document: Dict):
    db = await get_db()
    if db:
        await db[collection].insert_one(document)
    else:
        if collection == "vitals":
            vitals_buffer.append(document)
        elif collection == "alerts":
            alerts_buffer.append(document)
        elif collection == "users":
            users_buffer.append(document)


async def fetch_recent(collection: str, limit: int = 20) -> List[Dict]:
    db = await get_db()
    if db:
        cursor = db[collection].find().sort("timestamp", -1).limit(limit)
        return [doc async for doc in cursor]
    if collection == "vitals":
        return vitals_buffer[-limit:][::-1]
    if collection == "alerts":
        return alerts_buffer[-limit:][::-1]
    if collection == "users":
        return users_buffer[-limit:][::-1]
    return []


# ----------------------------
# WebSocket manager
# ----------------------------


class ConnectionManager:
    def __init__(self):
        # Mapping of user_id -> list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str = "global"):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str = "global"):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: Dict, user_id: str):
        if user_id in self.active_connections:
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    self.disconnect(connection, user_id)

    async def broadcast(self, message: Dict):
        for user_id in list(self.active_connections.keys()):
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    self.disconnect(connection, user_id)


manager = ConnectionManager()


# ----------------------------
# Core prediction logic
# ----------------------------


def explain(v: VitalsPayload) -> str:
    high_risk_reasons = []
    if v.systolic and v.systolic >= 140:
        high_risk_reasons.append("Elevated systolic BP")
    if v.diastolic and v.diastolic >= 90:
        high_risk_reasons.append("Elevated diastolic BP")
    if v.heart_rate and v.heart_rate >= 100:
        high_risk_reasons.append("High heart rate")
    if v.cholesterol and v.cholesterol >= 240:
        high_risk_reasons.append("High cholesterol")
    if v.triglycerides and v.triglycerides >= 200:
        high_risk_reasons.append("High triglycerides")
    if v.bmi and v.bmi >= 30:
        high_risk_reasons.append("Obesity (BMI >= 30)")
    if v.diabetes == 1:
        high_risk_reasons.append("Known diabetes")
    if v.smoking == 1:
        high_risk_reasons.append("Smoking reported")
    if v.stress_level and v.stress_level >= 7:
        high_risk_reasons.append("High stress")

    if not high_risk_reasons:
        return "Vitals within stable ranges based on trained feature set."
    return "; ".join(high_risk_reasons)


def predict(vitals: VitalsPayload) -> PredictResponse:
    if load_error:
        raise HTTPException(status_code=500, detail=f"Model unavailable: {load_error}")
    df = vitals.to_frame()
    prob = float(model.predict_proba(df)[0][1])
    label = int(model.predict(df)[0])
    risk_score = round(prob * 100, 2)

    if risk_score >= settings.risk_critical_threshold:
        status = "critical"
    elif risk_score >= settings.risk_warning_threshold:
        status = "warning"
    else:
        status = "safe"

    explanation = explain(vitals)

    return PredictResponse(
        risk_score=risk_score,
        status=status,
        prediction=label,
        explanation=explanation,
        timestamp=datetime.datetime.utcnow(),
    )


# ----------------------------
# Routes
# ----------------------------


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "model_loaded": load_error is None,
        "model_path": settings.model_path,
    }


@app.post("/predict", response_model=PredictResponse)
async def predict_endpoint(payload: PredictRequest):
    result = predict(payload.vitals)

    record = {
        "timestamp": result.timestamp,
        "source": payload.source,
        "vitals": payload.vitals.model_dump(),
        "risk_score": result.risk_score,
        "status": result.status,
        "prediction": result.prediction,
        "explanation": result.explanation,
        "user_id": payload.user_id,
    }
    await persist("vitals", record)

    # Send to specific user room and broadcast to global for general dashboarding if needed
    await manager.send_personal_message({"type": "prediction", "data": record}, payload.user_id)
    if payload.user_id != "global":
        await manager.send_personal_message({"type": "prediction", "data": record}, "global")

    if result.prediction == 1 or result.risk_score >= settings.risk_critical_threshold:
        alert = {
            "timestamp": result.timestamp,
            "risk_score": result.risk_score,
            "status": result.status,
            "reason": result.explanation,
            "vitals": payload.vitals.model_dump(),
            "user_id": payload.user_id,
        }
        await persist("alerts", alert)
        await manager.send_personal_message({"type": "alert", "data": alert}, payload.user_id)
        if payload.user_id != "global":
            await manager.send_personal_message({"type": "alert", "data": alert}, "global")

    return result


@app.post("/vitals")
async def ingest_vitals(payload: VitalsPayload):
    result = predict(payload)
    record = {
        "timestamp": result.timestamp,
        "source": "smartwatch",
        "vitals": payload.model_dump(),
        "risk_score": result.risk_score,
        "status": result.status,
        "prediction": result.prediction,
        "explanation": result.explanation,
    }
    await persist("vitals", record)
    await manager.broadcast({"type": "prediction", "data": record})
    return record


@app.get("/vitals/recent")
async def recent_vitals(limit: int = 20):
    docs = await fetch_recent("vitals", limit)
    return {"items": docs}


@app.get("/alerts")
async def list_alerts(limit: int = 20):
    docs = await fetch_recent("alerts", limit)
    return {"items": docs}


@app.post("/alerts")
async def create_alert(data: Dict):
    data["timestamp"] = data.get("timestamp") or datetime.datetime.utcnow()
    await persist("alerts", data)
    await manager.broadcast({"type": "alert", "data": data})
    return data


@app.post("/users")
async def upsert_user(user: User):
    doc = user.model_dump()
    doc["timestamp"] = datetime.datetime.utcnow()
    await persist("users", doc)
    return doc


@app.post("/simulate/emergency")
async def simulate_emergency():
    emergency_vitals = VitalsPayload(
        age=65,
        sex=1,
        cholesterol=260,
        heart_rate=120,
        diabetes=1,
        smoking=1,
        obesity=1,
        alcohol_consumption=1,
        exercise_hours_per_week=0.5,
        previous_heart_problems=1,
        medication_use=1,
        stress_level=9,
        sedentary_hours_per_day=14,
        bmi=32,
        triglycerides=260,
        physical_activity_days_per_week=0,
        sleep_hours_per_day=4,
        systolic=180,
        diastolic=110,
        diet_average=0,
        diet_healthy=0,
        diet_unhealthy=1,
    )
    result = predict(emergency_vitals)
    record = {
        "timestamp": result.timestamp,
        "source": "demo",
        "vitals": emergency_vitals.model_dump(),
        "risk_score": result.risk_score,
        "status": result.status,
        "prediction": result.prediction,
        "explanation": result.explanation,
    }
    await persist("vitals", record)
    await persist("alerts", record)
    await manager.broadcast({"type": "alert", "data": record})
    return record


@app.websocket("/ws/vitals")
async def websocket_vitals(websocket: WebSocket):
    await manager.connect(websocket, "global")
    try:
        recent = await fetch_recent("vitals", limit=5)
        await websocket.send_json({"type": "bootstrap", "data": recent})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, "global")
    except Exception:
        manager.disconnect(websocket, "global")


@app.websocket("/ws/{user_id}")
async def websocket_user(websocket: WebSocket, user_id: str):
    """Real-time WebSocket for user-specific health events"""
    await manager.connect(websocket, user_id)
    try:
        # Send bootstrap data
        recent = await fetch_recent("vitals", limit=5)
        await websocket.send_json({"type": "bootstrap", "data": recent})
        
        # Keep connection alive and relay messages
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception:
        manager.disconnect(websocket, user_id)


# ----------------------------
# NEW: Auth & OTP Endpoints (internal logging)
# ----------------------------

class OTPLogRequest(BaseModel):
    phone: str
    otp: str


@app.post("/internal/log-otp")
async def log_otp(data: OTPLogRequest):
    """Internal endpoint called by Node.js backend to log OTP to terminal"""
    print(f"\n=============================")
    print(f"📱 OTP for {data.phone}: {data.otp}")
    print(f"=============================\n")
    return {"logged": True}


# ----------------------------
# NEW: Device Data Endpoint
# ----------------------------

class DeviceDataPayload(BaseModel):
    user_id: str
    device_type: str
    device_id: str
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    bp_sys: Optional[float] = None
    bp_dia: Optional[float] = None
    glucose: Optional[float] = None
    temperature: Optional[float] = None
    timestamp: Optional[str] = None


@app.post("/device/data")
async def receive_device_data(payload: DeviceDataPayload):
    """
    Receives vitals from smartwatch/device integration.
    Validates JWT in headers (handled by Node.js/Express before forwarding).
    Broadcasts to WebSocket as prediction_update event.
    """
    # Map device data to VitalsPayload for prediction
    vitals = VitalsPayload(
        heart_rate=payload.heart_rate,
        spo2=payload.spo2,
        systolic=payload.bp_sys,
        diastolic=payload.bp_dia,
        # Other fields from device may be sparse; they'll use FALLBACKS
    )
    
    result = predict(vitals)
    
    event = {
        "type": "prediction_update",
        "user_id": payload.user_id,
        "risk_score": result.risk_score,
        "confidence": float(model.predict_proba(vitals.to_frame())[0][1]),
        "explanation": result.explanation,
        "time_to_risk": "Real-time monitoring",
        "vitals": {
            "heart_rate": payload.heart_rate,
            "spo2": payload.spo2,
            "bp_sys": payload.bp_sys,
            "bp_dia": payload.bp_dia,
            "glucose": payload.glucose,
            "temperature": payload.temperature,
        },
        "timestamp": payload.timestamp or datetime.datetime.utcnow().isoformat(),
    }
    
    # Send to specific user
    await manager.send_personal_message(event, payload.user_id)
    await manager.send_personal_message(event, "global")
    
    # Persist
    record = {
        "timestamp": datetime.datetime.utcnow(),
        "source": "device",
        "device_type": payload.device_type,
        "user_id": payload.user_id,
        "vitals": payload.model_dump(),
        "risk_score": result.risk_score,
        "status": result.status,
    }
    await persist("vitals", record)
    
    return event


# Convenience root
@app.get("/")
async def root():
    return {"message": "Arogya Link API running", "model_loaded": load_error is None}
