import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { User, Calendar, Heart, Activity, Cigarette, Droplet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import logo from "../../assets/957091c27de9b13a059e6413b82cdb1f734cc79a.png";

export default function Registration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    diabetes: false,
    smoking: false,
    heartProblem: false,
    stressLevel: [5],
    bmi: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save to localStorage for demo
    localStorage.setItem('workerData', JSON.stringify(formData));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4 overflow-auto">
      <div className="max-w-lg mx-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-8 border border-blue-100"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4">
              <img src={logo} alt="Arogya Link Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Worker Registration
            </h1>
            <p className="text-gray-500 text-sm">Basic Health Setup</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-12 border-gray-200 focus:border-blue-500 rounded-xl"
                required
              />
            </div>

            {/* Age */}
            <div className="space-y-2">
              <Label htmlFor="age" className="text-gray-700">Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="Enter your age"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="h-12 border-gray-200 focus:border-blue-500 rounded-xl"
                required
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label className="text-gray-700">Gender</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Male' })}
                  className={`flex-1 h-12 rounded-xl border-2 transition-all ${
                    formData.gender === 'Male'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Female' })}
                  className={`flex-1 h-12 rounded-xl border-2 transition-all ${
                    formData.gender === 'Female'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>

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
                    onCheckedChange={(checked) => setFormData({ ...formData, diabetes: checked })}
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
                    onCheckedChange={(checked) => setFormData({ ...formData, smoking: checked })}
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
                    onCheckedChange={(checked) => setFormData({ ...formData, heartProblem: checked })}
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
                onValueChange={(value) => setFormData({ ...formData, stressLevel: value })}
                min={1}
                max={10}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Low Stress</span>
                <span>High Stress</span>
              </div>
            </div>

            {/* BMI */}
            <div className="space-y-2">
              <Label htmlFor="bmi" className="text-gray-700">BMI (Body Mass Index)</Label>
              <Input
                id="bmi"
                type="number"
                step="0.1"
                placeholder="Enter your BMI"
                value={formData.bmi}
                onChange={(e) => setFormData({ ...formData, bmi: e.target.value })}
                className="h-12 border-gray-200 focus:border-blue-500 rounded-xl"
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-lg shadow-green-200 transition-all duration-300 mt-8"
            >
              <Activity className="w-5 h-5 mr-2" />
              Start Monitoring
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 text-sm hover:text-gray-800 transition-colors"
            >
              ← Back to Login
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}