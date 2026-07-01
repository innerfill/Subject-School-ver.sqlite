'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SchedulePreview from '@/components/SchedulePreview';

function BatchPrintContent() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type') as 'student' | 'teacher';
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (type) {
            fetchData();
        }
    }, [type]);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/reports/batch-print?type=${type}`);
            const result = await res.json();
            if (result.error) {
                setError(result.error);
            } else {
                setData(result);
            }
        } catch (err) {
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!data) return;

        const root = document.documentElement;
        const isDark = root.classList.contains('dark');
        if (isDark) root.classList.remove('dark');

        const html2pdf = (await import('html2pdf.js')).default;

        const element = document.getElementById('batch-print-container');
        if (!element) return;

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `schedules-${type}-${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: 'avoid-all' }
        } as any;

        await html2pdf().set(opt).from(element).save();

        if (isDark) root.classList.add('dark');
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-gray-500">
                <div className="loading-spinner"></div>
                <span className="text-sm font-medium">กำลังเตรียมข้อมูล...</span>
            </div>
        </div>
    );
    if (error) return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
                <p className="text-red-500 font-medium mb-2">{error}</p>
                <button onClick={() => window.close()} className="text-sm text-gray-500 hover:text-gray-700 underline">ปิดหน้าต่างนี้</button>
            </div>
        </div>
    );
    if (!data || !data.reports) return null;

    return (
        <div className="min-h-screen p-8" style={{ backgroundColor: '#f3f4f6' }}>
            <div className="fixed top-20 right-4 z-50 no-print flex gap-2">
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

            <div id="batch-print-container" style={{ width: '277mm', backgroundColor: '#ffffff' }}>
                {data.reports.map((report: any, index: number) => (
                    <div key={index} className="print-page-break" style={{
                        height: '190mm',
                        width: '277mm',
                        position: 'relative',
                        pageBreakAfter: 'always',
                        pageBreakInside: 'avoid',
                        overflow: 'hidden'
                    }}>
                        <SchedulePreview
                            data={{
                                school: data.school,
                                signatories: data.signatories,
                                data: report,
                                timeSlots: data.timeSlots
                            }}
                            type={type}
                        />
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print { .no-print { display: none; } }
                .html2pdf__page-break { page-break-after: always; }
            ` }} />
        </div>
    );
}

export default function BatchPrintPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <BatchPrintContent />
        </Suspense>
    );
}
