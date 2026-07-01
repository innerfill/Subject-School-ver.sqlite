'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, XCircle, CheckCircle2, RefreshCw, ChevronDown } from 'lucide-react';

interface Violation {
    type: 'consecutive' | 'duplicate_subject' | 'overload_week' | 'overload_day';
    severity: 'warning' | 'error';
    message: string;
}

interface Term { id: number; year: number; term: number; status: string; }

const TYPES = [
    { key: 'overload_week',    label: 'โอเวอร์โหลดรายสัปดาห์',  severity: 'error'   },
    { key: 'overload_day',     label: 'โอเวอร์โหลดรายวัน',       severity: 'warning' },
    { key: 'consecutive',      label: 'สอนต่อเนื่องเกิน',         severity: 'warning' },
    { key: 'duplicate_subject',label: 'วิชาซ้ำในวันเดียว',        severity: 'warning' },
] as const;

const SEVERITY_STYLE = {
    error:   { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', border: 'border-red-200 dark:border-red-800', header: 'bg-red-50 dark:bg-red-900/10',   icon: <XCircle className="w-4 h-4 text-red-500" />,    pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',    label: 'ร้ายแรง'    },
    warning: { badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800', header: 'bg-yellow-50 dark:bg-yellow-900/10', icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />, pill: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'ควรระวัง' },
};

function ViolationGroup({ label, severity, items }: { label: string; severity: 'error' | 'warning'; items: string[] }) {
    const [open, setOpen] = useState(true);
    const s = SEVERITY_STYLE[severity];

    return (
        <div className={`rounded-xl border ${s.border} overflow-hidden`}>
            <button
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between px-4 py-3 ${s.header} text-left`}
            >
                <div className="flex items-center gap-2.5">
                    {s.icon}
                    <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.pill}`}>{items.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {open && (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                    {items.map((msg, i) => (
                        <li key={i} className="flex items-start gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            <span className="mt-0.5 shrink-0 w-5 text-center text-gray-300 dark:text-gray-600 text-xs font-mono">{i + 1}</span>
                            {msg}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function ValidatePage() {
    const [termId, setTermId] = useState<string>('');
    const [activeTerm, setActiveTerm] = useState<Term | null>(null);
    const [violations, setViolations] = useState<Violation[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);

    useEffect(() => {
        fetch('/api/academic-terms')
            .then(r => r.json())
            .then((rows: Term[]) => {
                const active = rows.find(t => t.status === 'Active');
                if (active) { setActiveTerm(active); setTermId(String(active.id)); }
            });
    }, []);

    const runValidate = useCallback(async () => {
        if (!termId) return;
        setLoading(true);
        setFetched(false);
        try {
            const res = await fetch(`/api/schedules/validate?term_id=${termId}`);
            const data = await res.json();
            setViolations(data.violations ?? []);
        } finally {
            setLoading(false);
            setFetched(true);
        }
    }, [termId]);

    useEffect(() => {
        if (termId) runValidate();
    }, [termId]);

    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warnCount  = violations.filter(v => v.severity === 'warning').length;

    return (
        <div className="max-w-2xl mx-auto space-y-5 font-sarabun">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ตรวจตารางชน</h1>
                    {activeTerm && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            ปีการศึกษา {activeTerm.year} เทอม {activeTerm.term}
                        </p>
                    )}
                </div>
                <button
                    onClick={runValidate}
                    disabled={!termId || loading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    ตรวจสอบใหม่
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="text-center py-20 text-gray-400">
                    <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3" />
                    <p>กำลังตรวจสอบ...</p>
                </div>
            )}

            {/* Results */}
            {fetched && !loading && (
                <>
                    {/* Summary bar */}
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        {violations.length === 0 ? (
                            <>
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                <span className="font-semibold text-green-700 dark:text-green-400">ไม่พบปัญหา — ตารางเรียนผ่านทุกเงื่อนไข</span>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                                <span className="font-semibold text-gray-800 dark:text-gray-100">
                                    พบ {violations.length} ปัญหา
                                </span>
                                <div className="flex gap-2 ml-auto">
                                    {errorCount > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                            <XCircle className="w-3 h-3" /> ร้ายแรง {errorCount}
                                        </span>
                                    )}
                                    {warnCount > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                                            <AlertTriangle className="w-3 h-3" /> ควรระวัง {warnCount}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Grouped sections */}
                    {TYPES.map(({ key, label, severity }) => {
                        const items = violations.filter(v => v.type === key).map(v => v.message);
                        if (items.length === 0) return null;
                        return <ViolationGroup key={key} label={label} severity={severity} items={items} />;
                    })}
                </>
            )}

            {!fetched && !loading && !termId && (
                <div className="text-center py-20 text-gray-400">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p>ยังไม่มีเทอม Active</p>
                </div>
            )}
        </div>
    );
}
