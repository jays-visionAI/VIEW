import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Edit2, X, ChevronDown, ChevronUp, GripVertical, Loader2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

interface Question {
    id: string;
    order: number;
    question: string;
    type: 'single' | 'multiple' | 'slider';
    options?: string[];
    min?: number;
    max?: number;
    sliderLabels?: string[];
    reward: number;
    required: boolean;
}

interface SurveyCategory {
    id: string;
    category: string;
    categoryNameKo: string;
    order: number;
    completionBonus: number;
    isActive: boolean;
    questions: Question[];
}

interface SurveyEditorProps {
    surveys: SurveyCategory[];
    onRefresh: () => void;
}

const SurveyEditor: React.FC<SurveyEditorProps> = ({ surveys, onRefresh }) => {
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form states
    const [categoryForm, setCategoryForm] = useState<Partial<SurveyCategory>>({});
    const [questionForm, setQuestionForm] = useState<Partial<Question>>({});
    const [newCategoryForm, setNewCategoryForm] = useState({
        id: '',
        categoryNameKo: '',
        completionBonus: 50,
    });
    const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
    const [showNewQuestionForm, setShowNewQuestionForm] = useState<string | null>(null);
    const [newQuestionForm, setNewQuestionForm] = useState<Partial<Question>>({
        question: '',
        type: 'single',
        options: [''],
        reward: 10,
        required: true,
    });

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    // ========== Category Operations ==========
    const handleEditCategory = (category: SurveyCategory) => {
        setEditingCategory(category.id);
        setCategoryForm({
            categoryNameKo: category.categoryNameKo,
            completionBonus: category.completionBonus,
            isActive: category.isActive,
            order: category.order,
        });
    };

    const handleSaveCategory = async (categoryId: string) => {
        setIsSaving(true);
        try {
            const updateSurveyCategory = httpsCallable(functions, 'updateSurveyCategory');
            await updateSurveyCategory({ categoryId, updates: categoryForm });
            showMessage('success', '카테고리가 저장되었습니다.');
            setEditingCategory(null);
            onRefresh();
        } catch (error: any) {
            showMessage('error', '저장 실패: ' + error.message);
        }
        setIsSaving(false);
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (!confirm(`"${categoryId}" 카테고리를 삭제하시겠습니까? 모든 질문도 함께 삭제됩니다.`)) return;

        setIsSaving(true);
        try {
            const deleteSurveyCategory = httpsCallable(functions, 'deleteSurveyCategory');
            await deleteSurveyCategory({ categoryId });
            showMessage('success', '카테고리가 삭제되었습니다.');
            onRefresh();
        } catch (error: any) {
            showMessage('error', '삭제 실패: ' + error.message);
        }
        setIsSaving(false);
    };

    const handleCreateCategory = async () => {
        if (!newCategoryForm.id || !newCategoryForm.categoryNameKo) {
            showMessage('error', 'ID와 카테고리명을 입력해주세요.');
            return;
        }

        setIsSaving(true);
        try {
            const createSurveyCategory = httpsCallable(functions, 'createSurveyCategory');
            await createSurveyCategory({
                categoryId: newCategoryForm.id,
                categoryNameKo: newCategoryForm.categoryNameKo,
                completionBonus: newCategoryForm.completionBonus,
                order: surveys.length + 1,
            });
            showMessage('success', '새 카테고리가 생성되었습니다.');
            setShowNewCategoryForm(false);
            setNewCategoryForm({ id: '', categoryNameKo: '', completionBonus: 50 });
            onRefresh();
        } catch (error: any) {
            showMessage('error', '생성 실패: ' + error.message);
        }
        setIsSaving(false);
    };

    // ========== Question Operations ==========
    const handleEditQuestion = (categoryId: string, question: Question) => {
        setEditingQuestion(`${categoryId}-${question.id}`);
        setQuestionForm({
            question: question.question,
            type: question.type,
            options: question.options || [],
            min: question.min,
            max: question.max,
            sliderLabels: question.sliderLabels || [],
            reward: question.reward,
            required: question.required,
        });
    };

    const handleSaveQuestion = async (categoryId: string, questionId: string) => {
        setIsSaving(true);
        try {
            const updateSurveyQuestion = httpsCallable(functions, 'updateSurveyQuestion');
            await updateSurveyQuestion({ categoryId, questionId, updates: questionForm });
            showMessage('success', '질문이 저장되었습니다.');
            setEditingQuestion(null);
            onRefresh();
        } catch (error: any) {
            showMessage('error', '저장 실패: ' + error.message);
        }
        setIsSaving(false);
    };

    const handleDeleteQuestion = async (categoryId: string, questionId: string) => {
        if (!confirm('이 질문을 삭제하시겠습니까?')) return;

        setIsSaving(true);
        try {
            const deleteSurveyQuestion = httpsCallable(functions, 'deleteSurveyQuestion');
            await deleteSurveyQuestion({ categoryId, questionId });
            showMessage('success', '질문이 삭제되었습니다.');
            onRefresh();
        } catch (error: any) {
            showMessage('error', '삭제 실패: ' + error.message);
        }
        setIsSaving(false);
    };

    const handleCreateQuestion = async (categoryId: string) => {
        if (!newQuestionForm.question) {
            showMessage('error', '질문 내용을 입력해주세요.');
            return;
        }

        setIsSaving(true);
        try {
            const addSurveyQuestion = httpsCallable(functions, 'addSurveyQuestion');
            const category = surveys.find(s => s.id === categoryId);
            await addSurveyQuestion({
                categoryId,
                question: {
                    ...newQuestionForm,
                    order: (category?.questions?.length || 0) + 1,
                    id: `q${Date.now()}`,
                }
            });
            showMessage('success', '새 질문이 추가되었습니다.');
            setShowNewQuestionForm(null);
            setNewQuestionForm({ question: '', type: 'single', options: [''], reward: 10, required: true });
            onRefresh();
        } catch (error: any) {
            showMessage('error', '추가 실패: ' + error.message);
        }
        setIsSaving(false);
    };

    // Helper functions for options management
    const addOption = (formSetter: any, currentOptions: string[] = []) => {
        formSetter((prev: any) => ({ ...prev, options: [...currentOptions, ''] }));
    };

    const removeOption = (formSetter: any, currentOptions: string[], index: number) => {
        formSetter((prev: any) => ({
            ...prev,
            options: currentOptions.filter((_, i) => i !== index)
        }));
    };

    const updateOption = (formSetter: any, currentOptions: string[], index: number, value: string) => {
        formSetter((prev: any) => ({
            ...prev,
            options: currentOptions.map((opt, i) => i === index ? value : opt)
        }));
    };

    return (
        <div className="space-y-4">
            {/* Message */}
            {message && (
                <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">설문 편집기</h3>
                <button
                    onClick={() => setShowNewCategoryForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                    <Plus size={16} />
                    새 카테고리
                </button>
            </div>

            {/* New Category Form */}
            {showNewCategoryForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-blue-800">새 카테고리 추가</h4>
                    <div className="grid grid-cols-3 gap-3">
                        <input
                            type="text"
                            placeholder="카테고리 ID (영문)"
                            value={newCategoryForm.id}
                            onChange={(e) => setNewCategoryForm(prev => ({ ...prev, id: e.target.value }))}
                            className="px-3 py-2 border rounded-lg text-sm"
                        />
                        <input
                            type="text"
                            placeholder="카테고리명 (한글)"
                            value={newCategoryForm.categoryNameKo}
                            onChange={(e) => setNewCategoryForm(prev => ({ ...prev, categoryNameKo: e.target.value }))}
                            className="px-3 py-2 border rounded-lg text-sm"
                        />
                        <input
                            type="number"
                            placeholder="완료 보너스"
                            value={newCategoryForm.completionBonus}
                            onChange={(e) => setNewCategoryForm(prev => ({ ...prev, completionBonus: parseInt(e.target.value) || 0 }))}
                            className="px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreateCategory}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : '생성'}
                        </button>
                        <button
                            onClick={() => setShowNewCategoryForm(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}

            {/* Categories List */}
            <div className="space-y-3">
                {surveys.map((category) => (
                    <div key={category.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        {/* Category Header */}
                        <div
                            className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                            onClick={() => toggleCategory(category.id)}
                        >
                            <div className="flex items-center gap-3">
                                <GripVertical size={16} className="text-gray-400" />
                                {expandedCategories.has(category.id) ?
                                    <ChevronUp size={18} className="text-gray-500" /> :
                                    <ChevronDown size={18} className="text-gray-500" />
                                }
                                <div>
                                    <h4 className="font-bold text-gray-800">{category.categoryNameKo}</h4>
                                    <p className="text-xs text-gray-500">
                                        ID: {category.id} | 순서: {category.order} | {category.questions?.length || 0}개 질문 | 보너스: {category.completionBonus}VP
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <span className={`px-2 py-1 rounded text-xs ${category.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {category.isActive ? '활성' : '비활성'}
                                </span>
                                <button
                                    onClick={() => handleEditCategory(category)}
                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Category Edit Form */}
                        {editingCategory === category.id && (
                            <div className="p-4 bg-yellow-50 border-t border-yellow-200 space-y-3">
                                <h5 className="font-bold text-yellow-800">카테고리 수정</h5>
                                <div className="grid grid-cols-4 gap-3">
                                    <input
                                        type="text"
                                        placeholder="카테고리명"
                                        value={categoryForm.categoryNameKo || ''}
                                        onChange={(e) => setCategoryForm(prev => ({ ...prev, categoryNameKo: e.target.value }))}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="순서"
                                        value={categoryForm.order || 0}
                                        onChange={(e) => setCategoryForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="완료 보너스"
                                        value={categoryForm.completionBonus || 0}
                                        onChange={(e) => setCategoryForm(prev => ({ ...prev, completionBonus: parseInt(e.target.value) || 0 }))}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                    />
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={categoryForm.isActive ?? true}
                                            onChange={(e) => setCategoryForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                        />
                                        활성화
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSaveCategory(category.id)}
                                        disabled={isSaving}
                                        className="flex items-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        저장
                                    </button>
                                    <button
                                        onClick={() => setEditingCategory(null)}
                                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                    >
                                        취소
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Questions List */}
                        {expandedCategories.has(category.id) && (
                            <div className="p-4 space-y-2">
                                {category.questions?.map((q, idx) => (
                                    <div key={q.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                                        {editingQuestion === `${category.id}-${q.id}` ? (
                                            // Question Edit Form
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="질문"
                                                    value={questionForm.question || ''}
                                                    onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                                />
                                                <div className="grid grid-cols-3 gap-3">
                                                    <select
                                                        value={questionForm.type || 'single'}
                                                        onChange={(e) => setQuestionForm(prev => ({ ...prev, type: e.target.value as any }))}
                                                        className="px-3 py-2 border rounded-lg text-sm"
                                                    >
                                                        <option value="single">단일 선택</option>
                                                        <option value="multiple">다중 선택</option>
                                                        <option value="slider">슬라이더</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        placeholder="보상"
                                                        value={questionForm.reward || 0}
                                                        onChange={(e) => setQuestionForm(prev => ({ ...prev, reward: parseInt(e.target.value) || 0 }))}
                                                        className="px-3 py-2 border rounded-lg text-sm"
                                                    />
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={questionForm.required ?? true}
                                                            onChange={(e) => setQuestionForm(prev => ({ ...prev, required: e.target.checked }))}
                                                        />
                                                        필수
                                                    </label>
                                                </div>

                                                {/* Options for single/multiple */}
                                                {(questionForm.type === 'single' || questionForm.type === 'multiple') && (
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-700">옵션</label>
                                                        {(questionForm.options || []).map((opt, i) => (
                                                            <div key={i} className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={opt}
                                                                    onChange={(e) => updateOption(setQuestionForm, questionForm.options || [], i, e.target.value)}
                                                                    className="flex-1 px-3 py-1.5 border rounded text-sm"
                                                                    placeholder={`옵션 ${i + 1}`}
                                                                />
                                                                <button
                                                                    onClick={() => removeOption(setQuestionForm, questionForm.options || [], i)}
                                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={() => addOption(setQuestionForm, questionForm.options)}
                                                            className="text-sm text-blue-500 hover:underline"
                                                        >
                                                            + 옵션 추가
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Slider labels */}
                                                {questionForm.type === 'slider' && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input
                                                            type="text"
                                                            placeholder="최소값 라벨"
                                                            value={(questionForm.sliderLabels || [])[0] || ''}
                                                            onChange={(e) => setQuestionForm(prev => ({
                                                                ...prev,
                                                                sliderLabels: [e.target.value, (prev.sliderLabels || [])[1] || '']
                                                            }))}
                                                            className="px-3 py-2 border rounded-lg text-sm"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="최대값 라벨"
                                                            value={(questionForm.sliderLabels || [])[1] || ''}
                                                            onChange={(e) => setQuestionForm(prev => ({
                                                                ...prev,
                                                                sliderLabels: [(prev.sliderLabels || [])[0] || '', e.target.value]
                                                            }))}
                                                            className="px-3 py-2 border rounded-lg text-sm"
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleSaveQuestion(category.id, q.id)}
                                                        disabled={isSaving}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                                                    >
                                                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                        저장
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingQuestion(null)}
                                                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                                                    >
                                                        취소
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // Question Display
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800">Q{q.order}. {q.question}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Type: {q.type} |
                                                        {q.type !== 'slider' && ` Options: ${q.options?.length || 0} |`}
                                                        {q.type === 'slider' && ` Range: 1-5 |`}
                                                        보상: {q.reward}VP |
                                                        {q.required ? ' 필수' : ' 선택'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleEditQuestion(category.id, q)}
                                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteQuestion(category.id, q.id)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Add New Question Button/Form */}
                                {showNewQuestionForm === category.id ? (
                                    <div className="border border-green-200 rounded-lg p-3 bg-green-50 space-y-3">
                                        <h5 className="font-bold text-green-800 text-sm">새 질문 추가</h5>
                                        <input
                                            type="text"
                                            placeholder="질문 내용"
                                            value={newQuestionForm.question || ''}
                                            onChange={(e) => setNewQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                        <div className="grid grid-cols-3 gap-3">
                                            <select
                                                value={newQuestionForm.type || 'single'}
                                                onChange={(e) => setNewQuestionForm(prev => ({ ...prev, type: e.target.value as any }))}
                                                className="px-3 py-2 border rounded-lg text-sm"
                                            >
                                                <option value="single">단일 선택</option>
                                                <option value="multiple">다중 선택</option>
                                                <option value="slider">슬라이더</option>
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="보상"
                                                value={newQuestionForm.reward || 10}
                                                onChange={(e) => setNewQuestionForm(prev => ({ ...prev, reward: parseInt(e.target.value) || 0 }))}
                                                className="px-3 py-2 border rounded-lg text-sm"
                                            />
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={newQuestionForm.required ?? true}
                                                    onChange={(e) => setNewQuestionForm(prev => ({ ...prev, required: e.target.checked }))}
                                                />
                                                필수
                                            </label>
                                        </div>

                                        {/* Options for new question */}
                                        {(newQuestionForm.type === 'single' || newQuestionForm.type === 'multiple') && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">옵션</label>
                                                {(newQuestionForm.options || []).map((opt, i) => (
                                                    <div key={i} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => updateOption(setNewQuestionForm, newQuestionForm.options || [], i, e.target.value)}
                                                            className="flex-1 px-3 py-1.5 border rounded text-sm"
                                                            placeholder={`옵션 ${i + 1}`}
                                                        />
                                                        <button
                                                            onClick={() => removeOption(setNewQuestionForm, newQuestionForm.options || [], i)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => addOption(setNewQuestionForm, newQuestionForm.options)}
                                                    className="text-sm text-blue-500 hover:underline"
                                                >
                                                    + 옵션 추가
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleCreateQuestion(category.id)}
                                                disabled={isSaving}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
                                            >
                                                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                                추가
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowNewQuestionForm(null);
                                                    setNewQuestionForm({ question: '', type: 'single', options: [''], reward: 10, required: true });
                                                }}
                                                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                                            >
                                                취소
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowNewQuestionForm(category.id)}
                                        className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 hover:border-gray-400 text-sm flex items-center justify-center gap-1"
                                    >
                                        <Plus size={14} />
                                        새 질문 추가
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SurveyEditor;
