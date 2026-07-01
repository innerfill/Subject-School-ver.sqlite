import React from 'react';

interface SubjectInfo {
    subject_id: number;
    subject_code: string;
    subject_name: string;
    credits: number;
    hours_per_week: number;
    type: 'Fundamental' | 'Additional' | 'Activity';
    teacher_names: string | null;
}

interface CourseStructureData {
    school: { school_name: string; affiliation: string; logo_url?: string };
    header: {
        class_name: string;
        grade_name: string;
        term_info: string;
        advisor1_name: string;
        advisor1_prefix?: string;
        advisor1_rank?: string;
        advisor2_name: string;
        advisor2_prefix?: string;
        advisor2_rank?: string;
    };
    subjects: SubjectInfo[];
}

interface CourseStructurePreviewProps {
    data: CourseStructureData;
}

export default function CourseStructurePreview({ data }: CourseStructurePreviewProps) {
    const { school, header, subjects } = data;

    const fundamental = subjects.filter(s => s.type === 'Fundamental');
    const additional = subjects.filter(s => s.type === 'Additional');
    const activity = subjects.filter(s => s.type === 'Activity');

    const typeLabels = {
        'Fundamental': 'รายวิชาพื้นฐาน',
        'Additional': 'รายวิชาเพิ่มเติม',
        'Activity': 'กิจกรรมพัฒนาผู้เรียน'
    };

    const renderGroup = (group: SubjectInfo[], typeKey: 'Fundamental' | 'Additional' | 'Activity') => {
        if (group.length === 0) return null;
        
        return group.map((subject, index) => {
            const credits = parseFloat(subject.credits as any || 0);
            const hours = parseInt(subject.hours_per_week as any || 0);

            return (
                <tr key={subject.subject_id} className="text-sm">
                    {index === 0 && (
                        <td rowSpan={group.length} className="border border-black text-center align-middle font-medium py-2 px-1 whitespace-nowrap">
                            {typeLabels[typeKey]}
                        </td>
                    )}
                    <td className="border border-black px-2 py-1.5 text-center">{subject.subject_code}</td>
                    <td className="border border-black px-2 py-1.5">{subject.subject_name}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{credits > 0 ? credits.toFixed(1) : '-'}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{hours > 0 ? hours : '-'}</td>
                    <td className="border border-black px-2 py-1.5 text-sm">{subject.teacher_names || ''}</td>
                </tr>
            );
        });
    };

    const totalCredits = subjects.reduce((sum, s) => sum + parseFloat(s.credits as any || 0), 0);
    const totalHours = subjects.reduce((sum, s) => sum + parseInt(s.hours_per_week as any || 0), 0);

    // Advisors text
    const formatAdvisor = (name: string, prefix?: string, rank?: string) => {
        if (!name) return '';
        const rankStr = rank ? `${rank} ` : '';
        const prefixStr = prefix ? prefix : (!rank ? 'ครู' : '');
        return `${rankStr}${prefixStr}${name}`.trim();
    };

    let advisorsText = '';
    if (header.advisor1_name && header.advisor2_name) {
        advisorsText = `1. ${formatAdvisor(header.advisor1_name, header.advisor1_prefix, header.advisor1_rank)}  2. ${formatAdvisor(header.advisor2_name, header.advisor2_prefix, header.advisor2_rank)}`;
    } else if (header.advisor1_name) {
        advisorsText = `1. ${formatAdvisor(header.advisor1_name, header.advisor1_prefix, header.advisor1_rank)}`;
    } else if (header.advisor2_name) {
        advisorsText = `1. ${formatAdvisor(header.advisor2_name, header.advisor2_prefix, header.advisor2_rank)}`;
    }

    const formatClassName = (name: string) => {
        if (name.startsWith('ป.')) return name.replace('ป.', 'ประถมศึกษาปีที่ ');
        if (name.startsWith('ม.')) return name.replace('ม.', 'มัธยมศึกษาปีที่ ');
        if (name.startsWith('อ.')) return name.replace('อ.', 'อนุบาลปีที่ ');
        return name;
    };

    return (
        <div className="font-sarabun bg-white text-black" style={{ fontFamily: 'var(--font-sarabun), sans-serif' }}>
            {/* A4 Landscape Container */}
            <div className="p-8 mx-auto" style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '297mm' }}>
                
                {/* Header */}
                <div className="text-center mb-6 relative">
                    {school.logo_url && (
                        <div className="absolute left-0 top-0 w-16 h-16">
                            <img src={school.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    )}
                    <h1 className="text-xl font-bold mb-1">
                        โครงสร้างรายวิชาเรียน {school.school_name}
                    </h1>
                    <h1 className="text-xl font-bold mb-1">
                        {school.affiliation}
                    </h1>
                    <h2 className="text-lg mb-1 mt-2">
                        ชั้น{formatClassName(header.class_name)} {header.term_info}
                    </h2>
                    {advisorsText && (
                        <h3 className="text-base">
                            ครูที่ปรึกษา {advisorsText}
                        </h3>
                    )}
                </div>

                {/* Table */}
                <div className="w-full">
                    <table className="w-full border-collapse border border-black">
                        <thead>
                            <tr>
                                <th colSpan={6} className="border border-black py-2 font-medium bg-gray-50 text-center">
                                    รายการลงทะเบียน
                                </th>
                            </tr>
                            <tr className="bg-gray-50 text-center font-medium text-sm">
                                <th className="border border-black py-2 px-2 w-[15%]">ประเภทวิชา</th>
                                <th className="border border-black py-2 px-2 w-[12%]">รหัสวิชา</th>
                                <th className="border border-black py-2 px-2 w-[25%]">ชื่อรายวิชา</th>
                                <th className="border border-black py-2 px-2 w-[8%]">หน่วยกิต</th>
                                <th className="border border-black py-2 px-2 w-[10%]">จำนวนชั่วโมง</th>
                                <th className="border border-black py-2 px-2 w-[30%]">ครูผู้สอน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderGroup(fundamental, 'Fundamental')}
                            {renderGroup(additional, 'Additional')}
                            {renderGroup(activity, 'Activity')}
                            
                            {/* Summary Row */}
                            <tr className="font-medium text-sm bg-gray-50">
                                <td colSpan={3} className="border border-black py-2 px-4 text-center">รวม</td>
                                <td className="border border-black py-2 px-2 text-center">{totalCredits.toFixed(1)}</td>
                                <td className="border border-black py-2 px-2 text-center">{totalHours}</td>
                                <td className="border border-black py-2 px-2"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>

            <style jsx global>{`
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    table, th, td {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    thead {
                        display: table-header-group;
                    }
                    tfoot {
                        display: table-footer-group;
                    }
                    .print\\:hidden { display: none !important; }
                    .print\\:shadow-none { box-shadow: none; }
                    div[style*="max-width: 297mm"] {
                        width: 100% !important;
                        max-width: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
