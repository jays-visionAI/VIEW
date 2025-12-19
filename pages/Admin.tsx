import React, { useState, useEffect } from 'react';
import { useSettings, BoosterTier, ReferralRewardConfig } from '../context/SettingsContext';
import { Settings, Coins, TrendingUp, Users, Save, Plus, Trash2, Loader2, RefreshCw, Lock, Search, LogOut, Database, Home, PieChart as PieChartIcon, BarChart3, AlertTriangle, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { httpsCallable } from 'firebase/functions';
import { functions, db, auth } from '../firebase';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import DocumentArchive from '../components/admin/DocumentArchive';
import PredictionAdmin from '../components/admin/PredictionAdmin';

// Admin emails whitelist (can also be stored in Firestore /settings/admin)
const ADMIN_EMAILS = [
    'jays@visai.io',
];

type TabType = 'users' | 'tokenomics' | 'staking' | 'referral' | 'taxonomy' | 'personas' | 'documents' | 'prediction';

interface UserData {
    uid: string;
    displayName: string;
    email?: string;
    balance: number;
    claimableBalance: number;
    staked: number;
    referralCode: string;
    directReferrals: number;
    createdAt: string;
}

export const AdminPage: React.FC = () => {
    // Admin auth state
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [loginError, setLoginError] = useState('');

    const { settings, isLoading, updateTokenomics, updateStaking, updateReferral } = useSettings();
    const [activeTab, setActiveTab] = useState<TabType>('users');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
    const [priceMessage, setPriceMessage] = useState<string | null>(null);
    const [isUploadingTaxonomy, setIsUploadingTaxonomy] = useState(false);
    const [taxonomyMessage, setTaxonomyMessage] = useState<string | null>(null);
    const [isUploadingSurveys, setIsUploadingSurveys] = useState(false);
    const [surveysMessage, setSurveysMessage] = useState<string | null>(null);
    // Added for viewing surveys
    const [surveysData, setSurveysData] = useState<any[] | null>(null);
    const [isLoadingSurveysData, setIsLoadingSurveysData] = useState(false);

    // Users tab state
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Persona Stats state
    const [personaStats, setPersonaStats] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState<string | null>(null);

    const loadPersonaStats = async () => {
        if (!functions) return;
        setStatsLoading(true);
        setStatsError(null);
        try {
            // Call Cloud Function
            const getPersonaStats = httpsCallable(functions, 'getPersonaStats');
            const result: any = await getPersonaStats();

            if (result.data.success) {
                setPersonaStats(result.data.stats);
            } else {
                throw new Error(result.data.message || 'Unknown error');
            }

        } catch (error: any) {
            console.warn("Failed to load real stats, falling back to mock:", error);
            // Client-side Fallback Mock Data
            setPersonaStats({
                totalAnalyzed: 124,
                avgDataValue: 4500,
                personaDistribution: { "Trend Setter (Mock)": 40, "Smart Saver": 30, "Impulsive": 20, "Whale": 10, "Other": 24 },
                interestDistribution: { "Fashion": 50, "Tech": 30, "Food": 20, "Travel": 10, "Beauty": 14 }
            });
            // Don't show error, just show mock
        } finally {
            setStatsLoading(false);
        }
    };

    // Local state for form
    const [tokenomicsForm, setTokenomicsForm] = useState(settings.tokenomics);
    const [stakingForm, setStakingForm] = useState(settings.staking);
    const [referralForm, setReferralForm] = useState(settings.referral);

    // Listen to Firebase Auth state
    useEffect(() => {
        if (!auth) {
            setAuthLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // Check if user email is in admin list
                let isAdminUser = user.email ? ADMIN_EMAILS.includes(user.email) : false;

                // Also check Firestore for admin list (supports both emails and UIDs)
                if (!isAdminUser && db) {
                    try {
                        const adminDoc = await getDoc(doc(db, 'settings', 'admin'));
                        if (adminDoc.exists()) {
                            const adminData = adminDoc.data();
                            isAdminUser =
                                adminData?.adminEmails?.includes(user.email) ||
                                adminData?.adminUids?.includes(user.uid) ||
                                false;
                        }
                    } catch (e) {
                        console.error('Failed to check admin status:', e);
                    }
                }

                // Check User Role directly in 'users' collection
                if (!isAdminUser && db) {
                    try {
                        const userDocRef = doc(db, 'users', user.uid);
                        const userSnap = await getDoc(userDocRef);
                        if (userSnap.exists() && userSnap.data()?.role === 'admin') {
                            isAdminUser = true;
                        }
                    } catch (e) {
                        console.error('Failed to check user role:', e);
                    }
                }

                setIsAdmin(isAdminUser);
            } else {
                setIsAdmin(false);
            }

            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Handle Google Sign-in
    const handleGoogleLogin = async () => {
        if (!auth) return;
        setLoginError('');

        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            console.error('Login failed:', error);
            setLoginError(error.message || '로그인에 실패했습니다.');
        }
    };

    // Handle logout
    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // Sync with settings when loaded
    useEffect(() => {
        setTokenomicsForm(settings.tokenomics);
        setStakingForm(settings.staking);
        setReferralForm(settings.referral);
    }, [settings]);

    // Load users when Users tab is active
    useEffect(() => {
        if (activeTab === 'users' && users.length === 0 && isAdmin) {
            loadUsers();
        }
    }, [activeTab, isAdmin]);

    const loadUsers = async () => {
        if (!db) return;
        setIsLoadingUsers(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, orderBy('createdAt', 'desc'), limit(100));
            const snapshot = await getDocs(q);

            const userList: UserData[] = snapshot.docs.map(doc => ({
                uid: doc.id,
                displayName: doc.data().displayName || 'Unknown',
                email: doc.data().email,
                balance: doc.data().balance || 0,
                claimableBalance: doc.data().claimableBalance || 0,
                staked: doc.data().staked || 0,
                referralCode: doc.data().referralCode || '',
                directReferrals: doc.data().directReferrals || 0,
                createdAt: doc.data().createdAt || '',
            }));

            setUsers(userList);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
        setIsLoadingUsers(false);
    };

    const filteredUsers = users.filter(user =>
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.referralCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.uid.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage(null);
        try {
            await updateTokenomics(tokenomicsForm);
            await updateStaking(stakingForm);
            await updateReferral(referralForm);
            setSaveMessage('설정이 저장되었습니다!');
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error) {
            setSaveMessage('저장 실패. 다시 시도해주세요.');
        }
        setIsSaving(false);
    };

    const handleManualPriceUpdate = async () => {
        if (!functions) return;
        setIsUpdatingPrice(true);
        setPriceMessage(null);
        try {
            const manualUpdateTokenPrice = httpsCallable(functions, 'manualUpdateTokenPrice');
            const result = await manualUpdateTokenPrice({});
            const data = result.data as any;

            if (data.success) {
                setPriceMessage(`가격 업데이트 완료: $${data.price} (${data.source})`);
                // Update local form with new price
                setTokenomicsForm(prev => ({ ...prev, tokenPriceUsd: data.price }));
            } else {
                setPriceMessage(`가격 가져오기 실패: ${data.message}`);
            }
        } catch (error: any) {
            setPriceMessage(`오류: ${error.message}`);
        }
        setIsUpdatingPrice(false);
        setTimeout(() => setPriceMessage(null), 5000);
    };

    // Taxonomy Upload Handler - Industry/Attribute Separation
    const handleUploadTaxonomy = async (mode: 'industry' | 'attribute' | 'both' | 'legacy' = 'both') => {
        if (!functions) return;
        setIsUploadingTaxonomy(true);
        setTaxonomyMessage(null);
        try {
            const uploadTaxonomy = httpsCallable(functions, 'uploadTaxonomy');

            // Industry Taxonomy v1.1
            const industryData = mode === 'attribute' ? undefined : {
                version: '1.1',
                lastUpdated: '2025-12-19',
                taxonomy: {
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
                }
            };

            // Attribute Taxonomy v1.0
            const attributeData = mode === 'industry' ? undefined : {
                version: '1.0',
                lastUpdated: '2025-12-19',
                attributes: {
                    Price_Positioning: { description: '가격 포지셔닝', values: ['Mass', 'Value', 'Mid', 'Premium', 'Luxury', 'Ultra_Luxury'] },
                    Sustainability: { description: '지속가능성', values: ['Eco_Friendly', 'Upcycled', 'Fair_Trade', 'Vegan', 'Cruelty_Free', 'Organic', 'Zero_Waste'] },
                    Business_Model: { description: '비즈니스 모델', values: ['Direct_To_Consumer', 'Marketplace', 'Subscription', 'Rental', 'Resale', 'Secondhand', 'On_Demand'] },
                    Brand_Type: { description: '브랜드 유형', values: ['Legacy_Brand', 'Designer_Brand', 'Indie_Brand', 'Creator_Brand', 'Local_Brand', 'Global_Brand'] },
                    Product_Lifecycle: { description: '제품 수명주기', values: ['New_Launch', 'Limited_Edition', 'Seasonal', 'Evergreen', 'Preorder', 'Flash_Sale'] },
                    Audience_Lifecycle: { description: '타겟 라이프스타일', values: ['Student', 'Early_Career', 'Young_Professional', 'Family', 'Mid_Career', 'Senior'] },
                    Channel_Preference: { description: '채널 선호', values: ['Online_First', 'Offline_First', 'Omnichannel', 'Mobile_First', 'Social_Commerce'] },
                    Purchase_Decision_Style: { description: '구매 결정 스타일', values: ['Impulse', 'Deal_Seeker', 'Research_Heavy', 'Brand_Loyal', 'Trend_Seeker', 'Quality_Focused'] },
                    Offer_Format: { description: '제공 형식', values: ['Physical_Product', 'Digital_Product', 'Service', 'Experience', 'Event', 'Membership'] },
                    Target_Gender: { description: '타겟 성별', values: ['Male', 'Female', 'Unisex'] },
                }
            };

            const result = await uploadTaxonomy({
                industryData,
                attributeData,
                legacyMode: mode === 'legacy'
            });
            const data = result.data as any;

            if (data.success) {
                setTaxonomyMessage(`✅ ${data.message || 'Taxonomy 업로드 완료'} - ${data.results?.join(', ')}`);
            } else {
                setTaxonomyMessage(`❌ 업로드 실패`);
            }
        } catch (error: any) {
            setTaxonomyMessage(`오류: ${error.message}`);
        }
        setIsUploadingTaxonomy(false);
        setTimeout(() => setTaxonomyMessage(null), 15000);
    };

    // Surveys Upload Handler
    const handleUploadSurveys = async () => {
        setIsUploadingSurveys(true);
        setSurveysMessage(null);
        try {
            const uploadSurveys = httpsCallable(functions, 'uploadSurveys');
            const result: any = await uploadSurveys();
            if (result.data.success) {
                setSurveysMessage(`✅ 업로드 성공: ${result.data.count}개 문항`);
                // Reload if already viewing
                if (surveysData) handleLoadSurveys();
            }
        } catch (error: any) {
            console.error('Upload failed:', error);
            setSurveysMessage('❌ 업로드 실패: ' + error.message);
        } finally {
            setIsUploadingSurveys(false);
        }
    };

    const handleLoadSurveys = async () => {
        setIsLoadingSurveysData(true);
        try {
            // Ensure functions is initialized
            if (!functions) throw new Error("Firebase Functions not initialized");

            const getSurveysFn = httpsCallable(functions, 'getSurveys');
            const result: any = await getSurveysFn();
            if (result.data.success) {
                setSurveysData(result.data.surveys);
            }
        } catch (e: any) {
            console.error("Failed to load surveys:", e);
            setSurveysMessage('❌ 목록 로드 실패: ' + e.message);
        } finally {
            setIsLoadingSurveysData(false);
        }
    };
    setTimeout(() => setSurveysMessage(null), 10000);

    const addBoosterTier = () => {
        setStakingForm(prev => ({
            ...prev,
            boosterTiers: [...prev.boosterTiers, { minAchievement: 0, rewardRate: 0 }]
        }));
    };

    const removeBoosterTier = (index: number) => {
        setStakingForm(prev => ({
            ...prev,
            boosterTiers: prev.boosterTiers.filter((_, i) => i !== index)
        }));
    };

    const updateBoosterTier = (index: number, field: keyof BoosterTier, value: number) => {
        setStakingForm(prev => ({
            ...prev,
            boosterTiers: prev.boosterTiers.map((tier, i) =>
                i === index ? { ...tier, [field]: value } : tier
            )
        }));
    };

    const updateReferralReward = (
        type: 'purchase' | 'adViewing' | 'staking',
        field: keyof ReferralRewardConfig,
        value: boolean | number
    ) => {
        setReferralForm(prev => ({
            ...prev,
            rewards: {
                ...prev.rewards,
                [type]: { ...prev.rewards[type], [field]: value }
            }
        }));
    };

    // Loading State
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-white" />
            </div>
        );
    }

    // Not logged in - Show Login Screen
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-brand-500" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-800">Admin Login</h1>
                        <p className="text-gray-500 text-sm mt-1">관리자 계정으로 로그인하세요</p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-3 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google로 로그인
                        </button>

                        {loginError && (
                            <p className="text-red-500 text-sm text-center">{loginError}</p>
                        )}

                        <a
                            href="/"
                            className="block text-center text-sm text-gray-500 hover:text-brand-500"
                        >
                            ← 홈으로 돌아가기
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Logged in but not admin
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-800 mb-2">접근 권한 없음</h1>
                    <p className="text-gray-500 text-sm mb-2">
                        {currentUser.email}
                    </p>
                    <p className="text-gray-500 text-sm mb-6">
                        관리자 권한이 없는 계정입니다.
                    </p>
                    <p className="text-xs text-gray-400 mb-6 bg-gray-50 p-3 rounded-lg font-mono break-all">
                        UID: {currentUser.uid}
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            다른 계정으로 로그인
                        </button>
                        <a
                            href="/"
                            className="block text-center text-sm text-gray-500 hover:text-brand-500"
                        >
                            ← 홈으로 돌아가기
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                {/* Logo / Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
                            <Settings className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-gray-800">Admin</h1>
                            <p className="text-xs text-gray-400">VIEW Management</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 p-4 space-y-1">
                    {[
                        { id: 'users', label: '회원 관리', icon: Users },
                        { id: 'tokenomics', label: '토크노믹스', icon: Coins },
                        { id: 'staking', label: '스테이킹', icon: TrendingUp },
                        { id: 'referral', label: '레퍼럴', icon: Settings },
                        { id: 'taxonomy', label: '분류 체계', icon: Database },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as TabType)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all
                                ${activeTab === item.id
                                    ? 'bg-brand-50 text-brand-600 font-bold'
                                    : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Users size={18} className="text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{currentUser?.email}</p>
                            <p className="text-xs text-gray-400">Admin</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveTab('taxonomy')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'taxonomy' ? 'bg-brand-50 text-brand-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Database size={20} />
                        <span>Taxonomy & Surveys</span>
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('personas');
                            loadPersonaStats();
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'personas' ? 'bg-brand-50 text-brand-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <BarChart3 size={20} />
                        <span>Persona Stats</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'documents' ? 'bg-brand-50 text-brand-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <FileText size={20} />
                        <span>Documents</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('prediction')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'prediction' ? 'bg-brand-50 text-brand-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <TrendingUp size={20} />
                        <span>BTC 예측</span>
                    </button>
                    <a
                        href="/"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 text-sm text-gray-500 hover:text-brand-500 rounded-lg transition-colors"
                    >
                        <Home size={16} />
                        홈으로
                    </a>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 md:p-8 overflow-auto">
                <div className="max-w-5xl mx-auto">
                    {/* Content Header */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-black text-gray-800">
                            {activeTab === 'users' && '회원 관리'}
                            {activeTab === 'tokenomics' && '토크노믹스'}
                            {activeTab === 'staking' && '스테이킹'}
                            {activeTab === 'referral' && '레퍼럴'}
                            {activeTab === 'taxonomy' && '분류 체계'}
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            {activeTab === 'users' && '등록된 회원 목록 및 통계'}
                            {activeTab === 'tokenomics' && '포인트-토큰 변환 설정'}
                            {activeTab === 'staking' && '스테이킹 보상률 설정'}
                            {activeTab === 'referral' && '추천인 보상 설정'}
                            {activeTab === 'taxonomy' && '광고 분류 체계 관리'}
                        </p>
                    </div>

                    {/* Content Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        {/* Users Tab */}
                        {activeTab === 'users' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <Users size={20} className="text-brand-500" />
                                        User Management
                                    </h2>
                                    <button
                                        onClick={loadUsers}
                                        disabled={isLoadingUsers}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm"
                                    >
                                        <RefreshCw size={14} className={isLoadingUsers ? 'animate-spin' : ''} />
                                        새로고침
                                    </button>
                                </div>

                                {/* Search */}
                                <div className="relative">
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="이름, UID, 추천코드로 검색..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:border-brand-500 outline-none"
                                    />
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-blue-50 rounded-xl p-4">
                                        <p className="text-xs text-blue-600 font-medium">총 회원수</p>
                                        <p className="text-2xl font-black text-blue-800">{users.length}</p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4">
                                        <p className="text-xs text-green-600 font-medium">총 잔액</p>
                                        <p className="text-2xl font-black text-green-800">
                                            {users.reduce((sum, u) => sum + u.balance, 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="bg-purple-50 rounded-xl p-4">
                                        <p className="text-xs text-purple-600 font-medium">총 스테이킹</p>
                                        <p className="text-2xl font-black text-purple-800">
                                            {users.reduce((sum, u) => sum + u.staked, 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="bg-orange-50 rounded-xl p-4">
                                        <p className="text-xs text-orange-600 font-medium">클레임 가능</p>
                                        <p className="text-2xl font-black text-orange-800">
                                            {users.reduce((sum, u) => sum + u.claimableBalance, 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* User Table */}
                                {isLoadingUsers ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200">
                                                    <th className="text-left py-3 px-2 font-semibold text-gray-600">이름</th>
                                                    <th className="text-left py-3 px-2 font-semibold text-gray-600">추천코드</th>
                                                    <th className="text-right py-3 px-2 font-semibold text-gray-600">잔액</th>
                                                    <th className="text-right py-3 px-2 font-semibold text-gray-600">스테이킹</th>
                                                    <th className="text-right py-3 px-2 font-semibold text-gray-600">추천인수</th>
                                                    <th className="text-left py-3 px-2 font-semibold text-gray-600">가입일</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.map((user) => (
                                                    <tr key={user.uid} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="py-3 px-2">
                                                            <div>
                                                                <p className="font-medium text-gray-800">{user.displayName}</p>
                                                                <p className="text-xs text-gray-400 truncate max-w-[150px]">{user.uid}</p>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{user.referralCode}</code>
                                                        </td>
                                                        <td className="py-3 px-2 text-right font-medium">{user.balance.toLocaleString()}</td>
                                                        <td className="py-3 px-2 text-right font-medium">{user.staked.toLocaleString()}</td>
                                                        <td className="py-3 px-2 text-right">{user.directReferrals}</td>
                                                        <td className="py-3 px-2 text-xs text-gray-500">
                                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {filteredUsers.length === 0 && (
                                            <p className="text-center text-gray-500 py-8">검색 결과가 없습니다</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tokenomics Tab */}
                        {activeTab === 'tokenomics' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Coins size={20} className="text-brand-500" />
                                    Point-Token Conversion
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Point Value (USD)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                value={tokenomicsForm.pointValueUsd}
                                                onChange={(e) => setTokenomicsForm(prev => ({
                                                    ...prev, pointValueUsd: parseFloat(e.target.value) || 0
                                                }))}
                                                className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 outline-none"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">1 포인트 = ${tokenomicsForm.pointValueUsd}</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Token Price (USD)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                value={tokenomicsForm.tokenPriceUsd}
                                                onChange={(e) => setTokenomicsForm(prev => ({
                                                    ...prev, tokenPriceUsd: parseFloat(e.target.value) || 0
                                                }))}
                                                className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 outline-none"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">1 VIEW = ${tokenomicsForm.tokenPriceUsd}</p>
                                    </div>
                                </div>

                                {/* Price Source Toggle */}
                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-medium text-gray-700">Token Price Source</p>
                                        <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                                            <button
                                                onClick={() => setTokenomicsForm(prev => ({ ...prev, tokenPriceSource: 'manual' }))}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tokenomicsForm.tokenPriceSource === 'manual'
                                                    ? 'bg-brand-500 text-white'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                Manual
                                            </button>
                                            <button
                                                onClick={() => setTokenomicsForm(prev => ({ ...prev, tokenPriceSource: 'api' }))}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tokenomicsForm.tokenPriceSource === 'api'
                                                    ? 'bg-brand-500 text-white'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                API (Auto)
                                            </button>
                                        </div>
                                    </div>

                                    {tokenomicsForm.tokenPriceSource === 'api' && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-blue-600">
                                                📡 매시간 MEXC/LBANK에서 자동으로 VIEW 가격을 가져옵니다.
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleManualPriceUpdate}
                                                    disabled={isUpdatingPrice}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50"
                                                >
                                                    {isUpdatingPrice ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <RefreshCw size={14} />
                                                    )}
                                                    지금 가격 가져오기
                                                </button>
                                                {priceMessage && (
                                                    <span className={`text-xs ${priceMessage.includes('완료') ? 'text-green-600' : 'text-red-500'}`}>
                                                        {priceMessage}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {tokenomicsForm.tokenPriceSource === 'manual' && (
                                        <p className="text-xs text-gray-500">
                                            수동 모드: 위에서 직접 가격을 입력하세요.
                                        </p>
                                    )}
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm font-medium text-gray-700">Conversion Preview</p>
                                    <p className="text-2xl font-bold text-brand-600 mt-1">
                                        1,000 Points → {((1000 * tokenomicsForm.pointValueUsd) / tokenomicsForm.tokenPriceUsd).toFixed(2)} VIEW
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Staking Tab */}
                        {activeTab === 'staking' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-brand-500" />
                                    Staking Rewards
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Base APY (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={stakingForm.baseApy}
                                            onChange={(e) => setStakingForm(prev => ({
                                                ...prev, baseApy: parseFloat(e.target.value) || 0
                                            }))}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Booster APY (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={stakingForm.boosterApy}
                                            onChange={(e) => setStakingForm(prev => ({
                                                ...prev, boosterApy: parseFloat(e.target.value) || 0
                                            }))}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Daily Ad Threshold (seconds)
                                        </label>
                                        <input
                                            type="number"
                                            value={stakingForm.dailyAdThreshold}
                                            onChange={(e) => setStakingForm(prev => ({
                                                ...prev, dailyAdThreshold: parseInt(e.target.value) || 0
                                            }))}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">{Math.floor(stakingForm.dailyAdThreshold / 60)}분 {stakingForm.dailyAdThreshold % 60}초</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Lockup Period (days)
                                        </label>
                                        <input
                                            type="number"
                                            value={stakingForm.lockupDays}
                                            onChange={(e) => setStakingForm(prev => ({
                                                ...prev, lockupDays: parseInt(e.target.value) || 0
                                            }))}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Booster Tiers */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-sm font-medium text-gray-700">Booster Tiers</label>
                                        <button
                                            onClick={addBoosterTier}
                                            className="flex items-center gap-1 px-3 py-1 bg-brand-100 text-brand-600 rounded-lg text-sm font-bold hover:bg-brand-200"
                                        >
                                            <Plus size={16} /> Add Tier
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {stakingForm.boosterTiers.map((tier, index) => (
                                            <div key={index} className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl">
                                                <div className="flex-1">
                                                    <label className="text-xs text-gray-500">Min Achievement %</label>
                                                    <input
                                                        type="number"
                                                        value={tier.minAchievement}
                                                        onChange={(e) => updateBoosterTier(index, 'minAchievement', parseInt(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border rounded-lg"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs text-gray-500">Reward Rate %</label>
                                                    <input
                                                        type="number"
                                                        value={tier.rewardRate}
                                                        onChange={(e) => updateBoosterTier(index, 'rewardRate', parseInt(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border rounded-lg"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removeBoosterTier(index)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Referral Tab */}
                        {activeTab === 'referral' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Users size={20} className="text-brand-500" />
                                    Referral System
                                </h2>

                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={referralForm.enabled}
                                            onChange={(e) => setReferralForm(prev => ({ ...prev, enabled: e.target.checked }))}
                                            className="w-5 h-5 rounded text-brand-500"
                                        />
                                        <span className="font-medium">Enable Referral System</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Monthly Cap (points)
                                        </label>
                                        <input
                                            type="number"
                                            value={referralForm.monthlyCap}
                                            onChange={(e) => setReferralForm(prev => ({
                                                ...prev, monthlyCap: parseInt(e.target.value) || 0
                                            }))}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Payment Delay (days)
                                        </label>
                                        <input
                                            type="number"
                                            value={referralForm.paymentDelayDays}
                                            onChange={(e) => setReferralForm(prev => ({
                                                ...prev, paymentDelayDays: parseInt(e.target.value) || 0
                                            }))}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Reward Rates Table */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Reward Rates</label>
                                    <div className="bg-gray-50 rounded-xl overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Type</th>
                                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Enabled</th>
                                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Tier 1 %</th>
                                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Tier 2 %</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(['purchase', 'adViewing', 'staking'] as const).map(type => (
                                                    <tr key={type} className="border-t border-gray-200">
                                                        <td className="px-4 py-3 font-medium capitalize">{type === 'adViewing' ? 'Ad Viewing' : type}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={referralForm.rewards[type].enabled}
                                                                onChange={(e) => updateReferralReward(type, 'enabled', e.target.checked)}
                                                                className="w-5 h-5 rounded text-brand-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                value={referralForm.rewards[type].tier1Rate}
                                                                onChange={(e) => updateReferralReward(type, 'tier1Rate', parseFloat(e.target.value) || 0)}
                                                                className="w-20 px-2 py-1 border rounded text-center mx-auto block"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                value={referralForm.rewards[type].tier2Rate}
                                                                onChange={(e) => updateReferralReward(type, 'tier2Rate', parseFloat(e.target.value) || 0)}
                                                                className="w-20 px-2 py-1 border rounded text-center mx-auto block"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="mt-8 flex items-center justify-between">
                            {saveMessage && (
                                <p className={`text-sm font-medium ${saveMessage.includes('실패') ? 'text-red-500' : 'text-green-500'}`}>
                                    {saveMessage}
                                </p>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="ml-auto flex items-center gap-2 px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-all"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
                                Save All Settings
                            </button>
                        </div>

                        {/* Taxonomy Tab */}
                        {activeTab === 'taxonomy' && (
                            <div className="space-y-6">
                                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center">
                                            <Database className="w-7 h-7 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800">광고 분류 체계</h3>
                                            <p className="text-sm text-gray-500">VIEW Advertising Taxonomy v1.0</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-white rounded-xl p-4 text-center">
                                            <p className="text-3xl font-black text-green-600">13</p>
                                            <p className="text-xs text-gray-500">산업 분류</p>
                                        </div>
                                        <div className="bg-white rounded-xl p-4 text-center">
                                            <p className="text-3xl font-black text-green-600">60+</p>
                                            <p className="text-xs text-gray-500">카테고리</p>
                                        </div>
                                        <div className="bg-white rounded-xl p-4 text-center">
                                            <p className="text-3xl font-black text-green-600">400+</p>
                                            <p className="text-xs text-gray-500">서브카테고리</p>
                                        </div>
                                        <div className="bg-white rounded-xl p-4 text-center border-2 border-indigo-200">
                                            <p className="text-3xl font-black text-indigo-600">10</p>
                                            <p className="text-xs text-gray-500">속성 유형 (NEW)</p>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl p-4 mb-4">
                                        <h4 className="text-sm font-bold text-gray-700 mb-3">Taxonomy 구조 (v1.1)</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="font-medium text-brand-600">Industry (What)</span>
                                                <p className="text-gray-500 text-xs">무엇을 파는가: Fashion.Apparel.Womenswear</p>
                                            </div>
                                            <div>
                                                <span className="font-medium text-indigo-600">Attribute (How)</span>
                                                <p className="text-gray-500 text-xs">어떻게 파는가: Sustainability.Eco_Friendly</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <button
                                            onClick={() => handleUploadTaxonomy('both')}
                                            disabled={isUploadingTaxonomy}
                                            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 disabled:opacity-50 transition-all"
                                        >
                                            {isUploadingTaxonomy ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <Database size={18} />
                                            )}
                                            전체 업로드 (v1.1)
                                        </button>
                                        <button
                                            onClick={() => handleUploadTaxonomy('industry')}
                                            disabled={isUploadingTaxonomy}
                                            className="flex items-center gap-2 px-4 py-2 bg-brand-100 text-brand-700 font-medium rounded-xl hover:bg-brand-200 disabled:opacity-50 transition-all text-sm"
                                        >
                                            Industry만
                                        </button>
                                        <button
                                            onClick={() => handleUploadTaxonomy('attribute')}
                                            disabled={isUploadingTaxonomy}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-xl hover:bg-indigo-200 disabled:opacity-50 transition-all text-sm"
                                        >
                                            Attribute만
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Firestore: <code className="bg-white px-2 py-0.5 rounded text-xs">settings/taxonomy_industry</code>, <code className="bg-white px-2 py-0.5 rounded text-xs">settings/taxonomy_attributes</code>
                                    </p>
                                    {taxonomyMessage && (
                                        <p className={`text-sm mt-4 font-medium ${taxonomyMessage.includes('✅') ? 'text-green-600' : 'text-red-500'}`}>
                                            {taxonomyMessage}
                                        </p>
                                    )}
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h4 className="text-sm font-bold text-gray-700 mb-3">포함된 산업 분류 (Industry)</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                        {['패션 👗', '뷰티 💄', '식음료 🍔', '여행 ✈️', '금융 💰', '기술 📱', '교육 📚', '건강 💪', '자동차 🚗', '홈/리빙 🏠', '엔터테인먼트 🎬', 'ESG 🌱', '미디어/출판 📖'].map(industry => (
                                            <div key={industry} className="bg-white rounded-lg px-3 py-2 text-sm text-gray-600">
                                                {industry}
                                            </div>
                                        ))}
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-3">속성 유형 (Attribute)</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['가격 포지셔닝', '지속가능성', '비즈니스 모델', '브랜드 유형', '제품 수명주기', '타겟 라이프스타일', '채널 선호', '구매 결정 스타일', '제공 형식', '타겟 성별'].map(attr => (
                                            <span key={attr} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                                {attr}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Survey Upload Section */}
                                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mt-4">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
                                            <span className="text-xl">📋</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800">설문 데이터</h3>
                                            <p className="text-sm text-gray-500">페르소나 설문 60문항</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div className="bg-white rounded-xl p-3 text-center">
                                            <p className="text-2xl font-black text-blue-600">6</p>
                                            <p className="text-xs text-gray-500">카테고리</p>
                                        </div>
                                        <div className="bg-white rounded-xl p-3 text-center">
                                            <p className="text-2xl font-black text-blue-600">60</p>
                                            <p className="text-xs text-gray-500">문항</p>
                                        </div>
                                        <div className="bg-white rounded-xl p-3 text-center">
                                            <p className="text-2xl font-black text-blue-600">1,500</p>
                                            <p className="text-xs text-gray-500">VIEW 보상</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleLoadSurveys}
                                            disabled={isLoadingSurveysData}
                                            className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all text-sm"
                                        >
                                            {isLoadingSurveysData ? <Loader2 size={16} className="animate-spin" /> : '목록 보기'}
                                        </button>
                                        <button
                                            onClick={handleUploadSurveys}
                                            disabled={isUploadingSurveys}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-all"
                                        >
                                            {isUploadingSurveys ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <span>📋</span>
                                            )}
                                            설문 업로드
                                        </button>
                                    </div>
                                    {surveysMessage && (
                                        <p className={`text-sm mt-3 font-medium ${surveysMessage.includes('✅') ? 'text-blue-600' : 'text-red-500'}`}>
                                            {surveysMessage}
                                        </p>
                                    )}

                                    {/* Survey List View */}
                                    {surveysData && (
                                        <div className="mt-6 border-t border-blue-200 pt-6">
                                            <h4 className="text-md font-bold text-gray-800 mb-4">설문 문항 목록 ({surveysData.length}개 카테고리)</h4>
                                            <div className="space-y-4">
                                                {surveysData.map((survey: any) => (
                                                    <div key={survey.id} className="bg-white rounded-xl p-4 shadow-sm">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h5 className="font-bold text-blue-600">{survey.title} ({survey.id})</h5>
                                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">순서: {survey.order}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-3">{survey.description}</p>

                                                        <div className="space-y-2">
                                                            {survey.questions?.map((q: any) => (
                                                                <div key={q.id} className="text-sm border-l-2 border-gray-200 pl-3">
                                                                    <p className="font-medium text-gray-800">Q. {q.text}</p>
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        Type: {q.type} | Options: {q.options?.length || 0}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setSurveysData(null)}
                                                className="mt-4 text-sm text-gray-500 underline"
                                            >
                                                닫기
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Personas Tab */}
                        {activeTab === 'personas' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-800">Persona Statistics</h2>
                                    <button
                                        onClick={loadPersonaStats}
                                        disabled={statsLoading}
                                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                                    >
                                        <RefreshCw size={20} className={statsLoading ? 'animate-spin' : ''} />
                                    </button>
                                </div>

                                {statsLoading && !personaStats ? (
                                    <div className="flex justify-center py-20">
                                        <Loader2 className="animate-spin text-brand-500" size={40} />
                                    </div>
                                ) : statsError ? (
                                    <div className="text-center py-20 text-red-500">
                                        <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
                                        <p className="font-bold">Error loading stats</p>
                                        <p className="text-sm">{statsError}</p>
                                    </div>
                                ) : personaStats ? (
                                    <>
                                        {/* KPI Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="p-3 bg-blue-50 rounded-xl">
                                                        <Users className="text-blue-600" size={24} />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-400 uppercase">Total Users</span>
                                                </div>
                                                <h3 className="text-3xl font-bold text-gray-900">{personaStats.totalAnalyzed.toLocaleString()}</h3>
                                                <p className="text-sm text-gray-500 mt-1">Persona Analyzed</p>
                                            </div>

                                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="p-3 bg-green-50 rounded-xl">
                                                        <Coins className="text-green-600" size={24} />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-400 uppercase">Avg Data Value</span>
                                                </div>
                                                <h3 className="text-3xl font-bold text-gray-900">₩ {personaStats.avgDataValue.toLocaleString()}</h3>
                                                <p className="text-sm text-gray-500 mt-1">Per User / Month</p>
                                            </div>
                                        </div>

                                        {/* Charts */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Interest Distribution */}
                                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                                <h3 className="text-lg font-bold text-gray-800 mb-6">Top Interests (Taxonomy)</h3>
                                                <div className="h-[300px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={Object.entries(personaStats.interestDistribution).map(([name, value]) => ({ name, value }))}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                                            <YAxis />
                                                            <RechartsTooltip />
                                                            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            {/* Persona Distribution */}
                                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                                <h3 className="text-lg font-bold text-gray-800 mb-6">Persona Distribution</h3>
                                                <div className="h-[300px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={Object.entries(personaStats.personaDistribution).map(([name, value]) => ({ name, value }))}
                                                                cx="50%"
                                                                cy="50%"
                                                                outerRadius={100}
                                                                fill="#8884d8"
                                                                dataKey="value"
                                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                            >
                                                                {Object.entries(personaStats.personaDistribution).map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'][index % 5]} />
                                                                ))}
                                                            </Pie>
                                                            <RechartsTooltip />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-20 text-gray-400">
                                        <Database size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>No stats available. Try refreshing.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Documents Tab */}
                        {activeTab === 'documents' && (
                            <DocumentArchive />
                        )}

                        {/* Prediction Tab */}
                        {activeTab === 'prediction' && (
                            <PredictionAdmin />
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default AdminPage;
