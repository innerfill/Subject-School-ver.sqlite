'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Edit, Users, Search, X } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

interface Teacher {
    id: number;
    prefix?: string;
    rank?: string;
    name: string;
    color: string;
    department_name?: string;
    department_id?: number;
    advisor_class?: string;
    advisor_class_id?: number;
}

interface Department { id: number; name: string; }
interface Class { id: number; name: string; }

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
    '#64748b', '#0ea5e9', '#a855f7', '#f43f5e',
];

const PREFIXES = ['นาย', 'นาง', 'นางสาว', 'ศาสตราจารย์', 'ศาสตราจารย์พิเศษ', 'รองศาสตราจารย์', 'รองศาสตราจารย์พิเศษ', 'ผู้ช่วยศาสตราจารย์', 'ผู้ช่วยศาสตราจารย์พิเศษ'];
const RANKS = ['ว่าที่ร้อยตรี', 'ว่าที่ร้อยตรีหญิง', 'ว่าที่ร้อยโท', 'ว่าที่ร้อยเอก', 'ร้อยตรี', 'ร้อยโท', 'ร้อยเอก', 'พันตรี', 'พันโท', 'พันเอก', 'พลตรี', 'พลโท', 'พลเอก', 'ร้อยตำรวจตรี', 'ร้อยตำรวจโท', 'ร้อยตำรวจเอก', 'พันตำรวจตรี', 'พันตำรวจโท', 'พันตำรวจเอก', 'พลตำรวจตรี', 'พลตำรวจโท', 'พลตำรวจเอก'];

const emptyForm = { prefix: '', rank: '', name: '', department_id: '', class_id: '', color: PRESET_COLORS[5] };

function formatTeacherName(t: Pick<Teacher, 'rank' | 'prefix' | 'name'>) {
    return [t.rank, t.prefix, t.name].filter(Boolean).join(' ');
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => onChange(c)}
                        className="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none shrink-0"
                        style={{ backgroundColor: c, boxShadow: value === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none' }}
                    />
                ))}
            </div>
            <input type="color" value={value} onChange={e => onChange(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-gray-300 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-700"
                title="กำหนดสีเอง"
            />
        </div>
    );
}

export default function TeachersPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { showToast } = useToast();
    const confirm = useConfirm();

    const [addForm, setAddForm] = useState(emptyForm);
    const [editModal, setEditModal] = useState<{ open: boolean; teacher: Teacher | null }>({ open: false, teacher: null });
    const [editForm, setEditForm] = useState(emptyForm);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [teachersRes, deptsRes, classesRes] = await Promise.all([
                fetch('/api/teachers'),
                fetch('/api/master-data?type=departments'),
                fetch('/api/classes')
            ]);
            setTeachers(await teachersRes.json());
            setDepartments(await deptsRes.json());
            setClasses(await classesRes.json());
        } catch {
            showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/teachers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addForm),
        });
        if (res.ok) {
            setAddForm({ ...emptyForm, color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] });
            fetchData();
            showToast('เพิ่มข้อมูลครูสำเร็จ', 'success');
        } else {
            const data = await res.json();
            showToast(data.error || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
        }
    };

    const handleEdit = (teacher: Teacher) => {
        setEditForm({
            prefix: teacher.prefix || '',
            rank: teacher.rank || '',
            name: teacher.name,
            department_id: teacher.department_id?.toString() || '',
            class_id: teacher.advisor_class_id?.toString() || '',
            color: teacher.color || PRESET_COLORS[5],
        });
        setEditModal({ open: true, teacher });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModal.teacher) return;
        const res = await fetch('/api/teachers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...editForm, id: editModal.teacher.id }),
        });
        if (res.ok) {
            setEditModal({ open: false, teacher: null });
            fetchData();
            showToast('บันทึกการแก้ไขสำเร็จ', 'success');
        } else {
            const data = await res.json();
            showToast(data.error || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const isConfirmed = await confirm('คุณต้องการลบข้อมูลครูท่านนี้ใช่หรือไม่?');
        if (!isConfirmed) return;
        await fetch(`/api/teachers?id=${id}`, { method: 'DELETE' });
        fetchData();
        showToast('ลบข้อมูลครูสำเร็จ', 'success');
    };

    const filtered = teachers.filter(t =>
        !search || formatTeacherName(t).toLowerCase().includes(search.toLowerCase()) ||
        (t.department_name || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <h1 className="page-title">ข้อมูลครู</h1>

            {/* Add Form */}
            <div className="data-card">
                <h2 className="section-title mb-4">เพิ่มครูใหม่</h2>
                <form onSubmit={handleAdd} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="form-label">คำนำหน้าชื่อ</label>
                            <select className="form-select" value={addForm.prefix}
                                onChange={e => setAddForm({ ...addForm, prefix: e.target.value })}>
                                <option value="">ไม่มี</option>
                                {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">ยศ/ตำแหน่ง</label>
                            <select className="form-select" value={addForm.rank}
                                onChange={e => setAddForm({ ...addForm, rank: e.target.value })}>
                                <option value="">ไม่มี</option>
                                {RANKS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                            <input type="text" required className="form-input" placeholder="เช่น จันทร์ทิรา วันชูเสริฐ"
                                value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">กลุ่มสาระฯ</label>
                            <select className="form-select" value={addForm.department_id}
                                onChange={e => setAddForm({ ...addForm, department_id: e.target.value })}>
                                <option value="">เลือกกลุ่มสาระฯ</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">ครูประจำชั้น</label>
                            <select className="form-select" value={addForm.class_id}
                                onChange={e => setAddForm({ ...addForm, class_id: e.target.value })}>
                                <option value="">ไม่ระบุ</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">สีประจำตัว</label>
                            <ColorPicker value={addForm.color} onChange={c => setAddForm({ ...addForm, color: c })} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
                            <Plus className="w-4 h-4" /> เพิ่มครู
                        </button>
                    </div>
                </form>
            </div>

            {/* Table */}
            <div className="data-table-container">
                {/* search + count header */}
                <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {loading ? '...' : `${filtered.length} / ${teachers.length} คน`}
                    </span>
                    <div className="relative w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ / กลุ่มสาระฯ"
                            className="form-input pl-9 pr-8 text-sm"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="table-th">ชื่อ</th>
                            <th className="table-th">กลุ่มสาระฯ</th>
                            <th className="table-th">ครูประจำชั้น</th>
                            <th className="table-th-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center">
                                    <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                                        <div className="loading-spinner"></div>
                                        <span className="text-sm">กำลังโหลดข้อมูล...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
                                        <Users className="w-10 h-10 opacity-40" />
                                        <span className="text-sm">{search ? `ไม่พบ "${search}"` : 'ยังไม่มีข้อมูลครู'}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(t => (
                                <tr key={t.id} className="table-row">
                                    <td className="table-td-primary">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                                style={{ backgroundColor: t.color }}>
                                                {t.name.charAt(0)}
                                            </div>
                                            <span>{formatTeacherName(t)}</span>
                                        </div>
                                    </td>
                                    <td className="table-td">{t.department_name || <span className="text-gray-300 dark:text-gray-600">-</span>}</td>
                                    <td className="table-td">{t.advisor_class || <span className="text-gray-300 dark:text-gray-600">-</span>}</td>
                                    <td className="table-td-right flex justify-end gap-3 items-center">
                                        <button onClick={() => handleEdit(t)}
                                            className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors" title="แก้ไข">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(t.id)}
                                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors" title="ลบ">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editModal.open && editModal.teacher && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold"
                                    style={{ backgroundColor: editForm.color }}>
                                    {editModal.teacher.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">แก้ไขข้อมูลครู</h2>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{editModal.teacher.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditModal({ open: false, teacher: null })}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">คำนำหน้าชื่อ</label>
                                    <select className="form-select" value={editForm.prefix}
                                        onChange={e => setEditForm({ ...editForm, prefix: e.target.value })}>
                                        <option value="">ไม่มี</option>
                                        {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">ยศ/ตำแหน่ง</label>
                                    <select className="form-select" value={editForm.rank}
                                        onChange={e => setEditForm({ ...editForm, rank: e.target.value })}>
                                        <option value="">ไม่มี</option>
                                        {RANKS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                                <input type="text" required className="form-input" value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label">กลุ่มสาระฯ</label>
                                <select className="form-select" value={editForm.department_id}
                                    onChange={e => setEditForm({ ...editForm, department_id: e.target.value })}>
                                    <option value="">เลือกกลุ่มสาระฯ</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">ครูประจำชั้น</label>
                                <select className="form-select" value={editForm.class_id}
                                    onChange={e => setEditForm({ ...editForm, class_id: e.target.value })}>
                                    <option value="">ไม่ระบุ</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">สีประจำตัว</label>
                                <ColorPicker value={editForm.color} onChange={c => setEditForm({ ...editForm, color: c })} />
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setEditModal({ open: false, teacher: null })}
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
