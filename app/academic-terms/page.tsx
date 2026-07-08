'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, CheckCircle, Circle, Edit, X } from 'lucide-react';
import ThaiDatePicker from '@/components/ThaiDatePicker';
import { useConfirm } from '@/components/ConfirmProvider';
import { useToast } from '@/components/ToastProvider';

interface AcademicTerm {
    id: number;
    year: number;
    term: number;
    status: 'Active' | 'Inactive';
    start_date?: string;
    end_date?: string;
}

const emptyForm = { year: new Date().getFullYear() + 543, term: 1, status: 'Inactive', start_date: '', end_date: '' };

export default function AcademicTermsPage() {
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState(emptyForm);
    const [editModal, setEditModal] = useState<{ open: boolean; term: AcademicTerm | null }>({ open: false, term: null });
    const [editForm, setEditForm] = useState({ year: 0, term: 1, start_date: '', end_date: '' });
    const confirm = useConfirm();
    const { showToast } = useToast();

    useEffect(() => { fetchTerms(); }, []);

    const fetchTerms = async () => {
        try {
            const res = await fetch('/api/academic-terms');
            setTerms(await res.json());
        } catch {
            showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/academic-terms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        if (res.ok) {
            setFormData(emptyForm);
            fetchTerms();
            showToast('เพิ่มปีการศึกษาสำเร็จ', 'success');
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'บันทึกไม่สำเร็จ', 'error');
        }
    };

    const handleSetActive = async (t: AcademicTerm) => {
        if (t.status === 'Active') return;
        if (!await confirm(`ตั้งปีการศึกษา ${t.year} ภาคเรียน ${t.term} เป็นปัจจุบัน?`)) return;
        await fetch('/api/academic-terms', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: t.id, status: 'Active' }),
        });
        fetchTerms();
        showToast(`ตั้งปีการศึกษา ${t.year}/${t.term} เป็นปัจจุบันแล้ว`, 'success');
    };

    const handleEdit = (t: AcademicTerm) => {
        setEditForm({ year: t.year, term: t.term, start_date: t.start_date || '', end_date: t.end_date || '' });
        setEditModal({ open: true, term: t });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModal.term) return;
        const res = await fetch('/api/academic-terms', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editModal.term.id, ...editForm }),
        });
        if (res.ok) {
            setEditModal({ open: false, term: null });
            fetchTerms();
            showToast('บันทึกการแก้ไขสำเร็จ', 'success');
        } else {
            showToast('บันทึกไม่สำเร็จ', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!await confirm('คุณต้องการลบข้อมูลปีการศึกษานี้ใช่หรือไม่?')) return;
        await fetch(`/api/academic-terms?id=${id}`, { method: 'DELETE' });
        fetchTerms();
        showToast('ลบข้อมูลสำเร็จ', 'success');
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}/${month}/${date.getFullYear() + 543}`;
    };

    return (
        <div className="space-y-6">
            <h1 className="page-title">ปีการศึกษาและภาคเรียน</h1>

            <div className="data-card">
                <h2 className="section-title mb-4">เพิ่มปีการศึกษาใหม่</h2>
                <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
                    <div className="w-32">
                        <label className="form-label">ปีการศึกษา</label>
                        <input type="number" required className="form-input" value={formData.year}
                            onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} />
                    </div>
                    <div className="w-32">
                        <label className="form-label">ภาคเรียน</label>
                        <select className="form-select" value={formData.term}
                            onChange={e => setFormData({ ...formData, term: parseInt(e.target.value) })}>
                            <option value="1">1</option>
                            <option value="2">2</option>
                        </select>
                    </div>
                    <div className="w-48">
                        <label className="form-label">วันเปิดเทอม</label>
                        <ThaiDatePicker value={formData.start_date} onChange={date => setFormData({ ...formData, start_date: date })} />
                    </div>
                    <div className="w-48">
                        <label className="form-label">วันปิดเทอม</label>
                        <ThaiDatePicker value={formData.end_date} onChange={date => setFormData({ ...formData, end_date: date })} />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors">
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
                            terms.map(term => (
                                <tr key={term.id} className={`transition-colors duration-100 ${term.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                                    <td className="table-td">
                                        <button onClick={() => handleSetActive(term)}
                                            className={`flex items-center gap-2 font-medium transition-colors ${term.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'}`}>
                                            {term.status === 'Active' ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                            {term.status === 'Active' ? 'ปัจจุบัน' : 'เลือก'}
                                        </button>
                                    </td>
                                    <td className="table-td-primary">{term.year}</td>
                                    <td className="table-td">{term.term}</td>
                                    <td className="table-td">{formatDate(term.start_date)} ถึง {formatDate(term.end_date)}</td>
                                    <td className="table-td-right">
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => handleEdit(term)}
                                                className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors" title="แก้ไข">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(term.id)}
                                                className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors" title="ลบ">
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

            {editModal.open && editModal.term && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">แก้ไขปีการศึกษา</h2>
                            <button onClick={() => setEditModal({ open: false, term: null })}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">ปีการศึกษา</label>
                                    <input type="number" required className="form-input" value={editForm.year}
                                        onChange={e => setEditForm({ ...editForm, year: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="form-label">ภาคเรียน</label>
                                    <select className="form-select" value={editForm.term}
                                        onChange={e => setEditForm({ ...editForm, term: parseInt(e.target.value) })}>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">วันเปิดเทอม</label>
                                <ThaiDatePicker value={editForm.start_date} onChange={date => setEditForm({ ...editForm, start_date: date })} />
                            </div>
                            <div>
                                <label className="form-label">วันปิดเทอม</label>
                                <ThaiDatePicker value={editForm.end_date} onChange={date => setEditForm({ ...editForm, end_date: date })} />
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setEditModal({ open: false, term: null })}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    ยกเลิก
                                </button>
                                <button type="submit"
                                    className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors flex items-center gap-2">
                                    <Edit className="w-4 h-4" /> บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
