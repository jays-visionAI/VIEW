import React, { useState, useEffect } from 'react';
import {
    Building2, Users, Target, ChevronRight, ChevronDown, Check,
    Sliders, BarChart3, Globe, MapPin, Package, Tags, Filter, Loader2
} from 'lucide-react';
import {
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

// ============================================
// INDUSTRY TAXONOMY (What is being sold)
// ============================================
const INDUSTRY_TAXONOMY: Record<string, Record<string, string[]>> = {
    Fashion: {
        Apparel: ['Menswear', 'Womenswear', 'Sportswear', 'Outdoorwear', 'Kidswear', 'Maternity', 'Plus_Size'],
        Footwear: ['Sneakers', 'Sandals', 'Boots', 'High_Heels', 'Loafers', 'Athletic_Shoes'],
        Accessories: ['Bags', 'Watches', 'Jewelry', 'Belts', 'Glasses', 'Hats', 'Scarves', 'Wallets'],
    },
    Beauty: {
        Skincare: ['Anti_Aging', 'Whitening', 'Moisturizing', 'Sunscreen', 'Serum', 'Toner', 'Essence'],
        Makeup: ['Lipstick', 'Foundation', 'Mascara', 'Eyeliner', 'Blusher', 'Concealer', 'Primer'],
        Haircare: ['Shampoo', 'Conditioner', 'Treatment', 'Styling', 'Hair_Color', 'Scalp_Care'],
        Fragrance: ['Perfume', 'Body_Mist', 'Home_Fragrance', 'Niche_Perfume'],
        Tools_Devices: ['Makeup_Brushes', 'Beauty_Devices', 'Hair_Dryers', 'Straighteners'],
    },
    Technology: {
        Consumer_Electronics: ['Smartphone', 'Laptop', 'Tablet', 'Smartwatch', 'Headphones', 'Camera', 'Drone'],
        Software: ['Productivity', 'Security', 'Cloud_Service', 'AI_Application', 'CRM', 'Design_Tools'],
        Gaming: ['Console', 'PC_Game', 'Mobile_Game', 'VR_AR', 'Esports', 'Gaming_Accessories'],
        Smart_Home: ['Smart_Speaker', 'Smart_Lighting', 'Smart_Security', 'Smart_Thermostat', 'Robot_Vacuum'],
        Wearables: ['Fitness_Tracker', 'Smart_Ring', 'AR_Glasses', 'Health_Monitor'],
    },
    Food_Beverage: {
        Restaurant: ['Fine_Dining', 'Casual_Dining', 'Fast_Food', 'Cafe', 'Bakery', 'Food_Truck'],
        Beverage: ['Coffee', 'Tea', 'Juice', 'Alcohol', 'Energy_Drink', 'Craft_Beer', 'Wine'],
        Grocery: ['Organic_Food', 'Snack', 'Frozen_Food', 'Dairy_Product', 'Fresh_Produce', 'Meat_Seafood'],
        Delivery_Service: ['Meal_Kit', 'Food_Delivery_Platform', 'Grocery_Delivery', 'Subscription_Box'],
    },
    Travel: {
        Airline: ['Budget', 'Full_Service', 'Charter', 'Business_Class', 'First_Class'],
        Hotel: ['Resort', 'Boutique', 'Business', 'Capsule', 'Hostel', 'Vacation_Rental'],
        Tour: ['Honeymoon', 'Cultural', 'Adventure', 'Wellness', 'Food_Tour', 'Photography'],
        Transportation: ['Train', 'Bus', 'Car_Rental', 'Cruise', 'Bike_Rental'],
    },
    Finance: {
        Banking: ['Savings_Account', 'Loan', 'Credit_Card', 'Payment_App', 'Mortgage'],
        Investment: ['Stocks', 'ETF', 'Crypto', 'Real_Estate_Fund', 'Bonds', 'Mutual_Fund'],
        Insurance: ['Life', 'Health', 'Car', 'Travel', 'Property', 'Pet'],
        Fintech: ['Digital_Wallet', 'Robo_Advisor', 'DeFi', 'P2P_Lending', 'BNPL', 'Neobank'],
    },
    Health_Wellness: {
        Fitness: ['Gym', 'Yoga', 'Pilates', 'Home_Training', 'CrossFit', 'Swimming', 'Martial_Arts'],
        Nutrition: ['Supplements', 'Vitamins', 'Protein', 'Health_Drinks', 'Probiotics'],
        Medical_Service: ['Clinic', 'Dental', 'Dermatology', 'Aesthetic', 'Telemedicine'],
        Mental_Health: ['Meditation', 'Counseling', 'Therapy', 'Stress_Management', 'Mindfulness'],
    },
    Education: {
        Online_Course: ['Language', 'Programming', 'Business', 'Design', 'Music', 'Data_Science'],
        Institution: ['University', 'College', 'Vocational_School', 'Tutoring_Center'],
        Certification: ['MBA', 'TOEFL', 'IELTS', 'Blockchain_Certification', 'AI_Engineer', 'AWS'],
        EdTech: ['LMS', 'Online_Tutoring', 'Study_App', 'Assessment_Tool'],
    },
    Entertainment: {
        Streaming: ['OTT', 'Music', 'Podcast', 'Webtoon', 'Live_Streaming'],
        Event: ['Concert', 'Exhibition', 'Festival', 'Theater', 'Fan_Meeting'],
        Media: ['TV_Channel', 'Influencer', 'Magazine', 'YouTube', 'TikTok'],
        Sports: ['Football', 'Golf', 'eSports', 'Basketball', 'Tennis', 'Running'],
    },
    Home_Living: {
        Furniture: ['Sofa', 'Bed', 'Table', 'Lighting', 'Chair', 'Storage'],
        Interior: ['Wallpaper', 'Flooring', 'Home_Decor', 'Curtains', 'Rugs', 'Plants'],
        Appliances: ['Refrigerator', 'Washing_Machine', 'Air_Conditioner', 'Vacuum', 'Air_Purifier'],
        Real_Estate: ['Apartment', 'Villa', 'Commercial', 'Rental_Service', 'Co_Living'],
    },
    Auto_Mobility: {
        Vehicle: ['Electric_Vehicle', 'SUV', 'Sedan', 'Motorcycle', 'Truck', 'Hybrid'],
        Service: ['Ride_Sharing', 'Car_Sharing', 'Maintenance', 'Charging_Station', 'Car_Wash'],
        Accessories: ['Tire', 'Battery', 'Navigation', 'Dashcam', 'Car_Audio', 'Safety_Equipment'],
    },
    Media_Publishing: {
        Books: ['Fiction', 'Nonfiction', 'Self_Help', 'Business', 'Finance', 'Children', 'Lifestyle'],
        Digital_Books: ['eBook', 'Interactive_Book', 'Serialized_Fiction'],
        Audio_Content: ['Audiobook', 'Audio_Series', 'Podcast_Original'],
        Periodicals: ['Newsletter', 'Magazine_Subscription', 'Paid_Community'],
        Author_Brand: ['Book_Launch', 'Speaking', 'Fan_Membership', 'Merchandise'],
    },
    ESG_Impact: {
        Environment: ['Carbon_Offset', 'Recycling', 'Clean_Energy', 'Water_Conservation'],
        Social: ['Donation_Platform', 'Volunteer_Organization', 'Community_Development'],
        Green_Tech: ['Solar_Energy', 'Wind_Energy', 'EV_Infrastructure', 'Smart_Grid'],
    },
};

// ============================================
// ATTRIBUTE TAXONOMY (How it's being sold)
// ============================================
const ATTRIBUTE_TAXONOMY: Record<string, { description: string; values: string[] }> = {
    Price_Positioning: {
        description: '가격 포지셔닝',
        values: ['Mass', 'Value', 'Mid', 'Premium', 'Luxury', 'Ultra_Luxury'],
    },
    Sustainability: {
        description: '지속가능성',
        values: ['Eco_Friendly', 'Upcycled', 'Fair_Trade', 'Vegan', 'Cruelty_Free', 'Organic', 'Zero_Waste'],
    },
    Business_Model: {
        description: '비즈니스 모델',
        values: ['Direct_To_Consumer', 'Marketplace', 'Subscription', 'Rental', 'Resale', 'Secondhand', 'On_Demand'],
    },
    Brand_Type: {
        description: '브랜드 유형',
        values: ['Legacy_Brand', 'Designer_Brand', 'Indie_Brand', 'Creator_Brand', 'Local_Brand', 'Global_Brand'],
    },
    Product_Lifecycle: {
        description: '제품 수명주기',
        values: ['New_Launch', 'Limited_Edition', 'Seasonal', 'Evergreen', 'Preorder', 'Flash_Sale'],
    },
    Audience_Lifecycle: {
        description: '타겟 라이프스타일',
        values: ['Student', 'Early_Career', 'Young_Professional', 'Family', 'Mid_Career', 'Senior'],
    },
    Channel_Preference: {
        description: '채널 선호',
        values: ['Online_First', 'Offline_First', 'Omnichannel', 'Mobile_First', 'Social_Commerce'],
    },
    Purchase_Decision_Style: {
        description: '구매 결정 스타일',
        values: ['Impulse', 'Deal_Seeker', 'Research_Heavy', 'Brand_Loyal', 'Trend_Seeker', 'Quality_Focused'],
    },
    Offer_Format: {
        description: '제공 형식',
        values: ['Physical_Product', 'Digital_Product', 'Service', 'Experience', 'Event', 'Membership'],
    },
    Target_Gender: {
        description: '타겟 성별',
        values: ['Male', 'Female', 'Unisex'],
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
    // Step 1: Industry (What)
    selectedIndustry: string[];
    productName: string;
    salesChannel: string;
    regions: string[];
    // Step 2: Attributes (How) + Traits
    selectedAttributes: Record<string, string[]>;
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
    const [expandedAttributes, setExpandedAttributes] = useState<string[]>([]);

    // Dynamic taxonomy from Firestore
    const [industryTaxonomy, setIndustryTaxonomy] = useState<Record<string, Record<string, string[]>>>(INDUSTRY_TAXONOMY);
    const [attributeTaxonomy, setAttributeTaxonomy] = useState<Record<string, { description: string; values: string[] }>>(ATTRIBUTE_TAXONOMY);
    const [taxonomyLoaded, setTaxonomyLoaded] = useState(false);

    const [formData, setFormData] = useState<TargetingData>({
        selectedIndustry: [],
        productName: '',
        salesChannel: 'omni',
        regions: [],
        selectedAttributes: {},
        targetTraits: {},
        estimatedReach: 0,
        matchedPersonas: [],
    });

    // Initialize traits with default range [0.3, 0.7] and load taxonomy from Firestore
    useEffect(() => {
        const defaultTraits: Record<string, [number, number]> = {};
        TRAITS_CONFIG.forEach(t => {
            defaultTraits[t.key] = [0.3, 0.7];
        });
        setFormData(prev => ({ ...prev, targetTraits: defaultTraits }));

        // Load taxonomy from Firestore
        const loadTaxonomy = async () => {
            if (!functions) return;
            try {
                const getTaxonomy = httpsCallable(functions, 'getTaxonomy');
                const result = await getTaxonomy({});
                const data = result.data as any;

                if (data.success) {
                    if (data.industry?.taxonomy) {
                        setIndustryTaxonomy(data.industry.taxonomy);
                    }
                    if (data.attributes?.attributes) {
                        setAttributeTaxonomy(data.attributes.attributes);
                    }
                }
                setTaxonomyLoaded(true);
            } catch (error) {
                console.warn('Using fallback static taxonomy:', error);
                setTaxonomyLoaded(true);
            }
        };

        loadTaxonomy();
    }, []);

    const steps = [
        { id: 1, label: '산업 분류 (What)', icon: Building2 },
        { id: 2, label: '속성 & 페르소나 (How)', icon: Tags },
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

    const toggleIndustryItem = (path: string) => {
        setFormData(prev => ({
            ...prev,
            selectedIndustry: prev.selectedIndustry.includes(path)
                ? prev.selectedIndustry.filter(p => p !== path)
                : [...prev.selectedIndustry, path]
        }));
    };

    const toggleAttribute = (attrType: string) => {
        setExpandedAttributes(prev =>
            prev.includes(attrType) ? prev.filter(a => a !== attrType) : [...prev, attrType]
        );
    };

    const toggleAttributeValue = (attrType: string, value: string) => {
        setFormData(prev => {
            const current = prev.selectedAttributes[attrType] || [];
            const newValues = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            return {
                ...prev,
                selectedAttributes: {
                    ...prev.selectedAttributes,
                    [attrType]: newValues.length > 0 ? newValues : undefined
                }
            };
        });
    };

    const handleTraitChange = (key: string, index: number, value: number) => {
        setFormData(prev => {
            const current = prev.targetTraits[key] || [0.3, 0.7];
            const newRange: [number, number] = [...current] as [number, number];
            newRange[index] = value;
            if (index === 0 && value > newRange[1]) newRange[1] = value;
            if (index === 1 && value < newRange[0]) newRange[0] = value;
            return { ...prev, targetTraits: { ...prev.targetTraits, [key]: newRange } };
        });
    };

    const calculateAudience = async () => {
        setIsLoading(true);
        try {
            await new Promise(r => setTimeout(r, 1500));

            const industryFactor = formData.selectedIndustry.length * 1500;
            const attributeCount = Object.values(formData.selectedAttributes).flat().filter(Boolean).length;
            const attributeFactor = attributeCount > 0 ? Math.max(0.5, 1 - attributeCount * 0.1) : 1;

            const traitsArray = Object.values(formData.targetTraits) as [number, number][];
            const traitFactor = traitsArray.reduce((acc, [min, max]) => {
                return acc * (0.5 + (max - min) * 0.5);
            }, 1);

            const baseReach = 5000 + industryFactor;
            const reach = Math.round(baseReach * attributeFactor * traitFactor);

            setFormData(prev => ({
                ...prev,
                estimatedReach: reach,
                matchedPersonas: [
                    { name: '프리미엄 컨슈머', count: Math.round(reach * 0.32), color: '#8b5cf6' },
                    { name: '테크 얼리어답터', count: Math.round(reach * 0.24), color: '#3b82f6' },
                    { name: '가성비 헌터', count: Math.round(reach * 0.18), color: '#22c55e' },
                    { name: '경험 추구자', count: Math.round(reach * 0.14), color: '#f59e0b' },
                    { name: 'ESG 가치 소비자', count: Math.round(reach * 0.12), color: '#10b981' },
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

    const selectedAttributesCount = Object.values(formData.selectedAttributes).flat().filter(Boolean).length;

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">타겟 오디언스 찾기</h2>
                <p className="text-gray-500">산업 분류(What) + 속성(How)으로 정밀 타겟팅</p>
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[650px] flex flex-col">
                <div className="p-8 flex-1 overflow-auto">
                    {/* Step 1: Industry (What is being sold) */}
                    {step === 1 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Industry Tree */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Building2 size={20} className="text-brand-500" />
                                    산업 분류 선택 (What)
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">무엇을 판매/제공하는지 선택하세요</p>
                                <div className="border border-gray-200 rounded-xl max-h-[450px] overflow-auto">
                                    {Object.entries(industryTaxonomy).map(([industry, categories]) => (
                                        <div key={industry} className="border-b border-gray-100 last:border-b-0">
                                            <button
                                                onClick={() => toggleIndustry(industry)}
                                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                            >
                                                <span className="font-bold text-gray-800">{industry.replace(/_/g, ' ')}</span>
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
                                                                <span className="text-sm font-medium text-gray-700">{category.replace(/_/g, ' ')}</span>
                                                                <ChevronRight size={16} className={`text-gray-400 transition-transform ${expandedCategories.includes(`${industry}.${category}`) ? 'rotate-90' : ''}`} />
                                                            </button>

                                                            {expandedCategories.includes(`${industry}.${category}`) && (
                                                                <div className="ml-4 py-1 space-y-1">
                                                                    {subcategories.map(sub => {
                                                                        const path = `${industry}.${category}.${sub}`;
                                                                        const isSelected = formData.selectedIndustry.includes(path);
                                                                        return (
                                                                            <button
                                                                                key={sub}
                                                                                onClick={() => toggleIndustryItem(path)}
                                                                                className={`w-full px-3 py-1.5 text-left text-sm rounded-lg flex items-center gap-2 transition-colors ${isSelected ? 'bg-brand-100 text-brand-700' : 'hover:bg-gray-100 text-gray-600'}`}
                                                                            >
                                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
                                                                                    {isSelected && <Check size={12} className="text-white" />}
                                                                                </div>
                                                                                {sub.replace(/_/g, ' ')}
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

                                {/* Selected Industry Tags */}
                                {formData.selectedIndustry.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {formData.selectedIndustry.map(path => (
                                            <span key={path} className="px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-xs font-medium flex items-center gap-1">
                                                {path.split('.').pop()?.replace(/_/g, ' ')}
                                                <button onClick={() => toggleIndustryItem(path)} className="hover:text-brand-900">×</button>
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

                                {/* Summary */}
                                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                                    <h4 className="text-sm font-bold text-gray-700 mb-2">선택 요약</h4>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p>• 산업 분류: <span className="font-medium">{formData.selectedIndustry.length}개 선택</span></p>
                                        <p>• 지역: <span className="font-medium">{formData.regions.length > 0 ? formData.regions.join(', ') : '전체'}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Attributes + Traits (How it's being sold) */}
                    {step === 2 && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Attribute Selection */}
                            <div className="lg:col-span-1">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Tags size={20} className="text-indigo-500" />
                                    제품 속성 (How)
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">어떤 특성으로 판매하는지 선택</p>
                                <div className="border border-gray-200 rounded-xl max-h-[400px] overflow-auto">
                                    {(Object.entries(attributeTaxonomy) as [string, { description: string; values: string[] }][]).map(([attrType, attrData]) => (
                                        <div key={attrType} className="border-b border-gray-100 last:border-b-0">
                                            <button
                                                onClick={() => toggleAttribute(attrType)}
                                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                            >
                                                <div>
                                                    <span className="font-medium text-gray-800">{attrData.description}</span>
                                                    {(formData.selectedAttributes[attrType]?.length || 0) > 0 && (
                                                        <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                                                            {formData.selectedAttributes[attrType]?.length}
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedAttributes.includes(attrType) ? 'rotate-180' : ''}`} />
                                            </button>

                                            {expandedAttributes.includes(attrType) && (
                                                <div className="bg-gray-50 px-4 pb-3 flex flex-wrap gap-2">
                                                    {attrData.values.map(value => {
                                                        const isSelected = formData.selectedAttributes[attrType]?.includes(value);
                                                        return (
                                                            <button
                                                                key={value}
                                                                onClick={() => toggleAttributeValue(attrType, value)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}
                                                            >
                                                                {value.replace(/_/g, ' ')}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Selected Attributes Count */}
                                <div className="mt-4 p-3 bg-indigo-50 rounded-xl">
                                    <p className="text-sm text-indigo-700">
                                        <strong>{selectedAttributesCount}</strong>개 속성 선택됨
                                    </p>
                                </div>
                            </div>

                            {/* Trait Sliders */}
                            <div className="lg:col-span-1">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Sliders size={20} className="text-brand-500" />
                                    타겟 소비자 특성
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">범위를 조정하여 타겟 설정</p>
                                <div className="space-y-4 max-h-[400px] overflow-auto pr-2">
                                    {TRAITS_CONFIG.map(trait => {
                                        const range = formData.targetTraits[trait.key] || [0.3, 0.7];
                                        return (
                                            <div key={trait.key} className="bg-gray-50 p-3 rounded-xl">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-gray-700">{trait.label}</span>
                                                    <span className="text-[10px] text-brand-600 font-medium">
                                                        {Math.round(range[0] * 100)}~{Math.round(range[1] * 100)}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] text-gray-400 w-12 text-right">{trait.leftLabel}</span>
                                                    <div className="flex-1 relative h-1.5 bg-gray-200 rounded-full">
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
                                                    <span className="text-[9px] text-gray-400 w-12">{trait.rightLabel}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Radar Preview */}
                            <div className="lg:col-span-1 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
                                <h3 className="text-sm font-bold mb-3">타겟 페르소나 프리뷰</h3>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                                            <PolarGrid stroke="#ffffff30" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 8 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar name="Min" dataKey="min" stroke="#60a5fa" fill="#3b82f6" fillOpacity={0.3} />
                                            <Radar name="Max" dataKey="max" stroke="#a78bfa" fill="#8b5cf6" fillOpacity={0.5} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Selection Summary */}
                                <div className="mt-3 pt-3 border-t border-white/20 text-xs">
                                    <p className="text-gray-400 mb-2">선택된 조건:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {formData.selectedIndustry.slice(0, 3).map(path => (
                                            <span key={path} className="px-2 py-0.5 bg-brand-500/30 rounded text-[10px]">
                                                {path.split('.').pop()?.replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                        {formData.selectedIndustry.length > 3 && (
                                            <span className="px-2 py-0.5 bg-gray-500/30 rounded text-[10px]">
                                                +{formData.selectedIndustry.length - 3}
                                            </span>
                                        )}
                                    </div>
                                    {selectedAttributesCount > 0 && (
                                        <p className="text-indigo-300 mt-2">+ {selectedAttributesCount}개 속성 필터</p>
                                    )}
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

                            {/* Targeting Summary */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Industry Selected */}
                                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Building2 size={16} className="text-brand-500" />
                                        산업 분류 (What)
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.selectedIndustry.map(path => (
                                            <span key={path} className="px-2 py-1 bg-brand-100 text-brand-700 rounded-lg text-xs">
                                                {path.replace(/\./g, ' > ').replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Attributes Selected */}
                                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Tags size={16} className="text-indigo-500" />
                                        속성 필터 (How)
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(Object.entries(formData.selectedAttributes) as [string, string[] | undefined][]).map(([type, values]) =>
                                            values?.map(value => (
                                                <span key={`${type}-${value}`} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">
                                                    {type.replace(/_/g, ' ')}: {value.replace(/_/g, ' ')}
                                                </span>
                                            ))
                                        )}
                                        {selectedAttributesCount === 0 && (
                                            <span className="text-gray-400 text-sm">필터 없음</span>
                                        )}
                                    </div>
                                </div>

                                {/* Region */}
                                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <MapPin size={16} className="text-green-500" />
                                        지역
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.regions.map(region => (
                                            <span key={region} className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs">
                                                {region}
                                            </span>
                                        ))}
                                        {formData.regions.length === 0 && (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">전국</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Persona Distribution */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            disabled={isLoading || (step === 1 && formData.selectedIndustry.length === 0)}
                            className="flex items-center gap-2 px-8 py-2 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-200 disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? '분석 중...' : step === 2 ? '오디언스 분석' : '다음: 속성 선택'}
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
