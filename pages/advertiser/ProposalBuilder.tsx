import React, { useState } from 'react';
import { FileText, Target, DollarSign, PenTool, Printer, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const ProposalBuilder: React.FC = () => {
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [inputs, setInputs] = useState({
        industry: '',
        objective: 'awareness',
        budget: 5000,
        competitors: ''
    });

    const generateProposal = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setStep(2);
        }, 2000);
    };

    const budgetAllocation = [
        { name: 'Trend Setter', value: 40, color: '#8b5cf6' },
        { name: 'Smart Saver', value: 30, color: '#22c55e' },
        { name: 'Other', value: 30, color: '#cbd5e1' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {step === 1 ? (
                // Input Form
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Campaign Proposal Builder</h2>
                        <p className="text-gray-500">Generate a data-driven strategy for your next campaign.</p>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Industry</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-brand-500"
                                    value={inputs.industry}
                                    onChange={e => setInputs({ ...inputs, industry: e.target.value })}
                                >
                                    <option value="">Select Industry</option>
                                    <option value="fashion">Fashion</option>
                                    <option value="tech">Technology</option>
                                    <option value="fnb">Food & Beverage</option>
                                    <option value="beauty">Beauty</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Campaign Objective</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-brand-500"
                                    value={inputs.objective}
                                    onChange={e => setInputs({ ...inputs, objective: e.target.value })}
                                >
                                    <option value="awareness">Brand Awareness</option>
                                    <option value="conversion">Sales Conversion</option>
                                    <option value="traffic">Traffic Growth</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Total Budget (VIEW)</label>
                            <input
                                type="number"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-brand-500"
                                value={inputs.budget}
                                onChange={e => setInputs({ ...inputs, budget: parseInt(e.target.value) })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Main Competitors</label>
                            <input
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-brand-500"
                                placeholder="e.g. Brand A, Brand B"
                                value={inputs.competitors}
                                onChange={e => setInputs({ ...inputs, competitors: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={generateProposal}
                            disabled={isGenerating || !inputs.industry}
                            className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-all shadow-lg shadow-brand-200"
                        >
                            {isGenerating ? 'Analyzing Data...' : 'Generate Strategy'}
                            {!isGenerating && <PenTool size={18} />}
                        </button>
                    </div>
                </div>
            ) : (
                // Proposal View
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Campaign Strategy Proposal</h2>
                            <p className="text-gray-500">Generated for {inputs.industry} Industry • Budget: {inputs.budget.toLocaleString()} VIEW</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Edit</button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                                <Printer size={16} /> Print
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Executive Summary */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-4 text-brand-600">
                                    <Target size={24} />
                                    <h3 className="text-lg font-bold">Targeting Strategy</h3>
                                </div>
                                <p className="text-gray-600 leading-relaxed mb-4">
                                    Based on the recent performance data in the <strong>{inputs.industry}</strong> sector, we recommend focusing on
                                    <strong> Trend Setters</strong> and <strong>Smart Savers</strong>. These personas show
                                    <strong> 45% higher engagement</strong> for similar campaigns.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <div className="text-sm text-gray-500">Primary Persona</div>
                                        <div className="font-bold text-lg text-gray-900">Trend Setter</div>
                                        <div className="text-xs text-green-600 font-medium">+24% CTR vs Avg</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <div className="text-sm text-gray-500">Secondary Persona</div>
                                        <div className="font-bold text-lg text-gray-900">Smart Saver</div>
                                        <div className="text-xs text-brand-600 font-medium">High Retention</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-4 text-brand-600">
                                    <FileText size={24} />
                                    <h3 className="text-lg font-bold">Creative Direction</h3>
                                </div>
                                <ul className="space-y-3 text-gray-600">
                                    <li className="flex gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-black mt-2"></span>
                                        <span>Use vibrant colors and dynamic motion to appeal to Impulse Buyers.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-black mt-2"></span>
                                        <span>Highlight "Limited Time Offer" for Smart Savers to trigger Fear Of Missing Out (FOMO).</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-black mt-2"></span>
                                        <span>Ensure mobile optimization as 85% of target audience uses mobile.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Budget & KPIs */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-4 text-green-600">
                                    <DollarSign size={24} />
                                    <h3 className="text-lg font-bold">Budget Allocation</h3>
                                </div>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={budgetAllocation}
                                                dataKey="value"
                                                cx="50%" cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                            >
                                                {budgetAllocation.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-2 mt-4">
                                    {budgetAllocation.map(item => (
                                        <div key={item.name} className="flex justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                                <span>{item.name}</span>
                                            </div>
                                            <span className="font-bold">{item.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-brand-900 text-white p-6 rounded-2xl shadow-lg">
                                <h3 className="font-bold text-brand-200 mb-4">Projected Results</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                        <span className="opacity-70 text-sm">Impressions</span>
                                        <span className="text-2xl font-bold">{(inputs.budget * 15).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                        <span className="opacity-70 text-sm">Clicks (Est.)</span>
                                        <span className="text-2xl font-bold">{(inputs.budget * 0.8).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="opacity-70 text-sm">CPC</span>
                                        <span className="text-2xl font-bold">1.25 VIEW</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProposalBuilder;
