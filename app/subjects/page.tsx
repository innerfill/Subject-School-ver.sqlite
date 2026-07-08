'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, Plus, Edit, Search, Filter, Upload, Download, BookOpen, X, FileText, AlertCircle, CheckCircle2, RefreshCw, SkipForward, ChevronDown, Pencil } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

interface Subject {
    id: number;
    code: string;
    name: string;
    credits: number;
    max_credits?: number;
    hours_per_week: number;
    type: string;
    grade_level_id?: number;
    grade_level_name?: string;
    semester?: number | null;
}

interface GradeLevel { id: number; name: string; }

type PreviewStatus = 'new' | 'duplicate' | 'reactivate' | 'update' | 'invalid';

interface PreviewRow {
    rowIndex: number;
    code: string;
    name: string;
    credits: number;
    hours_per_week: number;
    type: string;
    grade_level_name: string;
    grade_level_id: number | null;
    semester: number | null;
    status: PreviewStatus;
    issues: string[];
    changes: string[];
    existingId: number | null;
}

interface PreviewSummary {
    total: number;
    new: number;
    update: number;
    duplicate: number;
    reactivate: number;
    invalid: number;
}

const emptyForm = {
    code: '', name: '', credits: 1.0, max_credits: 1.0,
    hours_per_week: 2, type: 'Fundamental', grade_level_id: '', semester: ''
};

const TYPE_LABEL: Record<string, string> = { Fundamental: 'พื้นฐาน', Additional: 'เพิ่มเติม', Activity: 'กิจกรรม' };
const TYPE_COLOR: Record<string, string> = {
    Fundamental: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    Additional: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    Activity: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const STATUS_CONFIG: Record<PreviewStatus, { label: string; color: string; rowBg: string; icon: React.ReactNode }> = {
    new: {
        label: 'ใหม่',
        color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        rowBg: 'bg-green-50/60 dark:bg-green-900/10',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    update: {
        label: 'แก้ไข',
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
        rowBg: 'bg-orange-50/60 dark:bg-orange-900/10',
        icon: <Pencil className="w-3.5 h-3.5" />,
    },
    reactivate: {
        label: 'กู้คืน',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        rowBg: 'bg-blue-50/60 dark:bg-blue-900/10',
        icon: <RefreshCw className="w-3.5 h-3.5" />,
    },
    duplicate: {
        label: 'ซ้ำ (ข้าม)',
        color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
        rowBg: 'opacity-50',
        icon: <SkipForward className="w-3.5 h-3.5" />,
    },
    invalid: {
        label: 'ข้อมูลผิด',
        color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        rowBg: 'bg-red-50/60 dark:bg-red-900/10',
        icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
};

function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    const lines = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    for (const line of lines) {
        if (!line.trim()) continue;
        const cols: string[] = [];
        let col = '';
        let inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQ && line[i + 1] === '"') { col += '"'; i++; }
                else inQ = !inQ;
            } else if (ch === ',' && !inQ) { cols.push(col.trim()); col = ''; }
            else col += ch;
        }
        cols.push(col.trim());
        rows.push(cols);
    }
    return rows;
}

// ---- ImportPreviewModal ----
function ImportPreviewModal({
    rows, summary, loading, confirming,
    onConfirm, onClose
}: {
    rows: PreviewRow[];
    summary: PreviewSummary | null;
    loading: boolean;
    confirming: boolean;
    onConfirm: () => void;
    onClose: () => void;
}) {
    const [filter, setFilter] = useState<'all' | PreviewStatus>('all');

    const visible = filter === 'all' ? rows : rows.filter(r => r.status === filter);
    const importCount = summary ? summary.new + summary.reactivate + summary.update : 0;

    const semesterLabel = (s: number | null) =>
        s === 1 ? 'ภาค 1' : s === 2 ? 'ภาค 2' : 'ทั้งปี';

    const filterTabs: { key: 'all' | PreviewStatus; label: string; count: number; color: string }[] = [
        { key: 'all', label: 'ทั้งหมด', count: summary?.total ?? 0, color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
        { key: 'new', label: 'ใหม่', count: summary?.new ?? 0, color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
        { key: 'update', label: 'แก้ไข', count: summary?.update ?? 0, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
        { key: 'reactivate', label: 'กู้คืน', count: summary?.reactivate ?? 0, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
        { key: 'duplicate', label: 'ซ้ำ (ข้าม)', count: summary?.duplicate ?? 0, color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
        { key: 'invalid', label: 'ผิดพลาด', count: summary?.invalid ?? 0, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">ตรวจสอบก่อน Import</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            ตรวจสอบรายวิชาด้านล่างให้ถี่ถ้วนก่อนกด Import
                        </p>
                    </div>
                    <button onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 py-16">
                        <div className="loading-spinner" />
                        <span className="text-sm">กำลังตรวจสอบ...</span>
                    </div>
                ) : (
                    <>
                        {/* Summary + Filter tabs */}
                        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div className="flex flex-wrap gap-2">
                                {filterTabs.map(tab => (
                                    <button key={tab.key}
                                        onClick={() => setFilter(tab.key)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                                            ${filter === tab.key
                                                ? `${tab.color} ring-2 ring-offset-1 ring-current ring-offset-white dark:ring-offset-gray-800`
                                                : `${tab.color} opacity-60 hover:opacity-100`
                                            }`}>
                                        <span>{tab.label}</span>
                                        <span className="bg-white/60 dark:bg-black/20 rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none">{tab.count}</span>
                                    </button>
                                ))}
                            </div>
                            {summary && (summary.invalid > 0 || summary.duplicate > 0 || summary.update > 0) && (
                                <p className="mt-2 text-xs flex flex-wrap gap-x-3">
                                    {summary.update > 0 && <span className="text-orange-500">แก้ไข: จะ overwrite ข้อมูลเดิม</span>}
                                    {summary.duplicate > 0 && <span className="text-gray-400">ซ้ำ: ข้ามอัตโนมัติ</span>}
                                    {summary.invalid > 0 && <span className="text-red-500">ผิดพลาด: จะไม่ถูก Import</span>}
                                </p>
                            )}
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                                    <tr>
                                        <th className="table-th w-10 text-center">#</th>
                                        <th className="table-th w-28">รหัสวิชา</th>
                                        <th className="table-th">ชื่อวิชา</th>
                                        <th className="table-th w-24">ระดับชั้น</th>
                                        <th className="table-th w-20">ประเภท</th>
                                        <th className="table-th w-16 text-center">ชม.</th>
                                        <th className="table-th w-20 text-center">ภาคเรียน</th>
                                        <th className="table-th w-24 text-center">สถานะ</th>
                                        <th className="table-th">หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                    {visible.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400">
                                                ไม่มีรายการในกลุ่มนี้
                                            </td>
                                        </tr>
                                    ) : visible.map(row => {
                                        const sc = STATUS_CONFIG[row.status];
                                        return (
                                            <tr key={row.rowIndex} className={`${sc.rowBg} transition-colors`}>
                                                <td className="px-3 py-2 text-center text-xs text-gray-400 font-mono">{row.rowIndex}</td>
                                                <td className="px-4 py-2 font-mono text-xs font-medium text-gray-800 dark:text-gray-200">
                                                    {row.code || <span className="text-red-400 italic">ว่าง</span>}
                                                </td>
                                                <td className="px-4 py-2 text-gray-800 dark:text-gray-200">
                                                    {row.name || <span className="text-red-400 italic">ว่าง</span>}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {row.grade_level_name
                                                        ? <span className={`px-2 py-0.5 rounded text-xs ${row.grade_level_id ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                                                            {row.grade_level_name}{!row.grade_level_id && ' ⚠'}
                                                          </span>
                                                        : <span className="text-gray-300 dark:text-gray-600 text-xs">-</span>}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLOR[row.type] || ''}`}>
                                                        {TYPE_LABEL[row.type] || row.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-center text-xs text-gray-700 dark:text-gray-300">{row.hours_per_week}</td>
                                                <td className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400">{semesterLabel(row.semester)}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                                                        {sc.icon} {sc.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-xs">
                                                    {row.changes?.length > 0 && (
                                                        <ul className="space-y-0.5 mb-1">
                                                            {row.changes.map((c, i) => (
                                                                <li key={i} className="text-orange-600 dark:text-orange-400">↳ {c}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    {row.issues.length > 0 && (
                                                        <ul className="space-y-0.5">{row.issues.map((issue, i) => (
                                                            <li key={i} className="text-red-500 dark:text-red-400">• {issue}</li>
                                                        ))}</ul>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {importCount > 0
                                    ? <span className="flex flex-wrap gap-x-3 items-center">
                                        <span>จะดำเนินการ <strong className="text-gray-800 dark:text-gray-100">{importCount} รายการ</strong></span>
                                        {summary && summary.new > 0 && <span className="text-green-600 dark:text-green-400 text-xs">+{summary.new} ใหม่</span>}
                                        {summary && summary.update > 0 && <span className="text-orange-500 text-xs">~{summary.update} แก้ไข</span>}
                                        {summary && summary.reactivate > 0 && <span className="text-blue-500 text-xs">↺{summary.reactivate} กู้คืน</span>}
                                        {summary && summary.duplicate > 0 && <span className="text-gray-400 text-xs">/{summary.duplicate} ข้าม</span>}
                                      </span>
                                    : <span className="text-orange-500">ไม่มีรายการที่จะ Import</span>}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={onClose} disabled={confirming}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                                    ยกเลิก
                                </button>
                                <button onClick={onConfirm} disabled={importCount === 0 || confirming}
                                    className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                                    {confirming ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> กำลัง Import...</>
                                        : <><Upload className="w-4 h-4" /> Import {importCount} วิชา</>}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ---- Main Page ----
export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [grades, setGrades] = useState<GradeLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const { showToast } = useToast();
    const confirm = useConfirm();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState(emptyForm);
    const [editModal, setEditModal] = useState<{ open: boolean; subject: Subject | null }>({ open: false, subject: null });
    const [editForm, setEditForm] = useState(emptyForm);

    const [importPreview, setImportPreview] = useState<{
        open: boolean;
        rows: PreviewRow[];
        summary: PreviewSummary | null;
        loading: boolean;
        confirming: boolean;
    }>({ open: false, rows: [], summary: null, loading: false, confirming: false });

    const [exportDropdown, setExportDropdown] = useState(false);

    useEffect(() => { fetchData(); }, []);
    useEffect(() => {
        if (!exportDropdown) return;
        const close = () => setExportDropdown(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [exportDropdown]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subjectsRes, gradesRes] = await Promise.all([
                fetch('/api/subjects'),
                fetch('/api/master-data?type=grades'),
            ]);
            const subjectsData = await subjectsRes.json();
            const gradesData = await gradesRes.json();
            setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
            setGrades(Array.isArray(gradesData) ? gradesData : []);
        } catch {
            showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        let list = subjects;
        if (filterGrade) list = list.filter(s => s.grade_level_id?.toString() === filterGrade);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(s => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
        }
        return list;
    }, [subjects, search, filterGrade]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/subjects', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
        });
        if (res.ok) {
            setFormData(prev => ({ ...emptyForm, grade_level_id: prev.grade_level_id, type: prev.type }));
            fetchData();
            showToast('เพิ่มรายวิชาสำเร็จ', 'success');
        } else {
            const data = await res.json();
            showToast(data.error || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
        }
    };

    const handleEdit = (subject: Subject) => {
        setEditForm({
            code: subject.code, name: subject.name, credits: subject.credits,
            max_credits: subject.max_credits || 1.0, hours_per_week: subject.hours_per_week,
            type: subject.type, grade_level_id: subject.grade_level_id?.toString() || '',
            semester: subject.semester?.toString() || '',
        });
        setEditModal({ open: true, subject });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModal.subject) return;
        const res = await fetch('/api/subjects', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...editForm, id: editModal.subject.id }),
        });
        if (res.ok) {
            setEditModal({ open: false, subject: null });
            fetchData();
            showToast('บันทึกการแก้ไขสำเร็จ', 'success');
        } else {
            const data = await res.json();
            showToast(data.error || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const isConfirmed = await confirm('ยืนยันการลบ? (วิชาจะถูกซ่อนจากระบบ)');
        if (!isConfirmed) return;
        const res = await fetch(`/api/subjects?id=${id}`, { method: 'DELETE' });
        if (res.ok) { fetchData(); showToast('ลบข้อมูลวิชาสำเร็จ', 'success'); }
        else { const d = await res.json(); showToast(d.error || 'ลบข้อมูลไม่สำเร็จ', 'error'); }
    };

    const buildCSV = (list: Subject[]) => {
        const headers = ['รหัสวิชา', 'ชื่อวิชา', 'หน่วยกิต', 'ชม./สัปดาห์', 'ประเภท', 'ระดับชั้น', 'ภาคเรียน'];
        const rows = list.map(s => [
            s.code,
            `"${s.name.replace(/"/g, '""')}"`,
            s.credits,
            s.hours_per_week,
            TYPE_LABEL[s.type] || s.type,
            s.grade_level_name || '',
            s.semester ?? '',
        ].join(','));
        return '﻿' + [headers.join(','), ...rows].join('\n');
    };

    const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const handleExportAll = () => {
        if (subjects.length === 0) { showToast('ไม่มีข้อมูลให้ Export', 'error'); return; }
        const sorted = [...subjects].sort((a, b) => (a.grade_level_id || 999) - (b.grade_level_id || 999) || a.code.localeCompare(b.code, 'th'));
        downloadCSV(buildCSV(sorted), 'subjects_all.csv');
    };

    const handleExportFiltered = () => {
        if (filtered.length === 0) { showToast('ไม่มีข้อมูลให้ Export', 'error'); return; }
        const gradeName = grades.find(g => g.id.toString() === filterGrade)?.name || 'filtered';
        downloadCSV(buildCSV(filtered), `subjects_${gradeName}.csv`);
    };

    const handleDownloadTemplate = () => {
        const content = '﻿' + [
            'รหัสวิชา,ชื่อวิชา,หน่วยกิต,ชม./สัปดาห์,ประเภท,ระดับชั้น,ภาคเรียน',
            'ท21101,ภาษาไทย,1.5,3,พื้นฐาน,ม.1,1',
            'ค22201,คณิตศาสตร์เพิ่มเติม,1,2,เพิ่มเติม,ม.2,',
            'ก31901,กิจกรรมแนะแนว,0,1,กิจกรรม,,',
        ].join('\n');
        downloadCSV(content, 'subjects_template.csv');
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (e.target) e.target.value = '';

        let text: string;
        try { text = await file.text(); }
        catch { showToast('อ่านไฟล์ไม่ได้', 'error'); return; }

        const parsed = parseCSV(text);
        if (parsed.length < 2) { showToast('ไฟล์ CSV ไม่มีข้อมูล', 'error'); return; }

        const rows = parsed.slice(1).map(cols => ({
            code: cols[0] || '',
            name: cols[1] || '',
            credits: cols[2] || '',
            hours_per_week: cols[3] || '',
            type: cols[4] || '',
            grade_level_name: cols[5] || '',
            semester: cols[6] || '',
        })).filter(r => r.code || r.name);

        if (rows.length === 0) { showToast('ไม่พบแถวข้อมูลใน CSV', 'error'); return; }

        setImportPreview({ open: true, rows: [], summary: null, loading: true, confirming: false });

        try {
            const res = await fetch('/api/subjects/preview', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }),
            });
            const data = await res.json();
            if (res.ok) {
                setImportPreview(s => ({ ...s, rows: data.rows, summary: data.summary, loading: false }));
            } else {
                showToast('Preview ล้มเหลว: ' + data.error, 'error');
                setImportPreview(s => ({ ...s, open: false, loading: false }));
            }
        } catch {
            showToast('เกิดข้อผิดพลาดในการตรวจสอบ', 'error');
            setImportPreview(s => ({ ...s, open: false, loading: false }));
        }
    };

    const handleConfirmImport = async () => {
        const toImport = importPreview.rows.filter(r => r.status === 'new' || r.status === 'reactivate' || r.status === 'update');
        if (toImport.length === 0) { showToast('ไม่มีรายการที่จะ Import', 'error'); return; }

        setImportPreview(s => ({ ...s, confirming: true }));
        try {
            const res = await fetch('/api/subjects/import', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows: toImport }),
            });
            const data = await res.json();
            if (res.ok) {
                const parts: string[] = [];
                if (data.inserted > 0) parts.push(`เพิ่ม ${data.inserted} วิชา`);
                if (data.updated > 0) parts.push(`แก้ไข ${data.updated} วิชา`);
                if (data.reactivated > 0) parts.push(`กู้คืน ${data.reactivated} วิชา`);
                if (data.skipped > 0) parts.push(`ข้าม ${data.skipped} ซ้ำ`);
                if (data.invalid > 0) parts.push(`ผิดพลาด ${data.invalid}`);
                showToast(`Import สำเร็จ — ${parts.join(', ') || 'ไม่มีการเปลี่ยนแปลง'}`, 'success');
                setImportPreview({ open: false, rows: [], summary: null, loading: false, confirming: false });
                fetchData();
            } else {
                showToast('Import ล้มเหลว: ' + data.error, 'error');
                setImportPreview(s => ({ ...s, confirming: false }));
            }
        } catch {
            showToast('เกิดข้อผิดพลาดในการ Import', 'error');
            setImportPreview(s => ({ ...s, confirming: false }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="page-title">รายวิชา</h1>
                <div className="flex gap-2 items-center">
                    {/* Export dropdown */}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setExportDropdown(p => !p)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                            <Download className="w-4 h-4" />
                            Export CSV
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {exportDropdown && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                                <button onClick={() => { handleExportAll(); setExportDropdown(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <Download className="w-3.5 h-3.5" /> Export ทั้งหมด ({subjects.length} วิชา)
                                </button>
                                {(filterGrade || search) && (
                                    <button onClick={() => { handleExportFiltered(); setExportDropdown(false); }}
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700">
                                        <Filter className="w-3.5 h-3.5" /> Export ที่กรองแล้ว ({filtered.length} วิชา)
                                    </button>
                                )}
                                <button onClick={() => { handleDownloadTemplate(); setExportDropdown(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                                    <FileText className="w-3.5 h-3.5" /> Download Template
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Import */}
                    <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer text-sm font-medium transition-colors">
                        <Upload className="w-4 h-4" /> Import CSV
                        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                    </label>
                </div>
            </div>

            {/* Add Form */}
            <div className="data-card">
                <h2 className="section-title mb-4">เพิ่มรายวิชาใหม่</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="form-label">รหัสวิชา <span className="text-red-500">*</span></label>
                            <input type="text" required className="form-input" placeholder="เช่น ท21101"
                                value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="form-label">ชื่อวิชา <span className="text-red-500">*</span></label>
                            <input type="text" required className="form-input" placeholder="เช่น ภาษาไทย"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">ระดับชั้น</label>
                            <select className="form-select" value={formData.grade_level_id}
                                onChange={e => setFormData({ ...formData, grade_level_id: e.target.value })}>
                                <option value="">ทุกชั้น (ไม่ระบุ)</option>
                                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">หน่วยกิต</label>
                            <input type="number" step="0.5" min="0" required className="form-input"
                                value={formData.credits} onChange={e => setFormData({ ...formData, credits: parseFloat(e.target.value) })} />
                        </div>
                        <div>
                            <label className="form-label">ชม./สัปดาห์</label>
                            <input type="number" min="1" required className="form-input"
                                value={formData.hours_per_week} onChange={e => setFormData({ ...formData, hours_per_week: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <label className="form-label">ประเภท</label>
                            <select className="form-select" value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                <option value="Fundamental">พื้นฐาน</option>
                                <option value="Additional">เพิ่มเติม</option>
                                <option value="Activity">กิจกรรม</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">ภาคเรียน</label>
                            <select className="form-select" value={formData.semester}
                                onChange={e => setFormData({ ...formData, semester: e.target.value })}>
                                <option value="">ทั้งปีการศึกษา</option>
                                <option value="1">ภาคเรียนที่ 1</option>
                                <option value="2">ภาคเรียนที่ 2</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400 dark:text-gray-500">หลัง submit จะคง ระดับชั้น + ประเภท ไว้ เพื่อเพิ่มต่อเนื่องได้เร็ว</p>
                        <button type="submit" className="px-6 py-2 rounded-lg flex items-center gap-2 text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors">
                            <Plus className="w-4 h-4" /> เพิ่มวิชา
                        </button>
                    </div>
                </form>
            </div>

            {/* Table with inline filter */}
            <div className="data-table-container">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                        <select className="form-select md:w-44 text-sm" value={filterGrade}
                            onChange={e => setFilterGrade(e.target.value)}>
                            <option value="">ทุกระดับชั้น</option>
                            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        {filterGrade && (
                            <button type="button" onClick={() => setFilterGrade('')}
                                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                                <X className="w-3 h-3" /> ล้าง
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">
                            {loading ? '...' : `${filtered.length} / ${subjects.length} วิชา`}
                        </span>
                        <div className="relative w-full md:w-60">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="ค้นหารหัส / ชื่อวิชา" className="form-input pl-9 pr-8 text-sm"
                                value={search} onChange={e => setSearch(e.target.value)} />
                            {search && (
                                <button type="button" onClick={() => setSearch('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="table-th">รหัส</th>
                            <th className="table-th">ชื่อวิชา</th>
                            <th className="table-th">ระดับชั้น</th>
                            <th className="table-th">ภาคเรียน</th>
                            <th className="table-th">ประเภท</th>
                            <th className="table-th text-center">หน่วยกิต / ชม.</th>
                            <th className="table-th-right">จัดการ</th>
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
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
                                        <BookOpen className="w-10 h-10 opacity-40" />
                                        <span className="text-sm">{search || filterGrade ? 'ไม่พบวิชาที่ค้นหา' : 'ยังไม่มีข้อมูลวิชา'}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(subject => (
                                <tr key={subject.id} className="table-row">
                                    <td className="table-td-primary font-mono">{subject.code}</td>
                                    <td className="table-td">{subject.name}</td>
                                    <td className="table-td">
                                        {subject.grade_level_name
                                            ? <span className="px-2 py-0.5 rounded-md text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{subject.grade_level_name}</span>
                                            : <span className="text-gray-300 dark:text-gray-600">-</span>}
                                    </td>
                                    <td className="table-td">
                                        {subject.semester === 1
                                            ? <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">ภาค 1</span>
                                            : subject.semester === 2
                                                ? <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">ภาค 2</span>
                                                : <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">ทั้งปี</span>}
                                    </td>
                                    <td className="table-td">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_COLOR[subject.type] || ''}`}>
                                            {TYPE_LABEL[subject.type] || subject.type}
                                        </span>
                                    </td>
                                    <td className="table-td text-center">
                                        <span className="font-medium">{subject.credits}</span>
                                        <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">หน่วยกิต</span>
                                        <span className="mx-1 text-gray-300 dark:text-gray-600">/</span>
                                        <span className="font-medium">{subject.hours_per_week}</span>
                                        <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">ชม.</span>
                                    </td>
                                    <td className="table-td-right flex justify-end gap-3 items-center">
                                        <button onClick={() => handleEdit(subject)} title="แก้ไข"
                                            className="text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(subject.id)} title="ลบ"
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
            {editModal.open && editModal.subject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">แก้ไขรายวิชา</h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{editModal.subject.code} — {editModal.subject.name}</p>
                            </div>
                            <button onClick={() => setEditModal({ open: false, subject: null })}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">รหัสวิชา <span className="text-red-500">*</span></label>
                                    <input type="text" required className="form-input font-mono" value={editForm.code}
                                        onChange={e => setEditForm({ ...editForm, code: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">ระดับชั้น</label>
                                    <select className="form-select" value={editForm.grade_level_id}
                                        onChange={e => setEditForm({ ...editForm, grade_level_id: e.target.value })}>
                                        <option value="">ทุกชั้น (ไม่ระบุ)</option>
                                        {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">ชื่อวิชา <span className="text-red-500">*</span></label>
                                <input type="text" required className="form-input" value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="form-label">หน่วยกิต</label>
                                    <input type="number" step="0.5" min="0" required className="form-input" value={editForm.credits}
                                        onChange={e => setEditForm({ ...editForm, credits: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="form-label">ชม./สัปดาห์</label>
                                    <input type="number" min="1" required className="form-input" value={editForm.hours_per_week}
                                        onChange={e => setEditForm({ ...editForm, hours_per_week: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="form-label">ประเภท</label>
                                    <select className="form-select" value={editForm.type}
                                        onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                                        <option value="Fundamental">พื้นฐาน</option>
                                        <option value="Additional">เพิ่มเติม</option>
                                        <option value="Activity">กิจกรรม</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">ภาคเรียน</label>
                                <select className="form-select" value={editForm.semester}
                                    onChange={e => setEditForm({ ...editForm, semester: e.target.value })}>
                                    <option value="">ทั้งปีการศึกษา</option>
                                    <option value="1">ภาคเรียนที่ 1</option>
                                    <option value="2">ภาคเรียนที่ 2</option>
                                </select>
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setEditModal({ open: false, subject: null })}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    ยกเลิก
                                </button>
                                <button type="submit"
                                    className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors flex items-center gap-2">
                                    <Edit className="w-4 h-4" /> บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Preview Modal */}
            {importPreview.open && (
                <ImportPreviewModal
                    rows={importPreview.rows}
                    summary={importPreview.summary}
                    loading={importPreview.loading}
                    confirming={importPreview.confirming}
                    onConfirm={handleConfirmImport}
                    onClose={() => setImportPreview({ open: false, rows: [], summary: null, loading: false, confirming: false })}
                />
            )}
        </div>
    );
}
