// src/app/components/PermissionsGate.tsx
// Shows on first launch to request device contacts + location access.
// No external API used — pure browser APIs only.
import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, BookUser, ShieldCheck, ChevronRight, Loader2 } from 'lucide-react';
import { usePermissions, isContactsAPISupported, refreshLocation } from '../hooks/usePermissions';
import useHealthStore from '../store/useHealthStore';

interface Props {
    children: ReactNode;
}

export default function PermissionsGate({ children }: Props) {
    const { locationGranted, contactsGranted, setLocationGranted, setContactsGranted, setLocation, user } =
        useHealthStore();

    // Key the gate per-user so each new login sees the gate once
    const gateKey = `permissions_gate_done_${user?.id || 'guest'}`;

    // Check if we've already been through the gate
    const [showGate, setShowGate] = useState(false);
    const [step, setStep] = useState<'intro' | 'location' | 'contacts' | 'done'>('intro');
    const [locationLoading, setLocationLoading] = useState(false);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
    const [contactsStatus, setContactsStatus] = useState<'idle' | 'granted' | 'not-supported' | 'denied'>('idle');

    useEffect(() => {
        // Show gate only if we haven't done both permissions yet for this user
        const done = localStorage.getItem(gateKey);
        if (!done) {
            setShowGate(true);
        } else {
            // Silently refresh location on every open
            if (locationGranted) {
                refreshLocation().then((coords) => {
                    if (coords) setLocation(coords.lat, coords.lng);
                });
            }
        }
    }, [gateKey]);

    const handleRequestLocation = async () => {
        setLocationLoading(true);
        const coords = await refreshLocation();
        setLocationLoading(false);
        if (coords) {
            setLocation(coords.lat, coords.lng);
            setLocationGranted(true);
            setLocationStatus('granted');
        } else {
            setLocationStatus('denied');
        }
        setTimeout(() => setStep('contacts'), 900);
    };

    const handleRequestContacts = async () => {
        if (!isContactsAPISupported()) {
            setContactsStatus('not-supported');
            setContactsGranted(false);
            setTimeout(finishGate, 900);
            return;
        }
        setContactsLoading(true);
        try {
            await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
            setContactsGranted(true);
            setContactsStatus('granted');
        } catch {
            setContactsStatus('denied');
        }
        setContactsLoading(false);
        setTimeout(finishGate, 900);
    };

    const skipContacts = () => {
        setContactsStatus('denied');
        finishGate();
    };

    const finishGate = () => {
        try { localStorage.setItem(gateKey, 'true'); } catch { }
        setStep('done');
        setTimeout(() => setShowGate(false), 400);
    };

    if (!showGate) return <>{children}</>;

    return (
        <AnimatePresence>
            {showGate && (
                <motion.div
                    key="gate"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '24px',
                    }}
                >
                    {/* Decorative circles */}
                    <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(40px)' }} />
                    <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '250px', height: '250px', background: 'rgba(16,185,129,0.06)', borderRadius: '50%', filter: 'blur(40px)' }} />

                    <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>

                        {/* INTRO step */}
                        {step === 'intro' && (
                            <motion.div key="intro" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                                    <div style={{
                                        width: '80px', height: '80px', borderRadius: '24px',
                                        background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 20px', boxShadow: '0 20px 40px rgba(59,130,246,0.3)',
                                    }}>
                                        <ShieldCheck size={40} color="white" />
                                    </div>
                                    <h1 style={{ color: 'white', fontSize: '26px', fontWeight: 800, marginBottom: '10px' }}>
                                        Setup Required
                                    </h1>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: '1.6' }}>
                                        To protect you in emergencies, the app needs access to your location and contacts.
                                        No data is shared externally.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
                                    <PermCard
                                        icon={<MapPin size={22} color="#34d399" />}
                                        title="Device Location"
                                        desc="Your coordinates are stored locally and updated every time you open the app."
                                        color="#064e3b"
                                        borderColor="rgba(52,211,153,0.3)"
                                    />
                                    <PermCard
                                        icon={<BookUser size={22} color="#60a5fa" />}
                                        title="Phone Contacts"
                                        desc="Pick emergency contacts directly from your address book — no upload needed."
                                        color="#1e3a5f"
                                        borderColor="rgba(96,165,250,0.3)"
                                    />
                                </div>

                                <button
                                    onClick={() => setStep('location')}
                                    style={{
                                        width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                                        background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                                        color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        boxShadow: '0 10px 30px rgba(59,130,246,0.4)',
                                    }}
                                >
                                    Get Started <ChevronRight size={18} />
                                </button>
                            </motion.div>
                        )}

                        {/* LOCATION step */}
                        {step === 'location' && (
                            <motion.div key="location" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}>
                                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                    <div style={{
                                        width: '80px', height: '80px', borderRadius: '24px',
                                        background: locationStatus === 'granted'
                                            ? 'linear-gradient(135deg, #059669, #34d399)'
                                            : locationStatus === 'denied'
                                                ? 'linear-gradient(135deg, #dc2626, #f87171)'
                                                : 'linear-gradient(135deg, #065f46, #34d399)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 20px', boxShadow: '0 20px 40px rgba(52,211,153,0.3)',
                                        transition: 'background 0.4s',
                                    }}>
                                        <MapPin size={40} color="white" />
                                    </div>
                                    <h2 style={{ color: 'white', fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>
                                        {locationStatus === 'granted' ? '✅ Location Saved!' : locationStatus === 'denied' ? '⚠️ Location Denied' : 'Allow Location Access'}
                                    </h2>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: '1.6' }}>
                                        {locationStatus === 'granted'
                                            ? 'Your current location has been securely saved on-device.'
                                            : locationStatus === 'denied'
                                                ? 'Location denied. You can enable it later in browser settings.'
                                                : 'Your GPS coordinates are stored only on your device. We update them every time you open the app.'}
                                    </p>
                                </div>

                                {locationStatus === 'idle' && (
                                    <button
                                        onClick={handleRequestLocation}
                                        disabled={locationLoading}
                                        style={{
                                            width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                                            background: 'linear-gradient(135deg, #059669, #34d399)',
                                            color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                            boxShadow: '0 10px 30px rgba(52,211,153,0.3)',
                                            opacity: locationLoading ? 0.8 : 1,
                                        }}
                                    >
                                        {locationLoading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <MapPin size={20} />}
                                        {locationLoading ? 'Getting location...' : 'Allow Location'}
                                    </button>
                                )}

                                {locationStatus !== 'idle' && (
                                    <div style={{ height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Loader2 size={24} color="rgba(255,255,255,0.5)" style={{ animation: 'spin 1s linear infinite' }} />
                                    </div>
                                )}

                                {locationStatus === 'idle' && (
                                    <button
                                        onClick={() => setStep('contacts')}
                                        style={{ width: '100%', marginTop: '12px', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}
                                    >
                                        Skip for now
                                    </button>
                                )}
                            </motion.div>
                        )}

                        {/* CONTACTS step */}
                        {step === 'contacts' && (
                            <motion.div key="contacts" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}>
                                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                    <div style={{
                                        width: '80px', height: '80px', borderRadius: '24px',
                                        background: contactsStatus === 'granted'
                                            ? 'linear-gradient(135deg, #1d4ed8, #60a5fa)'
                                            : contactsStatus === 'not-supported'
                                                ? 'linear-gradient(135deg, #b45309, #fbbf24)'
                                                : 'linear-gradient(135deg, #1e3a5f, #3b82f6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 20px', boxShadow: '0 20px 40px rgba(59,130,246,0.3)',
                                        transition: 'background 0.4s',
                                    }}>
                                        <BookUser size={40} color="white" />
                                    </div>
                                    <h2 style={{ color: 'white', fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>
                                        {contactsStatus === 'granted' ? '✅ Contacts Access Granted' : contactsStatus === 'not-supported' ? '⚠️ Not Supported on this Device' : 'Allow Contacts Access'}
                                    </h2>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: '1.6' }}>
                                        {contactsStatus === 'not-supported'
                                            ? 'Your browser or device does not support the Contacts API. You can still add contacts manually in Emergency Contacts.'
                                            : contactsStatus === 'granted'
                                                ? 'You can now pick emergency contacts directly from your phone book.'
                                                : 'We use the Web Contacts API to let you choose emergency contacts from your address book. Nothing is uploaded.'}
                                    </p>
                                </div>

                                {(contactsStatus === 'idle') && (
                                    <>
                                        <button
                                            onClick={handleRequestContacts}
                                            disabled={contactsLoading}
                                            style={{
                                                width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                                                background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
                                                color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                                boxShadow: '0 10px 30px rgba(59,130,246,0.35)',
                                                opacity: contactsLoading ? 0.8 : 1,
                                            }}
                                        >
                                            {contactsLoading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <BookUser size={20} />}
                                            {contactsLoading ? 'Opening contacts...' : 'Allow Contacts'}
                                        </button>
                                        <button
                                            onClick={skipContacts}
                                            style={{ width: '100%', marginTop: '12px', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}
                                        >
                                            Skip for now
                                        </button>
                                    </>
                                )}

                                {contactsStatus !== 'idle' && (
                                    <div style={{ height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Loader2 size={24} color="rgba(255,255,255,0.5)" style={{ animation: 'spin 1s linear infinite' }} />
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function PermCard({ icon, title, desc, color, borderColor }: {
    icon: ReactNode; title: string; desc: string; color: string; borderColor: string;
}) {
    return (
        <div style={{
            background: color, border: `1px solid ${borderColor}`, borderRadius: '16px',
            padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'flex-start',
        }}>
            <div style={{ marginTop: '2px', flexShrink: 0 }}>{icon}</div>
            <div>
                <p style={{ color: 'white', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{title}</p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', lineHeight: '1.5' }}>{desc}</p>
            </div>
        </div>
    );
}
