// src/app/components/dashboard/HomeScreen.tsx - AI Health Dashboard with real-time vitals and AI insights
import React, { useState, useCallback, useMemo } from "react";
import AreYouOkModal from '../AreYouOkModal';
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Activity, Heart, TrendingUp, Watch, Wifi, WifiOff, Zap, Siren,
  Wind, Thermometer, Gauge, Move, Building2, CheckCircle2, AlertCircle, AlertTriangle
} from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { predictVitals, simulateEmergency, VitalsPayload } from "../../services/api";
import { useHealth } from "../../context/HealthContext";
import { useHealthRealtime } from "../../hooks/useHealthRealtime";
import useHealthStore from "../../store/useHealthStore";

type StatusLabel = "safe" | "warning" | "critical";

export default function HomeScreen() {
  const navigate = useNavigate();
  const user = useHealthStore((state) => state.user);
  const {
    health,
    updateVitals: contextUpdateVitals,
    updateRiskScore,
    updateStatus,
    updateExplanation,
    addChartPoint
  } = useHealth();

  const { isConnected, pendingConfirmCheck, confirmCheckCountdown, respondToConfirmCheck } = useHealthRealtime(user?.id);

  const [editVitals, setEditVitals] = useState<VitalsPayload>({});
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [showOkModal, setShowOkModal] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [inputError, setInputError] = useState('');

  // Standardized URL for simulation terminals, assumes Node.js server acts as gateway on port 3001
  const gatewayUrl = window.location.origin.replace(':5173', ':3001');
  const simulationCommand = `python backend/simulate_user.py --user-id ${user?.id || 'guest'} --url ${gatewayUrl}`;

  const healthStatus = useMemo(() => {
    if (health?.status === "critical") return "HEALTH RISK";
    if (health?.status === "warning") return "FATIGUE";
    return "SAFE";
  }, [health?.status]);

  const statusColor = useMemo(() => {
    switch (health?.status) {
      case "critical": return "bg-gradient-to-r from-red-500 to-red-600 shadow-red-200";
      case "warning": return "bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-yellow-200";
      default: return "bg-gradient-to-r from-green-500 to-green-600 shadow-green-200";
    }
  }, [health?.status]);

  const fillRandomData = () => {
    const data: VitalsPayload = {
      age: Math.floor(Math.random() * (60 - 20) + 20),
      sex: Math.random() > 0.5 ? 1 : 0,
      cholesterol: Math.floor(Math.random() * (300 - 150) + 150),
      heart_rate: Math.floor(Math.random() * (100 - 60) + 60),
      diabetes: Math.random() > 0.8 ? 1 : 0,
      smoking: Math.random() > 0.7 ? 1 : 0,
      obesity: Math.random() > 0.8 ? 1 : 0,
      alcohol_consumption: Math.floor(Math.random() * 5),
      exercise_hours_per_week: Math.floor(Math.random() * 10),
      previous_heart_problems: Math.random() > 0.9 ? 1 : 0,
      stress_level: Math.floor(Math.random() * 10) + 1,
      sedentary_hours_per_day: Math.floor(Math.random() * 12),
      systolic: Math.floor(Math.random() * (140 - 110) + 110),
      diastolic: Math.floor(Math.random() * (90 - 70) + 70),
      sleep_hours_per_day: Math.floor(Math.random() * (9 - 5) + 5),
      physical_activity_days_per_week: Math.floor(Math.random() * 7),
    };
    setEditVitals(data);
  };

  const handlePredict = useCallback(async (source: "manual" | "smartwatch" | "demo" = "manual") => {
    setInputError('');

    setLoading(true);
    try {
      const res = await predictVitals(editVitals, source);
      updateRiskScore(res.risk_score);
      updateStatus(res.status as StatusLabel);
      updateExplanation(res.explanation);
      contextUpdateVitals(editVitals);

      if (editVitals.heart_rate && editVitals.systolic) {
        addChartPoint(editVitals.heart_rate, editVitals.systolic);
      }

      // Show "Are You OK?" modal when risk is detected
      if (res.status === 'warning' || res.status === 'critical') {
        setShowOkModal(true);
      }
    } catch (err) {
      console.error("Prediction failed", err);
      updateExplanation("AI analysis failed. Ensure the AI backend is running on port 8000.");
      updateStatus("warning");
    } finally {
      setLoading(false);
    }
  }, [editVitals, contextUpdateVitals, updateRiskScore, updateStatus, updateExplanation, addChartPoint]);

  const handleSimulateAction = useCallback(async () => {
    setSimulating(true);
    try {
      const res = await simulateEmergency();
      updateRiskScore(res.risk_score);
      updateStatus(res.status as StatusLabel);
      updateExplanation(res.explanation);
      addChartPoint(res.vitals?.heart_rate ?? 120, res.vitals?.systolic ?? 180);
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setSimulating(false);
    }
  }, [updateRiskScore, updateStatus, updateExplanation, addChartPoint]);

  const updateEditVitals = useCallback((key: keyof VitalsPayload, value: any) => {
    setEditVitals((prev) => ({ ...prev, [key]: value }));
  }, []);

  const hasData = health?.risk_score !== null && health?.status !== null;

  return (
    <>
      <AreYouOkModal
        open={showOkModal}
        riskScore={health?.risk_score ?? undefined}
        status={health?.status ?? undefined}
        onClose={() => setShowOkModal(false)}
      />
      <div className="max-w-lg mx-auto p-4 space-y-6 pb-20">
        {/* Welcome */}
        <div className="pt-4">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Hello, <span className="text-blue-600">{user?.name || 'Guest'}</span> 👋
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Real-time monitoring active
              </span>
            ) : (
              'Enter vitals below for AI analysis'
            )}
          </p>
        </div>

        {/* Device Status Card */}
        <Card className="p-4 border border-blue-100 shadow-sm overflow-hidden relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Watch className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Device Status</p>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-800">Smartwatch Link</h3>
                  <button
                    onClick={() => setShowQr(!showQr)}
                    className="p-1 hover:bg-gray-100 rounded text-blue-600 transition-colors"
                  >
                    <Wifi className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            {isConnected ? (
              <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full">
                <Wifi className="w-3.5 h-3.5 text-green-600" />
                <span className="text-[10px] font-bold text-green-700 uppercase">Live Stream Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full">
                <WifiOff className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-500 uppercase">Waiting for Device...</span>
              </div>
            )}
          </div>

          {showQr && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center"
            >
              <div className="bg-white p-2 rounded-lg shadow-sm mb-3">
                <img
                  src={`https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(JSON.stringify({ userId: user?.id, api: window.location.origin }))}&chs=160x160&chld=L|0`}
                  alt="Connection QR"
                  className="w-32 h-32"
                />
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Scan to connect terminal user</p>
              <code className="text-[10px] bg-white p-2 border rounded-lg w-full break-all text-blue-600">
                {simulationCommand}
              </code>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(simulationCommand);
                  alert("Command copied to clipboard!");
                }}
                className="mt-2 h-7 text-[10px] bg-white text-gray-600 border hover:bg-gray-50"
              >
                Copy Command
              </Button>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handlePredict('smartwatch')}
              className="h-10 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-xl font-bold text-sm"
            >
              <Zap className="w-4 h-4 mr-2" />
              Quick Check
            </Button>
            <Button
              onClick={handleSimulateAction}
              className="h-10 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl font-bold text-sm"
            >
              <Siren className="w-4 h-4 mr-2" />
              Test Alert
            </Button>
          </div>
        </Card>

        {/* Health Status Card */}
        {hasData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-[2rem] p-7 shadow-2xl text-white ${statusColor} relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Activity className="w-24 h-24" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Global Status</span>
                </div>
                <h2 className="text-4xl font-black tracking-tight">{healthStatus}</h2>
                <p className="text-sm font-medium text-white/90 max-w-[200px] leading-snug pt-2">{health?.explanation}</p>
              </div>
              <div className="text-right">
                <p className="text-6xl font-black mb-0 leading-none">{health?.risk_score?.toFixed(1) ?? "--"}</p>
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-80 mt-1">AI Risk Score</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* AI Insights Section */}
        {hasData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5 border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-white shadow-sm rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-purple-600 fill-purple-600" />
                <h3 className="font-bold text-purple-900">AI Health Insights</h3>
              </div>
              <div className="flex gap-3 items-start">
                {health?.status === 'safe' && (
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                )}
                {health?.status === 'warning' && (
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                )}
                {health?.status === 'critical' && (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <p className="text-gray-700 text-sm font-medium leading-relaxed">
                  {health?.status === 'safe' && "All vitals look good. Continue with regular hydration, exercise, and sleep."}
                  {health?.status === 'warning' && "Signs of elevated stress detected. Take a 10-minute break and practice deep breathing."}
                  {health?.status === 'critical' && "Critical pattern detected. Stop activity immediately and inform your emergency contacts."}
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Vitals Grid Display */}
        {hasData && (
          <div className="grid grid-cols-2 gap-3">
            <VitalCard
              label="Heart Rate"
              value={health?.vitals?.heart_rate}
              unit="BPM"
              icon={<Heart className="w-4 h-4 text-red-500" />}
              live={isConnected}
            />
            <VitalCard
              label="BP (Sys/Dia)"
              value={health?.vitals?.systolic ? `${health.vitals.systolic}/${health.vitals.diastolic || '--'}` : undefined}
              unit="mmHg"
              icon={<Activity className="w-4 h-4 text-blue-500" />}
              live={isConnected}
            />
            <VitalCard
              label="SpO2/Oxygen"
              value={health?.vitals?.diabetes === 1 ? '98' : '99'} // Placeholder mockup logic
              unit="%"
              icon={<Wind className="w-4 h-4 text-cyan-500" />}
              live={isConnected}
            />
            <VitalCard
              label="Stress Level"
              value={health?.vitals?.stress_level}
              unit="/10"
              icon={<Gauge className="w-4 h-4 text-purple-500" />}
              live={isConnected}
            />
            <VitalCard
              label="Heart History"
              value={health?.vitals?.previous_heart_problems === 1 ? 'High' : 'Normal'}
              unit=""
              icon={<AlertCircle className="w-4 h-4 text-orange-500" />}
            />
            <VitalCard
              label="BMI"
              value={health?.vitals?.bmi}
              unit="kg/m²"
              icon={<Move className="w-4 h-4 text-indigo-500" />}
            />
            <VitalCard
              label="Sedentary"
              value={health?.vitals?.sedentary_hours_per_day}
              unit="hrs/d"
              icon={<Building2 className="w-4 h-4 text-gray-500" />}
            />
            <VitalCard
              label="Exercise"
              value={health?.vitals?.exercise_hours_per_week}
              unit="hrs/wk"
              icon={<TrendingUp className="w-4 h-4 text-green-500" />}
            />
          </div>
        )}

        {/* Manual Input Card */}
        <Card className="p-5 border border-purple-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Manual Vitals Input</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100">AI CALIBRATED</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Field label="Age" value={editVitals.age} onChange={(v) => updateEditVitals("age", v)} />
            <Field label="Heart Rate (BPM)" value={editVitals.heart_rate} onChange={(v) => updateEditVitals("heart_rate", v)} />
            <Field label="Systolic BP" value={editVitals.systolic} onChange={(v) => updateEditVitals("systolic", v)} />
            <Field label="Diastolic BP" value={editVitals.diastolic} onChange={(v) => updateEditVitals("diastolic", v)} />

            <Field label="Cholesterol (mg/dL)" value={editVitals.cholesterol} onChange={(v) => updateEditVitals("cholesterol", v)} />
            <Field label="Triglycerides" value={editVitals.triglycerides} onChange={(v) => updateEditVitals("triglycerides", v)} />
            <Field label="BMI" value={editVitals.bmi} onChange={(v) => updateEditVitals("bmi", v)} />
            <Field label="Stress Level (1-10)" value={editVitals.stress_level} onChange={(v) => updateEditVitals("stress_level", v)} />

            <Field label="Sleep (hrs/day)" value={editVitals.sleep_hours_per_day} onChange={(v) => updateEditVitals("sleep_hours_per_day", v)} />
            <Field label="Exercise (hrs/wk)" value={editVitals.exercise_hours_per_week} onChange={(v) => updateEditVitals("exercise_hours_per_week", v)} />
            <Field label="Sedentary (hrs/day)" value={editVitals.sedentary_hours_per_day} onChange={(v) => updateEditVitals("sedentary_hours_per_day", v)} />
            <Field label="Activity (days/wk)" value={editVitals.physical_activity_days_per_week} onChange={(v) => updateEditVitals("physical_activity_days_per_week", v)} />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
            <ToggleField label="Diabetes" value={editVitals.diabetes} onChange={(v) => updateEditVitals("diabetes", v)} />
            <ToggleField label="Smoking" value={editVitals.smoking} onChange={(v) => updateEditVitals("smoking", v)} />
            <ToggleField label="Obesity" value={editVitals.obesity} onChange={(v) => updateEditVitals("obesity", v)} />
            <ToggleField label="Heart History" value={editVitals.previous_heart_problems} onChange={(v) => updateEditVitals("previous_heart_problems", v)} />
          </div>

          <div className="mt-8 space-y-3">
            <Button
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
              onClick={() => handlePredict("manual")}
              disabled={loading}
            >
              {loading ? "AI is Analyzing..." : "Run AI Health Assessment"}
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 border-dashed border-gray-300 text-gray-500 rounded-xl font-medium hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-all"
              onClick={fillRandomData}
            >
              🎲 Fill with Random Data
            </Button>
            {inputError && (
              <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl p-3 border border-red-200">
                {inputError}
              </p>
            )}
          </div>
        </Card>

        {/* Chart */}
        {
          health?.chartData && health.chartData.length > 0 && (
            <Card className="p-5 border border-blue-50 bg-white shadow-sm rounded-2xl overflow-hidden">
              <p className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Vitals Trendline
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={health.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={9} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={9} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="heartRate"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorHr)"
                    strokeWidth={3}
                    name="Heart Rate"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="bp"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorBp)"
                    strokeWidth={3}
                    name="Systolic BP"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )
        }
      </div >
    </>
  );
}

function VitalCard({ label, value, unit, icon, live }: { label: string; value?: number | string | null; unit: string; icon: React.ReactNode; live?: boolean }) {
  const displayValue = value === undefined || value === null || value === '' ? '--' : value;

  return (
    <Card className="p-4 border border-gray-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="p-1.5 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
          {icon}
        </div>
        {live && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[8px] font-black text-green-600 uppercase">Live</span>
          </div>
        )}
      </div>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <p className="text-xl font-black text-gray-800">{displayValue}</p>
        <span className="text-[10px] font-bold text-gray-400">{unit}</span>
      </div>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value?: number | string | null; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl text-sm h-10 border-gray-200 focus:border-blue-400 focus:ring-blue-100"
        placeholder="--"
      />
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value?: number | null; onChange: (v: number) => void }) {
  const isYes = value === 1;
  const isNo = value === 0;

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">{label}</Label>
      <div className="flex bg-gray-100 p-1 rounded-xl gap-1 h-10">
        <button
          onClick={() => onChange(1)}
          className={`flex-1 rounded-lg text-xs font-bold transition-all ${isYes ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Yes
        </button>
        <button
          onClick={() => onChange(0)}
          className={`flex-1 rounded-lg text-xs font-bold transition-all ${isNo ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          No
        </button>
      </div>
    </div>
  );
}