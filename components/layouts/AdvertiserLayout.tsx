import React, { useState, useEffect } from 'react';
import { LayoutDashboard, PlusCircle, List, Wallet, Settings, LogOut, PenTool } from 'lucide-react';
import AdvertiserDashboard from '../../pages/advertiser/Dashboard';
import CreateCampaign from '../../pages/advertiser/CreateCampaign';
import ProposalBuilder from '../../pages/advertiser/ProposalBuilder';
import Reports from '../../pages/advertiser/Reports';
import WalletPage from '../../pages/advertiser/Wallet';
import SettingsPage from '../../pages/advertiser/Settings';

const AdvertiserLayout: React.FC = () => {
    const [path, setPath] = useState(window.location.pathname);

    // Sync with browser history
    useEffect(() => {
        const handlePopState = () => setPath(window.location.pathname);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const navigate = (newPath: string) => {
        window.history.pushState({}, '', newPath);
        setPath(newPath);
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/advertiser/dashboard' },
        { icon: PlusCircle, label: 'Create Campaign', path: '/advertiser/create' },
        { icon: PenTool, label: 'Proposal Builder', path: '/advertiser/proposal' },
        { icon: List, label: 'Reports', path: '/advertiser/reports' },
        { icon: Wallet, label: 'Wallet', path: '/advertiser/wallet' },
        { icon: Settings, label: 'Settings', path: '/advertiser/settings' },
    ];

    const renderContent = () => {
        // Basic manual router logic
        if (path === '/advertiser' || path === '/advertiser/dashboard') {
            return <AdvertiserDashboard />;
        }
        if (path === '/advertiser/create') {
            return <CreateCampaign />;
        }
        if (path === '/advertiser/proposal') return <ProposalBuilder />;
        if (path === '/advertiser/reports') return <Reports />;
        if (path === '/advertiser/wallet') return <WalletPage />;
        if (path === '/advertiser/settings') return <SettingsPage />;
        // Fallback for unimplemented routes
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p>Page Under Construction</p>
                <p className="text-sm">{path}</p>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/advertiser')}>
                    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">V</div>
                    <span className="text-xl font-bold text-gray-900">VIEW <span className="text-brand-600 font-medium text-sm">Ads</span></span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${path === item.path
                                ? 'bg-brand-50 text-brand-600 font-bold shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={() => {
                            window.history.pushState({}, '', '/');
                            // Force reload/update in App.tsx might be needed if state is separate, 
                            // but usually pushState event is handled if App.tsx listens to it.
                            // However, our App.tsx usePopState doesn't listen to pushState automatically 
                            // (pushState doesn't trigger popstate). 
                            // We will manually dispatch popstate event to trigger App re-render.
                            window.dispatchEvent(new Event('popstate'));
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Exit Portal</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
                    <h1 className="text-lg font-bold text-gray-800">
                        {menuItems.find(i => i.path === path)?.label || 'Advertiser Portal'}
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-xs font-bold">
                            Beta Access
                        </div>
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    </div>
                </header>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-auto p-8">
                    <div className="max-w-7xl mx-auto">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdvertiserLayout;
