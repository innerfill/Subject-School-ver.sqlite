'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, Edit, Layers, Search, X, Filter } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

interface Class {
    id: number;
    name: string;
    grade_level_id?: number;
    grade_level_name?: string;
    academic_term_id?: number;
    advisor_id?: number;
    advisor_name?: string;
    advisor2_id?: number;
    advisor2_name?: string;
    home_room_id?: number;
    home_room_name?: string;
    year?: number;
    term?: number;
}

interface Resource { id: number; name: string; }

const emptyForm = { name: '', roomNum: '', grade_level_id: '', advisor_id: '', advisor2_id: '', home_room_id: '' };

export default function ClassesPage() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [grades, setGrades] = useState<Resource[]>([]);
    const [teachers, setTeachers] = useState<Resource[]>([]);
    const [rooms, setRooms] = useState<Resource[]>([]);
    const [activeTermId, setActiveTermId] = useState('');
    const [activeTermLabel, setActiveTermLabel] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const { showToast } = useToast();
    const confirm = useConfirm();

    const [addForm, setAddForm] = useState(emptyForm);
    const [editModal, setEditModal] = useState<{ open: boolean; cls: Class | null }>({ open: false, cls: null });
    const [editForm, setEditForm] = useState(emptyForm);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [classesRes, gradesRes, teachersRes, roomsRes, termsRes] = await Promise.all([
                fetch('/api/classes'),
                fetch('/api/master-data?type=grades'),
                fetch('/api/teachers'),
                fetch('/api/rooms'),
                fetch('/api/academic-terms'),
            ]);
            setClasses(await classesRes.json());
            setGrades(await gradesRes.json());
            setTeachers(await teachersRes.json());
            setRooms(await roomsRes.json());

            const termsData = await termsRes.json();
            const active = termsData.find((t: any) => t.status === 'Active');
            if (active) {
                setActiveTermId(active.id.toString());
                setActiveTermLabel(`${active.year}/${active.term}`);
            }
        } catch {
            showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        let list = classes;
        if (filterGrade) list = list.filter(c => c.grade_level_id?.toString() === filterGrade);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.grade_level_name || '').toLowerCase().includes(q) ||
                (c.advisor_name || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [classes, search, filterGrade]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const gradeName = grades.find(g => g.id.toString() === addForm.grade_level_id)?.name || '';
        const className = gradeName && addForm.roomNum ? `${gradeName}/${addForm.roomNum}` : addForm.roomNum;
        const res = await fetch('/api/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...addForm, name: className, academic_term_id: activeTermId }),
        });
        if (res.ok) {
            setAddForm(prev => ({ ...emptyForm, grade_level_id: prev.grade_level_id }));
            fetchData();
            showToast('เพิ่มชั้นเรียนสำเร็จ', 'success');
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
        }
    };

    const handleEdit = (cls: Class) => {
        const roomNum = cls.name.includes('/') ? cls.name.split('/').pop() || '' : cls.name;
        setEditForm({
            name: cls.name,
            roomNum,
            grade_level_id: cls.grade_level_id?.toString() || '',
            advisor_id: cls.advisor_id?.toString() || '',
            advisor2_id: cls.advisor2_id?.toString() || '',
            home_room_id: cls.home_room_id?.toString() || '',
        });
        setEditModal({ open: true, cls });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModal.cls) return;
        const gradeName = grades.find(g => g.id.toString() === editForm.grade_level_id)?.name || '';
        const className = gradeName && editForm.roomNum ? `${gradeName}/${editForm.roomNum}` : editForm.roomNum;
        const res = await fetch('/api/classes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...editForm, name: className, academic_term_id: editModal.cls.academic_term_id, id: editModal.cls.id }),
        });
        if (res.ok) {
            setEditModal({ open: false, cls: null });
            fetchData();
            showToast('บันทึกการแก้ไขสำเร็จ', 'success');
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const isConfirmed = await confirm('คุณต้องการลบชั้นเรียนนี้ใช่หรือไม่?');
        if (!isConfirmed) return;
        const res = await fetch(`/api/classes?id=${id}`, { method: 'DELETE' });
        if (res.ok) { fetchData(); showToast('ลบชั้นเรียนสำเร็จ', 'success'); }
        else showToast('ลบข้อมูลไม่สำเร็จ', 'error');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="page-title">ชั้นเรียน</h1>
                {activeTermLabel && (
                    <span className="text-sm px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                        ปีการศึกษา {activeTermLabel}
                    </span>
                )}
            </div>

            {/* Add Form */}
            <div className="data-card">
                <h2 className="section-title mb-4">เพิ่มชั้นเรียนใหม่</h2>
                <form onSubmit={handleAdd} className="space-y-4">
                    {/* Row 1: grade + room + homeroom */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="form-label">ระดับชั้น <span className="text-red-500">*</span></label>
                            <select required className="form-select" value={addForm.grade_level_id}
                                onChange={e => setAddForm({ ...addForm, grade_level_id: e.target.value })}>
                                <option value="">เลือกระดับชั้น</option>
                                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">ห้องที่ <span className="text-red-500">*</span></label>
                            <input
                                type="number" required min={1} max={20} className="form-input" placeholder="1"
                                value={addForm.roomNum}
                                onChange={e => setAddForm({ ...addForm, roomNum: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="form-label">ห้องโฮมรูม</label>
                            <select className="form-select" value={addForm.home_room_id}
                                onChange={e => setAddForm({ ...addForm, home_room_id: e.target.value })}>
                                <option value="">เลือกห้อง</option>
                                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Info strip: existing rooms + preview */}
                    {addForm.grade_level_id && (() => {
                        const existingInGrade = classes.filter(c => c.grade_level_id?.toString() === addForm.grade_level_id);
                        const gradeName = grades.find(g => g.id.toString() === addForm.grade_level_id)?.name || '';
                        return (
                            <div className="flex items-center gap-x-4 gap-y-2 flex-wrap text-xs py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                                <span className="text-gray-500 dark:text-gray-400 shrink-0">ห้องที่มีอยู่แล้ว:</span>
                                {existingInGrade.length > 0
                                    ? existingInGrade.map(c => (
                                        <span key={c.id} className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium">{c.name}</span>
                                    ))
                                    : <span className="text-gray-400 dark:text-gray-500 italic">ยังไม่มี</span>
                                }
                                {addForm.roomNum && (
                                    <span className="ml-auto font-semibold text-blue-600 dark:text-blue-400">
                                        → จะสร้าง: {gradeName}/{addForm.roomNum}
                                    </span>
                                )}
                            </div>
                        );
                    })()}

                    {/* Row 2: advisors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">ครูที่ปรึกษา (คนที่ 1)</label>
                            <select className="form-select" value={addForm.advisor_id}
                                onChange={e => setAddForm({ ...addForm, advisor_id: e.target.value })}>
                                <option value="">เลือกครู</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">ครูที่ปรึกษา (คนที่ 2)</label>
                            <select className="form-select" value={addForm.advisor2_id}
                                onChange={e => setAddForm({ ...addForm, advisor2_id: e.target.value })}>
                                <option value="">เลือกครู (ถ้ามี)</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400 dark:text-gray-500">หลัง submit จะคง ระดับชั้น ไว้เพื่อเพิ่มห้องต่อเนื่อง</p>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
                            <Plus className="w-4 h-4" /> เพิ่มชั้นเรียน
                        </button>
                    </div>
                </form>
            </div>

            {/* Table */}
            <div className="data-table-container">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                        <select className="form-select text-sm md:w-40" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
                            <option value="">ทุกระดับชั้น</option>
                            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        {filterGrade && (
                            <button type="button" onClick={() => setFilterGrade('')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                                <X className="w-3 h-3" /> ล้าง
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">
                            {loading ? '...' : `${filtered.length} / ${classes.length} ห้อง`}
                        </span>
                        <div className="relative w-full md:w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="ค้นหาชื่อห้อง / ครู" className="form-input pl-9 pr-8 text-sm"
                                value={search} onChange={e => setSearch(e.target.value)} />
                            {search && (
                                <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                    <colgroup>
                        <col className="w-28" />
                        <col className="w-28" />
                        <col />
                        <col className="w-32" />
                        <col className="w-20" />
                    </colgroup>
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="table-th">ระดับชั้น</th>
                            <th className="table-th">ชื่อห้อง</th>
                            <th className="table-th">ครูที่ปรึกษา</th>
                            <th className="table-th">โฮมรูม</th>
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
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
                                        <Layers className="w-10 h-10 opacity-40" />
                                        <span className="text-sm">{search || filterGrade ? 'ไม่พบชั้นเรียนที่ค้นหา' : 'ยังไม่มีข้อมูลชั้นเรียน'}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(cls => (
                                <tr key={cls.id} className="table-row">
                                    <td className="table-td">
                                        {cls.grade_level_name
                                            ? <span className="px-2 py-0.5 rounded-md text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{cls.grade_level_name}</span>
                                            : <span className="text-gray-300 dark:text-gray-600">-</span>}
                                    </td>
                                    <td className="table-td-primary font-semibold">{cls.name}</td>
                                    <td className="table-td">
                                        <div>
                                            <div className="text-sm">{cls.advisor_name || <span className="text-gray-300 dark:text-gray-600">-</span>}</div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                {cls.advisor2_name ? `และ ${cls.advisor2_name}` : <span className="opacity-0 select-none">—</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="table-td">{cls.home_room_name || <span className="text-gray-300 dark:text-gray-600">-</span>}</td>
                                    <td className="table-td-right flex justify-end gap-3 items-center">
                                        <button onClick={() => handleEdit(cls)} title="แก้ไข"
                                            className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(cls.id)} title="ลบ"
                                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors">
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
            {editModal.open && editModal.cls && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">แก้ไขชั้นเรียน</h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{editModal.cls.name}</p>
                            </div>
                            <button onClick={() => setEditModal({ open: false, cls: null })}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">ระดับชั้น <span className="text-red-500">*</span></label>
                                    <select required className="form-select" value={editForm.grade_level_id}
                                        onChange={e => setEditForm({ ...editForm, grade_level_id: e.target.value })}>
                                        <option value="">เลือกระดับชั้น</option>
                                        {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">ห้องที่ <span className="text-red-500">*</span></label>
                                    <input type="number" required min={1} max={20} className="form-input" placeholder="1"
                                        value={editForm.roomNum}
                                        onChange={e => setEditForm({ ...editForm, roomNum: e.target.value })} />
                                </div>
                            </div>
                            {editForm.grade_level_id && editForm.roomNum && (
                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                    ชื่อที่จะบันทึก: <span className="font-bold">{grades.find(g => g.id.toString() === editForm.grade_level_id)?.name}/{editForm.roomNum}</span>
                                </p>
                            )}
                            <div>
                                <label className="form-label">ครูที่ปรึกษา (คนที่ 1)</label>
                                <select className="form-select" value={editForm.advisor_id}
                                    onChange={e => setEditForm({ ...editForm, advisor_id: e.target.value })}>
                                    <option value="">เลือกครู</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">ครูที่ปรึกษา (คนที่ 2)</label>
                                <select className="form-select" value={editForm.advisor2_id}
                                    onChange={e => setEditForm({ ...editForm, advisor2_id: e.target.value })}>
                                    <option value="">เลือกครู (ถ้ามี)</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">ห้องโฮมรูม</label>
                                <select className="form-select" value={editForm.home_room_id}
                                    onChange={e => setEditForm({ ...editForm, home_room_id: e.target.value })}>
                                    <option value="">เลือกห้อง</option>
                                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setEditModal({ open: false, cls: null })}
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
