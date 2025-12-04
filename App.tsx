import React from 'react';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import AdFeed from './pages/AdFeed';
import Jackpot from './pages/Jackpot';
import Reward from './pages/Reward';
import Profile from './pages/Profile';
import { useApp, AppProvider } from './context/AppContext';
import { Tab } from './types';
import { X } from 'lucide-react';

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

const AppContent = () => {
  const { activeTab } = useApp();

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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased selection:bg-view-500 selection:text-white">
      <ToastContainer />
      <div 
        className={`max-w-md mx-auto min-h-screen relative shadow-2xl overflow-hidden border-x transition-colors duration-300 ${
          isDarkHeaderTab
            ? 'bg-[#1a1b2e] border-[#1a1b2e]' 
            : 'bg-white border-gray-200'
        }`}
      >
        <main className={`h-full overflow-y-auto no-scrollbar ${
          isFullHeightTab ? 'h-screen' : 
          isDarkHeaderTab ? '' : 
          'px-4 pt-4'
        }`}>
          {renderContent()}
        </main>

        <BottomNav />
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;