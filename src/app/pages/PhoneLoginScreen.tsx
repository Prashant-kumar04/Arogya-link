// src/app/pages/PhoneLoginScreen.tsx - Indian phone login with fixed +91 prefix
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Loader, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import logo from "../../assets/957091c27de9b13a059e6413b82cdb1f734cc79a.png";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const INDIA_PREFIX = '+91';

export default function PhoneLoginScreen() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(''); // only the 10 digits after +91
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Full phone number always has +91 prefix
  const fullPhone = `${INDIA_PREFIX}${digits}`;

  const handleDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, max 10
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setDigits(val);
    setError('');
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate: exactly 10 digits, starts with 6-9 (Indian mobile)
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError('Indian mobile numbers start with 6, 7, 8, or 9');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(`Too many attempts. Retry in ${data.retryAfter}s`);
        } else {
          setError(data.error || 'Failed to send OTP');
        }
        return;
      }

      navigate('/verify-otp', { state: { phone: fullPhone } });
    } catch (err) {
      console.error(err);
      setError('Network error. Make sure backend server is running on port 3001');
    } finally {
      setLoading(false);
    }
  };

  const isValid = digits.length === 10 && /^[6-9]/.test(digits);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-orange-100">

          {/* Logo & Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-24 h-24 mx-auto mb-4"
            >
              <img src={logo} alt="Arogya Link Logo" className="w-full h-full object-contain" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Arogya Link</h1>
            <p className="text-gray-500 text-sm">AI-Powered Health Monitoring System</p>
            {/* Indian flag accent */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-lg">🇮🇳</span>
              <span className="text-xs text-gray-400 font-medium">Made for India</span>
            </div>
          </div>

          {/* Phone Form */}
          <form onSubmit={handleSendOTP} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700 font-medium">
                Mobile Number
              </Label>

              {/* Fixed +91 + 10-digit input */}
              <div className="flex h-13 rounded-xl border border-gray-200 overflow-hidden focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
                {/* +91 prefix badge */}
                <div className="flex items-center gap-2 px-3 bg-orange-50 border-r border-gray-200 flex-shrink-0">
                  <span className="text-base">🇮🇳</span>
                  <span className="text-gray-700 font-semibold text-sm">+91</span>
                </div>

                {/* Number input */}
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="9876543210"
                  value={digits}
                  onChange={handleDigitsChange}
                  maxLength={10}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 rounded-none flex-1 text-base tracking-wide"
                  required
                  autoComplete="tel-national"
                />
              </div>

              {/* Character count hint */}
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400">
                  Enter your 10-digit Indian mobile number
                </p>
                <span className={`text-xs font-medium ${digits.length === 10 ? 'text-green-500' : 'text-gray-400'}`}>
                  {digits.length}/10
                </span>
              </div>
            </div>

            {/* Error */}
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

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg shadow-orange-200 transition-all duration-300 disabled:opacity-50 font-semibold text-base"
              disabled={loading || !isValid}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  भेज रहे हैं OTP...
                </>
              ) : (
                'OTP भेजें / Send OTP'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center mt-6 space-y-1">
            <p className="text-gray-400 text-xs">
              🔒 आपका नंबर सुरक्षित है · Your number is secure
            </p>
            <p className="text-gray-400 text-xs">
              Protecting worker health with AI technology
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
