import React, { useState, useEffect } from 'react';
import {
    Building2, Users, Target, ChevronRight, ChevronDown, Check,
    Search, Sliders, BarChart3, Globe, MapPin, Package
} from 'lucide-react';
import {
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { useApp } from '../../context/AppContext';

// Taxonomy Tree Structure (loaded from taxonomy_v1.yaml concept)
const TAXONOMY_TREE: Record<string, Record<string, string[]>> = {
    Fashion: {
        Apparel: ['Menswear', 'Womenswear', 'Sportswear', 'Outdoorwear', 'Kidswear'],
        Footwear: ['Sneakers', 'Sandals', 'Boots', 'High Heels'],
        Accessories: ['Bags', 'Watches', 'Jewelry', 'Belts', 'Glasses'],
    },
    Beauty: {
        Skincare: ['Anti-aging', 'Whitening', 'Moisturizing', 'Sunscreen', 'Acne-care'],
        Makeup: ['Lipstick', 'Foundation', 'Mascara', 'Eyeliner'],
        Haircare: ['Shampoo', 'Conditioner', 'Treatment', 'Styling'],
    },
    Technology: {
        Consumer_Electronics: ['Smartphone', 'Laptop', 'Tablet', 'Smartwatch', 'Headphones'],
        Software: ['Productivity', 'Security', 'Cloud Service', 'AI Application'],
        Gaming: ['Console', 'PC Game', 'Mobile Game', 'VR/AR'],
    },
    Food_Beverage: {
        Restaurant: ['Fine Dining', 'Casual Dining', 'Fast Food', 'Franchise Chain'],
        Beverage: ['Coffee', 'Tea', 'Juice', 'Alcohol', 'Energy Drink'],
        Grocery: ['Organic Food', 'Snack', 'Frozen Food', 'Dairy Product'],
    },
    Travel: {
        Airline: ['Budget', 'Full Service', 'Charter'],
        Hotel: ['Luxury', 'Resort', 'Boutique', 'Business'],
        Tour: ['Honeymoon', 'Cultural', 'Adventure', 'Wellness'],
    },
    Finance: {
        Banking: ['Savings Account', 'Loan', 'Credit Card', 'Payment App'],
        Investment: ['Stocks', 'ETF', 'Crypto', 'Real Estate Fund'],
        Insurance: ['Life', 'Health', 'Car', 'Travel'],
    },
    Health_Wellness: {
        Fitness: ['Gym', 'Yoga', 'Pilates', 'Home Training'],
        Nutrition: ['Supplements', 'Vitamins', 'Protein', 'Health Drinks'],
        Medical_Service: ['Clinic', 'Dental', 'Dermatology', 'Aesthetic'],
    },
    Entertainment: {
        Streaming: ['OTT', 'Music', 'Podcast', 'Webtoon'],
        Event: ['Concert', 'Exhibition', 'Festival'],
        Sports: ['Football', 'Golf', 'eSports'],
    },
};

// 10 Traits with Korean labels
const TRAITS_CONFIG = [
    { key: 'priceVsBrand', label: '가격/브랜드', leftLabel: '가격 중시', rightLabel: '브랜드 중시' },
    { key: 'impulseBuying', label: '구매 결정', leftLabel: '신중한 구매', rightLabel: '충동 구매' },
    { key: 'earlyAdopter', label: '신제품 수용', leftLabel: '안정 추구', rightLabel: '얼리어답터' },
    { key: 'onlinePreference', label: '채널 선호', leftLabel: '오프라인', rightLabel: '온라인' },
    { key: 'purchasingPower', label: '구매력', leftLabel: '저예산', rightLabel: '고예산' },
    { key: 'brandLoyalty', label: '브랜드 충성도', leftLabel: '다양한 선택', rightLabel: '충성 고객' },
    { key: 'socialInfluence', label: '사회적 영향', leftLabel: '독립적 결정', rightLabel: '리뷰/인플루언서' },
    { key: 'sustainabilityValue', label: 'ESG 가치', leftLabel: '무관심', rightLabel: '친환경 중시' },
    { key: 'experienceSeeker', label: '경험 추구', leftLabel: '소유 중시', rightLabel: '경험 중시' },
    { key: 'planningHorizon', label: '계획 기간', leftLabel: '즉시 구매', rightLabel: '장기 계획' },
];

interface TargetingData {
    // Step 1
    selectedTaxonomy: string[];
    productName: string;
    priceRange: [number, number];
    salesChannel: string;
    regions: string[];
    // Step 2
    targetTraits: Record<string, [number, number]>;
    // Step 3 (results)
    estimatedReach: number;
    matchedPersonas: { name: string; count: number; color: string }[];
}

const AudienceTargeting: React.FC = () => {
    const { showToast } = useApp();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedIndustries, setExpandedIndustries] = useState<string[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    const [formData, setFormData] = useState<TargetingData>({
        selectedTaxonomy: [],
        productName: '',
        priceRange: [0, 500000],
        salesChannel: 'omni',
        regions: [],
        targetTraits: {},
        estimatedReach: 0,
        matchedPersonas: [],
    });

    // Initialize traits with default range [0.3, 0.7]
    useEffect(() => {
        const defaultTraits: Record<string, [number, number]> = {};
        TRAITS_CONFIG.forEach(t => {
            defaultTraits[t.key] = [0.3, 0.7];
        });
        setFormData(prev => ({ ...prev, targetTraits: defaultTraits }));
    }, []);

    const steps = [
        { id: 1, label: '비즈니스 정보', icon: Building2 },
        { id: 2, label: '타겟 페르소나', icon: Users },
        { id: 3, label: '매칭 결과', icon: Target },
    ];

    const toggleIndustry = (industry: string) => {
        setExpandedIndustries(prev =>
            prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
        );
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    const toggleTaxonomyItem = (path: string) => {
        setFormData(prev => ({
            ...prev,
            selectedTaxonomy: prev.selectedTaxonomy.includes(path)
                ? prev.selectedTaxonomy.filter(p => p !== path)
                : [...prev.selectedTaxonomy, path]
        }));
    };

    const handleTraitChange = (key: string, index: number, value: number) => {
        setFormData(prev => {
            const current = prev.targetTraits[key] || [0.3, 0.7];
            const newRange: [number, number] = [...current] as [number, number];
            newRange[index] = value;
            // Ensure min <= max
            if (index === 0 && value > newRange[1]) newRange[1] = value;
            if (index === 1 && value < newRange[0]) newRange[0] = value;
            return { ...prev, targetTraits: { ...prev.targetTraits, [key]: newRange } };
        });
    };

    const calculateAudience = async () => {
        setIsLoading(true);
        try {
            // Mock calculation for now
            await new Promise(r => setTimeout(r, 1500));

            const baseReach = 5000 + (formData.selectedTaxonomy.length * 1500);
            const traitsArray = Object.values(formData.targetTraits) as [number, number][];
            const traitFactor = traitsArray.reduce((acc, [min, max]) => {
                return acc * (0.5 + (max - min) * 0.5);
            }, 1);

            const reach = Math.round(baseReach * traitFactor);

            setFormData(prev => ({
                ...prev,
                estimatedReach: reach,
                matchedPersonas: [
                    { name: '프리미엄 컨슈머', count: Math.round(reach * 0.35), color: '#8b5cf6' },
                    { name: '테크 얼리어답터', count: Math.round(reach * 0.25), color: '#3b82f6' },
                    { name: '가성비 헌터', count: Math.round(reach * 0.2), color: '#22c55e' },
                    { name: '경험 추구자', count: Math.round(reach * 0.12), color: '#f59e0b' },
                    { name: 'ESG 가치 소비자', count: Math.round(reach * 0.08), color: '#10b981' },
                ]
            }));

            setStep(3);
        } catch (error: any) {
            showToast(`분석 오류: ${error.message}`, 'error');
        }
        setIsLoading(false);
    };

    const radarData = TRAITS_CONFIG.map(t => {
        const range = formData.targetTraits[t.key] || [0.3, 0.7];
        return {
            subject: t.label,
            min: range[0] * 100,
            max: range[1] * 100,
            fullMark: 100,
        };
    });

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">타겟 오디언스 찾기</h2>
                <p className="text-gray-500">비즈니스에 맞는 최적의 고객층을 찾아보세요.</p>
            </div>

            {/* Progress Stepper */}
            <div className="mb-8 flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -z-10" />
                {steps.map((s) => (
                    <div key={s.id} className="flex flex-col items-center bg-gray-50 px-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${step >= s.id ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                            {step > s.id ? <Check size={24} /> : <s.icon size={24} />}
                        </div>
                        <span className={`text-sm mt-2 font-bold ${step >= s.id ? 'text-brand-600' : 'text-gray-400'}`}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
                <div className="p-8 flex-1 overflow-auto">
                    {/* Step 1: Business Info */}
                    {step === 1 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Taxonomy Tree */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Building2 size={20} className="text-brand-500" />
                                    산업/카테고리 선택
                                </h3>
                                <div className="border border-gray-200 rounded-xl max-h-[400px] overflow-auto">
                                    {Object.entries(TAXONOMY_TREE).map(([industry, categories]) => (
                                        <div key={industry} className="border-b border-gray-100 last:border-b-0">
                                            <button
                                                onClick={() => toggleIndustry(industry)}
                                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                            >
                                                <span className="font-bold text-gray-800">{industry.replace('_', ' ')}</span>
                                                <ChevronDown size={18} className={`text-gray-400 transition-transform ${expandedIndustries.includes(industry) ? 'rotate-180' : ''}`} />
                                            </button>

                                            {expandedIndustries.includes(industry) && (
                                                <div className="bg-gray-50 pb-2">
                                                    {Object.entries(categories).map(([category, subcategories]) => (
                                                        <div key={category} className="ml-4">
                                                            <button
                                                                onClick={() => toggleCategory(`${industry}.${category}`)}
                                                                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 rounded-lg transition-colors"
                                                            >
                                                                <span className="text-sm font-medium text-gray-700">{category.replace('_', ' ')}</span>
                                                                <ChevronRight size={16} className={`text-gray-400 transition-transform ${expandedCategories.includes(`${industry}.${category}`) ? 'rotate-90' : ''}`} />
                                                            </button>

                                                            {expandedCategories.includes(`${industry}.${category}`) && (
                                                                <div className="ml-4 py-1 space-y-1">
                                                                    {subcategories.map(sub => {
                                                                        const path = `${industry}.${category}.${sub}`;
                                                                        const isSelected = formData.selectedTaxonomy.includes(path);
                                                                        return (
                                                                            <button
                                                                                key={sub}
                                                                                onClick={() => toggleTaxonomyItem(path)}
                                                                                className={`w-full px-3 py-1.5 text-left text-sm rounded-lg flex items-center gap-2 transition-colors ${isSelected ? 'bg-brand-100 text-brand-700' : 'hover:bg-gray-100 text-gray-600'}`}
                                                                            >
                                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
                                                                                    {isSelected && <Check size={12} className="text-white" />}
                                                                                </div>
                                                                                {sub}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Selected Tags */}
                                {formData.selectedTaxonomy.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {formData.selectedTaxonomy.map(path => (
                                            <span key={path} className="px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-xs font-medium flex items-center gap-1">
                                                {path.split('.').pop()}
                                                <button onClick={() => toggleTaxonomyItem(path)} className="hover:text-brand-900">×</button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Other Business Info */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <Package size={16} />
                                        상품/서비스명
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 outline-none"
                                        placeholder="예: 프리미엄 남성 정장"
                                        value={formData.productName}
                                        onChange={e => setFormData({ ...formData, productName: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <Globe size={16} />
                                        판매 채널
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'online', label: '온라인 전용' },
                                            { id: 'offline', label: '오프라인 전용' },
                                            { id: 'omni', label: '옴니채널' },
                                        ].map(ch => (
                                            <button
                                                key={ch.id}
                                                onClick={() => setFormData({ ...formData, salesChannel: ch.id })}
                                                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${formData.salesChannel === ch.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300'}`}
                                            >
                                                {ch.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <MapPin size={16} />
                                        타겟 지역
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {['전국', '서울', '경기', '부산', '대구', '인천', '광주', '대전'].map(region => {
                                            const isSelected = formData.regions.includes(region);
                                            return (
                                                <button
                                                    key={region}
                                                    onClick={() => {
                                                        if (region === '전국') {
                                                            setFormData({ ...formData, regions: isSelected ? [] : ['전국'] });
                                                        } else {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                regions: isSelected
                                                                    ? prev.regions.filter(r => r !== region)
                                                                    : [...prev.regions.filter(r => r !== '전국'), region]
                                                            }));
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isSelected ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    {region}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Target Persona */}
                    {step === 2 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Trait Sliders */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Sliders size={20} className="text-brand-500" />
                                    타겟 고객 특성 (범위 설정)
                                </h3>
                                <div className="space-y-5">
                                    {TRAITS_CONFIG.map(trait => {
                                        const range = formData.targetTraits[trait.key] || [0.3, 0.7];
                                        return (
                                            <div key={trait.key} className="bg-gray-50 p-4 rounded-xl">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-bold text-gray-700">{trait.label}</span>
                                                    <span className="text-xs text-brand-600 font-medium">
                                                        {Math.round(range[0] * 100)}% ~ {Math.round(range[1] * 100)}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] text-gray-400 w-16 text-right">{trait.leftLabel}</span>
                                                    <div className="flex-1 relative h-2 bg-gray-200 rounded-full">
                                                        <div
                                                            className="absolute h-full bg-brand-400 rounded-full"
                                                            style={{
                                                                left: `${range[0] * 100}%`,
                                                                width: `${(range[1] - range[0]) * 100}%`
                                                            }}
                                                        />
                                                        <input
                                                            type="range"
                                                            min="0" max="1" step="0.05"
                                                            value={range[0]}
                                                            onChange={e => handleTraitChange(trait.key, 0, parseFloat(e.target.value))}
                                                            className="absolute w-full h-full opacity-0 cursor-pointer"
                                                        />
                                                        <input
                                                            type="range"
                                                            min="0" max="1" step="0.05"
                                                            value={range[1]}
                                                            onChange={e => handleTraitChange(trait.key, 1, parseFloat(e.target.value))}
                                                            className="absolute w-full h-full opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 w-16">{trait.rightLabel}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Radar Preview */}
                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
                                <h3 className="text-lg font-bold mb-4">타겟 페르소나 프리뷰</h3>
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                            <PolarGrid stroke="#ffffff30" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar name="Min" dataKey="min" stroke="#60a5fa" fill="#3b82f6" fillOpacity={0.3} />
                                            <Radar name="Max" dataKey="max" stroke="#a78bfa" fill="#8b5cf6" fillOpacity={0.5} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 flex items-center gap-4 justify-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full opacity-50" />
                                        <span className="text-gray-300">최소 범위</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-purple-500 rounded-full opacity-70" />
                                        <span className="text-gray-300">최대 범위</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Results */}
                    {step === 3 && (
                        <div className="space-y-8">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white">
                                    <p className="text-brand-200 text-sm mb-1">총 매칭 유저</p>
                                    <p className="text-4xl font-black">{formData.estimatedReach.toLocaleString()}</p>
                                    <p className="text-brand-200 text-xs mt-1">명</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                                    <p className="text-gray-500 text-sm mb-1">예상 CPM</p>
                                    <p className="text-3xl font-black text-gray-900">₩2,500</p>
                                    <p className="text-gray-400 text-xs mt-1">1,000회 노출당</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                                    <p className="text-gray-500 text-sm mb-1">예상 도달률</p>
                                    <p className="text-3xl font-black text-green-600">78%</p>
                                    <p className="text-gray-400 text-xs mt-1">타겟 대비</p>
                                </div>
                            </div>

                            {/* Persona Distribution */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <BarChart3 size={20} className="text-brand-500" />
                                        페르소나 분포
                                    </h3>
                                    <div className="h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={formData.matchedPersonas} layout="vertical">
                                                <XAxis type="number" hide />
                                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    formatter={(value: number) => [`${value.toLocaleString()}명`, '유저 수']}
                                                    contentStyle={{ borderRadius: '12px', border: 'none' }}
                                                />
                                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                                    {formData.matchedPersonas.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <MapPin size={20} className="text-brand-500" />
                                        지역 분포
                                    </h3>
                                    <div className="space-y-3">
                                        {[
                                            { region: '서울', percent: 45 },
                                            { region: '경기', percent: 28 },
                                            { region: '부산', percent: 12 },
                                            { region: '기타', percent: 15 },
                                        ].map(item => (
                                            <div key={item.region} className="flex items-center gap-3">
                                                <span className="w-12 text-sm text-gray-600">{item.region}</span>
                                                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-brand-500 rounded-full"
                                                        style={{ width: `${item.percent}%` }}
                                                    />
                                                </div>
                                                <span className="w-10 text-sm font-bold text-gray-700">{item.percent}%</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-gray-100">
                                        <h4 className="text-sm font-bold text-gray-700 mb-3">선택한 타겟</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {formData.selectedTaxonomy.map(path => (
                                                <span key={path} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                                                    {path.split('.').pop()}
                                                </span>
                                            ))}
                                            {formData.regions.map(region => (
                                                <span key={region} className="px-2 py-1 bg-blue-100 text-blue-600 rounded-lg text-xs">
                                                    {region}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-between bg-gray-50">
                    <button
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1 || isLoading}
                        className="px-6 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                        이전
                    </button>

                    {step < 3 ? (
                        <button
                            onClick={step === 2 ? calculateAudience : () => setStep(s => s + 1)}
                            disabled={isLoading || (step === 1 && formData.selectedTaxonomy.length === 0)}
                            className="flex items-center gap-2 px-8 py-2 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-200 disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? '분석 중...' : step === 2 ? '오디언스 분석' : '다음'}
                            {!isLoading && <ChevronRight size={18} />}
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={() => showToast('오디언스가 저장되었습니다!', 'success')}
                                className="px-6 py-2 rounded-xl font-bold border border-brand-500 text-brand-600 hover:bg-brand-50 transition-colors"
                            >
                                오디언스 저장
                            </button>
                            <button
                                onClick={() => showToast('캠페인 생성 페이지로 이동합니다.', 'info')}
                                className="flex items-center gap-2 px-8 py-2 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 transition-colors"
                            >
                                캠페인 생성하기
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudienceTargeting;
