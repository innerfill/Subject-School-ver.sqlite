'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CourseStructurePreview from '@/components/CourseStructurePreview';

function PrintContent() {
    const searchParams = useSearchParams();
    const classId = searchParams.get('id');

    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (classId) {
            fetchData();
        }
    }, [classId]);

    const fetchData = async () => {
        try {
            // Wait, we need to fetch the course structure and also the school settings 
            // Our API doesn't return school settings right now. Let's fetch settings too.
            const [structureRes, settingsRes] = await Promise.all([
                fetch(`/api/reports/course-structure?classId=${classId}`),
                fetch('/api/reports/settings')
            ]);
            
            const structureData = await structureRes.json();
            const settingsData = await settingsRes.json();
            
            if (structureData.error) {
                setData(structureData);
            } else {
                // Merge school settings into data
                setData({
                    ...structureData,
                    school: settingsData.school || { school_name: 'โรงเรียนมุกดาวิทยานุกูล', affiliation: 'จังหวัดมุกดาหาร' }
                });
            }
        } catch (error) {
            console.error('Failed to fetch report data', error);
            setData({ error: 'Failed to load data' });
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
    
    if (!data || data.error || !classId) return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
                <p className="text-red-500 font-medium mb-2">ไม่พบข้อมูล หรือเกิดข้อผิดพลาด: {data?.error}</p>
                <button onClick={() => window.close()} className="text-sm text-gray-500 hover:text-gray-700 underline">ปิดหน้าต่างนี้</button>
            </div>
        </div>
    );

    const handleDownloadPDF = () => {
        const root = document.documentElement;
        const isDark = root.classList.contains('dark');
        if (isDark) root.classList.remove('dark');
        window.print();
        if (isDark) root.classList.add('dark');
    };

    return (
        <>
            <style>{`
                @page { size: A4 portrait; margin: 0; }
                @media print {
                    html, body { width: 210mm; height: 297mm; }
                    body { background: white !important; }
                    #print-toolbar { display: none !important; }
                }
            `}</style>
            <div className="min-h-screen bg-gray-200 py-8 print:py-0 print:bg-white flex flex-col items-center">
                <div id="print-toolbar" className="fixed top-20 right-4 z-50 print:hidden flex gap-2">
                    <button
                        onClick={handleDownloadPDF}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-lg hover:bg-blue-700 font-semibold flex items-center gap-2 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        บันทึก PDF
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="bg-gray-500 text-white px-4 py-2.5 rounded-lg shadow-lg hover:bg-gray-600 font-semibold transition-colors"
                    >
                        ปิด
                    </button>
                </div>

                <div className="bg-white shadow-xl print:shadow-none w-[210mm] print:w-full overflow-hidden">
                    <CourseStructurePreview data={data} />
                </div>
            </div>
        </>
    );
}

export default function CourseStructurePrintPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PrintContent />
        </Suspense>
    );
}
