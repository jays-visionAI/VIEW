import React from 'react';
import { TrendingUp, Users, MousePointer, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const AdvertiserDashboard: React.FC = () => {
    // Mock Data
    const metrics = [
        { label: 'Active Campaigns', value: '3', change: '+1', icon: TrendingUp },
        { label: 'Total Impressions', value: '124,500', change: '+12%', icon: Users },
        { label: 'Clicks', value: '3,200', change: '+5%', icon: MousePointer },
        { label: 'Total Spend', value: '45,000 VIEW', change: '+8%', icon: DollarSign },
    ];

    const chartData = [
        { name: 'Mon', imp: 4000, click: 240 },
        { name: 'Tue', imp: 3000, click: 139 },
        { name: 'Wed', imp: 2000, click: 980 },
        { name: 'Thu', imp: 2780, click: 390 },
        { name: 'Fri', imp: 1890, click: 480 },
        { name: 'Sat', imp: 2390, click: 380 },
        { name: 'Sun', imp: 3490, click: 430 },
    ];

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-gray-500">Welcome back, Advertiser! Here's what's happening today.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
                                <stat.icon size={24} />
                            </div>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                        <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Main Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Performance Overview</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="imp" stroke="#8884d8" fillOpacity={1} fill="url(#colorImp)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Device Split</h3>
                    <div className="h-[300px] flex items-center justify-center text-gray-400">
                        {/* Placeholder for Pie Chart */}
                        Coming Soon
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvertiserDashboard;
