import React, { useState } from 'react';
import { Palette, Users, Calendar, DollarSign, ChevronRight, Check, Upload, Image as ImageIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { useApp } from '../../context/AppContext'; // For toast

interface CampaignData {
    name: string;
    objective: string;
    productCategory: string;
    targetPersonas: string[];
    creativeHeadline: string;
    creativeLink: string;
    budget: number;
}

const PERSONA_TYPES = [
    { id: 'Trend Setter', label: 'Trend Setter', color: '#8b5cf6', desc: 'Sensitive to new trends, high spending' },
    { id: 'Smart Saver', label: 'Smart Saver', color: '#22c55e', desc: 'Price conscious, high comparison' },
    { id: 'Impulsive', label: 'Impulsive Buyer', color: '#ef4444', desc: 'Immediate purchase decisions' },
    { id: 'Whale', label: 'Whale', color: '#eab308', desc: 'High purchasing power, luxury focus' },
    { id: 'Tech Savvy', label: 'Tech Savvy', color: '#3b82f6', desc: 'Early adopter of technology' },
];

const CreateCampaign: React.FC = () => {
    const { addToast } = useApp();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<CampaignData>({
        name: '',
        objective: 'awareness',
        productCategory: '',
        targetPersonas: [],
        creativeHeadline: '',
        creativeLink: '',
        budget: 1000,
    });

    const steps = [
        { id: 1, label: 'Campaign Setup', icon: Palette },
        { id: 2, label: 'Targeting', icon: Users },
        { id: 3, label: 'Creative', icon: ImageIcon },
        { id: 4, label: 'Budget & Review', icon: DollarSign },
    ];

    const estimateReach = () => {
        // Mock calculation logic synced with Cloud Function logic
        let baseReach = 1000;
        if (formData.targetPersonas.length > 0) {
            baseReach += formData.targetPersonas.length * 500;
        }
        return baseReach;
    };

    const handlePersonaToggle = (id: string) => {
        setFormData(prev => ({
            ...prev,
            targetPersonas: prev.targetPersonas.includes(id)
                ? prev.targetPersonas.filter(p => p !== id)
                : [...prev.targetPersonas, id]
        }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const functions = getFunctions();
            const createCampaignFn = httpsCallable(functions, 'createCampaign');

            const result = await createCampaignFn({
                ...formData,
                estimatedReach: estimateReach()
            });

            // @ts-ignore
            if (result.data && result.data.success) {
                addToast('Campaign submitted successfully! Pending approval.', 'success');
                // Redirect or reset (Here we just reset for demo)
                setStep(1);
                setFormData({
                    name: '',
                    objective: 'awareness',
                    productCategory: '',
                    targetPersonas: [],
                    creativeHeadline: '',
                    creativeLink: '',
                    budget: 1000,
                });
            }
        } catch (error: any) {
            console.error(error);
            addToast(`Error submitting campaign: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Create New Campaign</h2>
                <p className="text-gray-500">Reach your perfect audience with VIEW Personas.</p>
            </div>

            {/* Progress Stepper */}
            <div className="mb-8 flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -z-10" />
                {steps.map((s) => (
                    <div key={s.id} className={`flex flex-col items-center bg-gray-50 px-2`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${step >= s.id ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                            {step > s.id ? <Check size={20} /> : <s.icon size={20} />}
                        </div>
                        <span className={`text-xs mt-2 font-medium ${step >= s.id ? 'text-brand-600' : 'text-gray-400'}`}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-8 flex-1">
                    {/* Step 1: Setup */}
                    {step === 1 && (
                        <div className="space-y-6 max-w-lg mx-auto">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Campaign Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all outline-none"
                                    placeholder="e.g., Summer Sale 2025"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Objective</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['awareness', 'conversion'].map((obj) => (
                                        <button
                                            key={obj}
                                            onClick={() => setFormData({ ...formData, objective: obj })}
                                            className={`px-4 py-3 rounded-xl border text-left transition-all ${formData.objective === obj ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <span className="block font-bold capitalize">{obj}</span>
                                            <span className="text-xs text-gray-500">
                                                {obj === 'awareness' ? 'Maximize impressions' : 'Drive sales & actions'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Product Category</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 outline-none"
                                    value={formData.productCategory}
                                    onChange={e => setFormData({ ...formData, productCategory: e.target.value })}
                                >
                                    <option value="">Select a category</option>
                                    <option value="fashion">Fashion & Apparel</option>
                                    <option value="beauty">Beauty & Cosmetics</option>
                                    <option value="tech">Electronics & Tech</option>
                                    <option value="food">Food & Beverage</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Targeting */}
                    {step === 2 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800">Select Target Personas</h3>
                                <div className="space-y-3">
                                    {PERSONA_TYPES.map(persona => (
                                        <div
                                            key={persona.id}
                                            onClick={() => handlePersonaToggle(persona.id)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${formData.targetPersonas.includes(persona.id) ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: persona.color }} />
                                                <div>
                                                    <p className="font-bold text-gray-900">{persona.label}</p>
                                                    <p className="text-xs text-gray-500">{persona.desc}</p>
                                                </div>
                                            </div>
                                            {formData.targetPersonas.includes(persona.id) && <Check size={20} className="text-brand-600" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-900 text-white rounded-2xl p-6 flex flex-col justify-center">
                                <h3 className="text-lg font-bold mb-2">Estimated Reach</h3>
                                <div className="text-4xl font-black mb-1 text-brand-400">
                                    {estimateReach().toLocaleString()} <span className="text-lg text-gray-400 font-normal">Users</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-8">
                                    Based on your selected personas and product category.
                                </p>

                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[{ name: 'Reach', value: estimateReach() }]}>
                                            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 4, 4]} barSize={40} />
                                            <XAxis dataKey="name" hide />
                                            <YAxis hide />
                                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1f2937', color: 'white' }} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="mt-4 p-4 bg-white/10 rounded-xl text-sm">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-300">Est. Daily Impressions</span>
                                        <span className="font-bold">{(estimateReach() * 1.5).toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">Suggested Bid</span>
                                        <span className="font-bold text-brand-300">12 VIEW / Click</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Creative */}
                    {step === 3 && (
                        <div className="max-w-lg mx-auto space-y-6">
                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-brand-300 hover:bg-brand-50 transition-colors cursor-pointer bg-gray-50">
                                <Upload size={32} className="mb-2" />
                                <span className="font-bold">Upload Ad Image/Video</span>
                                <span className="text-xs">Supports JPG, PNG, MP4</span>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Headline</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 outline-none"
                                    placeholder="e.g., Get 50% Off Today!"
                                    value={formData.creativeHeadline}
                                    onChange={e => setFormData({ ...formData, creativeHeadline: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Destination URL</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 outline-none"
                                    placeholder="https://myshop.com/product"
                                    value={formData.creativeLink}
                                    onChange={e => setFormData({ ...formData, creativeLink: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Budget & Review */}
                    {step === 4 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold">Budget Settings</h3>
                                <div>
                                    <label className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                                        <span>Daily Budget (VIEW)</span>
                                        <span className="text-brand-600">{formData.budget.toLocaleString()} VIEW</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="100" max="10000" step="100"
                                        value={formData.budget}
                                        onChange={e => setFormData({ ...formData, budget: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                                    />
                                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                                        <span>100 VIEW</span>
                                        <span>10,000 VIEW</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <h3 className="text-lg font-bold mb-4">Summary</h3>
                                <dl className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500">Name</dt>
                                        <dd className="font-medium">{formData.name || 'Untitled'}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500">Targeting</dt>
                                        <dd className="font-medium">{formData.targetPersonas.length > 0 ? formData.targetPersonas.join(', ') : 'All Users'}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500">Est. Reach</dt>
                                        <dd className="font-medium">{estimateReach().toLocaleString()} Users</dd>
                                    </div>
                                    <div className="border-t pt-3 flex justify-between font-bold text-lg">
                                        <dt>Total Budget</dt>
                                        <dd className="text-brand-600">{formData.budget.toLocaleString()} VIEW</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-gray-100 flex justify-between bg-gray-50">
                    <button
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1 || isSubmitting}
                        className="px-6 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={step === 4 ? handleSubmit : () => setStep(s => Math.min(4, s + 1))}
                        disabled={isSubmitting}
                        className={`flex items-center gap-2 px-8 py-2 rounded-xl font-bold transition-colors shadow-lg ${step === 4 ? 'bg-green-600 hover:bg-green-700 shadow-green-200 text-white' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-200 text-white'}`}
                    >
                        {isSubmitting ? 'Submitting...' : step === 4 ? 'Submit Campaign' : 'Next Step'}
                        {!isSubmitting && <ChevronRight size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateCampaign;
