import React, { useState } from 'react';
import { User, Bell, Key, CreditCard, Save, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'api' | 'billing'>('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // Profile form state
    const [profile, setProfile] = useState({
        companyName: 'Acme Inc.',
        contactName: 'John Doe',
        email: 'john@acme.com',
        website: 'https://acme.com',
        industry: 'E-commerce',
    });

    // Notification preferences
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        budgetWarnings: true,
        weeklyReport: true,
        campaignUpdates: false,
    });

    // API Key (mock)
    const [showApiKey, setShowApiKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const apiKey = 'vw_live_sk_1234567890abcdef';

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
        setSaveMessage('Settings saved successfully!');
        setTimeout(() => setSaveMessage(null), 3000);
    };

    const copyApiKey = () => {
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'api', label: 'API Keys', icon: Key },
        { id: 'billing', label: 'Billing', icon: CreditCard },
    ];

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                <p className="text-gray-500">Manage your advertiser account settings.</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-6">
                    <div className="flex gap-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-brand-600 text-brand-600 font-medium'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6 max-w-2xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                                    <input
                                        type="text"
                                        value={profile.companyName}
                                        onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                                    <input
                                        type="text"
                                        value={profile.contactName}
                                        onChange={(e) => setProfile({ ...profile, contactName: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                                <input
                                    type="url"
                                    value={profile.website}
                                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                                <select
                                    value={profile.industry}
                                    onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500"
                                >
                                    <option>E-commerce</option>
                                    <option>Finance</option>
                                    <option>Gaming</option>
                                    <option>Technology</option>
                                    <option>Entertainment</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-4 max-w-2xl">
                            {Object.entries(notifications).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {key === 'emailAlerts' && 'Email Alerts'}
                                            {key === 'budgetWarnings' && 'Budget Warnings'}
                                            {key === 'weeklyReport' && 'Weekly Report'}
                                            {key === 'campaignUpdates' && 'Campaign Updates'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {key === 'emailAlerts' && 'Receive important account notifications via email'}
                                            {key === 'budgetWarnings' && 'Get notified when budget is running low'}
                                            {key === 'weeklyReport' && 'Receive weekly performance summary'}
                                            {key === 'campaignUpdates' && 'Get notified about campaign status changes'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setNotifications({ ...notifications, [key]: !value })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-brand-600' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-7' : 'left-1'
                                            }`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* API Keys Tab */}
                    {activeTab === 'api' && (
                        <div className="space-y-6 max-w-2xl">
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl text-sm">
                                <strong>Note:</strong> Your API key grants access to your advertiser account. Keep it secure and never share it publicly.
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Live API Key</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type={showApiKey ? 'text' : 'password'}
                                            value={apiKey}
                                            readOnly
                                            className="w-full px-4 py-3 pr-12 bg-gray-50 rounded-xl border border-gray-200 font-mono text-sm"
                                        />
                                        <button
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <button
                                        onClick={copyApiKey}
                                        className="px-4 py-3 bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
                                    >
                                        {copied ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>
                            <button className="px-6 py-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors">
                                Regenerate API Key
                            </button>
                        </div>
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && (
                        <div className="space-y-6 max-w-2xl">
                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-gray-900">Current Plan</h4>
                                    <span className="px-3 py-1 bg-brand-50 text-brand-600 text-xs font-bold rounded-full">Pro</span>
                                </div>
                                <p className="text-gray-500 text-sm">Access to all advertising features with priority support.</p>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">Monthly spend limit</span>
                                    <span className="font-bold text-gray-900">Unlimited</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-6">
                                <h4 className="font-bold text-gray-900 mb-4">Billing History</h4>
                                <div className="space-y-3">
                                    {[
                                        { date: '2025-12-01', amount: '1,500 VIEW', status: 'Paid' },
                                        { date: '2025-11-01', amount: '1,200 VIEW', status: 'Paid' },
                                        { date: '2025-10-01', amount: '800 VIEW', status: 'Paid' },
                                    ].map((invoice, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg">
                                            <span className="text-gray-600">{invoice.date}</span>
                                            <span className="font-medium">{invoice.amount}</span>
                                            <span className="text-green-500 text-sm">{invoice.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50">
                    {saveMessage && (
                        <span className="text-green-600 text-sm font-medium flex items-center gap-2">
                            <CheckCircle size={16} /> {saveMessage}
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="ml-auto px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        <Save size={18} />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
