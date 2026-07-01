'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart2, ChevronUp, ChevronDown, Search, X } from 'lucide-react';

interface WorkloadRow {
    id: number;
    name: string;
    color: string;
    department_name: string | null;
    total_periods: number;
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
}

interface Term { id: number; year: number; term: number; status: string; }

const DAYS = [
    { key: 'monday', label: 'จ' },
    { key: 'tuesday', label: 'อ' },
    { key: 'wednesday', label: 'พ' },
    { key: 'thursday', label: 'พฤ' },
    { key: 'friday', label: 'ศ' },
];

type SortKey = 'name' | 'total_periods' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
type WorkloadLevel = 'all' | 'normal' | 'heavy' | 'over' | 'none';

function workloadLevel(total: number): WorkloadLevel {
    if (total === 0) return 'none';
    if (total <= 15) return 'normal';
    if (total <= 22) return 'heavy';
    return 'over';
}

function workloadColor(total: number) {
    if (total === 0) return 'text-gray-400 dark:text-gray-500';
    if (total <= 15) return 'text-green-600 dark:text-green-400';
    if (total <= 22) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
}

function workloadBg(total: number) {
    if (total === 0) return 'bg-gray-200 dark:bg-gray-600';
    if (total <= 15) return 'bg-green-500';
    if (total <= 22) return 'bg-yellow-500';
    return 'bg-red-500';
}

function getInitial(name: string) {
    const parts = name.trim().split(' ');
    return parts[parts.length - 1]?.[0] ?? name[0] ?? '?';
}

const LEVEL_OPTS: { value: WorkloadLevel; label: string }[] = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'normal', label: '≤15 ปกติ' },
    { value: 'heavy', label: '16–22 มาก' },
    { value: 'over', label: '>22 เกิน' },
    { value: 'none', label: '0 คาบ' },
];

export default function WorkloadPage() {
    const [rows, setRows] = useState<WorkloadRow[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [termId, setTermId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState<WorkloadLevel>('all');
    const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'total_periods', dir: -1 });

    useEffect(() => {
        fetch('/api/academic-terms')
            .then(r => r.json())
            .then((data: Term[]) => {
                setTerms(data);
                const active = data.find(t => t.status === 'Active');
                if (active) setTermId(String(active.id));
            });
    }, []);

    useEffect(() => {
        if (!termId) return;
        setLoading(true);
        fetch(`/api/teachers/workload?term_id=${termId}`)
            .then(r => r.json())
            .then(data => { setRows(data); setLoading(false); });
    }, [termId]);

    const depts = useMemo(() => {
        const s = new Set(rows.map(r => r.department_name ?? '').filter(Boolean));
        return Array.from(s).sort();
    }, [rows]);

    const filtered = useMemo(() => {
        let out = rows;
        if (search) {
            const q = search.toLowerCase();
            out = out.filter(r =>
                r.name.toLowerCase().includes(q) ||
                (r.department_name ?? '').toLowerCase().includes(q)
            );
        }
        if (deptFilter) out = out.filter(r => (r.department_name ?? '') === deptFilter);
        if (levelFilter !== 'all') out = out.filter(r => workloadLevel(r.total_periods) === levelFilter);
        return [...out].sort((a, b) => {
            const av = a[sort.key] as string | number;
            const bv = b[sort.key] as string | number;
            if (av < bv) return -sort.dir;
            if (av > bv) return sort.dir;
            return 0;
        });
    }, [rows, search, deptFilter, levelFilter, sort]);

    const maxPeriods = useMemo(() => Math.max(...rows.map(r => r.total_periods), 1), [rows]);

    const activeTerm = terms.find(t => String(t.id) === termId);
    const hasFilter = !!(search || deptFilter || levelFilter !== 'all');

    function toggleSort(key: SortKey) {
        setSort(s => s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'name' ? 1 : -1 });
    }

    function SortIcon({ k }: { k: SortKey }) {
        if (sort.key !== k) return <ChevronUp className="w-3 h-3 opacity-20" />;
        return sort.dir === 1
            ? <ChevronUp className="w-3 h-3 text-blue-500" />
            : <ChevronDown className="w-3 h-3 text-blue-500" />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-blue-500 dark:text-blue-400" /> ภาระงานสอนครู
                    </h1>
                    {!loading && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {filtered.length} / {rows.length} คน
                        </p>
                    )}
                </div>
                {activeTerm && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
                        <span className="font-medium">ปีการศึกษา {activeTerm.year}/{activeTerm.term}</span>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> ≤15 คาบ (ปกติ)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> 16–22 คาบ (มาก)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> &gt;22 คาบ (เกิน)</span>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อครู / กลุ่มสาระฯ"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="form-input pl-9 pr-3 py-2 text-sm w-56"
                    />
                </div>
                <select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className="form-input py-2 text-sm"
                >
                    <option value="">กลุ่มสาระฯ ทั้งหมด</option>
                    {depts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {LEVEL_OPTS.map(o => (
                        <button
                            key={o.value}
                            onClick={() => setLevelFilter(o.value)}
                            className={`px-3 py-2 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-200 dark:border-gray-700 ${
                                levelFilter === o.value
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
                {hasFilter && (
                    <button
                        onClick={() => { setSearch(''); setDeptFilter(''); setLevelFilter('all'); }}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <X className="w-4 h-4" /> ล้างตัวกรอง
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="data-table-container">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="table-th">
                                <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
                                    ครู <SortIcon k="name" />
                                </button>
                            </th>
                            <th className="table-th">กลุ่มสาระฯ</th>
                            {DAYS.map(d => (
                                <th key={d.key} className="table-th text-center">
                                    <button onClick={() => toggleSort(d.key as SortKey)} className="flex items-center gap-0.5 mx-auto hover:text-blue-600 dark:hover:text-blue-400">
                                        {d.label} <SortIcon k={d.key as SortKey} />
                                    </button>
                                </th>
                            ))}
                            <th className="table-th text-center">
                                <button onClick={() => toggleSort('total_periods')} className="flex items-center gap-1 mx-auto hover:text-blue-600 dark:hover:text-blue-400">
                                    รวม/สัปดาห์ <SortIcon k="total_periods" />
                                </button>
                            </th>
                            <th className="table-th">ภาระ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-10 text-center">
                                    <div className="flex items-center justify-center gap-2 text-gray-400">
                                        <div className="loading-spinner" />
                                        <span className="text-sm">กำลังโหลด...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
                                    {hasFilter ? 'ไม่พบครูที่ตรงกับเงื่อนไข' : 'ยังไม่มีข้อมูลภาระงาน'}
                                </td>
                            </tr>
                        ) : filtered.map(row => (
                            <tr key={row.id} className="table-row">
                                <td className="table-td">
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                            style={{ backgroundColor: row.color }}
                                        >
                                            {getInitial(row.name)}
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{row.name}</span>
                                    </div>
                                </td>
                                <td className="table-td">
                                    {row.department_name
                                        ? <span className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs">{row.department_name}</span>
                                        : <span className="text-gray-300 dark:text-gray-600 text-sm">–</span>
                                    }
                                </td>
                                {DAYS.map(d => {
                                    const val = row[d.key as keyof WorkloadRow] as number;
                                    return (
                                        <td key={d.key} className="table-td text-center">
                                            <span className={val > 0 ? 'font-medium text-gray-800 dark:text-gray-200 text-sm' : 'text-gray-300 dark:text-gray-600 text-sm'}>
                                                {val > 0 ? val : '–'}
                                            </span>
                                        </td>
                                    );
                                })}
                                <td className={`table-td text-center font-bold text-lg ${workloadColor(row.total_periods)}`}>
                                    {row.total_periods}
                                </td>
                                <td className="table-td w-36">
                                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-2 rounded-full transition-all ${workloadBg(row.total_periods)}`}
                                            style={{ width: `${(row.total_periods / maxPeriods) * 100}%` }}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
