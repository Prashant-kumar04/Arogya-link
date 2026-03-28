// src/app/pages/OTPVerificationScreen.tsx - OTP input and verification (India +91)
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { ShieldCheck, Loader, AlertCircle, ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import logo from "../../assets/957091c27de9b13a059e6413b82cdb1f734cc79a.png";
import useHealthStore from '../store/useHealthStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function OTPVerificationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  const phone = state?.phone as string | undefined;

  const restoreSession = useHealthStore((s) => s.restoreSession);
  const setToken = useHealthStore((s) => s.setToken);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(30);

  // Redirect if no phone
  useEffect(() => {
    if (!phone) navigate('/');
  }, [phone, navigate]);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Format the displayed phone: +91 XXXXX XXXXX
  const displayPhone = phone
    ? phone.replace('+91', '').replace(/(\d{5})(\d{5})/, '+91 $1 $2')
    : '';

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError('कृपया 6 अंकों का OTP दर्ज करें · Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) setError('गलत OTP है · Invalid OTP. Please try again.');
        else if (res.status === 410) setError('OTP की समय सीमा समाप्त · OTP expired. Resend a new one.');
        else setError(data.error || 'Verification failed');
        return;
      }

      if (!data.exists) {
        // New user → collect name
        navigate('/register-name', { state: { phone } });
      } else {
        // Existing user → log in
        localStorage.setItem('jwt_token', data.token);
        restoreSession(data.user, data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Make sure backend is running on port 3001');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to resend OTP');
        return;
      }
      setResendCountdown(30);
      setOtp('');
    } catch (err) {
      setError('Network error');
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
              className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-2xl flex items-center justify-center"
            >
              <ShieldCheck className="w-8 h-8 text-orange-500" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">OTP सत्यापित करें</h1>
            <p className="text-sm font-medium text-gray-600">Verify OTP</p>
            <p className="text-gray-400 text-sm mt-2">
              Code sent to <span className="font-semibold text-gray-700">{displayPhone}</span>
            </p>
          </div>

          {/* OTP Form */}
          <form onSubmit={handleVerifyOTP} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-gray-700 font-medium">
                6-Digit OTP
              </Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                maxLength={6}
                className="h-14 text-center text-2xl tracking-[0.5em] border-gray-200 focus:border-orange-400 rounded-xl font-mono"
              />
              <p className="text-[10px] text-gray-400 font-medium">
                🔢 OTP admin से प्राप्त करें · Get your OTP from the admin
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
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg shadow-orange-200 transition-all duration-300 disabled:opacity-50 font-semibold"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  सत्यापित हो रहा है...
                </>
              ) : (
                'सत्यापित करें · Verify OTP'
              )}
            </Button>
          </form>

          {/* Resend */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm mb-2">OTP नहीं मिला? · Didn't receive it?</p>
            <button
              onClick={handleResendOTP}
              disabled={resendCountdown > 0 || loading}
              className="text-orange-500 hover:text-orange-600 font-semibold text-sm disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {resendCountdown > 0 ? `${resendCountdown}s बाद दोबारा भेजें · Resend in ${resendCountdown}s` : 'OTP दोबारा भेजें · Resend OTP'}
            </button>
          </div>

          <p className="text-center text-gray-400 text-xs mt-5">
            🔒 Secured by Arogya Link · Made in India 🇮🇳
          </p>
        </div>
      </motion.div>
    </div>
  );
}
