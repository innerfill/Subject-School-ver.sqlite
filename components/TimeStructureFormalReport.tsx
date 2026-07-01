import React from 'react';

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

interface SchoolData {
    school_name: string;
    affiliation: string;
    logo_url?: string;
}

interface TimeStructureFormalReportProps {
    data: TimeStructureData;
    school: SchoolData;
}

export default function TimeStructureFormalReport({ data, school }: TimeStructureFormalReportProps) {
    const { grades, groups, data: gradeData, standards, totalStandards } = data;

    // Helper for calculating totals
    const calcTotals = (grade: string) => {
        const gd = gradeData[grade];
        let fundamentalHours = 0;
        let fundamentalWeekly = 0;
        for (const group of groups) {
            fundamentalHours += gd[group]?.hoursPerYear || 0;
            fundamentalWeekly += gd[group]?.hoursPerWeek || 0;
        }
        const additionalHours = gd['วิชาเพิ่มเติม']?.hoursPerYear || 0;
        const additionalWeekly = gd['วิชาเพิ่มเติม']?.hoursPerWeek || 0;
        const activityHours = gd['กิจกรรมพัฒนาผู้เรียน']?.hoursPerYear || 0;
        const activityWeekly = gd['กิจกรรมพัฒนาผู้เรียน']?.hoursPerWeek || 0;
        const totalHours = fundamentalHours + additionalHours + activityHours;
        const totalWeekly = fundamentalWeekly + additionalWeekly + activityWeekly;
        return { fundamentalHours, fundamentalWeekly, additionalHours, additionalWeekly, activityHours, activityWeekly, totalHours, totalWeekly };
    };

    return (
        <div className="font-sarabun bg-white text-black" style={{ fontFamily: 'var(--font-sarabun), sans-serif' }}>
            <div className="p-8 mx-auto" style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '297mm' }}>
                
                {/* Header */}
                <div className="text-center mb-6 relative">
                    {school.logo_url && (
                        <div className="absolute left-0 top-0 w-16 h-16">
                            <img src={school.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    )}
                    <h1 className="text-xl font-bold mb-1">
                        รายงานสรุปและตรวจสอบจำนวนเวลาเรียนตามเกณฑ์หลักสูตร
                    </h1>
                    <h2 className="text-lg font-bold mb-1">
                        {school.school_name}
                    </h2>
                    <h3 className="text-base mb-1">
                        {school.affiliation}
                    </h3>
                </div>

                {/* Table */}
                <div className="w-full">
                    <table className="w-full border-collapse border border-black text-sm">
                        <thead>
                            <tr>
                                <th rowSpan={2} className="border border-black px-2 py-2 text-center align-middle w-[20%]">
                                    กลุ่มสาระการเรียนรู้ / กิจกรรม
                                </th>
                                <th colSpan={6} className="border border-black px-2 py-2 text-center">ระดับประถมศึกษา</th>
                                <th colSpan={3} className="border border-black px-2 py-2 text-center">ระดับมัธยมศึกษาตอนต้น</th>
                            </tr>
                            <tr>
                                {grades.map((grade) => (
                                    <th key={grade} className="border border-black px-1 py-1.5 text-center font-medium w-[8%]">
                                        {grade}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Fundamental Section */}
                            <tr className="bg-gray-50">
                                <td colSpan={10} className="border border-black px-3 py-1.5 font-bold text-left">
                                    กลุ่มสาระการเรียนรู้ (วิชาพื้นฐาน)
                                </td>
                            </tr>
                            {groups.map((group) => {
                                const std = standards[group];
                                return (
                                    <tr key={group}>
                                        <td className="border border-black px-3 py-2 text-left">{group}</td>
                                        {grades.map((grade) => {
                                            const cell = gradeData[grade]?.[group];
                                            const actual = cell?.hoursPerYear || 0;
                                            const standard = std?.[grade] || 0;
                                            return (
                                                <td key={grade} className="border border-black px-1 py-1.5 text-center align-middle">
                                                    {actual > 0 ? (
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="font-bold">{actual}</div>
                                                            <div className="text-[10px] mt-0.5">({cell?.hoursPerWeek || 0} คาบ/สป.)</div>
                                                            <div className="text-[10px] text-gray-700 mt-0.5">เกณฑ์: {standard}</div>
                                                        </div>
                                                    ) : (
                                                        <span>-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                            
                            {/* Fundamental Total */}
                            <tr className="bg-gray-50">
                                <td className="border border-black px-3 py-2 font-bold text-left">
                                    รวมเวลาเรียน (พื้นฐาน)
                                </td>
                                {grades.map((grade) => {
                                    const totals = calcTotals(grade);
                                    const std = totalStandards[grade];
                                    return (
                                        <td key={grade} className="border border-black px-1 py-1.5 text-center font-bold">
                                            <div className="flex flex-col items-center justify-center">
                                                <div>{totals.fundamentalHours}</div>
                                                <div className="text-[10px] mt-0.5 font-normal">({totals.fundamentalWeekly} คาบ/สป.)</div>
                                                <div className="text-[10px] text-gray-700 mt-0.5 font-normal">เกณฑ์: {std.fundamental}</div>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* Activity Section */}
                            <tr className="bg-gray-50">
                                <td colSpan={10} className="border border-black px-3 py-1.5 font-bold text-left">
                                    กิจกรรมพัฒนาผู้เรียน
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black px-3 py-2 text-left">
                                    กิจกรรมพัฒนาผู้เรียน
                                </td>
                                {grades.map((grade) => {
                                    const cell = gradeData[grade]?.['กิจกรรมพัฒนาผู้เรียน'];
                                    const actual = cell?.hoursPerYear || 0;
                                    const standard = totalStandards[grade].activity;
                                    return (
                                        <td key={grade} className="border border-black px-1 py-1.5 text-center align-middle">
                                            {actual > 0 ? (
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="font-bold">{actual}</div>
                                                    <div className="text-[10px] mt-0.5">({cell?.hoursPerWeek || 0} คาบ/สป.)</div>
                                                    <div className="text-[10px] text-gray-700 mt-0.5">เกณฑ์: {standard}</div>
                                                </div>
                                            ) : (
                                                <span>-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* Additional Section */}
                            <tr className="bg-gray-50">
                                <td colSpan={10} className="border border-black px-3 py-1.5 font-bold text-left">
                                    รายวิชาเพิ่มเติม / ซ่อมเสริม
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black px-3 py-2 text-left">
                                    วิชาเพิ่มเติม / ซ่อมเสริม
                                </td>
                                {grades.map((grade) => {
                                    const cell = gradeData[grade]?.['วิชาเพิ่มเติม'];
                                    const actual = cell?.hoursPerYear || 0;
                                    const standard = totalStandards[grade].additional_min;
                                    return (
                                        <td key={grade} className="border border-black px-1 py-1.5 text-center align-middle">
                                            {actual > 0 ? (
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="font-bold">{actual}</div>
                                                    <div className="text-[10px] mt-0.5">({cell?.hoursPerWeek || 0} คาบ/สป.)</div>
                                                    <div className="text-[10px] text-gray-700 mt-0.5">เกณฑ์: &ge;{standard}</div>
                                                </div>
                                            ) : (
                                                <span>-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* Grand Total */}
                            <tr className="bg-gray-100">
                                <td className="border border-black px-3 py-3 font-bold text-left text-[15px]">
                                    รวมเวลาเรียนทั้งหมด
                                </td>
                                {grades.map((grade) => {
                                    const totals = calcTotals(grade);
                                    const std = totalStandards[grade];
                                    return (
                                        <td key={grade} className="border border-black px-1 py-2 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="font-bold text-[15px]">{totals.totalHours}</div>
                                                <div className="text-[10px] mt-0.5">({totals.totalWeekly} คาบ/สป.)</div>
                                                <div className="text-[10px] mt-1 pt-1 border-t border-gray-300">
                                                    เกณฑ์: &ge;{std.total_min.toLocaleString()}
                                                </div>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer Notes */}
                <div className="mt-4 text-xs text-gray-700">
                    <p>* เกณฑ์อ้างอิงตาม สพฐ. คำสั่ง ที่ ศธ 0210/2562</p>
                    <p>* ระดับประถมศึกษารวมเวลาเรียนไม่น้อยกว่า 1,000 ชั่วโมง/ปี</p>
                    <p>* ระดับมัธยมศึกษาตอนต้นรวมเวลาเรียนไม่น้อยกว่า 1,200 ชั่วโมง/ปี</p>
                </div>

                {/* Signatures */}
                <div className="mt-16 flex justify-between px-8 text-sm">
                    <div className="text-center">
                        <div className="mb-2">ลงชื่อ ..............................................................</div>
                        <div>( .............................................................. )</div>
                        <div className="mt-1">ผู้ตรวจ/หัวหน้าฝ่ายวิชาการ</div>
                    </div>
                    <div className="text-center">
                        <div className="mb-2">ลงชื่อ ..............................................................</div>
                        <div>( .............................................................. )</div>
                        <div className="mt-1">ผู้อำนวยการโรงเรียน</div>
                    </div>
                </div>

            </div>

            <style jsx global>{`
                @media print {
                    @page { size: A4 landscape; margin: 10mm 10mm; }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        background: white !important;
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
                    div[style*="max-width: 297mm"] {
                        width: 100% !important;
                        max-width: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
