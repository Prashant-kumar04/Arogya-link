import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, RefreshCw, Copy, CheckCircle2, Clock, LogOut, Phone, Smartphone, AlertCircle, LayoutDashboard, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

// ADMIN PASSWORD: Store as a constant for now
const ADMIN_PASSWORD = 'arogya_admin_2024';

interface OTPRecord {
    phone: string;
    otp: string;
    created_at: number;
    expires_at: number;
    is_used: boolean;
}

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return sessionStorage.getItem('admin_auth') === 'true';
    });
    const [password, setPassword] = useState('');
    const [otpList, setOtpList] = useState<OTPRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const API_BASE = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? window.location.origin;

    const fetchOTPs = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/admin/otps?password=${ADMIN_PASSWORD}`);
            if (!response.ok) throw new Error('Failed to fetch OTPs');
            const data = await response.json();

            // Sort by created_at descending
            const sortedData = data.sort((a: OTPRecord, b: OTPRecord) => b.created_at - a.created_at);
            setOtpList(sortedData);
            setLastRefreshed(new Date());
            setError(null);
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError('Could not connect to server');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, API_BASE]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchOTPs();
        }
    }, [isAuthenticated, fetchOTPs]);

    useEffect(() => {
        if (!autoRefresh || !isAuthenticated) return;
        const interval = setInterval(fetchOTPs, 10000); // 10 seconds
        return () => clearInterval(interval);
    }, [autoRefresh, isAuthenticated, fetchOTPs]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            sessionStorage.setItem('admin_auth', 'true');
            setError(null);
        } else {
            setError('Invalid admin password');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_auth');
        setOtpList([]);
    };

    const copyToClipboard = async (otp: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(otp);
            } else {
                // Fallback for HTTP (dev/ngrok environment)
                const textArea = document.createElement('textarea');
                textArea.value = otp;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopiedOtp(otp);
            setTimeout(() => setCopiedOtp(null), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    const formatPhone = (phone: string) => {
        const cleaned = phone.replace('+91', '');
        if (cleaned.length === 10) {
            return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
        }
        return phone;
    };

    const getStatus = (record: OTPRecord) => {
        if (record.is_used) return { label: 'Used', color: 'text-gray-500 bg-gray-100' };
        if (Date.now() > record.expires_at) return { label: 'Expired', color: 'text-red-500 bg-red-100' };
        return { label: 'Active', color: 'text-green-600 bg-green-100' };
    };

    const filteredOtps = otpList.filter(otp =>
        otp.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        otp.otp.includes(searchQuery)
    );

    const activeCount = otpList.filter(o => !o.is_used && Date.now() <= o.expires_at).length;

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm"
                >
                    <Card className="p-8 border-none shadow-2xl rounded-3xl bg-white">
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
                                <ShieldCheck className="w-10 h-10 text-orange-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access</h1>
                            <p className="text-gray-500 text-sm">Enter the password to access the OTP monitor</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter Admin Password"
                                    className="w-full h-14 px-4 rounded-2xl border border-gray-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-center text-lg tracking-widest font-mono"
                                    autoFocus
                                />
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-red-500 text-xs mt-2 text-center font-medium"
                                    >
                                        <AlertCircle className="w-3 h-3 inline mr-1" />
                                        {error}
                                    </motion.p>
                                )}
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl text-lg font-bold shadow-lg shadow-orange-200 transition-all border-none"
                            >
                                Enter Dashboard
                            </Button>
                        </form>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
                            <LayoutDashboard className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 leading-tight">OTP Admin</h1>
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    {activeCount} Active
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchOTPs}
                            disabled={loading}
                            className={`p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-all ${loading ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-all"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Controls */}
                <Card className="p-4 border-none shadow-sm rounded-2xl bg-white flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search phone or OTP..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-1 focus:ring-orange-200 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Auto-Refresh</span>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${autoRefresh ? 'bg-orange-500' : 'bg-gray-200'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${autoRefresh ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </Card>

                {/* OTP List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredOtps.length > 0 ? (
                            filteredOtps.map((record) => {
                                const status = getStatus(record);
                                const timeLeft = Math.max(0, Math.floor((record.expires_at - Date.now()) / 1000));

                                return (
                                    <motion.div
                                        key={record.phone + record.created_at}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                    >
                                        <Card className="p-5 border-none shadow-sm rounded-3xl bg-white hover:shadow-md transition-shadow relative overflow-hidden h-full flex flex-col justify-between">
                                            {record.is_used && (
                                                <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px] z-[1] pointer-events-none" />
                                            )}

                                            <div className="relative z-[2]">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                                            <Smartphone className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                        <span className="font-bold text-gray-900">{formatPhone(record.phone)}</span>
                                                    </div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between gap-3 mb-6 bg-gray-50 p-4 rounded-2xl">
                                                    <div className="flex gap-1.5">
                                                        {record.otp.split('').map((digit, i) => (
                                                            <div key={i} className="w-8 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-lg font-bold text-gray-800 shadow-sm">
                                                                {digit}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(record.otp)}
                                                        className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                                                    >
                                                        {copiedOtp === record.otp ? (
                                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                        ) : (
                                                            <Copy className="w-5 h-5 text-gray-400" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="relative z-[2] flex items-center justify-between border-t border-gray-50 pt-4 mt-auto">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>

                                                {!record.is_used && timeLeft > 0 && (
                                                    <div className={`text-xs font-bold px-3 py-1 rounded-lg ${timeLeft > 60 ? 'text-green-600 bg-green-50' :
                                                        timeLeft > 30 ? 'text-orange-600 bg-orange-50' :
                                                            'text-red-500 bg-red-50 animate-pulse'
                                                        }`}>
                                                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} left
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Clock className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-gray-600">No OTP requests yet</p>
                                    <p className="text-sm">Waiting for users to request login codes...</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
