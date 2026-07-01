'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Users, Layers, AlertTriangle, ArrowRight, CheckCircle2, BarChart2, ShieldAlert } from 'lucide-react';

interface ClassCompletion {
    id: number;
    name: string;
    grade_name: string;
    placed_periods: number;
    total_expected: number;
}

interface DashboardData {
    activeTerm: { id: number; year: number; term: number } | null;
    stats: {
        total_teachers: number;
        total_classes: number;
        total_schedules: number;
        overloaded_teachers: number;
    } | null;
    classCompletion: ClassCompletion[];
}

function pct(placed: number, total: number) {
    if (total === 0) return null;
    return Math.min(100, Math.round((placed / total) * 100));
}

function ProgressBar({ value }: { value: number }) {
    const color = value >= 100 ? 'bg-green-500' : value >= 60 ? 'bg-blue-500' : value >= 30 ? 'bg-yellow-500' : 'bg-red-400';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
            </div>
            <span className="text-xs font-medium w-9 text-right text-gray-600 dark:text-gray-400">{value}%</span>
        </div>
    );
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard')
            .then(r => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400 font-sarabun">
                กำลังโหลด...
            </div>
        );
    }

    const { activeTerm, stats, classCompletion } = data ?? { activeTerm: null, stats: null, classCompletion: [] };

    const totalPlaced = classCompletion.reduce((s, c) => s + Number(c.placed_periods), 0);
    const totalExpected = classCompletion.reduce((s, c) => s + Number(c.total_expected), 0);
    const overallPct = pct(totalPlaced, totalExpected);

    return (
        <div className="space-y-6 font-sarabun">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ภาพรวมระบบ</h1>
                    {activeTerm ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            ปีการศึกษา {activeTerm.year} เทอม {activeTerm.term} (Active)
                        </p>
                    ) : (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" /> ยังไม่มีเทอมที่ Active
                        </p>
                    )}
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link href="/schedule" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                        <Calendar className="w-4 h-4" /> จัดตาราง <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link href="/validate" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors">
                        <ShieldAlert className="w-4 h-4" /> ตรวจตารางชน
                    </Link>
                </div>
            </div>

            {/* Stat Cards */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={<Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />} label="ครูทั้งหมด" value={stats.total_teachers} bg="bg-blue-50 dark:bg-blue-900/20" />
                    <StatCard icon={<Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />} label="ห้องเรียน" value={stats.total_classes} bg="bg-indigo-50 dark:bg-indigo-900/20" />
                    <StatCard icon={<Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />} label="คาบที่จัดแล้ว" value={stats.total_schedules} bg="bg-emerald-50 dark:bg-emerald-900/20" />
                    <StatCard
                        icon={<AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />}
                        label="ครูสอนเกิน 22 คาบ"
                        value={stats.overloaded_teachers}
                        bg={stats.overloaded_teachers > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800'}
                        valueClass={stats.overloaded_teachers > 0 ? 'text-red-600 dark:text-red-400' : undefined}
                    />
                </div>
            )}

            {/* Overall Completion */}
            {overallPct !== null && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <span className="font-semibold text-gray-800 dark:text-white">ความคืบหน้าการจัดตาราง</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{overallPct}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${overallPct >= 100 ? 'bg-green-500' : overallPct >= 60 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                            style={{ width: `${overallPct}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">จัด {totalPlaced} คาบ จากเป้าหมาย {totalExpected} คาบ</p>
                </div>
            )}

            {/* Per-class completion table */}
            {classCompletion.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <span className="font-semibold text-gray-800 dark:text-white">ความคืบหน้าแต่ละห้อง</span>
                        <span className="text-xs text-gray-400">{classCompletion.length} ห้อง</span>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-700/50 max-h-[440px] overflow-y-auto">
                        {classCompletion.map(c => {
                            const p = pct(Number(c.placed_periods), Number(c.total_expected));
                            return (
                                <div key={c.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <div className="w-28 shrink-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                                        <p className="text-xs text-gray-400">{c.grade_name}</p>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {p !== null ? (
                                            <ProgressBar value={p} />
                                        ) : (
                                            <span className="text-xs text-gray-400">ไม่มีข้อมูลเป้าหมาย</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-20 text-right">
                                        {c.placed_periods}/{c.total_expected} คาบ
                                    </div>
                                    {p !== null && p >= 100 && (
                                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!activeTerm && (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400 space-y-3">
                    <AlertTriangle className="w-12 h-12 mx-auto text-amber-400" />
                    <p className="font-medium">ยังไม่มีเทอมที่ Active</p>
                    <Link href="/academic-terms" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        ไปตั้งค่าปีการศึกษา <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value, bg, valueClass }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    bg: string;
    valueClass?: string;
}) {
    return (
        <div className={`${bg} rounded-xl p-4 border border-transparent`}>
            <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span></div>
            <p className={`text-3xl font-bold ${valueClass ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
        </div>
    );
}
