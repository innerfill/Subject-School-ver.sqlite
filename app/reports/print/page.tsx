'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SchedulePreview from '@/components/SchedulePreview';

function PrintContent() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type') as 'student' | 'teacher' | null;
    const id = searchParams.get('id');

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
    interface TimeSlot {
        id: number;
        start_time: string;
        end_time: string;
        type: string;
        order_index: number;
        name?: string;
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
            header: { title: string; subtitle: string; term_info: string; info_right?: string; advisor_name?: string; teacher_name?: string; };
            schedule: ScheduleItem[];
            summary: SubjectSummary[];
        };
        timeSlots?: TimeSlot[];
        error?: string;
    }
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (type && id) {
            fetchData();
        }
    }, [type, id]);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/reports/print?type=${type}&id=${id}`);
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error('Failed to fetch report data', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-gray-500">
                <div className="loading-spinner"></div>
                <span className="text-sm font-medium">กำลังเตรียมเอกสาร...</span>
            </div>
        </div>
    );
    if (!data || data.error || !type) return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
                <p className="text-red-500 font-medium mb-2">ไม่พบข้อมูล</p>
                <button onClick={() => window.close()} className="text-sm text-gray-500 hover:text-gray-700 underline">ปิดหน้าต่างนี้</button>
            </div>
        </div>
    );

    const handleDownloadPDF = async () => {
        if (!data) return;

        const root = document.documentElement;
        const isDark = root.classList.contains('dark');
        if (isDark) root.classList.remove('dark');

        const html2pdf = (await import('html2pdf.js')).default;

        const element = document.getElementById('single-print-container');
        if (!element) return;

        const opt = {
            margin: [10, 5, 10, 5],
            filename: `schedule-${type}-${id}-${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: 'avoid-all' }
        } as any;

        await html2pdf().set(opt).from(element).save();

        if (isDark) root.classList.add('dark');
    };

    return (
        <div className="min-h-screen bg-gray-200 py-8 print:py-0 print:bg-white flex flex-col items-center">
            <div className="fixed top-20 right-4 z-50 print:hidden flex gap-2">
                <button
                    onClick={handleDownloadPDF}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-lg hover:bg-blue-700 font-semibold flex items-center gap-2 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    ดาวน์โหลด PDF
                </button>
                <button
                    onClick={() => window.close()}
                    className="bg-gray-500 text-white px-4 py-2.5 rounded-lg shadow-lg hover:bg-gray-600 font-semibold transition-colors"
                >
                    ปิด
                </button>
            </div>

            <div id="single-print-container" className="bg-white shadow-xl print:shadow-none w-[287mm] print:w-full">
                <SchedulePreview data={data} type={type} />
            </div>
        </div>
    );
}

export default function PrintPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PrintContent />
        </Suspense>
    );
}
