import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Download, Filter } from 'lucide-react';

const Reports: React.FC = () => {
    // Mock Data
    const performanceData = [
        { date: '10/01', spend: 4000, conversion: 240 },
        { date: '10/02', spend: 3000, conversion: 139 },
        { date: '10/03', spend: 2000, conversion: 98 },
        { date: '10/04', spend: 2780, conversion: 390 },
        { date: '10/05', spend: 1890, conversion: 480 },
        { date: '10/06', spend: 2390, conversion: 380 },
        { date: '10/07', spend: 3490, conversion: 430 },
    ];

    const personaData = [
        { name: 'Trend Setter', clicks: 450, cost: 2400 },
        { name: 'Smart Saver', clicks: 320, cost: 1398 },
        { name: 'Impulsive', clicks: 210, cost: 800 },
        { name: 'Tech Savvy', clicks: 180, cost: 900 },
    ];

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Advanced Reports</h2>
                    <p className="text-gray-500">Deep dive into your campaign performance.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                        <Calendar size={18} />
                        <span>Last 7 Days</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 shadow-sm">
                        <Download size={18} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4 shadow-sm">
                <Filter size={20} className="text-gray-400" />
                <select className="px-4 py-2 bg-gray-50 rounded-lg text-sm outline-none border-transparent focus:border-brand-500">
                    <option>All Campaigns</option>
                    <option>Summer Sale 2025</option>
                    <option>Winter Launch</option>
                </select>
                <div className="h-6 w-px bg-gray-200"></div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span>3 Active Campaigns</span>
                </div>
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trend Chart */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Spend vs Conversions Trend</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={performanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line yAxisId="right" type="monotone" dataKey="conversion" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Persona Performance */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Efficiency by Persona</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={personaData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend />
                                <Bar dataKey="clicks" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                <Bar dataKey="cost" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Avg. CPC', value: '1.2 VIEW', sub: '-5% vs last week' },
                    { label: 'CTR', value: '3.4%', sub: '+0.2% vs last week' },
                    { label: 'Conversion Rate', value: '12.5%', sub: 'Stable' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                        <div className="text-gray-500 text-sm mb-1">{kpi.label}</div>
                        <div className="text-3xl font-black text-gray-900">{kpi.value}</div>
                        <div className="text-xs text-green-600 mt-2 font-medium">{kpi.sub}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Reports;
