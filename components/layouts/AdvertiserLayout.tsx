import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, PlusCircle, List, Wallet, Settings, LogOut, PenTool, Target, Bell, Check, AlertTriangle, Zap, Info, X, CheckCheck } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import AdvertiserDashboard from '../../pages/advertiser/Dashboard';
import CreateCampaign from '../../pages/advertiser/CreateCampaign';
import ProposalBuilder from '../../pages/advertiser/ProposalBuilder';
import AudienceTargeting from '../../pages/advertiser/AudienceTargeting';
import Reports from '../../pages/advertiser/Reports';
import WalletPage from '../../pages/advertiser/Wallet';
import SettingsPage from '../../pages/advertiser/Settings';

interface Notification {
    id: string;
    type: 'warning' | 'success' | 'optimization' | 'info';
    title: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
    suggestedAction?: string;
    campaignId?: string;
    campaignName?: string;
    read: boolean;
    createdAt: Date | null;
}

const AdvertiserLayout: React.FC = () => {
    const [path, setPath] = useState(window.location.pathname);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Sync with browser history
    useEffect(() => {
        const handlePopState = () => setPath(window.location.pathname);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch notifications on mount and periodically
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Every minute
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        setIsLoadingNotifications(true);
        try {
            const functions = getFunctions();
            const getNotifications = httpsCallable(functions, 'getCampaignNotifications');
            const result = await getNotifications({ limit: 10 });
            const data = result.data as any;

            if (data.success) {
                setNotifications(data.notifications.map((n: any) => ({
                    ...n,
                    createdAt: n.createdAt ? new Date(n.createdAt) : null,
                })));
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.warn('Failed to fetch notifications:', error);
        }
        setIsLoadingNotifications(false);
    };

    const markAsRead = async (notificationId: string) => {
        try {
            const functions = getFunctions();
            const markRead = httpsCallable(functions, 'markNotificationRead');
            await markRead({ notificationId });

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const functions = getFunctions();
            const markRead = httpsCallable(functions, 'markNotificationRead');
            await markRead({ markAll: true });

            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'warning': return <AlertTriangle size={16} className="text-orange-500" />;
            case 'success': return <Check size={16} className="text-green-500" />;
            case 'optimization': return <Zap size={16} className="text-purple-500" />;
            case 'info': return <Info size={16} className="text-blue-500" />;
            default: return <Bell size={16} className="text-gray-500" />;
        }
    };

    const getTimeAgo = (date: Date | null) => {
        if (!date) return '';
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return '방금';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
        return `${Math.floor(seconds / 86400)}일 전`;
    };

    const navigate = (newPath: string) => {
        window.history.pushState({}, '', newPath);
        setPath(newPath);
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/advertiser/dashboard' },
        { icon: Target, label: 'Audience Targeting', path: '/advertiser/audience' },
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
        if (path === '/advertiser/audience') return <AudienceTargeting />;
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

                        {/* Notification Bell */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="font-bold text-gray-800">알림</h3>
                                        <div className="flex items-center gap-2">
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={markAllAsRead}
                                                    className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                                                >
                                                    <CheckCheck size={14} />
                                                    모두 읽음
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setShowNotifications(false)}
                                                className="p-1 text-gray-400 hover:text-gray-600"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400">
                                                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">알림이 없습니다</p>
                                            </div>
                                        ) : (
                                            notifications.map(notification => (
                                                <div
                                                    key={notification.id}
                                                    onClick={() => !notification.read && markAsRead(notification.id)}
                                                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                                                >
                                                    <div className="flex gap-3">
                                                        <div className="flex-shrink-0 mt-0.5">
                                                            {getNotificationIcon(notification.type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <h4 className={`text-sm ${!notification.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                                    {notification.title}
                                                                </h4>
                                                                <span className="text-xs text-gray-400 flex-shrink-0">
                                                                    {getTimeAgo(notification.createdAt)}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                                {notification.message}
                                                            </p>
                                                            {notification.campaignName && (
                                                                <span className="inline-block mt-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                                                    {notification.campaignName}
                                                                </span>
                                                            )}
                                                            {notification.suggestedAction && (
                                                                <p className="text-xs text-brand-600 mt-1.5 font-medium">
                                                                    💡 {notification.suggestedAction}
                                                                </p>
                                                            )}
                                                            {!notification.read && (
                                                                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {notifications.length > 0 && (
                                        <div className="p-3 bg-gray-50 text-center">
                                            <button
                                                onClick={() => {
                                                    setShowNotifications(false);
                                                    // Could navigate to a full notifications page
                                                }}
                                                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                                            >
                                                모든 알림 보기
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
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
