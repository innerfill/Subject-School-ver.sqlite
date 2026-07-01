'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Save, CheckCircle, Clock, CalendarDays, X, Users } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

interface Term { id: number; year: number; term: number; status: string; }
interface Class { id: number; name: string; level: string; grade_level_id: number; }
interface Teacher { id: number; name: string; }
interface Room { id: number; name: string; }
interface Subject {
    id: number; code: string; name: string; type: string;
    credits: number; hours_per_week: number; grade_level_id: number; semester?: number | null;
    activity_group?: string | null;
}
interface Assignment { dbId?: number; subject_id: number; teacher_id: number | null; room_id: number | null; }
type RowStatus = 'saved' | 'unsaved' | 'idle';

const TYPE_LABEL: Record<string, string> = { Fundamental: 'พื้นฐาน', Additional: 'เพิ่มเติม', Activity: 'กิจกรรม' };
const TYPE_COLOR: Record<string, string> = {
    Fundamental: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    Additional: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    Activity: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export default function CourseAssignmentsPage() {
    const [activeTerm, setActiveTerm] = useState<Term | null>(null);
    const [classes, setClasses] = useState<Class[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rowStatus, setRowStatus] = useState<Record<number, RowStatus>>({});
    const { showToast } = useToast();
    const confirm = useConfirm();

    const selectedTermId = activeTerm?.id ?? '';

    useEffect(() => {
        Promise.all([
            fetch('/api/academic-terms').then(r => r.json()),
            fetch('/api/classes').then(r => r.json()),
            fetch('/api/teachers').then(r => r.json()),
            fetch('/api/rooms').then(r => r.json()),
        ]).then(([termsData, classesData, teachersData, roomsData]) => {
            const active = termsData.find((t: Term) => t.status === 'Active') ?? null;
            setActiveTerm(active);
            setClasses(classesData);
            setTeachers(teachersData);
            setRooms(roomsData);
            if (classesData.length > 0) setSelectedClassId(classesData[0].id);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (selectedClassId && selectedTermId) fetchSubjectData();
    }, [selectedClassId, selectedTermId]);

    const fetchSubjectData = async () => {
        setLoading(true);
        try {
            const [subjectsRes, assignmentsRes] = await Promise.all([
                fetch('/api/subjects'),
                fetch(`/api/course-assignments?class_id=${selectedClassId}&term_id=${selectedTermId}`),
            ]);
            const allSubjects: Subject[] = await subjectsRes.json();
            const existing: any[] = await assignmentsRes.json();

            setSubjects(allSubjects);
            setAssignments(allSubjects.map(s => {
                const ex = existing.find((a: any) => a.subject_id === s.id);
                return { dbId: ex?.id ?? undefined, subject_id: s.id, teacher_id: ex?.teacher_id || null, room_id: ex?.room_id || null };
            }));

            const status: Record<number, RowStatus> = {};
            allSubjects.forEach(s => {
                const ex = existing.find((a: any) => a.subject_id === s.id);
                status[s.id] = (ex?.teacher_id || ex?.room_id) ? 'saved' : 'idle';
            });
            setRowStatus(status);
        } catch {
            showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        } finally {
            setLoading(false);
        }
    };

    const clearAll = async () => {
        const idsToClean = assignments.filter(a => a.teacher_id || a.room_id).map(a => a.subject_id);
        if (idsToClean.length === 0) return;
        const cls = classes.find(c => c.id === Number(selectedClassId));
        const clsLabel = cls ? [cls.level, cls.name].filter(Boolean).join(' ') : 'ชั้นเรียนนี้';
        const ok = await confirm(`ล้างการมอบหมายทั้งหมดของ ${clsLabel} ใช่ไหม?\n\nข้อมูลจะถูกลบจริงเมื่อกด "บันทึก"`);
        if (!ok) return;
        setAssignments(prev => prev.map(a =>
            idsToClean.includes(a.subject_id) ? { ...a, teacher_id: null, room_id: null } : a
        ));
        setRowStatus(prev => {
            const next = { ...prev };
            idsToClean.forEach(id => { next[id] = 'unsaved'; });
            return next;
        });
    };

    const clearRow = (subjectId: number) => {
        setAssignments(prev => prev.map(a =>
            a.subject_id === subjectId ? { ...a, teacher_id: null, room_id: null } : a
        ));
        setRowStatus(prev => ({ ...prev, [subjectId]: 'unsaved' }));
    };

    const handleAssignmentChange = (subjectId: number, field: 'teacher_id' | 'room_id', value: string) => {
        setAssignments(prev => prev.map(a =>
            a.subject_id === subjectId ? { ...a, [field]: value ? Number(value) : null } : a
        ));
        setRowStatus(prev => ({ ...prev, [subjectId]: 'unsaved' }));
    };

    const saveAll = async () => {
        const unsavedIds = Object.entries(rowStatus).filter(([, s]) => s === 'unsaved').map(([id]) => Number(id));
        if (unsavedIds.length === 0) return;
        setSaving(true);
        let ok = 0, fail = 0;
        await Promise.all(unsavedIds.map(async subjectId => {
            const a = assignments.find(a => a.subject_id === subjectId);
            if (!a) return;
            try {
                // Both null → delete from DB (or just mark idle if never in DB)
                if (!a.teacher_id && !a.room_id) {
                    if (a.dbId) {
                        const res = await fetch(`/api/course-assignments?id=${a.dbId}`, { method: 'DELETE' });
                        if (res.ok) {
                            ok++;
                            setRowStatus(prev => ({ ...prev, [subjectId]: 'idle' }));
                            setAssignments(prev => prev.map(x => x.subject_id === subjectId ? { ...x, dbId: undefined } : x));
                        } else fail++;
                    } else {
                        ok++;
                        setRowStatus(prev => ({ ...prev, [subjectId]: 'idle' }));
                    }
                    return;
                }
                const res = await fetch('/api/course-assignments', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teacher_id: a.teacher_id, subject_id: a.subject_id, room_id: a.room_id, class_id: selectedClassId, academic_term_id: selectedTermId }),
                });
                if (res.ok) {
                    ok++;
                    setRowStatus(prev => ({ ...prev, [subjectId]: 'saved' }));
                    // store the dbId if this was a new insert (needed for future deletes)
                    const data = await res.json().catch(() => null);
                    if (data?.id && !a.dbId) setAssignments(prev => prev.map(x => x.subject_id === subjectId ? { ...x, dbId: data.id } : x));
                } else fail++;
            } catch { fail++; }
        }));
        setSaving(false);
        if (fail === 0) showToast(`บันทึกสำเร็จ ${ok} รายวิชา`, 'success');
        else if (ok === 0) showToast('บันทึกไม่สำเร็จ', 'error');
        else showToast(`บันทึกสำเร็จ ${ok} วิชา (ล้มเหลว ${fail})`, 'error');
    };

    const selectedClassObj = classes.find(c => c.id === Number(selectedClassId));
    const relevantSubjects = useMemo(() => subjects.filter(s => {
        if (!selectedClassObj) return true;
        if (s.grade_level_id != null && s.grade_level_id !== selectedClassObj.grade_level_id) return false;
        if (s.semester != null && activeTerm != null && s.semester !== activeTerm.term) return false;
        return true;
    }), [subjects, selectedClassObj, activeTerm]);

    // GUIDANCE เลือกครูได้, SCOUT/CLUB ใช้ "ครูทั้งโรงเรียน" อัตโนมัติ
    const needsTeacher = (s: Subject) => s.type !== 'Activity' || s.activity_group === 'GUIDANCE';
    const isAllSchool  = (s: Subject) => s.activity_group === 'SCOUT' || s.activity_group === 'CLUB';
    const assignableSubjects = relevantSubjects.filter(needsTeacher);
    const unsavedCount = assignableSubjects.filter(s => rowStatus[s.id] === 'unsaved').length;
    const savedCount = assignableSubjects.filter(s => rowStatus[s.id] === 'saved').length;
    const progressPct = assignableSubjects.length > 0 ? Math.round((savedCount / assignableSubjects.length) * 100) : 0;

    // group by type order
    const TYPE_ORDER = ['Fundamental', 'Additional', 'Activity'];
    const grouped = useMemo(() => {
        const map: Record<string, Subject[]> = {};
        relevantSubjects.forEach(s => {
            const key = s.type || 'Other';
            if (!map[key]) map[key] = [];
            map[key].push(s);
        });
        return TYPE_ORDER.filter(t => map[t]?.length).map(t => ({ type: t, subjects: map[t] }));
    }, [relevantSubjects]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="page-title">มอบหมายงานสอน</h1>
                <div className="flex items-center gap-3 flex-wrap">
                    {activeTerm && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
                            <CalendarDays className="w-4 h-4" />
                            <span className="font-medium">ปีการศึกษา {activeTerm.year}/{activeTerm.term}</span>
                        </div>
                    )}
                    <button
                        onClick={saveAll}
                        disabled={saving || unsavedCount === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'กำลังบันทึก...' : unsavedCount > 0 ? `บันทึก (${unsavedCount})` : 'บันทึกทั้งหมด'}
                    </button>
                </div>
            </div>

            {!activeTerm && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-700 dark:text-amber-400">
                    ยังไม่มีปีการศึกษาที่ Active — กรุณาตั้งค่าในหน้า <strong>ปีการศึกษาและภาคเรียน</strong> ก่อน
                </div>
            )}

            {/* Table with integrated filter */}
            <div className="data-table-container">
                {/* filter + progress header */}
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0">ชั้นเรียน</label>
                        <select
                            className="form-select text-sm md:w-56"
                            value={selectedClassId}
                            onChange={e => setSelectedClassId(Number(e.target.value))}
                        >
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.level ? `${c.level} — ${c.name}` : c.name}
                                </option>
                            ))}
                        </select>
                        {!loading && assignments.some(a => a.teacher_id || a.room_id) && (
                            <button
                                onClick={clearAll}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" /> ล้างทั้งหมด
                            </button>
                        )}
                    </div>

                    {/* progress */}
                    {!loading && assignableSubjects.length > 0 && (
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold text-gray-900 dark:text-gray-100">{savedCount}</span>
                                <span className="mx-1">/</span>
                                <span>{assignableSubjects.length} วิชา มอบหมายแล้ว</span>
                            </div>
                            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{progressPct}%</span>
                        </div>
                    )}
                </div>

                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="table-th">รหัส</th>
                            <th className="table-th">ชื่อวิชา</th>
                            <th className="table-th">ประเภท</th>
                            <th className="table-th">ชม./สัปดาห์</th>
                            <th className="table-th">ครูผู้สอน</th>
                            <th className="table-th">ห้องเรียนประจำ</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center">
                                    <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                                        <div className="loading-spinner"></div>
                                        <span className="text-sm">กำลังโหลดข้อมูล...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : grouped.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                                    ไม่พบรายวิชาสำหรับชั้นเรียนนี้
                                </td>
                            </tr>
                        ) : (
                            grouped.map(group => (
                                <React.Fragment key={group.type}>
                                    {/* group header row */}
                                    <tr className="bg-gray-50/80 dark:bg-gray-700/30">
                                        <td colSpan={7} className="px-4 py-2">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TYPE_COLOR[group.type] || ''}`}>
                                                {TYPE_LABEL[group.type] || group.type}
                                            </span>
                                            <span className="ml-2 text-xs text-gray-400">{group.subjects.length} วิชา</span>
                                        </td>
                                    </tr>
                                    {group.subjects.map(subject => {
                                        const assignable  = needsTeacher(subject);
                                        const allSchool   = isAllSchool(subject);
                                        const assignment  = assignments.find(a => a.subject_id === subject.id) || { subject_id: subject.id, teacher_id: null, room_id: null };
                                        const status      = rowStatus[subject.id] ?? 'idle';
                                        return (
                                            <tr key={subject.id} className={`table-row border-l-4 ${
                                                allSchool ? 'border-l-purple-400' :
                                                !assignable ? 'border-l-transparent opacity-75' :
                                                status === 'saved' ? 'border-l-emerald-400' :
                                                status === 'unsaved' ? 'border-l-amber-400' :
                                                'border-l-transparent'
                                            }`}>
                                                <td className="table-td-primary font-mono text-xs">{subject.code}</td>
                                                <td className="table-td">{subject.name}</td>
                                                <td className="table-td">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[subject.type] || ''}`}>
                                                        {TYPE_LABEL[subject.type] || subject.type}
                                                    </span>
                                                </td>
                                                <td className="table-td text-center">
                                                    <span className="font-medium">{subject.hours_per_week}</span>
                                                    <span className="text-xs text-gray-400 ml-1">คาบ</span>
                                                </td>
                                                {allSchool ? (
                                                    <td colSpan={2} className="px-4 py-3 text-center">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                            <Users className="w-3 h-3" />
                                                            ครูทั้งโรงเรียน
                                                        </span>
                                                    </td>
                                                ) : !assignable ? (
                                                    <td colSpan={2} className="px-4 py-3 text-center">
                                                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">ไม่กำหนดครูและห้องประจำ</span>
                                                    </td>
                                                ) : (
                                                    <>
                                                        <td className="px-4 py-3">
                                                            <select className="form-select text-sm" value={assignment.teacher_id || ''}
                                                                onChange={e => handleAssignmentChange(subject.id, 'teacher_id', e.target.value)}>
                                                                <option value="">— เลือกครู —</option>
                                                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <select className="form-select text-sm" value={assignment.room_id || ''}
                                                                onChange={e => handleAssignmentChange(subject.id, 'room_id', e.target.value)}>
                                                                <option value="">— เลือกห้อง —</option>
                                                                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                            </select>
                                                        </td>
                                                    </>
                                                )}
                                                <td className="px-4 py-3 text-center">
                                                    {!assignable ? null : (
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {status === 'saved' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                                                            {status === 'unsaved' && <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
                                                            {(assignment.teacher_id || assignment.room_id) ? (
                                                                <button
                                                                    onClick={() => clearRow(subject.id)}
                                                                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                    title="ล้างการมอบหมาย"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-300 dark:text-gray-600 text-xs w-6">—</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
