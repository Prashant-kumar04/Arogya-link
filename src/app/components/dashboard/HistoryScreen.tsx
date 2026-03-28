import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, TrendingUp, Heart, Activity, Clock, Bell, AlertTriangle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useHealth } from '../../context/HealthContext';
import useHealthStore from '../../store/useHealthStore';
import { fetchNotifications, markNotificationsAsRead } from '../../services/api';

export default function HistoryScreen() {
  const { health } = useHealth();
  const { notifications, setNotifications, markNotificationsAsRead: storeMarkAsRead } = useHealthStore();
  const [loading, setLoading] = useState(false);
  const chartData = health?.chartData ?? [];
  const hasHistory = chartData.length > 0;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      await markNotificationsAsRead(unreadIds);
      storeMarkAsRead(unreadIds);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-8 pb-10">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-3xl font-bold text-gray-800">Health Ledger</h1>
        <p className="text-gray-500 text-sm">Trends, alerts, and notifications</p>
      </div>

      {/* Notifications Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-500" />
            Alerts & Notifications
          </h3>
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAsRead}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1 rounded-full transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            <AnimatePresence>
              {notifications.map((notif, idx) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-2xl border transition-all ${notif.type === 'emergency'
                      ? 'bg-red-50 border-red-100'
                      : 'bg-white border-gray-100'
                    } ${!notif.is_read ? 'ring-2 ring-purple-400 ring-offset-2' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.type === 'emergency' ? 'bg-red-200' : 'bg-gray-100'
                      }`}>
                      {notif.type === 'emergency' ? (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Bell className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${notif.type === 'emergency' ? 'text-red-900' : 'text-gray-800'}`}>
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5" />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
            <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">Clear as a bell!</p>
            <p className="text-xs text-gray-400 mt-1">No recent alerts or messages.</p>
          </div>
        )}
      </div>

      <div className="h-px bg-gray-100 w-full" />

      {/* Vitals Trend Section */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Health Trends
        </h3>

        {hasHistory ? (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-5 shadow-lg border border-blue-100"
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="heartRate"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', r: 4 }}
                    name="Pulse"
                  />
                  <Line
                    type="monotone"
                    dataKey="bp"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="BP"
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            <div className="space-y-3 mt-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Recent Data Points</h4>
              {[...chartData].reverse().slice(0, 5).map((record, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-blue-500 rounded-full" />
                    <div>
                      <p className="text-sm font-bold text-gray-800">{record.heartRate} <span className="text-[10px] font-normal text-gray-500">BPM</span></p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase">{record.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">{record.bp} <span className="text-[10px] font-normal text-gray-500">mmHg</span></p>
                    <p className="text-[10px] text-blue-500 font-bold">Stable</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 bg-blue-50 rounded-2xl border border-dashed border-blue-200 text-center">
            <Activity className="w-8 h-8 text-blue-300 mx-auto mb-2" />
            <p className="text-sm text-blue-600 font-medium">No readings yet</p>
            <p className="text-xs text-blue-400 mt-1">Submit vitals from the Home tab to see trends.</p>
          </div>
        )}
      </div>
    </div>
  );
}

