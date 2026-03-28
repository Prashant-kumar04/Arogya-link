import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { Home, History, Phone, Bell, UserCircle } from 'lucide-react';
import HomeScreen from '../components/dashboard/HomeScreen';
import HistoryScreen from '../components/dashboard/HistoryScreen';
import EmergencyScreen from '../components/dashboard/EmergencyScreen';
import ReminderScreen from '../components/dashboard/ReminderScreen';
import ProfileScreen from '../components/dashboard/ProfileScreen';
import PermissionsGate from '../components/PermissionsGate';

export default function Dashboard() {
  const location = useLocation();
  const initialTab = (location.state as any)?.activeTab || 'home';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Fix: watch location.state for health_alert tab navigation events
  useEffect(() => {
    const newTab = (location.state as any)?.activeTab;
    if (newTab) {
      setActiveTab(newTab);
      // Clear the state so back navigation doesn't re-trigger it
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'emergency':
        return <EmergencyScreen />;
      case 'reminder':
        return <ReminderScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <PermissionsGate>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-20">
        {/* Main Content */}
        <div className="h-[calc(100vh-5rem)] overflow-auto">
          {renderScreen()}
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-lg mx-auto flex justify-around items-center h-20 px-4">
            <NavButton
              icon={<Home className="w-6 h-6" />}
              label="Home"
              active={activeTab === 'home'}
              onClick={() => setActiveTab('home')}
            />
            <NavButton
              icon={<History className="w-6 h-6" />}
              label="History"
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            />
            <NavButton
              icon={<Phone className="w-6 h-6" />}
              label="Emergency"
              active={activeTab === 'emergency'}
              onClick={() => setActiveTab('emergency')}
            />
            <NavButton
              icon={<Bell className="w-6 h-6" />}
              label="Reminder"
              active={activeTab === 'reminder'}
              onClick={() => setActiveTab('reminder')}
            />
            <NavButton
              icon={<UserCircle className="w-6 h-6" />}
              label="Profile"
              active={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
            />
          </div>
        </nav>
      </div>
    </PermissionsGate>
  );
}

function NavButton({ icon, label, active, onClick }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 transition-all ${active
        ? 'text-blue-600 scale-110'
        : 'text-gray-400 hover:text-gray-600'
        }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
