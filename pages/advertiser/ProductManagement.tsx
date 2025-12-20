import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Upload, Image, Tag, Search, Filter, Loader2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { INDUSTRY_TAXONOMY_V1_1 } from '../../src/constants/taxonomy';

interface ProductItem {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    industry: string;
    category: string;
    subcategory?: string;
    attributes: {
        pricePositioning?: string;
        sustainability?: string;
        targetGender?: string;
        businessModel?: string;
    };
    brand?: string;
    isActive: boolean;
    createdAt?: string;
}

const ProductManagement: React.FC = () => {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterIndustry, setFilterIndustry] = useState('');

    // Form state
    const [formData, setFormData] = useState<Partial<ProductItem>>({
        name: '',
        description: '',
        imageUrl: '',
        industry: '',
        category: '',
        subcategory: '',
        attributes: {},
        brand: '',
        isActive: true,
    });

    // Get industries from taxonomy
    const industries = Object.keys(INDUSTRY_TAXONOMY_V1_1.taxonomy);

    // Get categories for selected industry
    const getCategories = (industry: string) => {
        if (!industry) return [];
        const ind = INDUSTRY_TAXONOMY_V1_1.taxonomy[industry as keyof typeof INDUSTRY_TAXONOMY_V1_1.taxonomy];
        return ind ? Object.keys(ind) : [];
    };

    // Get subcategories for selected category
    const getSubcategories = (industry: string, category: string) => {
        if (!industry || !category) return [];
        const ind = INDUSTRY_TAXONOMY_V1_1.taxonomy[industry as keyof typeof INDUSTRY_TAXONOMY_V1_1.taxonomy];
        if (!ind) return [];
        return (ind as any)[category] || [];
    };

    // Load products
    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            const getProducts = httpsCallable(functions, 'getAdvertiserProducts');
            const result = await getProducts({});
            const data = result.data as { success: boolean; products: ProductItem[] };
            if (data.success) {
                setProducts(data.products || []);
            }
        } catch (error) {
            console.error('Failed to load products:', error);
            // Use mock data for now
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProduct = async () => {
        if (!formData.name || !formData.industry || !formData.category) {
            setMessage({ type: 'error', text: '필수 항목을 입력해주세요.' });
            return;
        }

        setIsSaving(true);
        try {
            const saveProduct = httpsCallable(functions, 'saveAdvertiserProduct');
            await saveProduct({
                ...formData,
                id: editingProduct?.id || `prod_${Date.now()}`,
            });

            setMessage({ type: 'success', text: editingProduct ? '제품이 수정되었습니다.' : '제품이 등록되었습니다.' });
            setShowAddForm(false);
            setEditingProduct(null);
            resetForm();
            loadProducts();
        } catch (error: any) {
            setMessage({ type: 'error', text: '저장 실패: ' + error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        if (!confirm('이 제품을 삭제하시겠습니까?')) return;

        try {
            const deleteProduct = httpsCallable(functions, 'deleteAdvertiserProduct');
            await deleteProduct({ productId });
            setMessage({ type: 'success', text: '제품이 삭제되었습니다.' });
            loadProducts();
        } catch (error: any) {
            setMessage({ type: 'error', text: '삭제 실패: ' + error.message });
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            imageUrl: '',
            industry: '',
            category: '',
            subcategory: '',
            attributes: {},
            brand: '',
            isActive: true,
        });
    };

    const handleEdit = (product: ProductItem) => {
        setEditingProduct(product);
        setFormData(product);
        setShowAddForm(true);
    };

    // Filter products
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesIndustry = !filterIndustry || p.industry === filterIndustry;
        return matchesSearch && matchesIndustry;
    });

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">제품 관리</h1>
                        <p className="text-gray-500 text-sm mt-1">스와이프 게임에 노출될 제품을 등록하세요</p>
                    </div>
                    <button
                        onClick={() => { setShowAddForm(true); setEditingProduct(null); resetForm(); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-200"
                    >
                        <Plus size={18} />
                        제품 등록
                    </button>
                </div>

                {/* Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {/* Search & Filter */}
                <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="제품명 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>
                        </div>
                        <div className="w-48">
                            <select
                                value={filterIndustry}
                                onChange={(e) => setFilterIndustry(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                            >
                                <option value="">전체 산업</option>
                                {industries.map(ind => (
                                    <option key={ind} value={ind}>{ind}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Products Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-brand-500" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                        <Image size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-800 mb-2">등록된 제품이 없습니다</h3>
                        <p className="text-gray-500 text-sm mb-6">첫 번째 제품을 등록하여 사용자들에게 노출하세요</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700"
                        >
                            <Plus size={18} />
                            제품 등록하기
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="h-40 bg-gray-100 relative">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Image size={32} className="text-gray-300" />
                                        </div>
                                    )}
                                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {product.isActive ? '활성' : '비활성'}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{product.description}</p>
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-xs rounded-full">{product.industry}</span>
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{product.category}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(product)}
                                            className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProduct(product.id)}
                                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add/Edit Modal */}
                {showAddForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white p-6">
                                <h2 className="text-xl font-bold">{editingProduct ? '제품 수정' : '새 제품 등록'}</h2>
                                <p className="text-brand-100 text-sm mt-1">스와이프 게임에 노출될 제품 정보를 입력하세요</p>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Basic Info */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">제품명 *</label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                                        placeholder="프리미엄 스니커즈"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                                        rows={2}
                                        placeholder="한정판 디자이너 운동화"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">이미지 URL</label>
                                    <input
                                        type="url"
                                        value={formData.imageUrl || ''}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">브랜드명</label>
                                    <input
                                        type="text"
                                        value={formData.brand || ''}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                                        placeholder="Nike"
                                    />
                                </div>

                                {/* Taxonomy */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">산업 *</label>
                                        <select
                                            value={formData.industry || ''}
                                            onChange={(e) => setFormData({ ...formData, industry: e.target.value, category: '', subcategory: '' })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm"
                                        >
                                            <option value="">선택</option>
                                            {industries.map(ind => (
                                                <option key={ind} value={ind}>{ind}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 *</label>
                                        <select
                                            value={formData.category || ''}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm"
                                            disabled={!formData.industry}
                                        >
                                            <option value="">선택</option>
                                            {getCategories(formData.industry || '').map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">서브카테고리</label>
                                        <select
                                            value={formData.subcategory || ''}
                                            onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm"
                                            disabled={!formData.category}
                                        >
                                            <option value="">선택</option>
                                            {getSubcategories(formData.industry || '', formData.category || '').map((sub: string) => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Attributes */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">가격대</label>
                                        <select
                                            value={formData.attributes?.pricePositioning || ''}
                                            onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, pricePositioning: e.target.value } })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm"
                                        >
                                            <option value="">선택</option>
                                            <option value="Mass">Mass</option>
                                            <option value="Value">Value</option>
                                            <option value="Mid">Mid</option>
                                            <option value="Premium">Premium</option>
                                            <option value="Luxury">Luxury</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">타겟 성별</label>
                                        <select
                                            value={formData.attributes?.targetGender || ''}
                                            onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, targetGender: e.target.value } })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm"
                                        >
                                            <option value="">선택</option>
                                            <option value="Male">남성</option>
                                            <option value="Female">여성</option>
                                            <option value="Unisex">전체</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Active Toggle */}
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive ?? true}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-5 h-5 text-brand-600 rounded"
                                    />
                                    <span className="text-sm text-gray-700">스와이프 게임에서 활성화</span>
                                </label>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => { setShowAddForm(false); setEditingProduct(null); resetForm(); }}
                                        className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleSaveProduct}
                                        disabled={isSaving}
                                        className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {editingProduct ? '수정' : '등록'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductManagement;
