'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Lock, Pencil, X } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

interface FixedActivity {
    id: number;
    subject_id?: number;
    activity_group?: string;
    subject_name?: string;
    subject_code?: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    target_grade_level_ids: number[];
}

interface Resource { id: number; name: string; }
interface Term { id: number; year: number; term: number; status: string; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAYS_TH: Record<string, string> = {
    Monday: 'จันทร์', Tuesday: 'อังคาร', Wednesday: 'พุธ',
    Thursday: 'พฤหัสบดี', Friday: 'ศุกร์',
};
const ACTIVITY_LABEL: Record<string, string> = {
    SCOUT: 'ลูกเสือ-เนตรนารี', CLUB: 'ชุมนุม', GUIDANCE: 'แนะแนว',
};
const ACTIVITY_BG: Record<string, string> = {
    SCOUT: '#d97706', CLUB: '#7c3aed', GUIDANCE: '#0891b2',
};
const ACTIVITY_BORDER: Record<string, string> = {
    SCOUT: '#b45309', CLUB: '#6d28d9', GUIDANCE: '#0e7490',
};

const emptyForm = () => ({
    activity_group: '',
    day_of_week: 'Thursday',
    start_time: '',
    end_time: '',
    target_grade_level_ids: [] as number[],
});

export default function FixedActivitiesPage() {
    const [activities, setActivities] = useState<FixedActivity[]>([]);
    const [activityGroups, setActivityGroups] = useState<string[]>([]);
    const [timeSlots, setTimeSlots] = useState<any[]>([]);
    const [grades, setGrades] = useState<Resource[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [activeTermId, setActiveTermId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [modalForm, setModalForm] = useState(emptyForm());
    const [editingId, setEditingId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const { showToast } = useToast();
    const confirm = useConfirm();

    useEffect(() => { fetchInitialData(); }, []);
    useEffect(() => { if (activeTermId) fetchActivities(); }, [activeTermId]);

    const fetchInitialData = async () => {
        try {
            const [groupsRes, gradesRes, termsRes, timeSlotsRes] = await Promise.all([
                fetch(`/api/subjects?type=group&_t=${Date.now()}`),
                fetch('/api/master-data?type=grades'),
                fetch('/api/academic-terms'),
                fetch('/api/time-slots'),
            ]);
            const groupsData = groupsRes.ok ? await groupsRes.json() : [];
            const gradesData = gradesRes.ok ? await gradesRes.json() : [];
            const termsData = termsRes.ok ? await termsRes.json() : [];
            const timeSlotsData = timeSlotsRes.ok ? await timeSlotsRes.json() : [];

            setActivityGroups(Array.isArray(groupsData) ? groupsData.map((g: any) => g.activity_group).filter(Boolean) : []);
            setGrades(Array.isArray(gradesData) ? gradesData : []);
            setTimeSlots(Array.isArray(timeSlotsData) ? timeSlotsData : []);
            if (Array.isArray(termsData)) {
                setTerms(termsData);
                const active = termsData.find((t: Term) => t.status === 'Active');
                if (active) setActiveTermId(active.id);
            }
        } catch (error) {
            console.error('Failed to fetch initial data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivities = async () => {
        if (!activeTermId) return;
        try {
            const res = await fetch(`/api/fixed-activities?term_id=${activeTermId}&_t=${Date.now()}`);
            if (!res.ok) throw new Error('fetch failed');
            const data = await res.json();
            setActivities(Array.isArray(data) ? data.map((item: any) => ({
                ...item,
                target_grade_level_ids: typeof item.target_grade_level_ids === 'string'
                    ? JSON.parse(item.target_grade_level_ids)
                    : item.target_grade_level_ids ?? [],
            })) : []);
        } catch {
            setActivities([]);
        }
    };

    const openAddModal = (prefillDay?: string, prefillSlot?: any) => {
        setModalMode('add');
        setModalForm({
            ...emptyForm(),
            ...(prefillDay ? { day_of_week: prefillDay } : {}),
            ...(prefillSlot ? {
                start_time: prefillSlot.start_time.substring(0, 5),
                end_time: prefillSlot.end_time.substring(0, 5),
            } : {}),
        });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const openEditModal = (activity: FixedActivity) => {
        setModalMode('edit');
        setModalForm({
            activity_group: activity.activity_group || '',
            day_of_week: activity.day_of_week,
            start_time: activity.start_time.substring(0, 5),
            end_time: activity.end_time.substring(0, 5),
            target_grade_level_ids: [...activity.target_grade_level_ids],
        });
        setEditingId(activity.id);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTermId) return showToast('กรุณาเลือกปีการศึกษา', 'error');
        if (!modalForm.activity_group) return showToast('กรุณาเลือกกลุ่มกิจกรรม', 'error');
        if (!modalForm.start_time) return showToast('กรุณาเลือกคาบเรียน', 'error');
        if (modalForm.target_grade_level_ids.length === 0) return showToast('กรุณาเลือกระดับชั้นอย่างน้อย 1 ระดับ', 'error');

        setSubmitting(true);
        try {
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const body = modalMode === 'add'
                ? { ...modalForm, academic_term_id: activeTermId }
                : { ...modalForm, academic_term_id: activeTermId, id: editingId };

            const res = await fetch('/api/fixed-activities', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const d = await res.json();
                return showToast(d.error || 'บันทึกไม่สำเร็จ', 'error');
            }
            await fetchActivities();
            showToast(modalMode === 'add' ? 'เพิ่มและล็อกตารางสำเร็จ' : 'อัปเดตสำเร็จ', 'success');
            setIsModalOpen(false);
        } catch (error) {
            showToast('เกิดข้อผิดพลาด', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!await confirm('ต้องการลบกิจกรรมล็อกเวลานี้ใช่หรือไม่?\nคาบเรียนที่ล็อกทั้งหมดจะถูกลบออกด้วย')) return;
        try {
            const res = await fetch(`/api/fixed-activities?id=${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const d = await res.json();
                return showToast(d.error || 'ลบไม่สำเร็จ', 'error');
            }
            await fetchActivities();
            showToast('ลบสำเร็จ', 'success');
        } catch {
            showToast('เกิดข้อผิดพลาด', 'error');
        }
    };

    const toggleGrade = (id: number) => setModalForm(f => ({
        ...f,
        target_grade_level_ids: f.target_grade_level_ids.includes(id)
            ? f.target_grade_level_ids.filter(x => x !== id)
            : [...f.target_grade_level_ids, id],
    }));

    const activeTerm = terms.find(t => t.id === activeTermId);
    const studySlots = timeSlots.filter(s => s.type === 'Study');

    // Grades already locked by the same activity_group this term (exclude self when editing)
    const lockedGradeIds = new Set(
        activities
            .filter(a => a.activity_group === modalForm.activity_group && a.id !== (editingId ?? -1))
            .flatMap(a => a.target_grade_level_ids)
    );

    const getSlotActivities = (day: string, slot: any) =>
        activities.filter(a =>
            a.day_of_week === day &&
            a.start_time.substring(0, 5) === slot.start_time.substring(0, 5)
        );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="page-title flex items-center gap-2">
                    <Lock className="w-6 h-6 text-blue-500 dark:text-blue-400" /> ล็อกตารางและกิจกรรมคงที่
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                    {activeTerm && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
                            <span className="font-medium">ปีการศึกษา {activeTerm.year}/{activeTerm.term}</span>
                        </div>
                    )}
                    <button
                        onClick={() => openAddModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> เพิ่มกิจกรรม
                    </button>
                </div>
            </div>

            {/* Timetable Grid */}
            <div className="data-card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="section-title">ภาพรวมการล็อกเวลา</h2>
                    {/* Legend */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {Object.entries(ACTIVITY_LABEL).map(([key, label]) => (
                            <div key={key} className="flex items-center gap-1.5 text-xs">
                                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: ACTIVITY_BG[key] || '#6b7280' }} />
                                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12 text-gray-400">
                        <div className="loading-spinner mr-2" /> กำลังโหลด...
                    </div>
                ) : studySlots.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีคาบเรียน — กรุณาตั้งค่า TimeSlots ก่อน</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse table-fixed">
                            <thead>
                                <tr>
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24 bg-gray-50 dark:bg-gray-700/50 border-b border-r border-gray-200 dark:border-gray-700">
                                        วัน
                                    </th>
                                    {studySlots.map((slot, i) => (
                                        <th key={slot.id} className="px-2 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700/50 border-b border-r border-gray-200 dark:border-gray-700 min-w-[110px]">
                                            <div>คาบ {i + 1}</div>
                                            <div className="text-[10px] font-normal text-gray-400">{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {DAYS.map((day, di) => (
                                    <tr key={day} className={di % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/10'}>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap border-r border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                                            {DAYS_TH[day]}
                                        </td>
                                        {studySlots.map(slot => {
                                            const slotActivities = getSlotActivities(day, slot);
                                            return (
                                                <td key={slot.id} className="border-r border-b border-gray-200 dark:border-gray-700 relative h-[80px] p-0">
                                                    <div className="absolute inset-[6px] overflow-y-auto overflow-x-hidden">
                                                    {slotActivities.length === 0 ? (
                                                        <button
                                                            onClick={() => openAddModal(day, slot)}
                                                            className="w-full h-full rounded-md border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center group"
                                                            title="คลิกเพื่อเพิ่มกิจกรรม"
                                                        >
                                                            <Plus className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors" />
                                                        </button>
                                                    ) : (
                                                        <div className="flex flex-col gap-1 h-full min-w-0">
                                                            {slotActivities.map(act => {
                                                                const bg = ACTIVITY_BG[act.activity_group || ''] || '#6b7280';
                                                                const border = ACTIVITY_BORDER[act.activity_group || ''] || '#4b5563';
                                                                const gradeCount = act.target_grade_level_ids.length;
                                                                return (
                                                                    <button
                                                                        key={act.id}
                                                                        onClick={() => openEditModal(act)}
                                                                        style={{ backgroundColor: bg, borderColor: border }}
                                                                        className="flex-1 w-full flex flex-col justify-center text-left px-2 py-1.5 rounded-md text-white text-xs border hover:opacity-90 transition-opacity min-w-0"
                                                                    >
                                                                        <div className="font-semibold truncate leading-tight w-full">
                                                                            {ACTIVITY_LABEL[act.activity_group || ''] || act.activity_group}
                                                                        </div>
                                                                        <div className="opacity-80 text-[10px] truncate leading-tight mt-0.5 w-full">
                                                                            {gradeCount} ระดับชั้น
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Activities List */}
            <div className="data-table-container">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="table-th">กลุ่มกิจกรรม</th>
                            <th className="table-th">วัน / เวลา</th>
                            <th className="table-th">ระดับชั้น</th>
                            <th className="table-th-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-10 text-center"><div className="loading-spinner mx-auto" /></td></tr>
                        ) : activities.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">ยังไม่มีกิจกรรมล็อก</td></tr>
                        ) : activities.map(item => {
                            const bg = ACTIVITY_BG[item.activity_group || ''] || '#6b7280';
                            return (
                                <tr key={item.id} className="table-row">
                                    <td className="px-6 py-4">
                                        <span
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white"
                                            style={{ backgroundColor: bg }}
                                        >
                                            <Lock className="w-3 h-3" />
                                            {ACTIVITY_LABEL[item.activity_group || ''] || item.activity_group}
                                        </span>
                                    </td>
                                    <td className="table-td">
                                        <span className="font-medium">{DAYS_TH[item.day_of_week]}</span>
                                        <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">
                                            {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {item.target_grade_level_ids.map(id => {
                                                const grade = grades.find(g => g.id === id);
                                                return grade ? (
                                                    <span key={id} className="inline-block bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded text-xs text-gray-700 dark:text-gray-300">
                                                        {grade.name}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    </td>
                                    <td className="table-td-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-blue-500" />
                                {modalMode === 'add' ? 'เพิ่มกิจกรรมล็อกเวลา' : 'แก้ไขกิจกรรมล็อกเวลา'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
                            <div className="px-6 py-5 space-y-5">
                                {/* Activity Group */}
                                <div>
                                    <label className="form-label mb-2">กลุ่มกิจกรรม</label>
                                    <div className="flex flex-wrap gap-2">
                                        {activityGroups.length === 0 ? (
                                            <p className="text-sm text-gray-400">ไม่พบกลุ่มกิจกรรม — กรุณาตั้งค่า activity_group ในรายวิชาก่อน</p>
                                        ) : activityGroups.map(g => {
                                            const selected = modalForm.activity_group === g;
                                            const bg = ACTIVITY_BG[g] || '#3b82f6';
                                            const lockedForGroup = new Set(
                                                activities
                                                    .filter(a => a.activity_group === g && a.id !== (editingId ?? -1))
                                                    .flatMap(a => a.target_grade_level_ids)
                                            );
                                            const allLocked = grades.length > 0 && lockedForGroup.size >= grades.length;
                                            const partialLock = lockedForGroup.size > 0 && !allLocked;
                                            return (
                                                <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => !allLocked && setModalForm(f => ({ ...f, activity_group: g }))}
                                                    disabled={allLocked}
                                                    title={allLocked ? 'ล็อกครบทุกระดับชั้นแล้ว' : undefined}
                                                    style={selected && !allLocked ? { backgroundColor: bg, borderColor: bg } : {}}
                                                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                                                        allLocked
                                                            ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                            : selected
                                                                ? 'text-white shadow-md'
                                                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500'
                                                    }`}
                                                >
                                                    {allLocked && <Lock className="w-3.5 h-3.5 shrink-0" />}
                                                    {ACTIVITY_LABEL[g] || g}
                                                    {partialLock && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selected ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>
                                                            {lockedForGroup.size}/{grades.length}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Day + Period */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label">วัน</label>
                                        <select
                                            className="form-select"
                                            value={modalForm.day_of_week}
                                            onChange={e => setModalForm(f => ({ ...f, day_of_week: e.target.value }))}
                                        >
                                            {DAYS.map(d => <option key={d} value={d}>{DAYS_TH[d]}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">คาบเรียน</label>
                                        <select
                                            required
                                            className="form-select"
                                            value={studySlots.find(s => s.start_time.substring(0, 5) === modalForm.start_time)?.id || ''}
                                            onChange={e => {
                                                const slot = studySlots.find(s => s.id === parseInt(e.target.value));
                                                if (slot) setModalForm(f => ({
                                                    ...f,
                                                    start_time: slot.start_time.substring(0, 5),
                                                    end_time: slot.end_time.substring(0, 5),
                                                }));
                                            }}
                                        >
                                            <option value="">เลือกคาบ</option>
                                            {studySlots.map((slot, i) => (
                                                <option key={slot.id} value={slot.id}>
                                                    คาบ {i + 1} ({slot.start_time.substring(0, 5)}–{slot.end_time.substring(0, 5)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Grade Level Selection */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="form-label mb-0">ระดับชั้นที่มีผล</label>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${modalForm.target_grade_level_ids.length > 0
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>
                                            {modalForm.target_grade_level_ids.length > 0
                                                ? `เลือก ${modalForm.target_grade_level_ids.length} ระดับชั้น`
                                                : 'ยังไม่ได้เลือก'}
                                        </span>
                                    </div>

                                    {/* Quick Select */}
                                    <div className="flex gap-2 mb-3 flex-wrap">
                                        {[
                                            { label: 'ทั้งโรงเรียน', fn: () => setModalForm(f => ({ ...f, target_grade_level_ids: grades.filter(g => !lockedGradeIds.has(g.id)).map(g => g.id) })) },
                                            { label: 'ประถม', fn: () => setModalForm(f => ({ ...f, target_grade_level_ids: grades.filter(g => g.name.startsWith('ป.') && !lockedGradeIds.has(g.id)).map(g => g.id) })) },
                                            { label: 'มัธยม', fn: () => setModalForm(f => ({ ...f, target_grade_level_ids: grades.filter(g => g.name.startsWith('ม.') && !lockedGradeIds.has(g.id)).map(g => g.id) })) },
                                            { label: 'ล้างทั้งหมด', fn: () => setModalForm(f => ({ ...f, target_grade_level_ids: [] })) },
                                        ].map(({ label, fn }) => (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={fn}
                                                className="px-3 py-1 rounded-lg text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Grade Grid */}
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {grades.map(g => {
                                            const alreadyLocked = lockedGradeIds.has(g.id);
                                            const selected = modalForm.target_grade_level_ids.includes(g.id);
                                            return (
                                                <button
                                                    key={g.id}
                                                    type="button"
                                                    onClick={() => !alreadyLocked && toggleGrade(g.id)}
                                                    disabled={alreadyLocked}
                                                    title={alreadyLocked ? 'ระดับชั้นนี้มีกิจกรรมนี้ล็อกไว้แล้ว' : undefined}
                                                    className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all flex items-center justify-center gap-1 ${
                                                        alreadyLocked
                                                            ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                            : selected
                                                                ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                                                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500'
                                                    }`}
                                                >
                                                    {g.name}
                                                    {alreadyLocked && <Lock className="w-3 h-3 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                                >
                                    {submitting ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> กำลังบันทึก...</>
                                    ) : (
                                        <><Lock className="w-4 h-4" /> {modalMode === 'add' ? 'บันทึกและล็อกตาราง' : 'อัปเดต'}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
