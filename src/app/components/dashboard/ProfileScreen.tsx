import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { User, UserCircle, Droplet, Cigarette, Heart, Activity, LogOut, Phone } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
// ✅ FIXED: Use Zustand store for real user
import useHealthStore from '../../store/useHealthStore';

interface ProfileFormData {
  age: string;
  gender: string;
  diabetes: boolean;
  smoking: boolean;
  heartProblem: boolean;
  stressLevel: number[];
  weight: string;
  height: string;
}

function calcBMI(weight: string, height: string): string {
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100; // cm to m
  if (!w || !h || h === 0) return '';
  return (w / (h * h)).toFixed(1);
}

export default function ProfileScreen() {
  const navigate = useNavigate();
  // ✅ Real user from Zustand
  const user = useHealthStore((state) => state.user);
  const logout = useHealthStore((state) => state.logout);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    age: '',
    gender: 'Male',
    diabetes: false,
    smoking: false,
    heartProblem: false,
    stressLevel: [5],
    weight: '',
    height: '',
  });

  // Load persisted health profile from localStorage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('health_profile');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    }
  }, []);

  const bmi = calcBMI(formData.weight, formData.height);

  const handleSave = () => {
    try {
      localStorage.setItem('health_profile', JSON.stringify(formData));
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  const handleLogout = () => {
    try {
      logout();
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('health_profile');
      localStorage.removeItem('last_vitals');
      // replace: true prevents Back button from returning to dashboard
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Failed to clear session:', err);
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6 pb-8">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-3xl font-bold text-gray-800">Profile</h1>
        <p className="text-gray-500 text-sm">Manage your health information</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 shadow-lg text-white"
      >
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
            <UserCircle className="w-12 h-12" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{user?.name || 'User'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Phone className="w-4 h-4 opacity-80" />
              <p className="text-sm opacity-90">{user?.phone || 'Not logged in'}</p>
            </div>
            {formData.age && (
              <div className="flex gap-4 mt-2">
                <span className="text-sm opacity-90">Age: {formData.age}</span>
                <span className="text-sm opacity-90">•</span>
                <span className="text-sm opacity-90">{formData.gender}</span>
                {bmi && <span className="text-sm opacity-90">• BMI: {bmi}</span>}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Edit Button */}
      <div className="flex gap-2">
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-12"
          >
            Edit Health Profile
          </Button>
        ) : (
          <>
            <Button
              onClick={handleSave}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl h-12"
            >
              Save Changes
            </Button>
            <Button
              onClick={() => setIsEditing(false)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl h-12"
            >
              Cancel
            </Button>
          </>
        )}
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 space-y-5">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-500" />
          Personal Information
        </h3>

        {/* Age */}
        <div className="space-y-2">
          <Label htmlFor="age" className="text-gray-700">Age</Label>
          <Input
            id="age"
            type="number"
            placeholder="Your age"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            disabled={!isEditing}
            className="rounded-xl"
          />
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <Label className="text-gray-700">Gender</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => isEditing && setFormData({ ...formData, gender: 'Male' })}
              disabled={!isEditing}
              className={`flex-1 h-12 rounded-xl border-2 transition-all ${formData.gender === 'Male'
                ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                : 'border-gray-200 text-gray-600'
                } ${!isEditing && 'opacity-60'}`}
            >
              Male
            </button>
            <button
              type="button"
              onClick={() => isEditing && setFormData({ ...formData, gender: 'Female' })}
              disabled={!isEditing}
              className={`flex-1 h-12 rounded-xl border-2 transition-all ${formData.gender === 'Female'
                ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                : 'border-gray-200 text-gray-600'
                } ${!isEditing && 'opacity-60'}`}
            >
              Female
            </button>
          </div>
        </div>

        {/* Weight & Height for BMI */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="weight" className="text-gray-700">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              placeholder="e.g. 70"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              disabled={!isEditing}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height" className="text-gray-700">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              placeholder="e.g. 175"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              disabled={!isEditing}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* BMI Display */}
        {bmi && (
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-sm text-gray-500">Calculated BMI</p>
            <p className="text-2xl font-bold text-blue-600">{bmi}</p>
            <p className="text-xs text-gray-400">
              {parseFloat(bmi) < 18.5 ? 'Underweight' :
                parseFloat(bmi) < 25 ? 'Normal' :
                  parseFloat(bmi) < 30 ? 'Overweight' : 'Obese'}
            </p>
          </div>
        )}
      </div>

      {/* Health Information */}
      <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 space-y-5">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-500" />
          Health Information
        </h3>

        {/* Medical History */}
        <div className="space-y-3">
          <Label className="text-gray-700">Medical History</Label>
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            {/* Diabetes */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Droplet className="w-5 h-5 text-blue-500" />
                <span className="text-gray-700">Diabetes</span>
              </div>
              <Switch
                checked={formData.diabetes}
                onCheckedChange={(checked) => isEditing && setFormData({ ...formData, diabetes: checked })}
                disabled={!isEditing}
              />
            </div>

            {/* Smoking */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cigarette className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">Smoking</span>
              </div>
              <Switch
                checked={formData.smoking}
                onCheckedChange={(checked) => isEditing && setFormData({ ...formData, smoking: checked })}
                disabled={!isEditing}
              />
            </div>

            {/* Heart Problem */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-red-500" />
                <span className="text-gray-700">Previous Heart Problem</span>
              </div>
              <Switch
                checked={formData.heartProblem}
                onCheckedChange={(checked) => isEditing && setFormData({ ...formData, heartProblem: checked })}
                disabled={!isEditing}
              />
            </div>
          </div>
        </div>

        {/* Stress Level */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-gray-700">Stress Level</Label>
            <span className="text-2xl font-bold text-blue-600">{formData.stressLevel[0]}</span>
          </div>
          <Slider
            value={formData.stressLevel}
            onValueChange={(value) => isEditing && setFormData({ ...formData, stressLevel: value })}
            min={1}
            max={10}
            step={1}
            disabled={!isEditing}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low Stress</span>
            <span>High Stress</span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleLogout}
          className="w-full h-12 bg-red-500 hover:bg-red-600 text-white rounded-xl"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </motion.div>
    </div>
  );
}
