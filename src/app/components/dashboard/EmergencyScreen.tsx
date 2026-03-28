import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Phone, Plus, Trash2, AlertTriangle, Loader, CheckCircle2, XCircle, BookUser, MapPin, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { fetchContacts, addContact, deleteContact, sendEmergencyAlert } from '../../services/api';
import useHealthStore from '../../store/useHealthStore';
import ContactPickerModal from '../ContactPickerModal';
import { useLocationPermission } from '../../hooks/useLocationPermission';

interface Contact {
  id: string;           // UUID from Supabase
  contact_name: string; // matches Supabase column
  contact_phone: string;// matches Supabase column
  is_app_user: boolean;
}

export default function EmergencyScreen() {
  const { trustedContacts, setTrustedContacts, addTrustedContact, removeTrustedContact } = useHealthStore();

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { locationState, requestLocation } = useLocationPermission();

  // Check if Contact Picker API is available
  const isContactPickerSupported = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

  const handlePickContact = async () => {
    try {
      // TypeScript doesn't have types for this experimental API yet
      const contacts = await (navigator as any).contacts.select(
        ['name', 'tel'],
        { multiple: false }
      );

      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        const name = contact.name?.[0] || '';
        let phone = contact.tel?.[0]?.replace(/\D/g, '') || '';

        // If it starts with 91 but doesn't have +
        if (phone.startsWith('91') && phone.length > 10) {
          phone = `+${phone}`;
        } else if (phone.length === 10) {
          // Format to Indian mobile if 10 digits
          phone = `+91${phone}`;
        }

        // Pre-fill the form inputs
        setNewName(name);
        setNewPhone(phone);
      }
    } catch (err: any) {
      // User cancelled or permission denied — silently ignore
      if (err.name !== 'AbortError') {
        console.warn('Contact picker error:', err);
      }
    }
  };

  const handlePickSelect = (picked: { name: string; phone: string }) => {
    setNewName(picked.name);
    setNewPhone(picked.phone);
    setShowAdd(true);
  };

  // Load contacts from backend on mount
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchContacts();
        setTrustedContacts(data);
      } catch (err: any) {
        console.error('Failed to load contacts:', err);
        setError('Failed to load contacts. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [setTrustedContacts]);

  // Handle adding a new contact
  const handleAddContact = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    if (trustedContacts.length >= 3) {
      setError('You can only have up to 3 emergency contacts.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const newContact = await addContact(newName.trim(), newPhone.trim());
      addTrustedContact(newContact);

      setNewName('');
      setNewPhone('');
      setShowAdd(false);
      setSuccess('Contact added successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to add contact:', err);
      setError(err.message || 'Failed to add contact. Duplicate number?');
    } finally {
      setSaving(false);
    }
  };

  // Handle deleting a contact
  const handleDeleteContact = async (id: string) => {
    try {
      setError(null);
      await deleteContact(id);
      removeTrustedContact(id);
    } catch (err: any) {
      console.error('Failed to delete contact:', err);
      setError('Failed to delete contact.');
    }
  };

  // Real emergency alert trigger
  const handleEmergencyAlert = async () => {
    if (trustedContacts.length === 0) {
      setError('Please add at least one emergency contact first.');
      return;
    }

    setAlerting(true);
    setError(null);
    setSuccess(null);

    // Try to get location — but NEVER block alert if it fails
    let locationData = locationState.location; // use cached if already granted
    if (locationState.status === 'idle') {
      locationData = await requestLocation(); // request if not yet asked
    }

    try {
      const res = await sendEmergencyAlert(
        "Manual emergency alert triggered by user.",
        locationData ? {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          mapsUrl: locationData.mapsUrl,
        } : undefined
      );

      if (res.success) {
        setSuccess(`🚨 Alert sent to ${res.sent_to} contacts!`);
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err: any) {
      console.error('Emergency alert failed:', err);
      setError('Failed to send emergency alert. Check your connection.');
    } finally {
      setAlerting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <ContactPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handlePickSelect}
      />
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-3xl font-bold text-gray-800">Emergency Contacts</h1>
        <p className="text-gray-500 text-sm">Auto-alert on health risk detected</p>
      </div>

      {/* Status Messages */}
      {error && (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
          <XCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}
      {success && (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </motion.div>
      )}

      {/* Alert Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-5 shadow-lg text-white"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-lg mb-1 uppercase tracking-wider">Automatic Emergency Alert</p>
            <p className="text-red-50 text-xs leading-relaxed opacity-90">
              When AI detects critical risk, the system will instantly alert 3 people.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Location Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-4 flex items-center gap-3 border shadow-sm transition-all duration-300 ${locationState.status === 'granted'
          ? 'bg-green-50 border-green-200'
          : locationState.status === 'denied' || locationState.status === 'unavailable'
            ? 'bg-red-50 border-red-200'
            : 'bg-white border-gray-100'
          }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${locationState.status === 'granted' ? 'bg-green-100 text-green-600' :
          locationState.status === 'denied' || locationState.status === 'unavailable' ? 'bg-red-100 text-red-500' : 'bg-gray-50 text-gray-400'
          }`}>
          {locationState.status === 'requesting' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <MapPin className="w-5 h-5 flex-shrink-0" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800">
            {locationState.status === 'granted' && 'Location service active'}
            {locationState.status === 'denied' && 'Location permission denied'}
            {locationState.status === 'unavailable' && 'Location service unavailable'}
            {locationState.status === 'requesting' && 'Finding your location...'}
            {locationState.status === 'idle' && 'Emergency GPS monitoring'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium leading-relaxed">
            {locationState.status === 'granted' && `GPS coordinates captured at ${new Date(locationState.location?.timestamp || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            {locationState.status === 'denied' && 'Alert will be sent without your live coordinates.'}
            {locationState.status === 'unavailable' && 'GPS not supported on this browser/device.'}
            {locationState.status === 'requesting' && 'Waiting for high-accuracy GPS fix...'}
            {locationState.status === 'idle' && 'Allow GPS to include your location in alert.'}
          </p>
        </div>

        {locationState.status === 'idle' && (
          <button
            onClick={requestLocation}
            className="text-[10px] bg-orange-600 text-white px-3 py-2 rounded-xl font-bold uppercase tracking-wider shadow-md shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95 flex-shrink-0"
          >
            Allow
          </button>
        )}
      </motion.div>

      {/* Contacts List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Emergency Contacts ({trustedContacts.length}/3)</h3>
          {!loading && trustedContacts.length < 3 && (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowPicker(true)}
                className="bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl"
              >
                <BookUser className="w-4 h-4 mr-1" />
                Pick
              </Button>
              <Button
                onClick={() => setShowAdd(!showAdd)}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          )}
        </div>

        {/* Add Contact Form */}
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white rounded-2xl p-5 shadow-lg border border-blue-100"
          >
            <h4 className="font-semibold text-gray-800 mb-3">Add New Contact</h4>
            <div className="space-y-4">
              {/* Only show if Contact Picker API is supported */}
              {isContactPickerSupported && (
                <button
                  type="button"
                  onClick={handlePickContact}
                  className="w-full flex items-center justify-center gap-2 h-12 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 rounded-xl text-sm font-bold transition-all active:scale-[0.98] shadow-sm mb-2"
                >
                  <BookUser className="w-5 h-5" />
                  Pick from Phone Contacts
                </button>
              )}
              <div>
                <Label htmlFor="em-name">Name</Label>
                <Input
                  id="em-name"
                  placeholder="Contact name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 rounded-xl"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="em-phone">Phone Number</Label>
                <Input
                  id="em-phone"
                  placeholder="+91 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddContact}
                  disabled={!newName.trim() || !newPhone.trim() || saving}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl h-11"
                >
                  {saving ? <Loader className="w-5 h-5 animate-spin" /> : 'Save Contact'}
                </Button>
                <Button
                  onClick={() => {
                    setShowAdd(false);
                    setNewName('');
                    setNewPhone('');
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl h-11"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading/Empty State/List */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <Loader className="w-8 h-8 text-blue-500 animate-spin mb-2" />
            <p className="text-gray-500 text-sm">Loading contacts...</p>
          </div>
        ) : trustedContacts.length === 0 && !showAdd ? (
          <div className="bg-gray-50 rounded-2xl p-8 text-center border border-dashed border-gray-200">
            <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No emergency contacts added yet.</p>
            <p className="text-gray-400 text-xs mt-1">Tap "Add" to add your first contact.</p>
          </div>
        ) : (
          trustedContacts.map((contact, index) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 relative">
                  <Phone className="w-6 h-6 text-blue-600" />
                  {contact.is_app_user && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center" title="App User">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-800 truncate">{contact.contact_name}</h4>
                    {contact.is_app_user && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded-full font-bold">APP</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{contact.contact_phone}</p>
                </div>
                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Emergency Alert Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleEmergencyAlert}
          disabled={alerting || loading || trustedContacts.length === 0}
          className="w-full h-14 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl shadow-lg text-lg font-bold disabled:opacity-50"
        >
          {alerting ? (
            <>
              <Loader className="w-6 h-6 mr-2 animate-spin" />
              Siri sending alert...
            </>
          ) : (
            <>
              <AlertTriangle className="w-6 h-6 mr-2" />
              TRIGGER EMERGENCY ALERT
            </>
          )}
        </Button>
      </motion.div>

      {/* Info */}
      <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
        <p className="text-sm text-gray-700 leading-relaxed">
          <strong>How it works:</strong> In an emergency, we immediately notify your trusted contacts via App Push notifications. Our AI monitors your vitals 24/7 and triggers this automatically if critical patterns are found.
        </p>
      </div>
    </div>
  );
}
