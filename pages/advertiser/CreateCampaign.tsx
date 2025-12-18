import React, { useState, useEffect } from 'react';
import {
    Palette, Users, Calendar, DollarSign, ChevronRight, Check, Upload,
    Image as ImageIcon, Building2, Tags, Target, Loader2, ChevronDown, Plus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useApp } from '../../context/AppContext';

interface SavedAudience {
    id: string;
    name: string;
    industryPaths: string[];
    attributes: Record<string, string[]>;
    estimatedReach: number;
    createdAt: any;
}

interface CampaignData {
    name: string;
    objective: 'awareness' | 'conversion';
    // Industry targeting (What)
    industryPaths: string[];
    // Attribute targeting (How)
    attributes: Record<string, string[]>;
    // Saved audience reference
    audienceId?: string;
    // Creative
    creativeHeadline: string;
    creativeDescription: string;
    destinationUrl: string;
    // Budget
    dailyBudget: number;
}

// Industry Taxonomy (simplified for UI)
const INDUSTRY_OPTIONS: Record<string, string[]> = {
    Fashion: ['Apparel', 'Footwear', 'Accessories'],
    Beauty: ['Skincare', 'Makeup', 'Haircare', 'Fragrance'],
    Technology: ['Consumer_Electronics', 'Software', 'Gaming', 'Wearables'],
    Food_Beverage: ['Restaurant', 'Beverage', 'Grocery', 'Delivery_Service'],
    Travel: ['Airline', 'Hotel', 'Tour', 'Transportation'],
    Finance: ['Banking', 'Investment', 'Insurance', 'Fintech'],
    Health_Wellness: ['Fitness', 'Nutrition', 'Medical_Service', 'Mental_Health'],
    Education: ['Online_Course', 'Institution', 'Certification', 'EdTech'],
    Entertainment: ['Streaming', 'Event', 'Media', 'Sports'],
    Home_Living: ['Furniture', 'Interior', 'Appliances', 'Real_Estate'],
};

// Attribute Options
const ATTRIBUTE_OPTIONS: Record<string, { label: string; values: string[] }> = {
    Price_Positioning: { label: '가격 포지셔닝', values: ['Mass', 'Value', 'Mid', 'Premium', 'Luxury'] },
    Sustainability: { label: '지속가능성', values: ['Eco_Friendly', 'Vegan', 'Fair_Trade', 'Organic'] },
    Business_Model: { label: '비즈니스 모델', values: ['DTC', 'Subscription', 'Marketplace', 'Rental'] },
    Channel_Preference: { label: '채널 선호', values: ['Online_First', 'Mobile_First', 'Omnichannel'] },
    Purchase_Style: { label: '구매 스타일', values: ['Brand_Loyal', 'Deal_Seeker', 'Trend_Seeker', 'Impulse'] },
};

const CreateCampaign: React.FC = () => {
    const { addToast } = useApp();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingAudiences, setIsLoadingAudiences] = useState(false);
    const [savedAudiences, setSavedAudiences] = useState<SavedAudience[]>([]);
    const [useExistingAudience, setUseExistingAudience] = useState(false);
    const [expandedIndustry, setExpandedIndustry] = useState<string | null>(null);

    const [formData, setFormData] = useState<CampaignData>({
        name: '',
        objective: 'awareness',
        industryPaths: [],
        attributes: {},
        creativeHeadline: '',
        creativeDescription: '',
        destinationUrl: '',
        dailyBudget: 50000,
    });

    const steps = [
        { id: 1, label: '캠페인 설정', icon: Palette },
        { id: 2, label: '타겟팅', icon: Target },
        { id: 3, label: '크리에이티브', icon: ImageIcon },
        { id: 4, label: '예산 & 검토', icon: DollarSign },
    ];

    // Load saved audiences
    useEffect(() => {
        loadSavedAudiences();
    }, []);

    const loadSavedAudiences = async () => {
        setIsLoadingAudiences(true);
        try {
            const functions = getFunctions();
            const getMyAudiences = httpsCallable(functions, 'getMyAudiences');
            const result = await getMyAudiences({});
            const data = result.data as any;
            if (data.success && data.audiences) {
                setSavedAudiences(data.audiences);
            }
        } catch (error) {
            console.warn('Failed to load audiences:', error);
        }
        setIsLoadingAudiences(false);
    };

    const selectSavedAudience = (audience: SavedAudience) => {
        setFormData(prev => ({
            ...prev,
            audienceId: audience.id,
            industryPaths: audience.industryPaths,
            attributes: audience.attributes,
        }));
    };

    const toggleIndustry = (industry: string, category: string) => {
        const path = `${industry}.${category}`;
        setFormData(prev => ({
            ...prev,
            industryPaths: prev.industryPaths.includes(path)
                ? prev.industryPaths.filter(p => p !== path)
                : [...prev.industryPaths, path]
        }));
    };

    const toggleAttribute = (type: string, value: string) => {
        setFormData(prev => {
            const current = prev.attributes[type] || [];
            const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            return {
                ...prev,
                attributes: {
                    ...prev.attributes,
                    [type]: updated
                }
            };
        });
    };

    const estimateReach = () => {
        let baseReach = 5000;
        // Industry factor
        baseReach += formData.industryPaths.length * 2000;
        // Attribute factor (more filters = more targeted = fewer users)
        const attrCount = Object.values(formData.attributes).flat().length;
        const attrFactor = attrCount > 0 ? Math.max(0.5, 1 - attrCount * 0.08) : 1;
        return Math.floor(baseReach * attrFactor);
    };

    const selectedAttributesCount = Object.values(formData.attributes).flat().length;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const functions = getFunctions();
            const createCampaignFn = httpsCallable(functions, 'createCampaign');

            const result = await createCampaignFn({
                name: formData.name,
                objective: formData.objective,
                industryPaths: formData.industryPaths,
                attributes: formData.attributes,
                audienceId: formData.audienceId,
                creativeHeadline: formData.creativeHeadline,
                creativeDescription: formData.creativeDescription,
                destinationUrl: formData.destinationUrl,
                dailyBudget: formData.dailyBudget,
                estimatedReach: estimateReach()
            });

            const data = result.data as any;
            if (data?.success) {
                addToast('캠페인이 성공적으로 생성되었습니다!', 'success');
                setStep(1);
                setFormData({
                    name: '',
                    objective: 'awareness',
                    industryPaths: [],
                    attributes: {},
                    creativeHeadline: '',
                    creativeDescription: '',
                    destinationUrl: '',
                    dailyBudget: 50000,
                });
            }
        } catch (error: any) {
            console.error(error);
            addToast(`캠페인 생성 실패: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">새 캠페인 만들기</h2>
                <p className="text-gray-500">Industry × Attribute 기반 정밀 타겟팅</p>
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[550px] flex flex-col">
                <div className="p-8 flex-1">
                    {/* Step 1: Campaign Setup */}
                    {step === 1 && (
                        <div className="space-y-6 max-w-lg mx-auto">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">캠페인 이름</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all outline-none"
                                    placeholder="예: 2024 겨울 시즌 프로모션"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">캠페인 목표</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'awareness', label: '브랜드 인지도', desc: '노출 극대화' },
                                        { id: 'conversion', label: '전환', desc: '구매/액션 유도' },
                                    ].map((obj) => (
                                        <button
                                            key={obj.id}
                                            onClick={() => setFormData({ ...formData, objective: obj.id as any })}
                                            className={`px-4 py-3 rounded-xl border text-left transition-all ${formData.objective === obj.id ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <span className="block font-bold">{obj.label}</span>
                                            <span className="text-xs text-gray-500">{obj.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Targeting - Industry & Attributes */}
                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Use Existing Audience Toggle */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-bold text-gray-800">저장된 오디언스 사용</p>
                                    <p className="text-sm text-gray-500">이전에 만든 타겟팅 설정 불러오기</p>
                                </div>
                                <button
                                    onClick={() => setUseExistingAudience(!useExistingAudience)}
                                    className={`w-12 h-6 rounded-full transition-colors ${useExistingAudience ? 'bg-brand-600' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${useExistingAudience ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            {useExistingAudience ? (
                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold text-gray-800">저장된 오디언스 선택</h3>
                                    {isLoadingAudiences ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="animate-spin text-brand-500" size={24} />
                                        </div>
                                    ) : savedAudiences.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>저장된 오디언스가 없습니다.</p>
                                            <p className="text-sm mt-1">Audience Targeting 페이지에서 먼저 생성해주세요.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {savedAudiences.map(audience => (
                                                <button
                                                    key={audience.id}
                                                    onClick={() => selectSavedAudience(audience)}
                                                    className={`p-4 rounded-xl border text-left transition-all ${formData.audienceId === audience.id ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                                                >
                                                    <p className="font-bold text-gray-900">{audience.name}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        산업: {audience.industryPaths.length}개 |
                                                        속성: {Object.values(audience.attributes || {}).flat().length}개
                                                    </p>
                                                    <p className="text-sm text-brand-600 font-medium mt-2">
                                                        ~{audience.estimatedReach?.toLocaleString() || 0} 도달
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Industry Selection */}
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <Building2 size={20} className="text-brand-500" />
                                            산업 분류 (What)
                                        </h3>
                                        <div className="border border-gray-200 rounded-xl max-h-[300px] overflow-auto">
                                            {Object.entries(INDUSTRY_OPTIONS).map(([industry, categories]) => (
                                                <div key={industry} className="border-b border-gray-100 last:border-b-0">
                                                    <button
                                                        onClick={() => setExpandedIndustry(expandedIndustry === industry ? null : industry)}
                                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                                                    >
                                                        <span className="font-medium text-gray-800">{industry.replace(/_/g, ' ')}</span>
                                                        <div className="flex items-center gap-2">
                                                            {formData.industryPaths.filter(p => p.startsWith(industry)).length > 0 && (
                                                                <span className="px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full text-xs">
                                                                    {formData.industryPaths.filter(p => p.startsWith(industry)).length}
                                                                </span>
                                                            )}
                                                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedIndustry === industry ? 'rotate-180' : ''}`} />
                                                        </div>
                                                    </button>
                                                    {expandedIndustry === industry && (
                                                        <div className="bg-gray-50 px-4 pb-3 flex flex-wrap gap-2">
                                                            {categories.map(cat => {
                                                                const path = `${industry}.${cat}`;
                                                                const isSelected = formData.industryPaths.includes(path);
                                                                return (
                                                                    <button
                                                                        key={cat}
                                                                        onClick={() => toggleIndustry(industry, cat)}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isSelected ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'}`}
                                                                    >
                                                                        {cat.replace(/_/g, ' ')}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Attribute Selection */}
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <Tags size={20} className="text-indigo-500" />
                                            속성 필터 (How)
                                        </h3>
                                        <div className="space-y-4">
                                            {Object.entries(ATTRIBUTE_OPTIONS).map(([type, config]) => (
                                                <div key={type}>
                                                    <p className="text-sm font-medium text-gray-700 mb-2">{config.label}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {config.values.map(value => {
                                                            const isSelected = formData.attributes[type]?.includes(value);
                                                            return (
                                                                <button
                                                                    key={value}
                                                                    onClick={() => toggleAttribute(type, value)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                                >
                                                                    {value.replace(/_/g, ' ')}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reach Estimate */}
                            <div className="bg-gray-900 text-white rounded-xl p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm">예상 도달</p>
                                    <p className="text-3xl font-black text-brand-400">{estimateReach().toLocaleString()} <span className="text-lg text-gray-400 font-normal">users</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400 text-sm">선택된 타겟</p>
                                    <p className="text-white">산업 {formData.industryPaths.length}개 × 속성 {selectedAttributesCount}개</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Creative */}
                    {step === 3 && (
                        <div className="space-y-6 max-w-lg mx-auto">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">헤드라인</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all outline-none"
                                    placeholder="예: 겨울 SALE 최대 50% 할인!"
                                    value={formData.creativeHeadline}
                                    onChange={e => setFormData({ ...formData, creativeHeadline: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">설명</label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all outline-none h-24 resize-none"
                                    placeholder="광고 설명을 입력하세요..."
                                    value={formData.creativeDescription}
                                    onChange={e => setFormData({ ...formData, creativeDescription: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">랜딩 URL</label>
                                <input
                                    type="url"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all outline-none"
                                    placeholder="https://example.com/landing"
                                    value={formData.destinationUrl}
                                    onChange={e => setFormData({ ...formData, destinationUrl: e.target.value })}
                                />
                            </div>

                            {/* Preview */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-sm font-bold text-gray-700 mb-3">광고 미리보기</p>
                                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                                    <p className="font-bold text-gray-900">{formData.creativeHeadline || '헤드라인'}</p>
                                    <p className="text-sm text-gray-600 mt-1">{formData.creativeDescription || '설명 텍스트...'}</p>
                                    <p className="text-xs text-brand-600 mt-2">{formData.destinationUrl || 'https://...'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Budget & Review */}
                    {step === 4 && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">일일 예산</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₩</span>
                                        <input
                                            type="number"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all outline-none"
                                            value={formData.dailyBudget}
                                            onChange={e => setFormData({ ...formData, dailyBudget: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">최소 일일 예산: ₩10,000</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-500">예상 일일 도달</p>
                                    <p className="text-2xl font-black text-gray-900 mt-1">{Math.floor(estimateReach() * (formData.dailyBudget / 50000)).toLocaleString()} users</p>
                                    <p className="text-sm text-gray-500 mt-2">예상 CPM: ₩{Math.floor(formData.dailyBudget / estimateReach() * 1000).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Review Summary */}
                            <div className="bg-gray-50 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">캠페인 요약</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">캠페인 이름</p>
                                        <p className="font-medium text-gray-900">{formData.name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">목표</p>
                                        <p className="font-medium text-gray-900 capitalize">{formData.objective}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">산업 타겟</p>
                                        <p className="font-medium text-gray-900">{formData.industryPaths.length}개 선택</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">속성 필터</p>
                                        <p className="font-medium text-gray-900">{selectedAttributesCount}개 적용</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">헤드라인</p>
                                        <p className="font-medium text-gray-900">{formData.creativeHeadline || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">일일 예산</p>
                                        <p className="font-medium text-gray-900">₩{formData.dailyBudget.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Selected Tags */}
                                {formData.industryPaths.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <p className="text-xs text-gray-500 mb-2">산업 타겟</p>
                                        <div className="flex flex-wrap gap-1">
                                            {formData.industryPaths.map(path => (
                                                <span key={path} className="px-2 py-1 bg-brand-100 text-brand-700 rounded text-xs">{path.replace('.', ' > ')}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {selectedAttributesCount > 0 && (
                                    <div className="mt-3">
                                        <p className="text-xs text-gray-500 mb-2">속성 필터</p>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(formData.attributes).flatMap(([type, values]) =>
                                                values.map(v => (
                                                    <span key={`${type}-${v}`} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">{v.replace(/_/g, ' ')}</span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="p-6 border-t border-gray-100 flex justify-between">
                    <button
                        onClick={() => setStep(step - 1)}
                        disabled={step === 1}
                        className="px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        이전
                    </button>
                    {step < 4 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 flex items-center gap-2 transition-all shadow-sm"
                        >
                            다음 <ChevronRight size={20} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.name}
                            className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                            캠페인 생성
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateCampaign;
