import React from 'react';
import { Home, PlaySquare, Ticket, Trophy, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Tab } from '../types';

const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const navItems = [
    { id: Tab.Home, icon: Home, label: '홈' },
    { id: Tab.Ad, icon: PlaySquare, label: '광고' },
    { id: Tab.Jackpot, icon: Ticket, label: '로또' },
    { id: Tab.Reward, icon: Trophy, label: '보상' },
    { id: Tab.Profile, icon: User, label: '나' },
  ];

  // Determine if we need a dark or light style nav based on the active tab context
  // For Ad tab (video), we might want a different style, but for consistency we use the glass bar.
  // The bar sits on top of content.

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe pt-2 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        {/* Glass Bar */}
        <div className="bg-white/90 backdrop-blur-xl border-t border-white/20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pb-6 pt-3 px-2 rounded-t-[30px] flex justify-between items-center">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative flex-1 flex flex-col items-center justify-center group"
              >
                <div className={`relative p-2 rounded-2xl transition-all duration-300 ease-out ${isActive ? 'bg-brand-50' : 'bg-transparent'}`}>
                  <item.icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-colors duration-300 ${isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                  />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-600 rounded-full"></span>
                  )}
                </div>
                <span className={`text-[10px] font-medium mt-1 transition-colors duration-300 ${isActive ? 'text-brand-900' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;