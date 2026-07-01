'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X, Plus, AlertTriangle, Lock, CheckCircle, Circle, ClipboardList, ShieldCheck, Wand2, Trash2, ArrowLeftRight } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

// Interfaces
interface Schedule {
    id: number;
    teacher_id: number;
    subject_id: number;
    room_id: number;
    class_id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    subject_code: string;
    subject_name: string;
    teacher_name: string;
    teacher_color: string;
    room_name: string;
    is_locked?: number;
    fixed_activity_group?: string;
}

interface Subject {
    id: number;
    code: string;
    name: string;
    category: string;
    credits: number;
    grade_level_id: number;
}

interface Teacher {
    id: number;
    name: string;
    color: string;
}

interface Room {
    id: number;
    name: string;
}

interface Class {
    id: number;
    name: string;
    level: string;
    grade_level_id: number;
}

interface Term {
    id: number;
    year: number;
    term: number;
    status: string;
}

interface TimeSlot {
    id: number;
    start_time: string;
    end_time: string;
    type: 'Study' | 'Break' | 'Assembly' | 'Homeroom';
    order_index: number;
    name?: string;
}

interface SubjectPoolItem {
    id: number;
    subject_id: number;
    code: string;
    name: string;
    teacher_id: number;
    teacher_name: string;
    teacher_color: string;
    room_id: number;
    room_name?: string;
    total_periods: number;
    placed_periods: number;
    remaining_periods: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAYS_TH = {
    'Monday': 'จันทร์',
    'Tuesday': 'อังคาร',
    'Wednesday': 'พุธ',
    'Thursday': 'พฤหัสบดี',
    'Friday': 'ศุกร์'
};

// Schedule Card View
const ACTIVITY_LABEL: Record<string, string> = { SCOUT: 'ลูกเสือ-เนตรนารี', CLUB: 'ชุมนุม', GUIDANCE: 'แนะแนว' };

function ScheduleCardView({ schedule, isLocked = false, isOverlay = false, isSwapping = false }: { schedule: Schedule, isLocked?: boolean, isOverlay?: boolean, isSwapping?: boolean }) {
    const isActivityOnly = !schedule.subject_id && schedule.fixed_activity_group;
    const bgColor = schedule.teacher_color || (isActivityOnly ? '#d97706' : '#3b82f6');
    const style: React.CSSProperties = {
        backgroundColor: bgColor,
        textShadow: '0px 0px 3px rgba(0,0,0,0.8), 0px 1px 2px rgba(0,0,0,0.8)',
    };
    const displayCode = schedule.subject_code || (schedule.fixed_activity_group ? ACTIVITY_LABEL[schedule.fixed_activity_group] || schedule.fixed_activity_group : 'ล็อก');
    const displayName = schedule.subject_name || '';
    return (
        <div
            style={style}
            className={`${isOverlay ? 'w-full h-full opacity-80 shadow-xl scale-105 z-50 rounded-md relative' : 'absolute inset-1 rounded z-10 hover:z-20'} p-1 text-xs text-white shadow-sm overflow-hidden flex flex-col justify-center items-center text-center ${isLocked ? 'cursor-default border-2 border-yellow-300' : 'cursor-move'} ${isSwapping ? 'animate-pulse ring-2 ring-yellow-300 ring-offset-1' : ''}`}
        >
            <div className="font-bold truncate w-full">{displayCode}</div>
            <div className="truncate w-full">{displayName}</div>
            <div className="truncate w-full text-[10px]">{schedule.teacher_name ? `ครู${schedule.teacher_name}` : ''}</div>
            <div className="truncate w-full text-[10px]">{schedule.room_name || ''}</div>
            {isLocked && (
                <div className="absolute top-0 right-0 p-1">
                    <Lock className="w-3 h-3" />
                </div>
            )}
        </div>
    );
}

// Draggable Item Component
function DraggableSchedule({ schedule, onDelete, isSwapping = false }: { schedule: Schedule; onDelete: (id: number) => void; isSwapping?: boolean }) {
    const isLocked = schedule.is_locked === 1;

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `schedule-${schedule.id}`,
        data: schedule,
        disabled: isLocked,
    });

    const style = {
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(isLocked ? {} : listeners)}
            {...(isLocked ? {} : attributes)}
            className="w-full h-full relative"
        >
            <ScheduleCardView schedule={schedule} isLocked={isLocked} isSwapping={isSwapping} />
            {!isLocked && (
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(schedule.id);
                    }}
                    className="absolute top-1 right-1 p-1 hover:bg-black/20 rounded-bl-md z-30 transition-colors text-white"
                    title="ลบคาบเรียน"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

// Subject Card View
function SubjectCardView({ subject, isComplete = false, isOverlay = false }: { subject: SubjectPoolItem, isComplete?: boolean, isOverlay?: boolean }) {
    if (isOverlay) {
        return (
            <div className="p-2 rounded border shadow-lg bg-white opacity-90 cursor-move">
                <div className="font-bold text-xs truncate">{subject.code}</div>
                <div className="text-xs text-gray-700 truncate">{subject.name}</div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subject.teacher_color || '#9ca3af' }}></span>
                    <span className="truncate">{subject.teacher_name ? `ครู${subject.teacher_name}` : 'ยังไม่กำหนดครู'}</span>
                </div>
            </div>
        );
    }
    return (
        <div className={`p-3 rounded border shadow-sm bg-white ${isComplete ? 'opacity-50 cursor-not-allowed' : 'cursor-move hover:shadow-md'}`}>
            <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-sm">{subject.code}</div>
                <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isComplete ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {isComplete ? <CheckCircle className="w-3 h-3" /> : <Circle className="w-3 h-3 fill-current" />} {subject.placed_periods}/{subject.total_periods}
                </div>
            </div>
            <div className="text-sm text-gray-800 mb-1">{subject.name}</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.teacher_color || '#9ca3af' }}></span>
                {subject.teacher_name ? `ครู${subject.teacher_name}` : 'ยังไม่กำหนดครู'}
            </div>
        </div>
    );
}

// Draggable Subject Pool Card
function DraggableSubjectCard({ subject }: { subject: SubjectPoolItem }) {
    const isComplete = subject.remaining_periods <= 0;
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `pool-subject-${subject.subject_id}`,
        data: subject,
        disabled: isComplete
    });

    const style = {
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
        >
            <SubjectCardView subject={subject} isComplete={isComplete} />
        </div>
    );
}

// Droppable Cell Component
function DroppableCell({ day, timeSlot, children, onAdd, type, hasSchedule, cellScheduleId, activeId }: { day: string, timeSlot: TimeSlot, children: React.ReactNode, onAdd: () => void, type: string, hasSchedule?: boolean, cellScheduleId?: number, activeId?: string | null }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `${day}::${timeSlot.start_time}`,
    });

    const isBreak = type === 'Break';
    const isAssembly = type === 'Assembly';

    // swap target = dragging a different schedule card over this occupied cell
    const isSwapTarget = isOver && hasSchedule
        && activeId?.startsWith('schedule-')
        && activeId !== `schedule-${cellScheduleId}`;

    if (isBreak || isAssembly) {
        return (
            <div className="h-24 border-r border-b border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
                {timeSlot.name || (isBreak ? 'พัก' : 'กิจกรรม')}
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            className={`h-24 border-r border-b border-gray-200 relative transition-colors ${isSwapTarget ? 'bg-orange-50' : isOver ? 'bg-blue-50' : 'bg-white'}`}
        >
            {children}
            {isSwapTarget && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="bg-orange-500 text-white rounded-full p-1.5 shadow-lg animate-bounce">
                        <ArrowLeftRight className="w-4 h-4" />
                    </div>
                </div>
            )}
            {!children && !isOver && (
                <button
                    onClick={onAdd}
                    className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-all"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}
        </div>
    );
}

export default function SchedulePage() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [subjectPool, setSubjectPool] = useState<SubjectPoolItem[]>([]);
    const [hasAssignments, setHasAssignments] = useState(true);

    const [selectedTermId, setSelectedTermId] = useState<number | ''>('');
    const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();
    const confirm = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [activeId, setActiveId] = useState<string | null>(null);

    const [swappingIds, setSwappingIds] = useState<number[]>([]);

    const [validateOpen, setValidateOpen] = useState(false);
    const [violations, setViolations] = useState<{ type: string; severity: string; message: string }[]>([]);
    const [validateLoading, setValidateLoading] = useState(false);

    interface AutoPlacement { subject_name: string; subject_code: string; teacher_name: string; day_of_week: string; start_time: string; }
    const [autoOpen, setAutoOpen] = useState(false);
    const [autoLoading, setAutoLoading] = useState(false);
    const [autoPreview, setAutoPreview] = useState<AutoPlacement[]>([]);
    const [autoSkipped, setAutoSkipped] = useState<string[]>([]);
    const [autoApplying, setAutoApplying] = useState(false);

    const DAYS_TH: Record<string, string> = { Monday: 'จันทร์', Tuesday: 'อังคาร', Wednesday: 'พุธ', Thursday: 'พฤหัสบดี', Friday: 'ศุกร์' };

    const fetchAutoPreview = async () => {
        if (!selectedClassId || !selectedTermId) return;
        setAutoLoading(true);
        setAutoOpen(true);
        setAutoPreview([]);
        setAutoSkipped([]);
        try {
            const res = await fetch('/api/schedules/auto-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ class_id: selectedClassId, term_id: selectedTermId, dry_run: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAutoPreview(data.placed ?? []);
            setAutoSkipped(data.skipped ?? []);
        } catch (err: any) {
            showToast(err.message, 'error');
            setAutoOpen(false);
        } finally {
            setAutoLoading(false);
        }
    };

    const applyAutoSchedule = async () => {
        if (!selectedClassId || !selectedTermId) return;
        setAutoApplying(true);
        try {
            const res = await fetch('/api/schedules/auto-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ class_id: selectedClassId, term_id: selectedTermId, dry_run: false }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAutoOpen(false);
            fetchSchedules();
            fetchSubjectPool();
            showToast(`จัดตารางอัตโนมัติสำเร็จ ${data.placed.length} คาบ`, 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setAutoApplying(false);
        }
    };

    const clearClass = async () => {
        const cls = classes.find(c => c.id === Number(selectedClassId));
        const clsName = cls?.name ?? 'ชั้นที่เลือก';
        if (!await confirm(`ต้องการเคลียร์ตารางเรียนของ ${clsName} ใช่หรือไม่?\n(คาบที่ล็อกจาก Fixed Activities จะไม่ถูกลบ)`)) return;
        if (!await confirm(`ยืนยันอีกครั้ง — ลบตารางเรียนทั้งหมดของ ${clsName} จริงๆ ใช่ไหม?`)) return;
        try {
            const res = await fetch(`/api/schedules?scope=class&class_id=${selectedClassId}&term_id=${selectedTermId}`, { method: 'DELETE' });
            const data = await res.json();
            fetchSchedules();
            fetchSubjectPool();
            showToast(`เคลียร์ตาราง ${clsName} แล้ว (${data.deleted} คาบ)`, 'success');
        } catch {
            showToast('เกิดข้อผิดพลาด', 'error');
        }
    };

    const clearAll = async () => {
        if (!await confirm('ต้องการเคลียร์ตารางเรียนของทุกชั้นเรียนใช่หรือไม่?\n(คาบที่ล็อกจาก Fixed Activities จะไม่ถูกลบ)')) return;
        if (!await confirm('ยืนยันอีกครั้ง — ลบตารางเรียนทุกชั้นเรียนจริงๆ ใช่ไหม? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
        try {
            const res = await fetch(`/api/schedules?scope=all&term_id=${selectedTermId}`, { method: 'DELETE' });
            const data = await res.json();
            fetchSchedules();
            fetchSubjectPool();
            showToast(`เคลียร์ตารางทุกชั้นแล้ว (${data.deleted} คาบ)`, 'success');
        } catch {
            showToast('เกิดข้อผิดพลาด', 'error');
        }
    };

    const fetchValidation = async () => {
        setValidateLoading(true);
        setValidateOpen(true);
        try {
            const res = await fetch(`/api/schedules/validate${selectedTermId ? `?term_id=${selectedTermId}` : ''}`);
            const data = await res.json();
            setViolations(data.violations ?? []);
        } catch {
            setViolations([]);
        } finally {
            setValidateLoading(false);
        }
    };
    const [modalData, setModalData] = useState({
        id: '', // Used for edit
        day: '',
        start_time: '',
        end_time: '',
        teacher_id: '',
        subject_id: '',
        room_id: ''
    });

    useEffect(() => {
        Promise.all([
            fetch('/api/time-slots').then(res => res.json()),
            fetch('/api/classes').then(res => res.json()),
            fetch('/api/teachers').then(res => res.json()),
            fetch('/api/subjects').then(res => res.json()),
            fetch('/api/rooms').then(res => res.json()),
            fetch('/api/academic-terms').then(res => res.json())
        ]).then(([slotsData, classesData, teachersData, subjectsData, roomsData, termsData]) => {
            setTimeSlots(slotsData);
            setClasses(classesData);
            setTeachers(teachersData);
            setSubjects(subjectsData);
            setRooms(roomsData);
            setTerms(termsData);

            const activeTerm = termsData.find((t: Term) => t.status === 'Active');
            if (activeTerm) setSelectedTermId(activeTerm.id);
            if (classesData.length > 0) setSelectedClassId(classesData[0].id);

            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (selectedClassId && selectedTermId) {
            fetchSchedules();
            fetchSubjectPool();
        }
    }, [selectedClassId, selectedTermId]);

    const fetchSchedules = async () => {
        try {
            const term = terms.find(t => t.id === Number(selectedTermId));
            if (!term) return;

            const res = await fetch(`/api/schedules?term_id=${term.id}`);
            if (!res.ok) {
                throw new Error('Failed to fetch');
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setSchedules(data);
            } else {
                setSchedules([]);
            }
        } catch (error) {
            console.error('Failed to fetch schedules', error);
            setSchedules([]);
        }
    };

    const fetchSubjectPool = async () => {
        try {
            const res = await fetch(`/api/course-assignments?type=quota&class_id=${selectedClassId}&term_id=${selectedTermId}`);
            if (!res.ok) throw new Error('Failed to fetch quota');
            const data = await res.json();
            setSubjectPool(data.subjects || []);
            setHasAssignments(data.has_assignments ?? true);
        } catch (error) {
            console.error('Failed to fetch subject pool', error);
            setSubjectPool([]);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();

        // Check if dragging from subject pool
        if (activeId.startsWith('pool-subject-')) {
            // Pool → Grid drag
            const subjectId = parseInt(activeId.replace('pool-subject-', ''));
            const subject = subjectPool.find(s => s.subject_id === subjectId);
            if (!subject) return;

            const [newDay, newStartTime] = overId.split('::');
            const timeSlot = timeSlots.find(ts => ts.start_time === newStartTime);
            if (!timeSlot) return;

            try {
                const term = terms.find(t => t.id === Number(selectedTermId));
                if (!term) return;

                const res = await fetch('/api/schedules', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        teacher_id: subject.teacher_id,
                        subject_id: subject.subject_id,
                        room_id: subject.room_id,
                        class_id: selectedClassId,
                        day_of_week: newDay,
                        start_time: newStartTime,
                        end_time: timeSlot.end_time,
                        academic_term_id: term.id
                    }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.details ? err.details.join(', ') : err.error);
                }

                fetchSchedules();
                fetchSubjectPool();
                setError(null);
                showToast('ย้ายคาบเรียนสำเร็จ', 'success');
            } catch (err: any) {
                setError(err.message);
                showToast(err.message, 'error');
            }
            return;
        }

        // Grid → Grid drag (existing logic)
        const scheduleId = parseInt(activeId.replace('schedule-', ''));
        const [newDay, newStartTime] = overId.split('::');
        const schedule = schedules.find(s => s.id === scheduleId);
        const timeSlot = timeSlots.find(ts => ts.start_time === newStartTime);

        if (!schedule || !timeSlot) return;

        // Prevent dropping on the same slot
        if (schedule.day_of_week === newDay && schedule.start_time === newStartTime) {
            return;
        }

        // Swap: target cell already has a schedule
        const targetSchedule = filteredSchedules.find(s =>
            s.day_of_week === newDay && s.start_time === newStartTime
        );

        if (targetSchedule) {
            if (targetSchedule.is_locked === 1) {
                showToast('ไม่สามารถสลับกับคาบที่ล็อกได้', 'error');
                return;
            }

            const originalSchedules = [...schedules];
            setSchedules(schedules.map(s => {
                if (s.id === scheduleId) return { ...s, day_of_week: targetSchedule.day_of_week, start_time: targetSchedule.start_time, end_time: targetSchedule.end_time };
                if (s.id === targetSchedule.id) return { ...s, day_of_week: schedule.day_of_week, start_time: schedule.start_time, end_time: schedule.end_time };
                return s;
            }));
            setSwappingIds([scheduleId, targetSchedule.id]);

            try {
                const res = await fetch('/api/schedules/swap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_a: scheduleId, id_b: targetSchedule.id }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.details ? err.details.join(', ') : err.error);
                }

                setSwappingIds([]);
                fetchSchedules();
                fetchSubjectPool();
                setError(null);
                showToast('สลับคาบเรียนสำเร็จ', 'success');
            } catch (err: any) {
                setSwappingIds([]);
                setError(err.message);
                setSchedules(originalSchedules);
                showToast(err.message, 'error');
            }
            return;
        }

        // Optimistic Update (move to empty slot)
        const originalSchedules = [...schedules];
        setSchedules(schedules.map(s => s.id === scheduleId ? { ...s, day_of_week: newDay, start_time: newStartTime, end_time: timeSlot.end_time } : s));

        try {
            const term = terms.find(t => t.id === Number(selectedTermId));

            const res = await fetch('/api/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacher_id: schedule.teacher_id,
                    subject_id: schedule.subject_id,
                    room_id: schedule.room_id,
                    class_id: schedule.class_id,
                    day_of_week: newDay,
                    start_time: newStartTime,
                    end_time: timeSlot.end_time,
                    academic_term_id: term?.id
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.details ? err.details.join(', ') : err.error);
            }

            await fetch(`/api/schedules?id=${scheduleId}`, { method: 'DELETE' });

            fetchSchedules();
            fetchSubjectPool();
            setError(null);
            showToast('ย้ายคาบเรียนสำเร็จ', 'success');
        } catch (err: any) {
            setError(err.message);
            setSchedules(originalSchedules);
            showToast(err.message, 'error');
        }
    };

    const handleAddOrEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const term = terms.find(t => t.id === Number(selectedTermId));
            if (!term) return;

            let res;
            if (modalMode === 'add') {
                res = await fetch('/api/schedules', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        teacher_id: modalData.teacher_id,
                        subject_id: modalData.subject_id,
                        room_id: modalData.room_id,
                        class_id: selectedClassId,
                        day_of_week: modalData.day,
                        start_time: modalData.start_time,
                        end_time: modalData.end_time,
                        academic_term_id: term.id
                    }),
                });
            } else {
                res = await fetch('/api/schedules', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: modalData.id,
                        teacher_id: modalData.teacher_id,
                        room_id: modalData.room_id,
                    }),
                });
            }

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.details ? err.details.join(', ') : err.error);
            }

            setIsModalOpen(false);
            fetchSchedules();
            fetchSubjectPool();
            setError(null);
            showToast(modalMode === 'add' ? 'เพิ่มคาบเรียนสำเร็จ' : 'แก้ไขคาบเรียนสำเร็จ', 'success');
        } catch (err: any) {
            setError(err.message);
            showToast(err.message, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const isConfirmed = await confirm('คุณต้องการลบคาบเรียนนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้');
        if (!isConfirmed) return;

        console.log('[handleDelete] Starting delete for schedule ID:', id);

        try {
            const res = await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' });
            console.log('[handleDelete] API response status:', res.status);

            const responseText = await res.text();
            let responseData;
            try {
                responseData = responseText ? JSON.parse(responseText) : {};
            } catch (parseError) {
                console.error('[handleDelete] Failed to parse JSON:', parseError);
                throw new Error('Server returned invalid response');
            }

            if (!res.ok) {
                throw new Error(responseData.error || 'Failed to delete');
            }

            console.log('[handleDelete] Delete successful');
            await fetchSchedules();
            await fetchSubjectPool();
            showToast('ลบคาบเรียนสำเร็จ', 'success');
        } catch (error: any) {
            console.error('[handleDelete] Error:', error);
            showToast('ลบไม่สำเร็จ: ' + error.message, 'error');
        }
    };

    const openAddModal = (day: string, startTime: string, endTime: string) => {
        setModalMode('add');
        setModalData({ id: '', day, start_time: startTime, end_time: endTime, teacher_id: '', subject_id: '', room_id: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (schedule: Schedule) => {
        if (schedule.is_locked === 1) return; // Prevent editing locked schedules
        setModalMode('edit');
        setModalData({
            id: schedule.id.toString(),
            day: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            teacher_id: schedule.teacher_id ? schedule.teacher_id.toString() : '',
            subject_id: schedule.subject_id.toString(),
            room_id: schedule.room_id ? schedule.room_id.toString() : ''
        });
        setIsModalOpen(true);
    };

    const filteredSchedules = Array.isArray(schedules) ? schedules.filter(s => s.class_id === Number(selectedClassId)) : [];

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4 dark:bg-gray-800 dark:border-gray-700">
                {/* Left: selects + badge */}
                <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex gap-4">
                        {terms.find(t => t.id === selectedTermId) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ปีการศึกษา</label>
                                <div className="flex items-center px-3 h-[38px] bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md text-sm font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                    {terms.find(t => t.id === selectedTermId)!.year}/{terms.find(t => t.id === selectedTermId)!.term}
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชั้นเรียน</label>
                            <select
                                className="p-2 border rounded-md min-w-[150px] dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                            >
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                {/* Center: action buttons — always centered */}
                <div className="flex-1 flex items-center justify-center gap-2 flex-wrap">
                    <button
                        onClick={fetchAutoPreview}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
                    >
                        <Wand2 className="w-4 h-4" /> จัดอัตโนมัติ
                    </button>
                    <button
                        onClick={clearClass}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors shadow-sm"
                        title="เคลียร์ตารางชั้นที่เลือก"
                    >
                        <Trash2 className="w-4 h-4" /> เคลียร์ชั้นนี้
                    </button>
                    <button
                        onClick={clearAll}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-sm font-medium transition-colors shadow-sm"
                        title="เคลียร์ตารางทุกชั้น"
                    >
                        <Trash2 className="w-4 h-4" /> เคลียร์ทุกชั้น
                    </button>
                    <button
                        onClick={fetchValidation}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors shadow-sm"
                    >
                        <ShieldCheck className="w-4 h-4" /> ตรวจสอบตาราง
                    </button>
                </div>
                {/* Right: title */}
                <div className="shrink-0 text-right">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">จัดตารางเรียน</h1>
                </div>
            </div>

            <DndContext 
                onDragStart={(e) => setActiveId(e.active.id.toString())}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveId(null)}
            >
                <div className="grid grid-cols-[320px_1fr] gap-6">
                    {/* Subject Pool Sidebar */}
                    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 h-fit sticky top-4 flex flex-col max-h-[calc(100vh-32px)]">
                        <h2 className="text-lg font-bold mb-4 text-gray-800 shrink-0 flex items-center justify-between">
                            รายวิชาที่ต้องจัด
                            {subjectPool.length > 0 && <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{subjectPool.length}</span>}
                        </h2>
                        {subjectPool.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 flex flex-col items-center">
                                <CheckCircle className="w-12 h-12 mb-2 text-green-500" />
                                <div className="text-sm">จัดตารางครบแล้ว</div>
                            </div>
                        ) : (
                            <div className="space-y-3 overflow-y-auto pr-2 pb-2">
                                {subjectPool.map(subject => (
                                    <DraggableSubjectCard key={subject.id} subject={subject} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Schedule Grid */}
                    <div className="min-w-0">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 flex items-center gap-2 text-red-700">
                                <AlertTriangle className="w-5 h-5" />
                                <p>{error}</p>
                                <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                            </div>
                        )}
                        <div className="bg-white rounded-lg shadow overflow-x-auto">
                            <div className="min-w-[800px]">
                                {/* Time Header */}
                                <div className="flex border-b border-gray-200">
                                    <div className="w-24 p-2 bg-cyan-100 border-r border-gray-300 font-bold text-center flex items-center justify-center text-gray-800 shrink-0">
                                        วัน / เวลา
                                    </div>
                                    {(() => {
                                        let periodNum = 0;
                                        return timeSlots.map((slot) => {
                                            const isStudy = slot.type !== 'Break' && slot.type !== 'Assembly' && slot.type !== 'Homeroom';
                                            if (isStudy) periodNum++;
                                            const slotLabel = slot.type === 'Break' ? (slot.name || 'พัก')
                                                : slot.type === 'Assembly' ? (slot.name || 'เข้าแถว')
                                                : slot.type === 'Homeroom' ? (slot.name || 'โฮมรูม')
                                                : null;
                                            return (
                                                <div key={slot.id} className="flex-1 min-w-[100px] p-2 bg-cyan-100 border-r border-gray-300 font-bold text-center text-gray-800 flex flex-col justify-center">
                                                    {isStudy
                                                        ? <div className="text-xs text-gray-600 mb-1">คาบที่ {periodNum}</div>
                                                        : <div className="text-xs text-gray-400 mb-1">{slotLabel}</div>
                                                    }
                                                    <div className="text-sm whitespace-nowrap">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>

                                {/* Days Rows */}
                                {DAYS.map(day => (
                                    <div key={day} className="flex border-b border-gray-200 h-24">
                                        <div className="w-24 p-2 bg-cyan-50 border-r border-gray-300 font-bold text-center flex items-center justify-center text-gray-800 shrink-0">
                                            {DAYS_TH[day as keyof typeof DAYS_TH]}
                                        </div>

                                        {(() => {
                                            const rowCells: React.ReactNode[] = [];
                                            let skip = 0;

                                            timeSlots.forEach((slot, index) => {
                                                if (skip > 0) {
                                                    skip--;
                                                    return;
                                                }

                                                const schedule = filteredSchedules.find(s =>
                                                    s.day_of_week === day && s.start_time === slot.start_time
                                                );

                                                let span = 1;
                                                if (schedule) {
                                                    // Check next slots for same subject
                                                    for (let i = index + 1; i < timeSlots.length; i++) {
                                                        const nextSlot = timeSlots[i];
                                                        const nextSchedule = filteredSchedules.find(s =>
                                                            s.day_of_week === day && s.start_time === nextSlot.start_time
                                                        );

                                                        if (nextSchedule &&
                                                            nextSchedule.subject_id === schedule.subject_id &&
                                                            nextSchedule.teacher_id === schedule.teacher_id) {
                                                            span++;
                                                        } else {
                                                            break;
                                                        }
                                                    }
                                                }

                                                skip = span - 1;

                                                rowCells.push(
                                                    <div key={`${day}-${slot.id}`} className="min-w-[100px]" style={{ flex: span }}>
                                                        <DroppableCell
                                                            day={day}
                                                            timeSlot={slot}
                                                            onAdd={() => openAddModal(day, slot.start_time, slot.end_time)}
                                                            type={slot.type}
                                                            hasSchedule={!!schedule}
                                                            cellScheduleId={schedule?.id}
                                                            activeId={activeId}
                                                        >
                                                            {schedule && (
                                                                <div className="w-full h-full" onClick={() => openEditModal(schedule)}>
                                                                    <DraggableSchedule schedule={schedule} onDelete={handleDelete} isSwapping={swappingIds.includes(schedule.id)} />
                                                                </div>
                                                            )}
                                                        </DroppableCell>
                                                    </div>
                                                );
                                            });

                                            return rowCells;
                                        })()}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeId && activeId.startsWith('pool-subject-') ? (
                        <div className="w-[160px]">
                            <SubjectCardView
                                subject={subjectPool.find(s => s.subject_id === parseInt(activeId.replace('pool-subject-', '')))!}
                                isOverlay={true}
                            />
                        </div>
                    ) : activeId && activeId.startsWith('schedule-') ? (
                        <div className="w-[100px] h-[90px]">
                            <ScheduleCardView
                                schedule={filteredSchedules.find(s => s.id === parseInt(activeId.replace('schedule-', '')))!}
                                isOverlay={true}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <h2 className="text-lg font-bold mb-4">{modalMode === 'add' ? 'เพิ่มวิชาเรียน' : 'แก้ไขครู/ห้องเรียน'}</h2>
                        <form onSubmit={handleAddOrEdit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">วิชา</label>
                                <select
                                    className="w-full p-2 border rounded bg-gray-50"
                                    value={modalData.subject_id}
                                    onChange={(e) => {
                                        const newSubjectId = e.target.value;
                                        const poolItem = subjectPool.find(p => p.subject_id === Number(newSubjectId));
                                        setModalData({
                                            ...modalData,
                                            subject_id: newSubjectId,
                                            teacher_id: poolItem && poolItem.teacher_id ? poolItem.teacher_id.toString() : '',
                                            room_id: poolItem && poolItem.room_id ? poolItem.room_id.toString() : ''
                                        });
                                    }}
                                    required
                                    disabled={modalMode === 'edit'}
                                >
                                    <option value="">เลือกวิชา</option>
                                    {subjectPool.map(p => {
                                        const isFull = p.remaining_periods <= 0;
                                        return (
                                            <option key={p.id} value={p.subject_id} disabled={isFull} style={{ color: isFull ? '#9ca3af' : 'inherit' }}>
                                                {p.code} - {p.name} {p.teacher_name ? `(ครู${p.teacher_name})` : ''} {isFull ? '(จัดครบแล้ว)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ครูผู้สอน</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={modalData.teacher_id}
                                    onChange={(e) => setModalData({ ...modalData, teacher_id: e.target.value })}
                                >
                                    <option value="">-- ยังไม่กำหนดครู --</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ห้องเรียน</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={modalData.room_id}
                                    onChange={(e) => setModalData({ ...modalData, room_id: e.target.value })}
                                >
                                    <option value="">-- ไม่ระบุ --</option>
                                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">ยกเลิก</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">บันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Auto-schedule Modal */}
            {autoOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Wand2 className="w-5 h-5 text-emerald-500" /> ตัวอย่างการจัดตารางอัตโนมัติ
                            </h2>
                            <button onClick={() => setAutoOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto px-6 py-4 flex-1">
                            {autoLoading ? (
                                <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                                    <div className="loading-spinner"></div>
                                    <span className="text-sm">กำลังคำนวณ...</span>
                                </div>
                            ) : autoPreview.length === 0 && autoSkipped.length === 0 ? (
                                <div className="flex flex-col items-center py-10 gap-3 text-green-600 dark:text-green-400">
                                    <CheckCircle className="w-12 h-12" />
                                    <span className="font-medium">ไม่มีวิชาที่ต้องจัดเพิ่ม</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {autoPreview.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                จะจัด <span className="text-emerald-600 font-bold">{autoPreview.length}</span> คาบ
                                            </p>
                                            <div className="space-y-1 max-h-64 overflow-y-auto">
                                                {autoPreview.map((p, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                                        <span className="font-medium text-emerald-800 dark:text-emerald-300 w-6 text-center">{i + 1}</span>
                                                        <span className="flex-1 text-gray-800 dark:text-gray-200">{p.subject_name}</span>
                                                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                                                            {DAYS_TH[p.day_of_week]} {p.start_time.slice(0, 5)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {autoSkipped.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                                                ไม่สามารถจัดได้ {autoSkipped.length} รายการ (ช่องเต็ม)
                                            </p>
                                            {autoSkipped.map((s, i) => (
                                                <div key={i} className="text-xs text-yellow-700 dark:text-yellow-400 py-1 px-3 bg-yellow-50 dark:bg-yellow-900/20 rounded mb-1">
                                                    {s}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {!autoLoading && autoPreview.length > 0 && (
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
                                <button onClick={() => setAutoOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={applyAutoSchedule}
                                    disabled={autoApplying}
                                    className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    {autoApplying ? <><div className="loading-spinner w-4 h-4"></div> กำลังบันทึก...</> : <><Wand2 className="w-4 h-4" /> ใช้การจัดนี้</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Validation Modal */}
            {validateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-violet-500" /> ผลการตรวจสอบตาราง
                            </h2>
                            <button onClick={() => setValidateOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto px-6 py-4 flex-1">
                            {validateLoading ? (
                                <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                                    <div className="loading-spinner"></div>
                                    <span className="text-sm">กำลังตรวจสอบ...</span>
                                </div>
                            ) : violations.length === 0 ? (
                                <div className="flex flex-col items-center py-10 gap-3 text-green-600 dark:text-green-400">
                                    <CheckCircle className="w-12 h-12" />
                                    <span className="font-medium">ไม่พบปัญหา ตารางเรียนสมบูรณ์</span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">พบ {violations.length} รายการที่ควรตรวจสอบ</p>
                                    {violations.map((v, i) => (
                                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                                            v.severity === 'error'
                                                ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                                                : 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'
                                        }`}>
                                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                            <span>{v.message}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
