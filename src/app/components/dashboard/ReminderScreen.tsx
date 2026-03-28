import { useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Plus, Trash2, Pill, Coffee, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

interface Reminder {
  id: number;
  type: 'medicine' | 'rest';
  title: string;
  time: string;
  enabled: boolean;
}

const REMINDERS_KEY = 'health_reminders';

const defaultReminders: Reminder[] = [
  { id: 1, type: 'medicine', title: 'Blood Pressure Medicine', time: '08:00', enabled: true },
  { id: 2, type: 'rest', title: 'Take a Break', time: '12:00', enabled: true },
  { id: 3, type: 'medicine', title: 'Vitamin Supplement', time: '20:00', enabled: false },
];

export default function ReminderScreen() {
  const [reminders, setRemindersState] = useState<Reminder[]>(() => {
    try {
      const saved = localStorage.getItem(REMINDERS_KEY);
      return saved ? JSON.parse(saved) : defaultReminders;
    } catch {
      return defaultReminders;
    }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newType, setNewType] = useState<'medicine' | 'rest'>('medicine');

  // Persist to localStorage on every mutation
  const setReminders = (updated: Reminder[]) => {
    setRemindersState(updated);
    try {
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save reminders:', err);
    }
  };

  const addReminder = () => {
    if (newTitle && newTime) {
      setReminders([...reminders, {
        id: Date.now(),
        type: newType,
        title: newTitle,
        time: newTime,
        enabled: true
      }]);
      setNewTitle('');
      setNewTime('');
      setShowAdd(false);
    }
  };

  const toggleReminder = (id: number) => {
    setReminders(reminders.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const deleteReminder = (id: number) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-3xl font-bold text-gray-800">Reminders</h1>
        <p className="text-gray-500 text-sm">Medicine & rest notifications</p>
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-5 shadow-lg text-white"
      >
        <div className="flex items-start gap-3">
          <Bell className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold mb-1">Smart Reminders</h3>
            <p className="text-sm opacity-90">
              Set up medicine and rest reminders. Get notifications at scheduled times to maintain your health routine.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800">Active Reminders</h3>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Reminder
        </Button>
      </div>

      {/* Add Reminder Form */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white rounded-2xl p-5 shadow-lg border border-blue-100"
        >
          <h4 className="font-semibold text-gray-800 mb-4">New Reminder</h4>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setNewType('medicine')}
                  className={`flex-1 py-2 px-4 rounded-xl border-2 transition-all ${newType === 'medicine'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-200 text-gray-600'
                    }`}
                >
                  <Pill className="w-4 h-4 inline mr-2" />
                  Medicine
                </button>
                <button
                  onClick={() => setNewType('rest')}
                  className={`flex-1 py-2 px-4 rounded-xl border-2 transition-all ${newType === 'rest'
                      ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                      : 'border-gray-200 text-gray-600'
                    }`}
                >
                  <Coffee className="w-4 h-4 inline mr-2" />
                  Rest
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Take blood pressure medicine"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="mt-1 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={addReminder}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl"
              >
                Add Reminder
              </Button>
              <Button
                onClick={() => {
                  setShowAdd(false);
                  setNewTitle('');
                  setNewTime('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Reminders List */}
      <div className="space-y-3">
        {reminders.map((reminder, index) => (
          <motion.div
            key={reminder.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-white rounded-2xl p-4 shadow-lg border ${reminder.enabled ? 'border-blue-100' : 'border-gray-100 opacity-60'
              }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${reminder.type === 'medicine' ? 'bg-blue-100' : 'bg-green-100'
                } rounded-xl flex items-center justify-center flex-shrink-0`}>
                {reminder.type === 'medicine' ? (
                  <Pill className={`w-6 h-6 ${reminder.type === 'medicine' ? 'text-blue-600' : 'text-green-600'}`} />
                ) : (
                  <Coffee className="w-6 h-6 text-green-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 truncate">{reminder.title}</h4>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {reminder.time}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={reminder.enabled}
                  onCheckedChange={() => toggleReminder(reminder.id)}
                />
                <button
                  onClick={() => deleteReminder(reminder.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-50 rounded-2xl p-4 border border-blue-100"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Push Notifications</span>
          </div>
          <Switch defaultChecked />
        </div>
        <p className="text-sm text-gray-600">
          Enable push notifications to receive reminders on time
        </p>
      </motion.div>
    </div>
  );
}
