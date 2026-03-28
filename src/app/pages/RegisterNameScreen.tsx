// src/app/pages/RegisterNameScreen.tsx - Name input for new Indian users
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { User, Loader, AlertCircle, ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import logo from "../../assets/957091c27de9b13a059e6413b82cdb1f734cc79a.png";
import useHealthStore from '../store/useHealthStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function RegisterNameScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  const phone = state?.phone as string | undefined;

  const restoreSession = useHealthStore((s) => s.restoreSession);

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if no phone
  useEffect(() => {
    if (!phone) navigate('/');
  }, [phone, navigate]);

  // Format phone for display: +91 XXXXX XXXXX
  const displayPhone = phone
    ? phone.replace('+91', '').replace(/(\d{5})(\d{5})/, '+91 $1 $2')
    : '';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || name.trim().length < 2) {
      setError('कृपया अपना पूरा नाम दर्ज करें · Please enter your full name (min. 2 chars)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Store token in localStorage + Zustand
      localStorage.setItem('jwt_token', data.token);
      restoreSession(data.user, data.token);

      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Network error. Make sure backend is running on port 3001');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-orange-100">

          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-orange-500 hover:text-orange-600 mb-5 font-medium text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            वापस · Back
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center"
            >
              <User className="w-8 h-8 text-green-600" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">अपना नाम बताएं</h1>
            <p className="text-sm font-medium text-gray-500">Complete Your Profile</p>
            <p className="text-gray-400 text-xs mt-2">
              Registering as <span className="font-semibold text-gray-600">{displayPhone}</span>
            </p>
          </div>

          {/* Name Form */}
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-medium">
                पूरा नाम · Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g. Raj Kumar Sharma"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                className="h-12 border-gray-200 focus:border-orange-400 rounded-xl text-base"
                autoFocus
                required
              />
              <p className="text-xs text-gray-400">
                यही नाम आपके डैशबोर्ड पर दिखेगा · This name will appear on your dashboard
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2 items-start"
              >
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-lg shadow-green-200 transition-all duration-300 disabled:opacity-50 font-semibold text-base"
              disabled={loading || name.trim().length < 2}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  खाता बना रहे हैं...
                </>
              ) : (
                'शुरू करें · Get Started'
              )}
            </Button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-6">
            🔒 आपकी जानकारी सुरक्षित है · Your information is encrypted 🇮🇳
          </p>
        </div>
      </motion.div>
    </div>
  );
}
