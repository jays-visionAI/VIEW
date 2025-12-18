import React, { useState } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, PieChart, Pie, Cell, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar, Treemap
} from 'recharts';
import { Calendar, Download, Filter, Tags, Building2, TrendingUp, Users, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'industry' | 'attribute' | 'persona'>('overview');
    const [dateRange, setDateRange] = useState('7d');

    // Mock Performance Data
    const performanceData = [
        { date: '12/13', spend: 4000, conversion: 240, impressions: 45000, clicks: 1200 },
        { date: '12/14', spend: 3500, conversion: 189, impressions: 38000, clicks: 980 },
        { date: '12/15', spend: 4200, conversion: 298, impressions: 52000, clicks: 1450 },
        { date: '12/16', spend: 3800, conversion: 320, impressions: 48000, clicks: 1320 },
        { date: '12/17', spend: 4500, conversion: 380, impressions: 55000, clicks: 1580 },
        { date: '12/18', spend: 4800, conversion: 420, impressions: 62000, clicks: 1780 },
        { date: '12/19', spend: 5200, conversion: 490, impressions: 68000, clicks: 1950 },
    ];

    // Persona Performance Data
    const personaData = [
        { name: 'Trend Setter', clicks: 2450, conversions: 320, cpc: 1.2, color: '#8b5cf6' },
        { name: 'Smart Saver', clicks: 1820, conversions: 280, cpc: 0.9, color: '#3b82f6' },
        { name: 'Brand Lover', clicks: 1560, conversions: 210, cpc: 1.5, color: '#ec4899' },
        { name: 'Early Adopter', clicks: 1340, conversions: 180, cpc: 1.3, color: '#f59e0b' },
        { name: 'Quality Seeker', clicks: 980, conversions: 150, cpc: 1.8, color: '#10b981' },
    ];

    // Industry Performance Data
    const industryData = [
        { industry: 'Fashion', impressions: 125000, clicks: 4200, conversions: 580, spend: 8500, ctr: 3.36, cvr: 13.8 },
        { industry: 'Beauty', impressions: 98000, clicks: 3100, conversions: 420, spend: 6200, ctr: 3.16, cvr: 13.5 },
        { industry: 'Technology', impressions: 85000, clicks: 2800, conversions: 350, spend: 5800, ctr: 3.29, cvr: 12.5 },
        { industry: 'Food & Beverage', impressions: 72000, clicks: 2200, conversions: 280, spend: 4200, ctr: 3.05, cvr: 12.7 },
        { industry: 'Travel', impressions: 45000, clicks: 1400, conversions: 180, spend: 3200, ctr: 3.11, cvr: 12.8 },
    ];

    // Attribute Performance Data (NEW)
    const attributeData = {
        pricePositioning: [
            { name: 'Luxury', impressions: 45000, clicks: 1800, conversions: 320, cpc: 2.1, color: '#8b5cf6' },
            { name: 'Premium', impressions: 82000, clicks: 2900, conversions: 480, cpc: 1.5, color: '#6366f1' },
            { name: 'Mid', impressions: 65000, clicks: 2100, conversions: 290, cpc: 1.2, color: '#3b82f6' },
            { name: 'Value', impressions: 38000, clicks: 1200, conversions: 150, cpc: 0.9, color: '#22c55e' },
        ],
        sustainability: [
            { name: 'Eco-Friendly', impressions: 52000, clicks: 2200, conversions: 380, cpc: 1.4, score: 85 },
            { name: 'Fair Trade', impressions: 28000, clicks: 950, conversions: 120, cpc: 1.3, score: 72 },
            { name: 'Vegan', impressions: 35000, clicks: 1400, conversions: 180, cpc: 1.2, score: 78 },
            { name: 'Organic', impressions: 42000, clicks: 1650, conversions: 220, cpc: 1.5, score: 80 },
        ],
        businessModel: [
            { name: 'Direct to Consumer', value: 35, color: '#8b5cf6' },
            { name: 'Subscription', value: 25, color: '#3b82f6' },
            { name: 'Marketplace', value: 20, color: '#22c55e' },
            { name: 'Resale/Secondhand', value: 12, color: '#f59e0b' },
            { name: 'Rental', value: 8, color: '#ec4899' },
        ],
        channelPreference: [
            { channel: 'Online First', A: 85, fullMark: 100 },
            { channel: 'Mobile First', A: 78, fullMark: 100 },
            { channel: 'Omnichannel', A: 65, fullMark: 100 },
            { channel: 'Social Commerce', A: 72, fullMark: 100 },
            { channel: 'Offline First', A: 45, fullMark: 100 },
        ],
        purchaseDecision: [
            { name: 'Brand Loyal', conversions: 420, avgOrderValue: 85000 },
            { name: 'Research Heavy', conversions: 380, avgOrderValue: 72000 },
            { name: 'Deal Seeker', conversions: 520, avgOrderValue: 48000 },
            { name: 'Trend Seeker', conversions: 290, avgOrderValue: 68000 },
            { name: 'Impulse', conversions: 180, avgOrderValue: 35000 },
        ],
    };

    // Attribute Comparison Treemap Data
    const attributeTreemapData = [
        { name: 'Luxury', size: 320, fill: '#8b5cf6' },
        { name: 'Premium', size: 480, fill: '#6366f1' },
        { name: 'Eco-Friendly', size: 380, fill: '#22c55e' },
        { name: 'DTC', size: 350, fill: '#3b82f6' },
        { name: 'Subscription', size: 250, fill: '#f59e0b' },
        { name: 'Online First', size: 420, fill: '#ec4899' },
        { name: 'Brand Loyal', size: 420, fill: '#14b8a6' },
    ];

    const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899'];

    const tabs = [
        { id: 'overview', label: '전체 개요', icon: TrendingUp },
        { id: 'industry', label: '산업별 분석', icon: Building2 },
        { id: 'attribute', label: '속성별 분석', icon: Tags },
        { id: 'persona', label: '페르소나 분석', icon: Users },
    ];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">캠페인 분석 리포트</h2>
                    <p className="text-gray-500">Industry × Attribute 기반 성과 분석</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600"
                    >
                        <option value="7d">최근 7일</option>
                        <option value="14d">최근 14일</option>
                        <option value="30d">최근 30일</option>
                        <option value="90d">최근 90일</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 shadow-sm">
                        <Download size={18} />
                        <span>CSV 내보내기</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === tab.id
                                ? 'bg-brand-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <tab.icon size={18} />
                        <span className="hidden md:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: '총 노출', value: '368K', change: '+12.5%', up: true },
                            { label: '총 클릭', value: '12.3K', change: '+8.2%', up: true },
                            { label: '전환', value: '2,337', change: '+15.3%', up: true },
                            { label: '총 지출', value: '₩32.1M', change: '-2.1%', up: false },
                        ].map((kpi, i) => (
                            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-gray-500 text-sm">{kpi.label}</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{kpi.value}</p>
                                <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${kpi.up ? 'text-green-600' : 'text-red-500'}`}>
                                    {kpi.up ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                    {kpi.change}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">일별 지출 & 전환 추이</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={performanceData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" />
                                        <YAxis yAxisId="left" />
                                        <YAxis yAxisId="right" orientation="right" />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Legend />
                                        <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#8b5cf6" strokeWidth={2} name="지출 (₩)" />
                                        <Line yAxisId="right" type="monotone" dataKey="conversion" stroke="#22c55e" strokeWidth={2} name="전환" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">페르소나별 성과</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={personaData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="conversions" radius={[0, 4, 4, 0]} barSize={20}>
                                            {personaData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Industry Tab */}
            {activeTab === 'industry' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">산업별 캠페인 성과</h3>
                            <p className="text-sm text-gray-500 mt-1">Industry 분류별 상세 지표</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">산업</th>
                                        <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">노출</th>
                                        <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">클릭</th>
                                        <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">CTR</th>
                                        <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">전환</th>
                                        <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">CVR</th>
                                        <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">지출</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {industryData.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{row.industry}</td>
                                            <td className="px-6 py-4 text-right text-gray-600">{row.impressions.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-gray-600">{row.clicks.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-gray-600">{row.ctr.toFixed(2)}%</td>
                                            <td className="px-6 py-4 text-right text-gray-900 font-semibold">{row.conversions.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-green-600 font-semibold">{row.cvr.toFixed(1)}%</td>
                                            <td className="px-6 py-4 text-right text-gray-600">₩{(row.spend / 1000).toFixed(0)}K</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">산업별 전환 분포</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={industryData.map(d => ({ name: d.industry, value: d.conversions }))}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {industryData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">산업별 CTR 비교</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={industryData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="industry" />
                                        <YAxis domain={[0, 5]} />
                                        <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                        <Bar dataKey="ctr" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="CTR (%)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Attribute Tab - NEW */}
            {activeTab === 'attribute' && (
                <div className="space-y-6">
                    {/* Attribute Overview Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: '최고 CVR 속성', value: 'Eco-Friendly', sub: '지속가능성', color: 'text-green-600' },
                            { label: '최저 CPC 속성', value: 'Value', sub: '가격 포지셔닝', color: 'text-blue-600' },
                            { label: '최고 전환 속성', value: 'Premium', sub: '가격 포지셔닝', color: 'text-purple-600' },
                            { label: '트렌드 상승 속성', value: 'Subscription', sub: '비즈니스 모델', color: 'text-orange-600' },
                        ].map((card, i) => (
                            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-gray-500 text-sm">{card.label}</p>
                                <p className={`text-xl font-black mt-1 ${card.color}`}>{card.value}</p>
                                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Price Positioning Analysis */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-lg">💰</span>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">가격 포지셔닝별 성과</h3>
                                <p className="text-sm text-gray-500">Price_Positioning 속성 분석</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={attributeData.pricePositioning}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                        <Legend />
                                        <Bar dataKey="impressions" fill="#e2e8f0" name="노출" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="conversions" fill="#8b5cf6" name="전환" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-3">
                                {attributeData.pricePositioning.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            <span className="font-medium text-gray-800">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-6 text-sm">
                                            <div className="text-right">
                                                <p className="text-gray-500">CVR</p>
                                                <p className="font-bold text-gray-900">{((item.conversions / item.clicks) * 100).toFixed(1)}%</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-gray-500">CPC</p>
                                                <p className="font-bold text-gray-900">₩{(item.cpc * 1000).toFixed(0)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sustainability & Business Model */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sustainability */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-lg">🌱</span>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">지속가능성 속성</h3>
                                    <p className="text-sm text-gray-500">Sustainability 속성 분석</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {attributeData.sustainability.map((item, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-gray-700">{item.name}</span>
                                            <span className="text-gray-500">{item.conversions} 전환 (CPC ₩{(item.cpc * 1000).toFixed(0)})</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                                                style={{ width: `${item.score}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Business Model */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-lg">🏢</span>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">비즈니스 모델 분포</h3>
                                    <p className="text-sm text-gray-500">Business_Model 속성 분석</p>
                                </div>
                            </div>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={attributeData.businessModel}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {attributeData.businessModel.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => `${value}%`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {attributeData.businessModel.map((item, i) => (
                                    <span key={i} className="flex items-center gap-1.5 text-xs">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                                        {item.name} ({item.value}%)
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Channel Preference & Purchase Decision */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Channel Preference Radar */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-lg">📱</span>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">채널 선호도</h3>
                                    <p className="text-sm text-gray-500">Channel_Preference 속성 분석</p>
                                </div>
                            </div>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={attributeData.channelPreference}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="channel" tick={{ fontSize: 11 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                        <Radar name="전환 점유율" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Purchase Decision Style */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-lg">🛒</span>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">구매 결정 스타일</h3>
                                    <p className="text-sm text-gray-500">Purchase_Decision_Style 속성 분석</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {attributeData.purchaseDecision.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <span className="font-medium text-gray-800">{item.name}</span>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">전환</p>
                                                <p className="font-bold text-brand-600">{item.conversions}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">AOV</p>
                                                <p className="font-bold text-gray-900">₩{(item.avgOrderValue / 1000).toFixed(0)}K</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Attribute Treemap Visualization */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center text-lg">📊</span>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">속성별 전환 비중</h3>
                                <p className="text-sm text-gray-500">모든 Attribute의 전환 기여도</p>
                            </div>
                        </div>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <Treemap
                                    data={attributeTreemapData}
                                    dataKey="size"
                                    aspectRatio={4 / 3}
                                    stroke="#fff"
                                    content={({ x, y, width, height, name, fill }: any) => (
                                        <g>
                                            <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} />
                                            {width > 60 && height > 30 && (
                                                <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">
                                                    {name}
                                                </text>
                                            )}
                                        </g>
                                    )}
                                />
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Persona Tab */}
            {activeTab === 'persona' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">페르소나별 전환 효율</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={personaData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} />
                                        <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                        <Legend />
                                        <Bar dataKey="clicks" fill="#94a3b8" name="클릭" radius={[0, 4, 4, 0]} barSize={16} />
                                        <Bar dataKey="conversions" fill="#8b5cf6" name="전환" radius={[0, 4, 4, 0]} barSize={16} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">페르소나별 CPC 비교</h3>
                            <div className="space-y-4">
                                {personaData.map((persona, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-24 truncate font-medium text-gray-700">{persona.name}</div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${(persona.cpc / 2) * 100}%`,
                                                        backgroundColor: persona.color
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="w-20 text-right font-bold text-gray-900">₩{(persona.cpc * 1000).toFixed(0)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">페르소나 × 속성 교차 분석</h3>
                        <p className="text-sm text-gray-500 mb-4">어떤 페르소나가 어떤 속성에서 가장 높은 성과를 보이는지 분석</p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">페르소나</th>
                                        <th className="px-4 py-3 text-center font-semibold text-gray-600">최고 산업</th>
                                        <th className="px-4 py-3 text-center font-semibold text-gray-600">가격 선호</th>
                                        <th className="px-4 py-3 text-center font-semibold text-gray-600">채널 선호</th>
                                        <th className="px-4 py-3 text-center font-semibold text-gray-600">구매 스타일</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { name: 'Trend Setter', industry: 'Fashion', price: 'Premium', channel: 'Mobile First', style: 'Trend Seeker' },
                                        { name: 'Smart Saver', industry: 'Technology', price: 'Value', channel: 'Online First', style: 'Deal Seeker' },
                                        { name: 'Brand Lover', industry: 'Beauty', price: 'Luxury', channel: 'Omnichannel', style: 'Brand Loyal' },
                                        { name: 'Early Adopter', industry: 'Technology', price: 'Premium', channel: 'Mobile First', style: 'Trend Seeker' },
                                        { name: 'Quality Seeker', industry: 'Fashion', price: 'Premium', channel: 'Offline First', style: 'Research Heavy' },
                                    ].map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 bg-brand-100 text-brand-700 rounded-lg text-xs">{row.industry}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs">{row.price}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">{row.channel}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs">{row.style}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
