import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    FileText, Upload, Trash2, Eye, Edit3, Save, X, Plus,
    FolderOpen, Clock, Download, Search, ChevronRight
} from 'lucide-react';
import { db } from '../../firebase';
import {
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
    serverTimestamp, query, orderBy
} from 'firebase/firestore';

interface Document {
    id: string;
    title: string;
    content: string;
    category: string;
    createdAt: any;
    updatedAt: any;
}

const CATEGORIES = [
    { id: 'plans', label: 'Implementation Plans', icon: '📋' },
    { id: 'specs', label: 'Technical Specs', icon: '⚙️' },
    { id: 'guides', label: 'User Guides', icon: '📖' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'other', label: 'Other', icon: '📁' },
];

const DocumentArchive: React.FC = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Form state
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editCategory, setEditCategory] = useState('plans');

    // Load documents
    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        if (!db) return;
        setIsLoading(true);
        try {
            const docsRef = collection(db, 'documents');
            const q = query(docsRef, orderBy('updatedAt', 'desc'));
            const snapshot = await getDocs(q);

            const docs: Document[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as Document));

            setDocuments(docs);
        } catch (error) {
            console.error('Failed to load documents:', error);
        }
        setIsLoading(false);
    };

    const handleCreate = async () => {
        if (!db || !editTitle.trim() || !editContent.trim()) return;

        try {
            await addDoc(collection(db, 'documents'), {
                title: editTitle,
                content: editContent,
                category: editCategory,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setIsCreating(false);
            setEditTitle('');
            setEditContent('');
            loadDocuments();
        } catch (error) {
            console.error('Failed to create document:', error);
        }
    };

    const handleUpdate = async () => {
        if (!db || !selectedDoc) return;

        try {
            await updateDoc(doc(db, 'documents', selectedDoc.id), {
                title: editTitle,
                content: editContent,
                category: editCategory,
                updatedAt: serverTimestamp(),
            });

            setIsEditing(false);
            setSelectedDoc({ ...selectedDoc, title: editTitle, content: editContent, category: editCategory });
            loadDocuments();
        } catch (error) {
            console.error('Failed to update document:', error);
        }
    };

    const handleDelete = async (docId: string) => {
        if (!db || !confirm('정말 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, 'documents', docId));
            setSelectedDoc(null);
            loadDocuments();
        } catch (error) {
            console.error('Failed to delete document:', error);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setEditContent(content);
            setEditTitle(file.name.replace('.md', ''));
            setIsCreating(true);
        };
        reader.readAsText(file);
    };

    const startEdit = (doc: Document) => {
        setEditTitle(doc.title);
        setEditContent(doc.content);
        setEditCategory(doc.category);
        setIsEditing(true);
    };

    const filteredDocs = documents.filter(d => {
        const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || d.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Create/Edit Modal
    const renderEditor = () => (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold">
                        {isCreating ? '새 문서 작성' : '문서 편집'}
                    </h3>
                    <button
                        onClick={() => { setIsCreating(false); setIsEditing(false); }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500"
                                placeholder="문서 제목"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                            <select
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            내용 (Markdown 지원)
                        </label>
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full h-[400px] px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500 font-mono text-sm"
                            placeholder="# 제목&#10;&#10;내용을 입력하세요..."
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={() => { setIsCreating(false); setIsEditing(false); }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
                    >
                        취소
                    </button>
                    <button
                        onClick={isCreating ? handleCreate : handleUpdate}
                        disabled={!editTitle.trim() || !editContent.trim()}
                        className="px-6 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save size={18} />
                        {isCreating ? '저장' : '업데이트'}
                    </button>
                </div>
            </div>
        </div>
    );

    // Document Viewer
    const renderViewer = () => (
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedDoc(null)}
                        className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
                    >
                        <ChevronRight size={20} className="rotate-180" />
                    </button>
                    <div>
                        <h3 className="text-lg font-bold">{selectedDoc?.title}</h3>
                        <p className="text-xs text-gray-400">
                            {CATEGORIES.find(c => c.id === selectedDoc?.category)?.label}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => startEdit(selectedDoc!)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                    >
                        <Edit3 size={18} />
                    </button>
                    <button
                        onClick={() => handleDelete(selectedDoc!.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedDoc?.content || ''}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FolderOpen size={20} className="text-brand-500" />
                        Document Archive
                    </h2>
                    <p className="text-sm text-gray-500">{documents.length}개 문서</p>
                </div>

                <div className="flex gap-2">
                    <label className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 cursor-pointer flex items-center gap-2">
                        <Upload size={18} />
                        파일 업로드
                        <input
                            type="file"
                            accept=".md,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>
                    <button
                        onClick={() => { setEditTitle(''); setEditContent(''); setIsCreating(true); }}
                        className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 flex items-center gap-2"
                    >
                        <Plus size={18} />
                        새 문서
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="문서 검색..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${!selectedCategory ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
                            }`}
                    >
                        전체
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${selectedCategory === cat.id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
                                }`}
                        >
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex gap-6 min-h-[500px]">
                {/* Document List */}
                <div className={`w-full md:w-80 space-y-2 ${selectedDoc ? 'hidden md:block' : ''}`}>
                    {isLoading ? (
                        <div className="text-center py-8 text-gray-400">Loading...</div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <FileText size={48} className="mx-auto mb-3 opacity-50" />
                            <p>문서가 없습니다</p>
                        </div>
                    ) : (
                        filteredDocs.map(d => (
                            <button
                                key={d.id}
                                onClick={() => setSelectedDoc(d)}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${selectedDoc?.id === d.id
                                        ? 'border-brand-500 bg-brand-50'
                                        : 'border-gray-100 bg-white hover:border-gray-200'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">
                                        {CATEGORIES.find(c => c.id === d.category)?.icon || '📄'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 truncate">{d.title}</p>
                                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                            <Clock size={12} />
                                            {d.updatedAt?.toDate?.()?.toLocaleDateString('ko-KR') || '-'}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Document Viewer */}
                {selectedDoc ? (
                    renderViewer()
                ) : (
                    <div className="hidden md:flex flex-1 bg-gray-50 rounded-2xl items-center justify-center text-gray-400">
                        <div className="text-center">
                            <Eye size={48} className="mx-auto mb-3 opacity-50" />
                            <p>문서를 선택하세요</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {(isCreating || isEditing) && renderEditor()}
        </div>
    );
};

export default DocumentArchive;
