// src/app/components/AreYouOkModal.tsx
// Shown when AI detects a health risk.
// - Asks "Are you OK?"
// - YES → dismisses
// - NO → plays emergency audio file, then dials the 1st emergency contact
// Note: Browsers cannot inject audio INTO an active phone call (OS restriction).
// The audio plays IN THE APP immediately before the dialer opens, so the user
// can hold the speaker toward the receiver or it alerts people nearby.
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, HeartPulse, Volume2, CheckCircle2, X } from 'lucide-react';
import useHealthStore from '../store/useHealthStore';

interface AreYouOkModalProps {
    open: boolean;
    riskScore?: number;
    status?: string;
    onClose: () => void;
}

// Path to the emergency audio message saved in /public/
const EMERGENCY_AUDIO_SRC = '/emergency_voice.mp3';

export default function AreYouOkModal({ open, riskScore, status, onClose }: AreYouOkModalProps) {
    const trustedContacts = useHealthStore((s) => s.trustedContacts);
    const location = useHealthStore((s) => s.location);

    const [phase, setPhase] = useState<'ask' | 'calling' | 'called'>('ask');
    const [countdown, setCountdown] = useState(10);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const firstContact = trustedContacts[0] ?? null;

    // Reset state every time modal opens
    useEffect(() => {
        if (open) {
            setPhase('ask');
            setCountdown(10);
            setAudioPlaying(false);
        } else {
            clearTimer();
            stopAudio();
        }
    }, [open]);

    // Auto-call countdown when phase is 'ask'
    useEffect(() => {
        if (!open || phase !== 'ask') return;
        if (countdown <= 0) {
            handleNotOk();
            return;
        }
        timerRef.current = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) {
                    clearTimer();
                    handleNotOk();
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
        return () => clearTimer();
    }, [open, phase]);

    function clearTimer() {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }

    function stopAudio() {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setAudioPlaying(false);
    }

    function playEmergencyAudio() {
        try {
            if (!audioRef.current) {
                audioRef.current = new Audio(EMERGENCY_AUDIO_SRC);
            }
            audioRef.current.currentTime = 0;
            audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => {
                // Audio file might not exist yet — silently ignore
                console.warn('Emergency audio not found at /emergency_voice.mp3');
                setAudioPlaying(false);
            });
            audioRef.current.onended = () => setAudioPlaying(false);
        } catch {
            setAudioPlaying(false);
        }
    }

    function handleIAmOk() {
        clearTimer();
        stopAudio();
        onClose();
    }

    function handleNotOk() {
        clearTimer();
        setPhase('calling');
        // Play the audio message first
        playEmergencyAudio();

        // Wait 2s then open phone dialer
        setTimeout(() => {
            if (firstContact) {
                const phone = firstContact.contact_phone.replace(/\s+/g, '');
                window.location.href = `tel:${phone}`;
            }
            setTimeout(() => {
                setPhase('called');
            }, 1500);
        }, 2000);
    }

    const statusLabel = status === 'critical' ? 'CRITICAL RISK' : 'HEALTH WARNING';
    const statusColor = status === 'critical' ? '#dc2626' : '#d97706';
    const statusBg = status === 'critical' ? 'rgba(220,38,38,0.08)' : 'rgba(217,119,6,0.08)';

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9998,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '24px',
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.85, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        style={{
                            background: 'white',
                            borderRadius: '28px',
                            width: '100%',
                            maxWidth: '380px',
                            overflow: 'hidden',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
                        }}
                    >
                        {/* ── Top banner ── */}
                        <div style={{
                            background: status === 'critical'
                                ? 'linear-gradient(135deg, #7f1d1d, #dc2626)'
                                : 'linear-gradient(135deg, #78350f, #d97706)',
                            padding: '24px',
                            textAlign: 'center',
                            position: 'relative',
                        }}>
                            {/* Pulsing icon */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                                <motion.div
                                    animate={{ scale: [1, 1.18, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                                    style={{
                                        width: '64px', height: '64px', borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    <HeartPulse size={34} color="white" />
                                </motion.div>
                            </div>
                            <span style={{
                                background: 'rgba(255,255,255,0.2)', color: 'white',
                                fontSize: '10px', fontWeight: 800, letterSpacing: '2px',
                                padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase',
                            }}>
                                {statusLabel}
                            </span>
                            <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 900, margin: '10px 0 4px' }}>
                                Are You Okay?
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                                AI Risk Score: <strong>{riskScore?.toFixed(1) ?? '--'}</strong>
                            </p>
                        </div>

                        {/* ── Body ── */}
                        <div style={{ padding: '24px' }}>

                            {phase === 'ask' && (
                                <>
                                    <p style={{ textAlign: 'center', color: '#374151', fontSize: '14px', lineHeight: '1.6', marginBottom: '8px' }}>
                                        A health risk has been detected. Respond within{' '}
                                        <strong style={{ color: statusColor }}>{countdown}s</strong>{' '}
                                        or your first emergency contact will be called automatically.
                                    </p>

                                    {/* Countdown ring */}
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                        <svg width="64" height="64" viewBox="0 0 64 64">
                                            <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="5" />
                                            <circle
                                                cx="32" cy="32" r="28"
                                                fill="none" stroke={statusColor} strokeWidth="5"
                                                strokeDasharray={`${2 * Math.PI * 28}`}
                                                strokeDashoffset={`${2 * Math.PI * 28 * (1 - countdown / 10)}`}
                                                strokeLinecap="round"
                                                transform="rotate(-90 32 32)"
                                                style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                                            />
                                            <text x="32" y="37" textAnchor="middle" fontSize="18" fontWeight="800" fill={statusColor}>
                                                {countdown}
                                            </text>
                                        </svg>
                                    </div>

                                    {/* Contact preview */}
                                    {firstContact && (
                                        <div style={{
                                            background: statusBg, border: `1px solid ${statusColor}30`,
                                            borderRadius: '14px', padding: '12px 16px',
                                            display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
                                        }}>
                                            <Phone size={18} color={statusColor} />
                                            <div>
                                                <p style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>{firstContact.contact_name}</p>
                                                <p style={{ fontSize: '12px', color: '#6b7280' }}>{firstContact.contact_phone}</p>
                                            </div>
                                            <span style={{
                                                marginLeft: 'auto', fontSize: '10px', fontWeight: 700,
                                                background: statusColor, color: 'white',
                                                padding: '2px 8px', borderRadius: '999px',
                                            }}>
                                                Will be called
                                            </span>
                                        </div>
                                    )}

                                    {!firstContact && (
                                        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '14px', padding: '12px', marginBottom: '16px', color: '#92400e', fontSize: '12px', textAlign: 'center' }}>
                                            ⚠️ No emergency contact saved. Go to Emergency tab to add one.
                                        </div>
                                    )}

                                    {location && (
                                        <p style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', marginBottom: '20px' }}>
                                            📍 Location saved: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                                        </p>
                                    )}

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            onClick={handleIAmOk}
                                            style={{
                                                flex: 1, padding: '14px', borderRadius: '14px', border: '2px solid #d1fae5',
                                                background: 'white', color: '#059669', fontSize: '15px',
                                                fontWeight: 700, cursor: 'pointer', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            }}
                                        >
                                            <CheckCircle2 size={18} /> I'm OK
                                        </button>
                                        <button
                                            onClick={handleNotOk}
                                            style={{
                                                flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                                                background: `linear-gradient(135deg, ${statusColor}, ${status === 'critical' ? '#ef4444' : '#f59e0b'})`,
                                                color: 'white', fontSize: '15px',
                                                fontWeight: 700, cursor: 'pointer', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                boxShadow: `0 8px 20px ${statusColor}50`,
                                            }}
                                        >
                                            <Phone size={18} /> Call Help
                                        </button>
                                    </div>
                                </>
                            )}

                            {phase === 'calling' && (
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <motion.div
                                        animate={{ scale: [1, 1.15, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.0 }}
                                        style={{
                                            width: '72px', height: '72px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            margin: '0 auto 16px', boxShadow: '0 0 0 16px rgba(220,38,38,0.12)',
                                        }}
                                    >
                                        <Phone size={32} color="white" />
                                    </motion.div>
                                    <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#111827', marginBottom: '6px' }}>
                                        Calling {firstContact?.contact_name || 'Emergency Contact'}…
                                    </h3>
                                    <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                                        {firstContact?.contact_phone}
                                    </p>
                                    {audioPlaying && (
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                                            background: '#eff6ff', border: '1px solid #bfdbfe',
                                            borderRadius: '999px', padding: '6px 14px', marginBottom: '12px',
                                        }}>
                                            <Volume2 size={14} color="#3b82f6" />
                                            <span style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 600 }}>
                                                Playing emergency voice message…
                                            </span>
                                        </div>
                                    )}
                                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Your phone dialer will open momentarily.
                                    </p>
                                </div>
                            )}

                            {phase === 'called' && (
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <div style={{
                                        width: '72px', height: '72px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #059669, #34d399)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 16px', boxShadow: '0 0 0 16px rgba(5,150,105,0.1)',
                                    }}>
                                        <CheckCircle2 size={32} color="white" />
                                    </div>
                                    <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#111827', marginBottom: '6px' }}>
                                        Call Initiated
                                    </h3>
                                    <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>
                                        Emergency contact has been dialed. Stay calm — help is on the way.
                                    </p>
                                    <button
                                        onClick={onClose}
                                        style={{
                                            width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                                            background: '#f3f4f6', color: '#374151', fontSize: '14px',
                                            fontWeight: 700, cursor: 'pointer',
                                        }}
                                    >
                                        <X size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
