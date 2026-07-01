'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, CheckCircle, Circle } from 'lucide-react';
import ThaiDatePicker from '@/components/ThaiDatePicker';
import { useConfirm } from '@/components/ConfirmProvider';

interface AcademicTerm {
    id: number;
    year: number;
    term: number;
    status: 'Active' | 'Inactive';
    start_date?: string;
    end_date?: string;
}

export default function AcademicTermsPage() {
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [loading, setLoading] = useState(true);
    const confirm = useConfirm();
    const [formData, setFormData] = useState({ year: 2568, term: 1, status: 'Inactive', start_date: '', end_date: '' });

    useEffect(() => {
        fetchTerms();
    }, []);

    const fetchTerms = async () => {
        try {
            const res = await fetch('/api/academic-terms');
            const data = await res.json();
            setTerms(data);
        } catch (error) {
            console.error('Failed to fetch terms', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/academic-terms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setFormData({ year: 2568, term: 1, status: 'Inactive', start_date: '', end_date: '' });
                fetchTerms();
            }
        } catch (error) {
            console.error('Failed to create term', error);
        }
    };

    const handleSetActive = async (id: number) => {
        try {
            await fetch('/api/academic-terms', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'Active' }),
            });
            fetchTerms();
        } catch (error) {
            console.error('Failed to update term', error);
        }
    };

    const handleDelete = async (id: number) => {
        const isConfirmed = await confirm('คุณต้องการลบข้อมูลปีการศึกษานี้ใช่หรือไม่?');
        if (!isConfirmed) return;
        try {
            await fetch(`/api/academic-terms?id=${id}`, { method: 'DELETE' });
            fetchTerms();
        } catch (error) {
            console.error('Failed to delete term', error);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const yearBE = date.getFullYear() + 543;
        return `${day}/${month}/${yearBE}`;
    };

    return (
        <div className="space-y-6">
            <h1 className="page-title">ปีการศึกษาและภาคเรียน</h1>

            <div className="data-card">
                <h2 className="section-title mb-4">เพิ่มปีการศึกษาใหม่</h2>
                <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
                    <div className="w-32">
                        <label className="form-label">ปีการศึกษา</label>
                        <input
                            type="number"
                            required
                            className="form-input"
                            value={formData.year}
                            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="w-32">
                        <label className="form-label">ภาคเรียน</label>
                        <select
                            className="form-select"
                            value={formData.term}
                            onChange={(e) => setFormData({ ...formData, term: parseInt(e.target.value) })}
                        >
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3 (Summer)</option>
                        </select>
                    </div>
                    <div className="w-48">
                        <label className="form-label">วันเปิดเทอม</label>
                        <ThaiDatePicker
                            value={formData.start_date}
                            onChange={(date) => setFormData({ ...formData, start_date: date })}
                        />
                    </div>
                    <div className="w-48">
                        <label className="form-label">วันปิดเทอม</label>
                        <ThaiDatePicker
                            value={formData.end_date}
                            onChange={(date) => setFormData({ ...formData, end_date: date })}
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" /> เพิ่ม
                    </button>
                </form>
            </div>

            <div className="data-table-container">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="table-th">สถานะ</th>
                            <th className="table-th">ปีการศึกษา</th>
                            <th className="table-th">ภาคเรียน</th>
                            <th className="table-th">ระยะเวลา</th>
                            <th className="table-th-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center">
                                    <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                                        <div className="loading-spinner"></div>
                                        <span className="text-sm">กำลังโหลดข้อมูล...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : terms.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">ยังไม่มีข้อมูลปีการศึกษา</td></tr>
                        ) : (
                            terms.map((term) => (
                                <tr key={term.id} className={`transition-colors duration-100 ${term.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                                    <td className="table-td">
                                        <button
                                            onClick={() => handleSetActive(term.id)}
                                            className={`flex items-center gap-2 font-medium transition-colors ${term.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                                        >
                                            {term.status === 'Active' ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                            {term.status === 'Active' ? 'ปัจจุบัน' : 'เลือก'}
                                        </button>
                                    </td>
                                    <td className="table-td-primary">{term.year}</td>
                                    <td className="table-td">{term.term}</td>
                                    <td className="table-td">{formatDate(term.start_date)} ถึง {formatDate(term.end_date)}</td>
                                    <td className="table-td-right">
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => handleDelete(term.id)}
                                                className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
