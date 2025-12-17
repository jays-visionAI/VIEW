import React, { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import AdFeed from './pages/AdFeed';
import Jackpot from './pages/Jackpot';
import Reward from './pages/Reward';
import Profile from './pages/Profile';
import AdminPage from './pages/Admin';
import SplashScreen from './components/SplashScreen';
import Login from './pages/Login';
import AdvertiserLayout from './components/layouts/AdvertiserLayout';
import { useApp, AppProvider } from './context/AppContext';
import { SettingsProvider } from './context/SettingsContext';
import { Tab } from './types';
import { X } from 'lucide-react';

// Web3 Imports
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from './lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';

// React Query Client
const queryClient = new QueryClient();

const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none space-y-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-center shadow-2xl rounded-2xl px-5 py-3 min-w-[300px] max-w-sm backdrop-blur-md border animate-in slide-in-from-top-2 fade-in duration-300
            ${toast.type === 'success' ? 'bg-black/80 text-white border-white/10' :
              toast.type === 'error' ? 'bg-red-500/90 text-white border-red-400/50' :
                'bg-white/90 text-gray-900 border-gray-200'}
          `}
        >
          <span className="flex-1 text-sm font-bold">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="ml-3 opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

// Simple URL-based router hook
const useRouter = () => {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (newPath: string) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
  };

  return { path, navigate };
};

const AppContent = () => {
  const { path } = useRouter();

  // Check if on admin page
  if (path === '/admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <ToastContainer />
        <AdminPage />
      </div>
    );
  }

  // Check if on advertiser portal
  if (path.startsWith('/advertiser')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ToastContainer />
        <AdvertiserLayout />
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased selection:bg-view-500 selection:text-white">
      <ToastContainer />
      <MainSwitch />
    </div>
  );
};

const MainSwitch = () => {
  const { activeTab, authLoading, isLoggedIn } = useApp();

  if (authLoading) {
    return <SplashScreen />;
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Home:
        return <Home />;
      case Tab.Ad:
        return <AdFeed />;
      case Tab.Jackpot:
        return <Jackpot />;
      case Tab.Reward:
        return <Reward />;
      case Tab.Profile:
        return <Profile />;
      default:
        return <Home />;
    }
  };

  const isDarkHeaderTab = activeTab === Tab.Jackpot || activeTab === Tab.Home || activeTab === Tab.Reward || activeTab === Tab.Profile;
  const isFullHeightTab = activeTab === Tab.Ad;

  return (
    <div
      className={`max-w-md mx-auto min-h-screen relative shadow-2xl overflow-hidden border-x transition-colors duration-300 ${isDarkHeaderTab
        ? 'bg-[#1a1b2e] border-[#1a1b2e]'
        : 'bg-white border-gray-200'
        }`}
    >
      <main className={`h-full overflow-y-auto no-scrollbar ${isFullHeightTab ? 'h-screen' :
        isDarkHeaderTab ? '' :
          'px-4 pt-4'
        }`}>
        {renderContent()}
      </main>

      <BottomNav />
    </div>
  );
}

const App = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#8b5cf6',
            accentColorForeground: 'white',
            borderRadius: 'large',
          })}
          locale="ko"
        >
          <AppProvider>
            <SettingsProvider>
              <AppContent />
            </SettingsProvider>
          </AppProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;