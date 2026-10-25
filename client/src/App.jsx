import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import ScheduleModal from './components/ScheduleModal';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import MeetingRoom from './components/MeetingRoom/MeetingRoom';

function MainApp() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'dashboard' | 'admin'
  const [activeMeetingId, setActiveMeetingId] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('login');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const handleOpenAuth = (tab = 'login') => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  // Check URL query parameters for direct meeting link (e.g. ?meeting=nex-101-202)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const meetingFromUrl = params.get('meeting');
    if (meetingFromUrl) {
      setActiveMeetingId(meetingFromUrl);
    }
  }, []);

  const handleStartMeeting = (meetingId) => {
    setActiveMeetingId(meetingId);
    // update URL without full page reload
    window.history.pushState({}, '', `/?meeting=${meetingId}`);
  };

  const handleLeaveMeeting = () => {
    setActiveMeetingId(null);
    window.history.pushState({}, '', '/');
  };

  // If in an active video meeting room, render full-screen MeetingRoom
  if (activeMeetingId) {
    return (
      <MeetingRoom
        meetingId={activeMeetingId}
        currentUser={user}
        onLeave={handleLeaveMeeting}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Navigation Bar */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onNavigate={(page) => {
          if (page === 'schedule') {
            setScheduleModalOpen(true);
          } else {
            setCurrentPage(page);
          }
        }}
        currentPage={currentPage}
      />

      {/* Main Page Views */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <Home
            onStartMeeting={handleStartMeeting}
            onOpenSchedule={() => setScheduleModalOpen(true)}
            onOpenAuth={handleOpenAuth}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'dashboard' && (
          <Dashboard
            onStartMeeting={handleStartMeeting}
            onOpenSchedule={() => setScheduleModalOpen(true)}
          />
        )}

        {currentPage === 'admin' && (
          <AdminDashboard />
        )}
      </main>

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authInitialTab}
        onClose={() => setAuthModalOpen(false)}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onScheduled={(meeting) => {
          setCurrentPage('dashboard');
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
