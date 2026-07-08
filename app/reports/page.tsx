'use client';

import { useState, useEffect } from 'react';
import { Printer, Settings, Users, GraduationCap, Save, FileText, ArrowUpRight } from 'lucide-react';
import SchedulePreview, { TABLE_THEMES } from '@/components/SchedulePreview';
import CourseStructurePreview from '@/components/CourseStructurePreview';
import { useToast } from '@/components/ToastProvider';

interface Class { id: number; name: string; grade_level_id: number; }
interface Teacher { id: number; name: string; department_id: number; }
interface Department { id: number; name: string; }
interface GradeLevel { id: number; name: string; }

const PREFIXES = [
    'นาย', 'นาง', 'นางสาว',
    'ศาสตราจารย์', 'ศาสตราจารย์พิเศษ',
    'รองศาสตราจารย์', 'รองศาสตราจารย์พิเศษ',
    'ผู้ช่วยศาสตราจารย์', 'ผู้ช่วยศาสตราจารย์พิเศษ'
];

const RANK_TITLES = [
    'ว่าที่ร้อยตรี', 'ว่าที่ร้อยตรีหญิง', 'ว่าที่ร้อยโท', 'ว่าที่ร้อยเอก',
    'ร้อยตรี', 'ร้อยโท', 'ร้อยเอก',
    'พันตรี', 'พันโท', 'พันเอก',
    'พลตรี', 'พลโท', 'พลเอก',
    'ร้อยตำรวจตรี', 'ร้อยตำรวจโท', 'ร้อยตำรวจเอก',
    'พันตำรวจตรี', 'พันตำรวจโท', 'พันตำรวจเอก',
    'พลตำรวจตรี', 'พลตำรวจโท', 'พลตำรวจเอก'
];

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<'student' | 'teacher' | 'course-structure' | 'settings'>('student');
    const [classes, setClasses] = useState<Class[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [grades, setGrades] = useState<GradeLevel[]>([]);

    // Selections
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');

    // Preview State
    interface ScheduleItem {
        id: number;
        day_of_week: string;
        period_sequence: number;
        start_time: string;
        end_time: string;
        subject_name: string;
        teacher_name?: string;
        class_name?: string;
        room_name?: string;
        color_code?: string;
        is_countable?: number;
    }
    interface SubjectSummary {
        code: string;
        name: string;
        credit: number;
        hours_per_week: number;
    }
    interface ReportData {
        school: { school_name: string; affiliation: string };
        signatories: { id: number; role_key: string; position_name: string; person_name: string; rank_title?: string }[];
        data: {
            header: { title: string; subtitle: string; term_info: string; info_right?: string };
            schedule: ScheduleItem[];
            summary: SubjectSummary[];
        };
        error?: string;
    }
    const [previewData, setPreviewData] = useState<ReportData | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const { showToast } = useToast();

    // Settings State
    const [schoolSettings, setSchoolSettings] = useState({ school_name: '', affiliation: '', table_theme: 'blue', logo_url: '' });
    interface Signatory {
        id?: number;
        role_key: string;
        position_name: string;
        person_name: string;
        person_prefix?: string;
        rank_title: string;
    }
    const [signatories, setSignatories] = useState<Signatory[]>([]);

    // Course Structure Preview State
    const [previewStructureData, setPreviewStructureData] = useState<any | null>(null);
    const [previewStructureLoading, setPreviewStructureLoading] = useState(false);

    useEffect(() => {
        fetchMasterData();
        fetchSettings();
    }, []);

    // Fetch preview when selection changes
    useEffect(() => {
        if (activeTab === 'student' && selectedClassId) {
            fetchPreview('student', selectedClassId);
        } else if (activeTab === 'teacher' && selectedTeacherId) {
            fetchPreview('teacher', selectedTeacherId);
        } else if (activeTab === 'course-structure' && selectedClassId) {
            fetchCourseStructurePreview(selectedClassId);
        } else {
            setPreviewData(null);
            setPreviewStructureData(null);
        }
    }, [activeTab, selectedClassId, selectedTeacherId]);

    const fetchMasterData = async () => {
        try {
            const [classesRes, teachersRes, deptsRes, gradesRes] = await Promise.all([
                fetch('/api/classes?active_only=1'),
                fetch('/api/teachers?active_only=1'),
                fetch('/api/master-data?type=departments'),
                fetch('/api/master-data?type=grades')
            ]);
            setClasses(await classesRes.json());
            setTeachers(await teachersRes.json());
            setDepartments(await deptsRes.json());
            setGrades(await gradesRes.json());
        } catch (error) {
            console.error('Failed to fetch master data', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/reports/settings');
            const data = await res.json();
            if (data.school) {
                setSchoolSettings(data.school);
            }
            if (data.signatories) {
                setSignatories(data.signatories);
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        }
    };

    const fetchPreview = async (type: 'student' | 'teacher', id: string) => {
        setPreviewLoading(true);
        try {
            const res = await fetch(`/api/reports/print?type=${type}&id=${id}`);
            const data = await res.json();
            if (data.error) {
                setPreviewData(null);
            } else {
                setPreviewData(data);
            }
        } catch (error) {
            console.error('Failed to fetch preview', error);
            setPreviewData(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    const fetchCourseStructurePreview = async (classId: string) => {
        setPreviewStructureLoading(true);
        try {
            const [structureRes, settingsRes] = await Promise.all([
                fetch(`/api/reports/course-structure?classId=${classId}`),
                fetch('/api/reports/settings')
            ]);
            
            const structureData = await structureRes.json();
            const settingsData = await settingsRes.json();

            if (structureData.error) {
                setPreviewStructureData(null);
            } else {
                setPreviewStructureData({
                    ...structureData,
                    school: settingsData.school || { school_name: 'โรงเรียนมุกดาวิทยานุกูล', affiliation: 'จังหวัดมุกดาหาร' }
                });
            }
        } catch (error) {
            console.error('Failed to fetch preview', error);
            setPreviewStructureData(null);
        } finally {
            setPreviewStructureLoading(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/reports/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ school: schoolSettings, signatories }),
            });
            if (!res.ok) {
                const errorData = await res.text();
                throw new Error(`Failed to save settings: ${errorData}`);
            }
            showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
        } catch (error) {
            console.error('Save Settings Error:', error);
            showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
    };

    const handlePrint = (type: 'student' | 'teacher', id: string) => {
        if (!id) {
            showToast('กรุณาเลือกข้อมูลก่อนพิมพ์', 'error');
            return;
        }
        // Open print page in new tab
        window.open(`/reports/print?type=${type}&id=${id}`, '_blank');
    };

    return (
        <div className="space-y-6">
            <h1 className="page-title flex items-center gap-2">
                <Printer className="w-6 h-6 text-blue-500 dark:text-blue-400" /> ออกรายงานและดาวน์โหลด
            </h1>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => { setActiveTab('student'); setPreviewData(null); setSelectedClassId(''); }}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 transition-colors ${
                        activeTab === 'student'
                            ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    <GraduationCap className="w-4 h-4" /> ตารางเรียนนักเรียน
                </button>
                <button
                    onClick={() => { setActiveTab('teacher'); setPreviewData(null); setSelectedTeacherId(''); }}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 transition-colors ${
                        activeTab === 'teacher'
                            ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    <Users className="w-4 h-4" /> ตารางสอนครู
                </button>
                <button
                    onClick={() => { setActiveTab('course-structure'); setPreviewStructureData(null); setSelectedClassId(''); }}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 transition-colors ${
                        activeTab === 'course-structure'
                            ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    <FileText className="w-4 h-4" /> โครงสร้างรายวิชา
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 transition-colors ${
                        activeTab === 'settings'
                            ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    <Settings className="w-4 h-4" /> ตั้งค่ารายงาน
                </button>
            </div>

            {/* Content */}
            <div className="data-card min-h-[400px]">

                {/* Student Tab */}
                {activeTab === 'student' && (
                    <div className="space-y-8">
                        <div className="max-w-2xl">
                            <h3 className="section-title mb-4">พิมพ์รายห้องเรียน</h3>
                            <div className="flex gap-3 items-end flex-wrap">
                                <div className="flex-1 min-w-[180px]">
                                    <label className="form-label">เลือกห้องเรียน</label>
                                    <select
                                        className="form-select"
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                    >
                                        <option value="">-- เลือกห้อง --</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <button
                                    onClick={() => handlePrint('student', selectedClassId)}
                                    className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors whitespace-nowrap"
                                >
                                    <Printer className="w-4 h-4" /> พิมพ์ตาราง
                                </button>
                                <button
                                    onClick={() => window.open('/reports/batch-print?type=student', '_blank')}
                                    className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium transition-colors whitespace-nowrap"
                                >
                                    <Printer className="w-4 h-4" /> พิมพ์ทุกห้องเรียน
                                </button>
                            </div>
                        </div>

                        {/* Preview Section */}
                        {selectedClassId && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="section-title mb-4">ตัวอย่างตารางเรียน</h3>
                                <PreviewArea loading={previewLoading} data={previewData} type="student" />
                            </div>
                        )}
                    </div>
                )}

                {/* Teacher Tab */}
                {activeTab === 'teacher' && (
                    <div className="space-y-8">
                        <div className="max-w-2xl">
                            <h3 className="section-title mb-4">พิมพ์รายบุคคล</h3>
                            <div className="flex gap-3 items-end flex-wrap">
                                <div className="flex-1 min-w-[180px]">
                                    <label className="form-label">เลือกครูผู้สอน</label>
                                    <select
                                        className="form-select"
                                        value={selectedTeacherId}
                                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                                    >
                                        <option value="">-- เลือกครู --</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <button
                                    onClick={() => handlePrint('teacher', selectedTeacherId)}
                                    className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors whitespace-nowrap"
                                >
                                    <Printer className="w-4 h-4" /> พิมพ์ตาราง
                                </button>
                                <button
                                    onClick={() => window.open('/reports/batch-print?type=teacher', '_blank')}
                                    className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium transition-colors whitespace-nowrap"
                                >
                                    <Printer className="w-4 h-4" /> พิมพ์ตารางสอนทุกคน
                                </button>
                            </div>
                        </div>

                        {/* Preview Section */}
                        {selectedTeacherId && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="section-title mb-4">ตัวอย่างตารางสอน</h3>
                                <PreviewArea loading={previewLoading} data={previewData} type="teacher" />
                            </div>
                        )}
                    </div>
                )}

                {/* Course Structure Tab */}
                {activeTab === 'course-structure' && (
                    <div className="space-y-8">
                        <div className="max-w-2xl">
                            <h3 className="section-title mb-4">พิมพ์โครงสร้างรายวิชาเรียน</h3>
                            <div className="flex gap-3 items-end flex-wrap">
                                <div className="flex-1 min-w-[180px]">
                                    <label className="form-label">เลือกห้องเรียน</label>
                                    <select
                                        className="form-select"
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                    >
                                        <option value="">-- เลือกห้อง --</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <button
                                    onClick={() => {
                                        if (!selectedClassId) {
                                            showToast('กรุณาเลือกห้องเรียนก่อนพิมพ์', 'error');
                                            return;
                                        }
                                        window.open(`/reports/course-structure/print?id=${selectedClassId}`, '_blank');
                                    }}
                                    className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors whitespace-nowrap"
                                >
                                    <Printer className="w-4 h-4" /> พิมพ์โครงสร้าง
                                </button>
                            </div>
                        </div>

                        {/* Preview Section */}
                        {selectedClassId && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="section-title mb-4">ตัวอย่างโครงสร้างรายวิชา</h3>
                                <CourseStructurePreviewArea loading={previewStructureLoading} data={previewStructureData} />
                            </div>
                        )}
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <form onSubmit={handleSaveSettings} className="max-w-5xl space-y-8">
                        <div>
                            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                                <h3 className="section-title">ข้อมูลโรงเรียน</h3>
                                <a href="/master-data" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                    text-blue-600 dark:text-blue-400
                                    bg-blue-50 dark:bg-blue-900/20
                                    border border-blue-200 dark:border-blue-800
                                    hover:bg-blue-100 dark:hover:bg-blue-900/40
                                    hover:border-blue-300 dark:hover:border-blue-700
                                    transition-all group">
                                    แก้ไขที่ ข้อมูลทั่วไป
                                    <ArrowUpRight className="w-3 h-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                </a>
                            </div>
                            <div className="flex items-start gap-5">
                                {schoolSettings.logo_url ? (
                                    <img src={schoolSettings.logo_url} alt="School Logo" className="w-16 h-16 object-contain border border-gray-200 dark:border-gray-700 rounded-lg bg-white shadow-sm shrink-0" />
                                ) : (
                                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                                        <span className="text-xs text-gray-300 dark:text-gray-600">ไม่มีโลโก้</span>
                                    </div>
                                )}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="form-label">ชื่อโรงเรียน</p>
                                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mt-1">{schoolSettings.school_name || <span className="text-gray-400 font-normal italic">ยังไม่ได้ตั้งค่า</span>}</p>
                                    </div>
                                    <div>
                                        <p className="form-label">สังกัด</p>
                                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mt-1">{schoolSettings.affiliation || <span className="text-gray-400 font-normal italic">ยังไม่ได้ตั้งค่า</span>}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="section-title border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">ผู้ลงนาม</h3>
                            <div className="space-y-3">
                                {signatories.filter(sig => sig.role_key !== 'ISSUER').map((sig, index) => (
                                    <div key={sig.id} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 p-5 rounded-xl flex flex-col md:flex-row gap-6 md:items-start">
                                        <div className="font-medium text-gray-700 dark:text-gray-300 text-sm w-32 shrink-0 pt-2">
                                            {sig.role_key === 'ACADEMIC' ? 'หัวหน้าวิชาการ' : 'ผู้อำนวยการ'}
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">ยศ/ตำแหน่งพิเศษ (เหนือชื่อ)</label>
                                                <select
                                                    className="form-select text-sm bg-white dark:bg-gray-800"
                                                    value={sig.rank_title || ''}
                                                    onChange={(e) => {
                                                        const newSigs = [...signatories];
                                                        newSigs[index].rank_title = e.target.value;
                                                        setSignatories(newSigs);
                                                    }}
                                                >
                                                    <option value="">ไม่มี (เว้นว่าง)</option>
                                                    {RANK_TITLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">คำนำหน้า (ในวงเล็บ)</label>
                                                <select
                                                    className="form-select text-sm bg-white dark:bg-gray-800"
                                                    value={sig.person_prefix || ''}
                                                    onChange={(e) => {
                                                        const newSigs = [...signatories];
                                                        newSigs[index].person_prefix = e.target.value;
                                                        setSignatories(newSigs);
                                                    }}
                                                >
                                                    <option value="">ไม่มี (เว้นว่าง)</option>
                                                    {PREFIXES.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">ชื่อ-นามสกุล (ในวงเล็บ)</label>
                                                <input
                                                    type="text"
                                                    className="form-input text-sm bg-white dark:bg-gray-800"
                                                    placeholder="เช่น สมชาย ใจดี"
                                                    value={sig.person_name || ''}
                                                    onChange={(e) => {
                                                        const newSigs = [...signatories];
                                                        newSigs[index].person_name = e.target.value;
                                                        setSignatories(newSigs);
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">ตำแหน่ง (ใต้ลายเซ็น)</label>
                                                <input
                                                    type="text"
                                                    className="form-input text-sm bg-white dark:bg-gray-800"
                                                    placeholder="เช่น ผู้อำนวยการโรงเรียน"
                                                    value={sig.position_name || ''}
                                                    onChange={(e) => {
                                                        const newSigs = [...signatories];
                                                        newSigs[index].position_name = e.target.value;
                                                        setSignatories(newSigs);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="section-title border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">รูปแบบสีตาราง</h3>
                            <div className="flex gap-3 flex-wrap">
                                {Object.entries(TABLE_THEMES).map(([key, t]) => {
                                    if (key === 'custom') return null; // We handle custom separately below
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setSchoolSettings({ ...schoolSettings, table_theme: key })}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                                schoolSettings.table_theme === key
                                                    ? 'border-blue-500 dark:border-blue-400 shadow-md'
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'
                                            }`}
                                        >
                                            <div className="flex gap-1">
                                                <div className={`w-10 h-8 rounded ${key === 'white' ? 'border border-gray-200 dark:border-gray-600' : ''}`} style={{ backgroundColor: t.header }} />
                                                <div className={`w-6 h-8 rounded ${key === 'white' ? 'border border-gray-200 dark:border-gray-600' : ''}`} style={{ backgroundColor: t.day }} />
                                            </div>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t.label}</span>
                                        </button>
                                    );
                                })}
                                {/* Custom Color Picker */}
                                <div
                                    onClick={() => {
                                        if (!schoolSettings.table_theme?.startsWith('custom_')) {
                                            setSchoolSettings({ ...schoolSettings, table_theme: 'custom_e5e7eb_f3f4f6' });
                                        }
                                    }}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                                        schoolSettings.table_theme?.startsWith('custom_')
                                            ? 'border-blue-500 dark:border-blue-400 shadow-md'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'
                                    }`}
                                >
                                    <div className="flex gap-1 items-center">
                                        <input 
                                            type="color" 
                                            value={schoolSettings.table_theme?.startsWith('custom_') ? '#' + schoolSettings.table_theme.split('_')[1] : '#e5e7eb'}
                                            onChange={(e) => {
                                                const hex = e.target.value.replace('#', '');
                                                const currentDay = schoolSettings.table_theme?.startsWith('custom_') ? schoolSettings.table_theme.split('_')[2] : 'f3f4f6';
                                                setSchoolSettings({ ...schoolSettings, table_theme: `custom_${hex}_${currentDay}` });
                                            }}
                                            className="w-10 h-8 p-0 border-0 rounded cursor-pointer"
                                            title="สีหัวตาราง"
                                        />
                                        <input 
                                            type="color" 
                                            value={schoolSettings.table_theme?.startsWith('custom_') ? '#' + schoolSettings.table_theme.split('_')[2] : '#f3f4f6'}
                                            onChange={(e) => {
                                                const hex = e.target.value.replace('#', '');
                                                const currentHeader = schoolSettings.table_theme?.startsWith('custom_') ? schoolSettings.table_theme.split('_')[1] : 'e5e7eb';
                                                setSchoolSettings({ ...schoolSettings, table_theme: `custom_${currentHeader}_${hex}` });
                                            }}
                                            className="w-6 h-8 p-0 border-0 rounded cursor-pointer"
                                            title="สีช่องวัน"
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">กำหนดเอง</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium transition-colors"
                            >
                                <Save className="w-4 h-4" /> บันทึกการตั้งค่า
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

function PreviewArea({ loading, data, type }: { loading: boolean; data: any; type: 'student' | 'teacher' }) {
    if (loading) {
        return (
            <div className="flex flex-col items-center gap-3 py-12 text-gray-400 dark:text-gray-500">
                <div className="loading-spinner"></div>
                <span className="text-sm">กำลังโหลดตัวอย่าง...</span>
            </div>
        );
    }
    if (!data) {
        return (
            <div className="py-10 text-center text-red-500 dark:text-red-400 text-sm">
                ไม่สามารถโหลดตัวอย่างได้
            </div>
        );
    }
    return (
        <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 p-4">
            <div
                style={{ width: '297mm', transform: 'scale(var(--preview-scale, 0.65))', transformOrigin: 'top left', height: '210mm' }}
                ref={(el) => {
                    if (el) {
                        const parent = el.parentElement;
                        if (parent) {
                            const scale = (parent.clientWidth - 32) / el.offsetWidth;
                            el.style.setProperty('--preview-scale', String(Math.min(scale, 1)));
                            parent.style.height = (el.offsetHeight * Math.min(scale, 1) + 32) + 'px';
                        }
                    }
                }}
            >
                <SchedulePreview data={data} type={type} />
            </div>
        </div>
    );
}

function CourseStructurePreviewArea({ loading, data }: { loading: boolean; data: any; }) {
    if (loading) {
        return (
            <div className="flex flex-col items-center gap-3 py-12 text-gray-400 dark:text-gray-500">
                <div className="loading-spinner"></div>
                <span className="text-sm">กำลังโหลดตัวอย่าง...</span>
            </div>
        );
    }
    if (!data) {
        return (
            <div className="py-10 text-center text-red-500 dark:text-red-400 text-sm">
                ไม่สามารถโหลดตัวอย่างได้
            </div>
        );
    }
    return (
        <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 p-4">
            <div
                style={{ width: '210mm', transform: 'scale(var(--preview-scale, 0.9))', transformOrigin: 'top left', height: '297mm' }}
                ref={(el) => {
                    if (el) {
                        const parent = el.parentElement;
                        if (parent) {
                            const scale = (parent.clientWidth - 32) / el.offsetWidth;
                            el.style.setProperty('--preview-scale', String(Math.min(scale, 1)));
                            parent.style.height = (el.offsetHeight * Math.min(scale, 1) + 32) + 'px';
                        }
                    }
                }}
            >
                <CourseStructurePreview data={data} />
            </div>
        </div>
    );
}
