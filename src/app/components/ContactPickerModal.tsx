// src/app/components/ContactPickerModal.tsx
// Lets the user pick a contact from their device phone book (Web Contacts API)
// or fall back to manual name+phone entry.
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookUser, PenLine, X, Search, Phone, Check } from 'lucide-react';
import { isContactsAPISupported, pickContactsFromDevice, DeviceContact } from '../hooks/usePermissions';

interface ContactPickerModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (contact: { name: string; phone: string }) => void;
}

export default function ContactPickerModal({ open, onClose, onSelect }: ContactPickerModalProps) {
    const [mode, setMode] = useState<'choose' | 'device' | 'manual' | 'picked'>('choose');
    const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [pickLoading, setPickLoading] = useState(false);

    // Manual fields
    const [manualName, setManualName] = useState('');
    const [manualPhone, setManualPhone] = useState('');

    const handlePickFromDevice = async () => {
        setPickLoading(true);
        const contacts = await pickContactsFromDevice();
        setPickLoading(false);
        if (contacts.length > 0) {
            setDeviceContacts(contacts);
            setMode('device');
        } else {
            // Fall back to manual if picker returned nothing
            setMode('manual');
        }
    };

    const handleSelectDeviceContact = (c: DeviceContact) => {
        onSelect({ name: c.name, phone: c.phone });
        resetAndClose();
    };

    const handleSaveManual = () => {
        if (!manualName.trim() || !manualPhone.trim()) return;
        onSelect({ name: manualName.trim(), phone: manualPhone.trim() });
        resetAndClose();
    };

    const resetAndClose = () => {
        setMode('choose');
        setDeviceContacts([]);
        setSearchQuery('');
        setManualName('');
        setManualPhone('');
        onClose();
    };

    const filtered = deviceContacts.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    );

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={resetAndClose}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9995,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                        backdropFilter: 'blur(3px)',
                    }}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'white', borderRadius: '28px 28px 0 0',
                            width: '100%', maxWidth: '480px',
                            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Handle */}
                        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px' }}>
                            <div style={{ width: '40px', height: '4px', background: '#e5e7eb', borderRadius: '999px' }} />
                        </div>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
                            <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#111827' }}>Add Emergency Contact</h3>
                            <button onClick={resetAndClose} style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={16} color="#6b7280" />
                            </button>
                        </div>

                        {/* ── Mode: choose method ── */}
                        {mode === 'choose' && (
                            <div style={{ padding: '0 20px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '4px' }}>
                                    How would you like to add a contact?
                                </p>

                                {isContactsAPISupported() && (
                                    <button
                                        onClick={handlePickFromDevice}
                                        disabled={pickLoading}
                                        style={{
                                            padding: '18px', borderRadius: '16px', border: '2px solid #dbeafe',
                                            background: pickLoading ? '#eff6ff' : 'white', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <BookUser size={22} color="white" />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 700, color: '#111827', fontSize: '15px', marginBottom: '3px' }}>
                                                {pickLoading ? 'Opening contacts…' : 'Pick from Phone Contacts'}
                                            </p>
                                            <p style={{ color: '#6b7280', fontSize: '12px' }}>
                                                Select directly from your device address book
                                            </p>
                                        </div>
                                    </button>
                                )}

                                <button
                                    onClick={() => setMode('manual')}
                                    style={{
                                        padding: '18px', borderRadius: '16px', border: '2px solid #f3f4f6',
                                        background: 'white', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
                                    }}
                                >
                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #065f46, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <PenLine size={22} color="white" />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 700, color: '#111827', fontSize: '15px', marginBottom: '3px' }}>
                                            Enter Manually
                                        </p>
                                        <p style={{ color: '#6b7280', fontSize: '12px' }}>
                                            Type in the name and phone number
                                        </p>
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* ── Mode: device contacts list ── */}
                        {mode === 'device' && (
                            <>
                                <div style={{ padding: '0 16px 12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f9fafb', borderRadius: '12px', padding: '10px 14px' }}>
                                        <Search size={16} color="#9ca3af" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search contacts…"
                                            style={{ border: 'none', background: 'transparent', flex: 1, fontSize: '14px', color: '#111827', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 20px' }}>
                                    {filtered.length === 0 && (
                                        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', padding: '24px 0' }}>No contacts found</p>
                                    )}
                                    {filtered.map((c, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelectDeviceContact(c)}
                                            style={{
                                                width: '100%', padding: '14px 12px', border: 'none', background: 'white',
                                                borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                                                marginBottom: '4px', textAlign: 'left',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f9ff')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                                        >
                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Phone size={18} color="#3b82f6" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontWeight: 600, fontSize: '14px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                                                <p style={{ fontSize: '12px', color: '#6b7280' }}>{c.phone}</p>
                                            </div>
                                            <Check size={16} color="#d1d5db" />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ── Mode: manual entry ── */}
                        {mode === 'manual' && (
                            <div style={{ padding: '0 20px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                                        Full Name
                                    </label>
                                    <input
                                        value={manualName}
                                        onChange={(e) => setManualName(e.target.value)}
                                        placeholder="e.g. Ranjit Kumar"
                                        style={{
                                            width: '100%', padding: '12px 14px', borderRadius: '12px',
                                            border: '2px solid #e5e7eb', fontSize: '14px', color: '#111827', outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                                        onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                                        Phone Number
                                    </label>
                                    <input
                                        value={manualPhone}
                                        onChange={(e) => setManualPhone(e.target.value)}
                                        placeholder="+91 98765 43210"
                                        type="tel"
                                        style={{
                                            width: '100%', padding: '12px 14px', borderRadius: '12px',
                                            border: '2px solid #e5e7eb', fontSize: '14px', color: '#111827', outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                                        onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                                    />
                                </div>
                                <button
                                    onClick={handleSaveManual}
                                    disabled={!manualName.trim() || !manualPhone.trim()}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                                        background: !manualName.trim() || !manualPhone.trim()
                                            ? '#e5e7eb'
                                            : 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                                        color: !manualName.trim() || !manualPhone.trim() ? '#9ca3af' : 'white',
                                        fontSize: '15px', fontWeight: 700, cursor: !manualName.trim() || !manualPhone.trim() ? 'not-allowed' : 'pointer',
                                        marginTop: '4px',
                                    }}
                                >
                                    Save Contact
                                </button>
                                {isContactsAPISupported() && (
                                    <button
                                        onClick={() => setMode('choose')}
                                        style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}
                                    >
                                        ← Back
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
