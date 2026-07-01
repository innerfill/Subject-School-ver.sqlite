'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import {
    UserX, Calendar, Clock, BookOpen, Users, AlertTriangle,
    CheckCircle, Loader2, Sun, Sunset, AlignJustify, Columns2,
    ClipboardList, Send, BarChart2, MessageSquare, Pencil, Trash2, X
} from 'lucide-react';
import ThaiDatePicker from '@/components/ThaiDatePicker';
import LineSettings from '@/components/LineSettings';

interface Teacher { id: number; name: string; color: string }
interface Period {
    schedule_id: number; timeslot_id: number; order_index: number;
    start_time: string; end_time: string;
    subject_id: number; subject_name: string; subject_code: string;
    class_id: number; class_name: string;
}
interface Candidate {
    id: number; name: string; color: string;
    periods_today: number; monthly_sub_count: number; overload_warning: boolean;
}

type Scope = 'all' | 'morning' | 'afternoon' | 'specific';

const LEAVE_TYPES = [
    { value: 'Leave', label: 'ลากิจ/ลาป่วย' },
    { value: 'PersonalLeave', label: 'ลากิจ' },
    { value: 'SickLeave', label: 'ลาป่วย' },
    { value: 'OfficialDuty', label: 'ไปราชการ' },
    { value: 'Swap', label: 'แลกคาบ' },
];

const SCOPE_OPTIONS: { value: Scope; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'ทั้งวัน', icon: <AlignJustify className="w-3.5 h-3.5" /> },
    { value: 'morning', label: 'ครึ่งเช้า', icon: <Sun className="w-3.5 h-3.5" /> },
    { value: 'afternoon', label: 'ครึ่งบ่าย', icon: <Sunset className="w-3.5 h-3.5" /> },
    { value: 'specific', label: 'เฉพาะคาบ', icon: <Columns2 className="w-3.5 h-3.5" /> },
];

const STATUS_BADGE: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Sent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Expired: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};
const STATUS_LABEL: Record<string, string> = {
    Pending: 'รอส่ง',
    Sent:    'ส่งแล้ว',
    Failed:  'ส่งไม่สำเร็จ',
    Expired: 'หมดอายุ',
};

export default function SubstitutePage() {
    const { showToast } = useToast();

    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [teacherId, setTeacherId] = useState('');
    const [leaveType, setLeaveType] = useState('Leave');
    const [scope, setScope] = useState<Scope>('all');
    const [specificSelected, setSpecificSelected] = useState<Set<number>>(new Set());

    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [activeTerm, setActiveTerm] = useState<{ id: number; year: number; term: number } | null>(null);
    const [periods, setPeriods] = useState<Period[]>([]);
    const [availableMap, setAvailableMap] = useState<Record<number, Candidate[] | null>>({});
    const [assignments, setAssignments] = useState<Record<number, string>>({});
    const [recentRequests, setRecentRequests] = useState<any[]>([]);

    const [stats, setStats] = useState({ pending_today: 0, sent_today: 0, total_month: 0 });

    // history filters
    const firstOfMonth = today.slice(0, 7) + '-01';
    const [histDateFrom, setHistDateFrom] = useState(firstOfMonth);
    const [histDateTo, setHistDateTo]     = useState(today);
    const [histTeacher, setHistTeacher]   = useState('');
    const [histStatus, setHistStatus]     = useState('Sent');
    const [histLimit, setHistLimit]       = useState(30);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [activeTab, setActiveTab] = useState<'assign' | 'today' | 'history' | 'line'>('assign');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTeacherId, setEditTeacherId] = useState('');
    const [todayRequests, setTodayRequests] = useState<any[]>([]);
    const [loadingToday, setLoadingToday] = useState(false);

    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [loadingNotify, setLoadingNotify] = useState(false);
    const [scheduleLoaded, setScheduleLoaded] = useState(false);

    // คาบที่ต้องจัดสอนแทน ตาม scope
    const activePeriods = useMemo((): Period[] => {
        if (scope === 'all') return periods;
        if (scope === 'morning') return periods.filter(p => String(p.start_time) < '12:00:00');
        if (scope === 'afternoon') return periods.filter(p => String(p.start_time) >= '12:00:00');
        if (scope === 'specific') return periods.filter(p => specificSelected.has(p.timeslot_id));
        return periods;
    }, [periods, scope, specificSelected]);

    const fetchHistory = useCallback(async (params?: {
        dateFrom?: string; dateTo?: string; teacher?: string; status?: string; limit?: number;
    }) => {
        setLoadingHistory(true);
        const p = params ?? { dateFrom: histDateFrom, dateTo: histDateTo, teacher: histTeacher, status: histStatus, limit: histLimit };
        const qs = new URLSearchParams();
        if (p.dateFrom) qs.set('date_from', p.dateFrom);
        if (p.dateTo)   qs.set('date_to',   p.dateTo);
        if (p.teacher)  qs.set('absent_teacher_id', p.teacher);
        if (p.status)   qs.set('status',    p.status);
        qs.set('limit', String(p.limit ?? 30));
        const data = await fetch(`/api/sub-requests?${qs}`).then(r => r.json());
        setRecentRequests(Array.isArray(data) ? data : []);
        setLoadingHistory(false);
    }, [histDateFrom, histDateTo, histTeacher, histStatus, histLimit]);

    const fetchToday = useCallback(async () => {
        setLoadingToday(true);
        const data = await fetch(`/api/sub-requests?date=${today}&limit=200`).then(r => r.json());
        setTodayRequests(Array.isArray(data) ? data : []);
        setLoadingToday(false);
    }, [today]);

    const refreshRecent = useCallback(async () => {
        const statsData = await fetch(`/api/sub-requests?type=stats&date=${today}`).then(r => r.json());
        if (statsData && !statsData.error) setStats(statsData);
        await fetchHistory({ limit: histLimit });
    }, [today, fetchHistory, histLimit]);

    useEffect(() => {
        if (activeTab === 'today') fetchToday();
        if (activeTab === 'history') fetchHistory();
    }, [activeTab, fetchToday, fetchHistory]);

    useEffect(() => {
        Promise.all([
            fetch('/api/teachers').then(r => r.json()),
            fetch('/api/academic-terms').then(r => r.json()),
        ]).then(([teacherData, termData]) => {
            setTeachers(Array.isArray(teacherData) ? teacherData : []);
            const active = Array.isArray(termData) ? termData.find((t: any) => t.status === 'Active') : null;
            setActiveTerm(active || null);
        });
        refreshRecent();
    }, [refreshRecent]);

    const resetSchedule = () => {
        setScheduleLoaded(false);
        setPeriods([]);
        setAssignments({});
        setAvailableMap({});
        setSpecificSelected(new Set());
    };

    const handleLoadSchedule = useCallback(async () => {
        if (!teacherId || !activeTerm) return;
        setLoadingSchedule(true);
        resetSchedule();

        try {
            const res = await fetch(
                `/api/substitute/teacher-schedule?teacher_id=${teacherId}&date=${date}&academic_term_id=${activeTerm.id}`
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'โหลดตารางล้มเหลว');

            const periodsData: Period[] = data.periods || [];
            setPeriods(periodsData);

            // specific scope: เลือกทั้งหมดเป็น default
            if (scope === 'specific') {
                setSpecificSelected(new Set(periodsData.map(p => p.timeslot_id)));
            }

            setScheduleLoaded(true);
            if (periodsData.length === 0) return;

            // init availableMap ด้วย null (loading state)
            const initMap: Record<number, null> = {};
            periodsData.forEach(p => { initMap[p.timeslot_id] = null; });
            setAvailableMap(initMap);

            // หาครูว่างทุกคาบพร้อมกัน
            const results = await Promise.all(
                periodsData.map(p =>
                    fetch(`/api/substitute/available?date=${date}&timeslot_id=${p.timeslot_id}&absent_teacher_id=${teacherId}&academic_term_id=${activeTerm.id}`)
                        .then(r => r.json())
                        .then(d => ({ timeslot_id: p.timeslot_id, candidates: d.candidates || [] }))
                        .catch(() => ({ timeslot_id: p.timeslot_id, candidates: [] }))
                )
            );

            const map: Record<number, Candidate[]> = {};
            results.forEach(r => { map[r.timeslot_id] = r.candidates; });
            setAvailableMap(map);
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setLoadingSchedule(false);
        }
    }, [teacherId, date, activeTerm, scope, showToast]);

    const toggleSpecific = (timeslot_id: number) => {
        setSpecificSelected(prev => {
            const next = new Set(prev);
            if (next.has(timeslot_id)) next.delete(timeslot_id);
            else next.add(timeslot_id);
            return next;
        });
        // ถ้า uncheck → ล้าง assignment ของคาบนั้น
        setAssignments(prev => {
            const next = { ...prev };
            delete next[timeslot_id];
            return next;
        });
    };

    const handleSubmit = async () => {
        if (!activeTerm) return;

        if (activePeriods.length === 0) {
            showToast('ไม่มีคาบที่ต้องจัดสอนแทน', 'error');
            return;
        }
        const missing = activePeriods.filter(p => !assignments[p.timeslot_id]);
        if (missing.length > 0) {
            showToast(`กรุณาเลือกครูสอนแทนให้ครบ (ยังขาด ${missing.length} คาบ)`, 'error');
            return;
        }

        setLoadingSubmit(true);
        try {
            // 1. บันทึก TeacherLeave (ไม่ต้องสำเร็จก็ได้ — ถ้าซ้ำ ignore)
            const specificIds = scope === 'specific'
                ? Array.from(specificSelected).join(',')
                : null;

            await fetch('/api/teacher-leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacher_id: parseInt(teacherId),
                    date,
                    type: leaveType,
                    scope,
                    specific_timeslot_ids: specificIds,
                }),
            }).catch(() => { /* ignore */ });

            // 2. สร้าง SubRequests
            const payload = activePeriods.map(p => ({
                date,
                leave_type: leaveType,
                absent_teacher_id: parseInt(teacherId),
                timeslot_id: p.timeslot_id,
                class_id: p.class_id || null,
                subject_id: p.subject_id || null,
                sub_teacher_id: parseInt(assignments[p.timeslot_id]),
                academic_term_id: activeTerm.id,
            }));

            const res = await fetch('/api/sub-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'บันทึกล้มเหลว');

            showToast(`บันทึกสำเร็จ ${data.results?.length ?? 0} คาบ`, 'success');
            resetSchedule();
            await refreshRecent();
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setLoadingSubmit(false);
        }
    };

    const confirm = useConfirm();

    const handleEditSave = async (id: number) => {
        if (!editTeacherId) return;
        const res = await fetch(`/api/sub-requests?id=${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sub_teacher_id: parseInt(editTeacherId) }),
        });
        if (res.ok) {
            showToast('เปลี่ยนครูสอนแทนแล้ว', 'success');
            setEditingId(null);
            await Promise.all([fetchToday(), fetchHistory()]);
            await refreshRecent();
        } else {
            showToast('เปลี่ยนไม่สำเร็จ', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirm('ยืนยันลบรายการนี้?');
        if (!ok) return;
        const res = await fetch(`/api/sub-requests?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            showToast('ลบแล้ว', 'success');
            await Promise.all([fetchToday(), fetchHistory()]);
            await refreshRecent();
        } else {
            showToast(data.error || 'ลบไม่สำเร็จ', 'error');
        }
    };

    const handleNotifyLine = async () => {
        setLoadingNotify(true);
        try {
            const res = await fetch('/api/notify/line', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'ส่ง LINE ล้มเหลว');
            showToast(`ส่ง LINE สำเร็จ ${data.sent} คาบ`, 'success');
            await refreshRecent();
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setLoadingNotify(false);
        }
    };

    const SubRow = ({ r, showDate = false }: { r: any; showDate?: boolean }) => {
        const isPending = r.notify_status === 'Pending';
        const isEditing = editingId === r.id;
        return (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{r.log_id || '—'}</td>
                {showDate && (
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {(() => { const [y,m,d] = String(r.date).split('T')[0].split('-'); return `${d}/${m}/${parseInt(y)+543}`; })()}
                    </td>
                )}
                <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {String(r.start_time||'').slice(0,5)}–{String(r.end_time||'').slice(0,5)}
                </td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{r.absent_teacher_name}</td>
                <td className="px-4 py-2.5">
                    {isEditing ? (
                        <div className="flex items-center gap-1.5">
                            <select
                                autoFocus
                                value={editTeacherId}
                                onChange={e => setEditTeacherId(e.target.value)}
                                className="border border-blue-400 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
                            >
                                <option value="">-- เลือกครู --</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button onClick={() => handleEditSave(r.id)} disabled={!editTeacherId}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded text-xs">บันทึก</button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <span className="text-gray-700 dark:text-gray-300">{r.sub_teacher_name || <span className="text-gray-400">—</span>}</span>
                    )}
                </td>
                <td className="px-4 py-2.5 text-xs">
                    <span className="text-gray-700 dark:text-gray-300">{r.subject_name || '—'}</span>
                    {r.class_name && <span className="text-gray-400 dark:text-gray-500"> / {r.class_name}</span>}
                </td>
                <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.notify_status] || 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABEL[r.notify_status] ?? r.notify_status}
                    </span>
                </td>
                {isPending && (
                    <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingId(r.id); setEditTeacherId(String(r.sub_teacher_id||'')); }}
                                className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(r.id)}
                                className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </td>
                )}
                {!isPending && <td />}
            </tr>
        );
    };

    const absentTeacher = teachers.find(t => t.id === parseInt(teacherId));
    const allAssigned = activePeriods.length > 0 && activePeriods.every(p => assignments[p.timeslot_id]);

    return (
        <div className="max-w-7xl mx-auto p-6 font-sarabun">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                    <UserX className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดสอนแทน</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activeTerm
                            ? `ปีการศึกษา ${activeTerm.year} ภาคเรียนที่ ${activeTerm.term}`
                            : 'ไม่มีภาคเรียน Active — กรุณาตั้งค่าปีการศึกษา'}
                    </p>
                </div>
            </div>

            {/* Stats Widget */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex-shrink-0">
                            <ClipboardList className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">รอแจ้งเตือนวันนี้</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending_today}</p>
                        </div>
                    </div>
                    {stats.pending_today > 0 && (
                        <button
                            onClick={handleNotifyLine}
                            disabled={loadingNotify}
                            title="ส่งแจ้งเตือน LINE"
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors"
                        >
                            {loadingNotify ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                            ส่งแจ้งเตือน LINE
                        </button>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                        <Send className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ส่งแล้ววันนี้</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.sent_today}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                        <BarChart2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">รวมเดือนนี้</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_month}</p>
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                {([
                    { key: 'assign',  label: 'จัดสอนแทน' },
                    { key: 'today',   label: 'วันนี้' },
                    { key: 'history', label: 'ประวัติ' },
                    { key: 'line',    label: 'ตั้งค่า LINE' },
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                            activeTab === tab.key
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Tab: จัดสอนแทน ── */}
            {activeTab === 'assign' && <><div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วันที่</label>
                        <ThaiDatePicker
                            value={date}
                            onChange={v => { if (v) { setDate(v); resetSchedule(); } }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ครูที่ขาด</label>
                        <select
                            value={teacherId}
                            onChange={e => { setTeacherId(e.target.value); resetSchedule(); }}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- เลือกครู --</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ประเภทการลา</label>
                        <select
                            value={leaveType}
                            onChange={e => setLeaveType(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {LEAVE_TYPES.map(lt => (
                                <option key={lt.value} value={lt.value}>{lt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Scope selector — Segmented Control */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ขอบเขตการลา</label>
                    <div className="inline-flex bg-gray-100 dark:bg-gray-700/60 rounded-xl p-1 gap-0.5">
                        {SCOPE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { setScope(opt.value); resetSchedule(); }}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                    scope === opt.value
                                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                            >
                                {opt.icon}
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {scope === 'morning' && (
                        <p className="mt-1.5 text-xs text-gray-400">คาบที่เริ่มก่อน 12:00 น.</p>
                    )}
                    {scope === 'afternoon' && (
                        <p className="mt-1.5 text-xs text-gray-400">คาบที่เริ่มตั้งแต่ 12:00 น.</p>
                    )}
                    {scope === 'specific' && (
                        <p className="mt-1.5 text-xs text-gray-400">เลือกเฉพาะคาบที่ต้องการจัดสอนแทน</p>
                    )}
                </div>

                <button
                    onClick={handleLoadSchedule}
                    disabled={!teacherId || !activeTerm || loadingSchedule}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:dark:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                >
                    {loadingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    ดูตารางสอน
                </button>
            </div>

            {/* Period Cards */}
            {scheduleLoaded && (
                <div className="mb-6">
                    {periods.length === 0 ? (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 dark:text-gray-400">
                                {absentTeacher?.name} ไม่มีคาบสอนในวันที่เลือก
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Header row */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    ตารางสอนของ {absentTeacher?.name}
                                    {scope !== 'all' && activePeriods.length !== periods.length && (
                                        <span className="ml-2 text-blue-500">
                                            ({activePeriods.length}/{periods.length} คาบ)
                                        </span>
                                    )}
                                    {(scope === 'all' || activePeriods.length === periods.length) && (
                                        <span className="ml-2 text-gray-400">— {periods.length} คาบ</span>
                                    )}
                                </h2>
                                <div className="flex items-center gap-2">
                                    {scope === 'specific' && periods.length > 0 && (
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => setSpecificSelected(new Set(periods.map(p => p.timeslot_id)))}
                                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                เลือกทั้งหมด
                                            </button>
                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                            <button
                                                onClick={() => setSpecificSelected(new Set())}
                                                className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                                            >
                                                ล้างทั้งหมด
                                            </button>
                                        </div>
                                    )}
                                    {allAssigned && (
                                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                                            <CheckCircle className="w-4 h-4" />
                                            เลือกครูแทนครบแล้ว
                                        </span>
                                    )}
                                </div>
                            </div>

                            {periods.map((period, idx) => {
                                const isActive = scope === 'all'
                                    ? true
                                    : scope === 'morning'
                                        ? String(period.start_time) < '12:00:00'
                                        : scope === 'afternoon'
                                            ? String(period.start_time) >= '12:00:00'
                                            : specificSelected.has(period.timeslot_id);

                                const candidates = availableMap[period.timeslot_id];
                                const selectedId = assignments[period.timeslot_id] || '';
                                const selected = Array.isArray(candidates)
                                    ? candidates.find(c => c.id === parseInt(selectedId))
                                    : undefined;

                                return (
                                    <div
                                        key={period.timeslot_id}
                                        className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm transition-opacity ${
                                            isActive
                                                ? 'border-gray-200 dark:border-gray-700'
                                                : 'border-gray-100 dark:border-gray-800 opacity-40'
                                        }`}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                                            {/* Checkbox for specific scope */}
                                            {scope === 'specific' && (
                                                <input
                                                    type="checkbox"
                                                    checked={specificSelected.has(period.timeslot_id)}
                                                    onChange={() => toggleSpecific(period.timeslot_id)}
                                                    className="w-4 h-4 accent-blue-500 flex-shrink-0 cursor-pointer"
                                                />
                                            )}

                                            {/* Period info */}
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                    <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                                                        {idx + 1}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 space-y-0.5">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span className="font-mono">
                                                            {String(period.start_time).slice(0, 5)} – {String(period.end_time).slice(0, 5)}
                                                        </span>
                                                        {scope !== 'all' && (
                                                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                                                                String(period.start_time) < '12:00:00'
                                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                            }`}>
                                                                {String(period.start_time) < '12:00:00' ? 'เช้า' : 'บ่าย'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <BookOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {period.subject_name || '(ไม่ระบุวิชา)'}
                                                        </span>
                                                        {period.subject_code && (
                                                            <span className="text-xs text-gray-400">({period.subject_code})</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {period.class_name || '(ไม่ระบุชั้น)'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Substitute dropdown (only when active) */}
                                            {isActive && (
                                                <div className="flex flex-col gap-1 sm:min-w-[230px]">
                                                    {candidates === null ? (
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 px-2">
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            กำลังโหลด...
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={selectedId}
                                                            onChange={e => setAssignments(prev => ({
                                                                ...prev,
                                                                [period.timeslot_id]: e.target.value,
                                                            }))}
                                                            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="">-- เลือกครูสอนแทน --</option>
                                                            {(candidates as Candidate[]).map(c => (
                                                                <option key={c.id} value={c.id}>
                                                                    {c.name} ({c.periods_today} คาบ{c.overload_warning ? ' ⚠️' : ''})
                                                                </option>
                                                            ))}
                                                            {(candidates as Candidate[]).length === 0 && (
                                                                <option disabled>ไม่มีครูว่างในคาบนี้</option>
                                                            )}
                                                        </select>
                                                    )}
                                                    {selected?.overload_warning && (
                                                        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            ครูสอนครบ/เกิน 5 คาบวันนี้
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Confirm */}
                            <div className="flex items-center justify-between pt-2">
                                <p className="text-xs text-gray-400">
                                    จัดสอนแทน {activePeriods.length} คาบ
                                    {scope !== 'all' && ` (${SCOPE_OPTIONS.find(s => s.value === scope)?.label})`}
                                </p>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!allAssigned || loadingSubmit}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:dark:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    {loadingSubmit
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <CheckCircle className="w-4 h-4" />}
                                    ยืนยันการจัดสอนแทน
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            </>}

            {/* ── Tab: วันนี้ ── */}
            {activeTab === 'today' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            ตารางสอนแทนวันนี้
                        </h2>
                        <button onClick={fetchToday} disabled={loadingToday} className="text-xs text-blue-500 hover:underline disabled:opacity-50">
                            {loadingToday ? 'กำลังโหลด...' : 'รีเฟรช'}
                        </button>
                    </div>
                    {loadingToday ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                    ) : todayRequests.length === 0 ? (
                        <div className="px-5 py-12 text-center text-sm text-gray-400">ไม่มีการจัดสอนแทนวันนี้</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th rowSpan={2} className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">วันที่</th>
                                        <th rowSpan={2} className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">ครูที่ลา/<br/>ไปราชการ</th>
                                        <th rowSpan={2} className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">สาเหตุ</th>
                                        <th colSpan={3} className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">ตารางสอนแทน</th>
                                        <th rowSpan={2} className="w-[320px] min-w-[320px] border-r border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">ครูที่สอนแทน</th>
                                        <th rowSpan={2} className="border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">สถานะ</th>
                                    </tr>
                                    <tr>
                                        <th className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/10 whitespace-nowrap">รายวิชา</th>
                                        <th className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/10 whitespace-nowrap">คาบที่</th>
                                        <th className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/10 whitespace-nowrap">ชั้น</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.values(todayRequests.reduce((acc, r: any) => {
                                        const key = `${r.date}-${r.absent_teacher_name}-${r.leave_type}`;
                                        if (!acc[key]) acc[key] = { date: r.date, teacherName: r.absent_teacher_name, leaveType: r.leave_type, requests: [] };
                                        acc[key].requests.push(r);
                                        return acc;
                                    }, {} as Record<string, any>)).flatMap((group: any) =>
                                        group.requests.map((r: any, rIdx: number) => {
                                            const isFirst = rIdx === 0;
                                            const isEditing = editingId === r.id;
                                            const isPending = r.notify_status === 'Pending';
                                            return (
                                                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                                    {isFirst && (
                                                        <>
                                                            <td rowSpan={group.requests.length} className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100 align-top whitespace-nowrap bg-white dark:bg-gray-800">
                                                                {(() => { const [y,m,d] = String(group.date).split('T')[0].split('-'); return `${d}/${m}/${parseInt(y)+543}`; })()}
                                                            </td>
                                                            <td rowSpan={group.requests.length} className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100 align-top whitespace-nowrap bg-white dark:bg-gray-800">
                                                                {group.teacherName}
                                                            </td>
                                                            <td rowSpan={group.requests.length} className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-3 text-center text-gray-500 dark:text-gray-400 align-top whitespace-nowrap bg-white dark:bg-gray-800">
                                                                {LEAVE_TYPES.find(lt => lt.value === group.leaveType)?.label || group.leaveType}
                                                            </td>
                                                        </>
                                                    )}
                                                    <td className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                                                        {r.subject_name || '—'}
                                                    </td>
                                                    <td className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center text-gray-700 dark:text-gray-300">
                                                        {r.order_index}
                                                    </td>
                                                    <td className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                        {r.class_name || '—'}
                                                    </td>
                                                    <td className="border-r border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-1.5 justify-center">
                                                                <select
                                                                    autoFocus
                                                                    value={editTeacherId}
                                                                    onChange={e => setEditTeacherId(e.target.value)}
                                                                    className="border border-blue-400 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
                                                                >
                                                                    <option value="">-- เลือกครู --</option>
                                                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                                </select>
                                                                <button onClick={() => handleEditSave(r.id)} disabled={!editTeacherId}
                                                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded text-xs">บันทึก</button>
                                                                <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 justify-center">
                                                                <span className="text-gray-700 dark:text-gray-300">{r.sub_teacher_name || <span className="text-gray-400">—</span>}</span>
                                                                {isPending && (
                                                                    <button onClick={() => { setEditingId(r.id); setEditTeacherId(String(r.sub_teacher_id||'')); }}
                                                                        className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                                                                        <Pencil className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                r.notify_status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                r.notify_status === 'Sent' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                r.notify_status === 'Failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                                            }`}>
                                                                {r.notify_status === 'Pending' ? 'รอส่งแจ้งเตือน' :
                                                                 r.notify_status === 'Sent' ? 'แจ้งแล้ว' :
                                                                 STATUS_LABEL[r.notify_status] ?? r.notify_status}
                                                            </span>
                                                            {isPending && (
                                                                <button onClick={() => handleDelete(r.id)}
                                                                    className="p-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors">
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: ประวัติ ── */}
            {activeTab === 'line' && <LineSettings />}

            {activeTab === 'history' && <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">ประวัติการจัดสอนแทน</h2>
                    {/* Filter bar */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end">
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">จากวันที่</label>
                            <ThaiDatePicker value={histDateFrom} onChange={setHistDateFrom} placeholder="เริ่มต้น" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ถึงวันที่</label>
                            <ThaiDatePicker value={histDateTo} onChange={setHistDateTo} placeholder="สิ้นสุด" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ครูที่ขาด</label>
                            <select
                                value={histTeacher}
                                onChange={e => setHistTeacher(e.target.value)}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">ทั้งหมด</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">สถานะ</label>
                            <select
                                value={histStatus}
                                onChange={e => setHistStatus(e.target.value)}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">ทั้งหมด</option>
                                <option value="Pending">รอส่ง</option>
                                <option value="Sent">ส่งแล้ว</option>
                                <option value="Failed">ส่งไม่สำเร็จ</option>
                                <option value="Expired">หมดอายุ</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">แสดง</label>
                            <select
                                value={histLimit}
                                onChange={e => setHistLimit(parseInt(e.target.value))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={30}>30 รายการ</option>
                                <option value={100}>100 รายการ</option>
                                <option value={500}>500 รายการ</option>
                            </select>
                        </div>
                        <button
                            onClick={() => fetchHistory()}
                            disabled={loadingHistory}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {loadingHistory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                            ค้นหา
                        </button>
                        {(histDateFrom || histDateTo || histTeacher || histStatus) && (
                            <button
                                onClick={() => {
                                    setHistDateFrom(''); setHistDateTo('');
                                    setHistTeacher(''); setHistStatus('');
                                    fetchHistory({ limit: histLimit });
                                }}
                                className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            >
                                ล้าง
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-hidden rounded-b-xl">
                {recentRequests.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-gray-400">ยังไม่มีรายการ</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    {['รหัส', 'วันที่', 'เวลา', 'ครูขาด', 'ครูสอนแทน', 'วิชา / ชั้น', 'สถานะ', ''].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {recentRequests.map((r: any) => <SubRow key={r.id} r={r} showDate />)}
                            </tbody>
                        </table>
                    </div>
                )}
                </div>
            </div>}
        </div>
    );
}
