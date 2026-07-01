'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ClipboardCheck, Info, School, Printer, BookOpen, Activity, PlusCircle, Sparkles } from 'lucide-react';
import TimeStructureFormalReport from '@/components/TimeStructureFormalReport';

interface SubjectDetail {
    name: string;
    hoursPerWeek: number;
    hoursPerYear: number;
}

interface GroupData {
    hoursPerWeek: number;
    hoursPerYear: number;
    subjectNames: SubjectDetail[];
}

interface TotalStandard {
    fundamental: number;
    activity: number;
    additional_min: number;
    total_min: number;
}

interface TimeStructureData {
    grades: string[];
    groups: string[];
    data: Record<string, Record<string, GroupData>>;
    standards: Record<string, Record<string, number>>;
    totalStandards: Record<string, TotalStandard>;
    weeksPerYear: number;
}

export default function TimeStructurePage() {
    const [data, setData] = useState<TimeStructureData | null>(null);
    const [schoolData, setSchoolData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [slowLoad, setSlowLoad] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [timeRes, schoolRes] = await Promise.all([
                    fetch('/api/reports/time-structure'),
                    fetch('/api/reports/settings')
                ]);
                const timeJson = await timeRes.json();
                const schoolJson = await schoolRes.json();
                setData(timeJson);
                setSchoolData(schoolJson.school || { school_name: 'โรงเรียนมุกดาวิทยานุกูล', affiliation: 'จังหวัดมุกดาหาร' });
            } catch (error) {
                console.error('Failed to fetch time structure data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        const t = setTimeout(() => setSlowLoad(true), 150);
        return () => clearTimeout(t);
    }, []);

    if (loading) {
        if (!slowLoad) return null;
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <div className="w-8 h-8 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-3">
                <XCircle className="w-10 h-10 text-red-400" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">ไม่สามารถโหลดข้อมูลได้</h3>
                <p className="text-sm text-gray-500">กรุณาลองใหม่อีกครั้ง</p>
            </div>
        );
    }

    const { grades, groups, data: gradeData, standards, totalStandards } = data;

    const calcTotals = (grade: string) => {
        const gd = gradeData[grade] || {};
        let fundamentalHours = 0, fundamentalWeekly = 0;
        groups.forEach(group => {
            fundamentalHours += gd[group]?.hoursPerYear || 0;
            fundamentalWeekly += gd[group]?.hoursPerWeek || 0;
        });
        const additionalHours = gd['วิชาเพิ่มเติม']?.hoursPerYear || 0;
        const additionalWeekly = gd['วิชาเพิ่มเติม']?.hoursPerWeek || 0;
        const activityHours = gd['กิจกรรมพัฒนาผู้เรียน']?.hoursPerYear || 0;
        const activityWeekly = gd['กิจกรรมพัฒนาผู้เรียน']?.hoursPerWeek || 0;
        const totalHours = fundamentalHours + additionalHours + activityHours;
        const totalWeekly = fundamentalWeekly + additionalWeekly + activityWeekly;
        return { fundamentalHours, fundamentalWeekly, additionalHours, additionalWeekly, activityHours, activityWeekly, totalHours, totalWeekly };
    };

    const getStatus = (actual: number, standard: number) => {
        if (actual >= standard) return 'pass';
        if (actual >= standard * 0.9) return 'warning';
        return 'fail';
    };

    let passCount = 0, warnCount = 0, failCount = 0;
    grades.forEach(grade => {
        const totals = calcTotals(grade);
        const std = totalStandards[grade];
        const statuses = [
            getStatus(totals.totalHours, std.total_min),
            getStatus(totals.fundamentalHours, std.fundamental),
            getStatus(totals.activityHours, std.activity),
            getStatus(totals.additionalHours, std.additional_min),
        ];
        if (statuses.includes('fail')) failCount++;
        else if (statuses.includes('warning')) warnCount++;
        else passCount++;
    });

    const statusConfig = {
        pass:    { icon: <CheckCircle className="w-3 h-3" />, cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40' },
        warning: { icon: <AlertTriangle className="w-3 h-3" />, cls: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40' },
        fail:    { icon: <XCircle className="w-3 h-3" />, cls: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40' },
    };

    const StatusBadge = ({ status, text }: { status: string; text: string | number }) => {
        const cfg = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.fail;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
                {cfg.icon} {text}
            </span>
        );
    };

    const priLevel = grades.filter(g => g.startsWith('ป'));
    const secLevel = grades.filter(g => !g.startsWith('ป'));

    return (
        <div className="space-y-5 pb-10">

            {/* ── Header ── */}
            <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        ตรวจสอบโครงสร้างเวลาเรียน
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-7">
                        รายงานสรุปและตรวจสอบจำนวนเวลาเรียนตามเกณฑ์หลักสูตร
                    </p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
                >
                    <Printer className="w-4 h-4" />
                    พิมพ์รายงาน
                </button>
            </div>

            {/* ── Summary Cards ── */}
            <div className="print:hidden grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-4 border-l-4 border-l-emerald-500">
                    <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ระดับชั้นผ่านเกณฑ์</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{passCount}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-4 border-l-4 border-l-amber-400">
                    <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ระดับชั้นใกล้เกณฑ์</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{warnCount}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-4 border-l-4 border-l-red-500">
                    <div className="w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ระดับชั้นต่ำกว่าเกณฑ์</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{failCount}</p>
                    </div>
                </div>
            </div>

            {/* ── Info ── */}
            <div className="print:hidden flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/30 text-sm text-blue-900 dark:text-blue-200">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>
                    <strong>เกณฑ์อ้างอิง:</strong> หลักสูตรแกนกลางฯ พ.ศ. 2551 (ปรับปรุง 2560) — คาบเรียน/สัปดาห์ × 40 สัปดาห์ = ชั่วโมง/ปี
                </span>
            </div>

            {/* ── Table ── */}
            <div className="print:hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            {/* Level row */}
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 min-w-[200px] bg-gray-50 dark:bg-gray-900/50 sticky left-0 z-20 border-r border-gray-200 dark:border-gray-700" rowSpan={2}>
                                    กลุ่มสาระ / กิจกรรม
                                </th>
                                {priLevel.length > 0 && (
                                    <th colSpan={priLevel.length} className="px-3 py-2 text-center text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-900/15 border-l border-gray-200 dark:border-gray-700 tracking-wide uppercase">
                                        ระดับประถมศึกษา
                                    </th>
                                )}
                                {secLevel.length > 0 && (
                                    <th colSpan={secLevel.length} className="px-3 py-2 text-center text-xs font-semibold text-purple-700 dark:text-purple-400 bg-purple-50/60 dark:bg-purple-900/15 border-l border-gray-200 dark:border-gray-700 tracking-wide uppercase">
                                        ระดับมัธยมศึกษาตอนต้น
                                    </th>
                                )}
                            </tr>
                            {/* Grade row */}
                            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                                {grades.map((grade, idx) => (
                                    <th key={grade} className={`px-3 py-2 text-center font-bold text-sm border-l border-gray-200 dark:border-gray-700 ${
                                        grade.startsWith('ป')
                                            ? 'text-blue-700 dark:text-blue-300 bg-blue-50/40 dark:bg-blue-900/10'
                                            : 'text-purple-700 dark:text-purple-300 bg-purple-50/40 dark:bg-purple-900/10'
                                    }`}>
                                        {grade}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* ── Fundamental header ── */}
                            <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                                <td colSpan={grades.length + 1} className="px-4 py-2 sticky left-0 bg-gray-50 dark:bg-gray-900/40">
                                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                        <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                                        กลุ่มสาระการเรียนรู้ (วิชาพื้นฐาน)
                                    </span>
                                </td>
                            </tr>

                            {/* ── Fundamental rows ── */}
                            {groups.map(group => {
                                const std = standards[group];
                                return (
                                    <tr key={group} className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800 hover:bg-gray-50/70 dark:hover:bg-gray-700/30 border-r border-gray-100 dark:border-gray-700/60 z-10">
                                            {group}
                                        </td>
                                        {grades.map((grade, idx) => {
                                            const cell = gradeData[grade]?.[group];
                                            const actual = cell?.hoursPerYear || 0;
                                            const standard = std?.[grade] || 0;
                                            const status = actual > 0 ? getStatus(actual, standard) : 'fail';
                                            return (
                                                <td key={grade} className="px-3 py-3 text-center border-l border-gray-100 dark:border-gray-700/50 relative group/cell">
                                                    {actual > 0 ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <StatusBadge status={status} text={actual} />
                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{cell?.hoursPerWeek} คาบ/สป.</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 dark:text-gray-600 text-base">—</span>
                                                    )}
                                                    {actual > 0 && cell && cell.subjectNames?.length > 0 && (
                                                        <div className={`absolute z-50 bottom-full mb-2 w-60 p-3 rounded-xl shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-left pointer-events-none opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150 ${
                                                            idx >= grades.length - 2 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                                                        }`}>
                                                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-1.5 mb-2">
                                                                {group} — {grade}
                                                            </p>
                                                            <ul className="space-y-1.5">
                                                                {cell.subjectNames.map((subj, i) => (
                                                                    <li key={i} className="flex justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
                                                                        <span className="leading-tight">{subj.name}</span>
                                                                        <span className="text-gray-400 whitespace-nowrap font-medium">{subj.hoursPerYear} ชม.</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs">
                                                                <span className="text-gray-400">เกณฑ์</span>
                                                                <span className="font-medium text-gray-600 dark:text-gray-300">{standard} ชม./ปี</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}

                            {/* ── Fundamental total ── */}
                            <tr className="bg-blue-50/40 dark:bg-blue-900/10 border-y border-blue-100 dark:border-blue-900/30 font-medium">
                                <td className="px-4 py-3 text-blue-800 dark:text-blue-300 sticky left-0 bg-blue-50/40 dark:bg-blue-900/10 border-r border-blue-100 dark:border-blue-900/30 z-10 text-sm">
                                    รวมวิชาพื้นฐาน
                                </td>
                                {grades.map(grade => {
                                    const totals = calcTotals(grade);
                                    const std = totalStandards[grade];
                                    const status = getStatus(totals.fundamentalHours, std.fundamental);
                                    return (
                                        <td key={grade} className="px-3 py-3 text-center border-l border-blue-100 dark:border-blue-900/30">
                                            <div className="flex flex-col items-center gap-1">
                                                <StatusBadge status={status} text={totals.fundamentalHours} />
                                                <span className="text-[10px] text-gray-400">เกณฑ์: {std.fundamental}</span>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* ── Activity header ── */}
                            <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                                <td colSpan={grades.length + 1} className="px-4 py-2 sticky left-0 bg-gray-50 dark:bg-gray-900/40">
                                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                        <Activity className="w-3.5 h-3.5 text-emerald-500" />
                                        กิจกรรมพัฒนาผู้เรียน
                                    </span>
                                </td>
                            </tr>
                            <tr className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/60 z-10">
                                    กิจกรรมพัฒนาผู้เรียน
                                </td>
                                {grades.map(grade => {
                                    const cell = gradeData[grade]?.['กิจกรรมพัฒนาผู้เรียน'];
                                    const actual = cell?.hoursPerYear || 0;
                                    const standard = totalStandards[grade].activity;
                                    const status = actual > 0 ? getStatus(actual, standard) : 'fail';
                                    return (
                                        <td key={grade} className="px-3 py-3 text-center border-l border-gray-100 dark:border-gray-700/50">
                                            {actual > 0 ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <StatusBadge status={status} text={actual} />
                                                    <span className="text-[10px] text-gray-400">เกณฑ์: {standard}</span>
                                                </div>
                                            ) : <span className="text-gray-300 dark:text-gray-600 text-base">—</span>}
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* ── Additional header ── */}
                            <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                                <td colSpan={grades.length + 1} className="px-4 py-2 sticky left-0 bg-gray-50 dark:bg-gray-900/40">
                                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                        <PlusCircle className="w-3.5 h-3.5 text-purple-500" />
                                        รายวิชาเพิ่มเติม / ซ่อมเสริม
                                    </span>
                                </td>
                            </tr>
                            <tr className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/60 z-10">
                                    วิชาเพิ่มเติม / ซ่อมเสริม
                                </td>
                                {grades.map((grade, idx) => {
                                    const cell = gradeData[grade]?.['วิชาเพิ่มเติม'];
                                    const actual = cell?.hoursPerYear || 0;
                                    const standard = totalStandards[grade].additional_min;
                                    const status = actual > 0 ? getStatus(actual, standard) : 'fail';
                                    return (
                                        <td key={grade} className="px-3 py-3 text-center border-l border-gray-100 dark:border-gray-700/50 relative group/cell">
                                            {actual > 0 ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <StatusBadge status={status} text={actual} />
                                                    <span className="text-[10px] text-gray-400">≥{standard}</span>
                                                </div>
                                            ) : <span className="text-gray-300 dark:text-gray-600 text-base">—</span>}
                                            {actual > 0 && cell && cell.subjectNames?.length > 0 && (
                                                <div className={`absolute z-50 bottom-full mb-2 w-60 p-3 rounded-xl shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-left pointer-events-none opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150 ${
                                                    idx >= grades.length - 2 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                                                }`}>
                                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-1.5 mb-2">
                                                        วิชาเพิ่มเติม — {grade}
                                                    </p>
                                                    <ul className="space-y-1.5">
                                                        {cell.subjectNames.map((subj, i) => (
                                                            <li key={i} className="flex justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
                                                                <span className="leading-tight">{subj.name}</span>
                                                                <span className="text-gray-400 whitespace-nowrap font-medium">{subj.hoursPerYear} ชม.</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* ── Grand Total ── */}
                            <tr className="bg-gray-900 dark:bg-gray-950 font-bold">
                                <td className="px-4 py-4 text-white sticky left-0 bg-gray-900 dark:bg-gray-950 border-r border-gray-700 z-10 flex items-center gap-2">
                                    <School className="w-4 h-4 text-gray-400" />
                                    รวมเวลาเรียนทั้งหมด
                                </td>
                                {grades.map(grade => {
                                    const totals = calcTotals(grade);
                                    const std = totalStandards[grade];
                                    const status = getStatus(totals.totalHours, std.total_min);
                                    const diff = totals.totalHours - std.total_min;
                                    return (
                                        <td key={grade} className="px-3 py-4 text-center border-l border-gray-700">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`text-lg font-bold ${
                                                    status === 'pass' ? 'text-emerald-400'
                                                    : status === 'warning' ? 'text-amber-400'
                                                    : 'text-red-400'
                                                }`}>{totals.totalHours}</span>
                                                <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded-full ${
                                                    diff >= 0 ? 'text-emerald-400 bg-emerald-900/40' : 'text-red-400 bg-red-900/40'
                                                }`}>{diff >= 0 ? '+' : ''}{diff}</span>
                                                <span className="text-[10px] text-gray-500 font-normal">เกณฑ์: {std.total_min}</span>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Legend ── */}
            <div className="print:hidden flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 px-1">
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> ผ่านเกณฑ์ (≥ 100%)</span>
                <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> ใกล้เกณฑ์ (90–99%)</span>
                <span className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-red-500" /> ต่ำกว่าเกณฑ์ (&lt; 90%)</span>
                <span className="ml-auto text-[11px] text-gray-400">* ชี้ที่ช่องเพื่อดูรายวิชา</span>
            </div>

            <div className="hidden print:block">
                {data && schoolData && <TimeStructureFormalReport data={data} school={schoolData} />}
            </div>
        </div>
    );
}
