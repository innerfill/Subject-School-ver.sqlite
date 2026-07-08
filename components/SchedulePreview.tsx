import React from 'react';

export const TABLE_THEMES: Record<string, { label: string; header: string; day: string }> = {
    blue:   { label: 'ฟ้า',    header: '#bae6fd', day: '#e0f2fe' },
    green:  { label: 'เขียว',  header: '#bbf7d0', day: '#dcfce7' },
    purple: { label: 'ม่วง',   header: '#e9d5ff', day: '#f3e8ff' },
    amber:  { label: 'เหลือง', header: '#fde68a', day: '#fef3c7' },
    rose:   { label: 'ชมพู',   header: '#fecdd3', day: '#fff1f2' },
    white:  { label: 'ขาวล้วน', header: '#ffffff', day: '#ffffff' },
};

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
    school: { school_name: string; affiliation: string; logo_url?: string; table_theme?: string };
    signatories: { id: number; role_key: string; position_name: string; person_name: string; rank_title?: string; person_prefix?: string }[];
    data: {
        header: {
            title: string;
            subtitle: string;
            term_info: string;
            info_right?: string;
            advisor_name?: string;
            advisor_prefix?: string;
            advisor_rank?: string;
            advisor2_name?: string;
            advisor2_prefix?: string;
            advisor2_rank?: string;
            teacher_name?: string;
            teacher_prefix?: string;
            teacher_rank?: string;
        };
        schedule: ScheduleItem[];
        summary: SubjectSummary[];
    };
    timeSlots?: TimeSlot[];
    error?: string;
}

interface SchedulePreviewProps {
    data: ReportData;
    type: 'student' | 'teacher';
}

export default function SchedulePreview({ data, type }: SchedulePreviewProps) {
    const { school, signatories, data: report } = data;
    const { header, schedule, summary } = report;
    
    // Theme logic
    const tableTheme = data.school?.table_theme || 'blue';
    let theme = TABLE_THEMES[tableTheme];
    
    // Parse custom theme e.g. custom_e5e7eb_f3f4f6
    if (tableTheme.startsWith('custom_')) {
        const parts = tableTheme.split('_');
        if (parts.length === 3) {
            theme = { label: 'กำหนดเอง', header: `#${parts[1]}`, day: `#${parts[2]}` };
        }
    }
    if (!theme) theme = TABLE_THEMES['blue'];

    // Helper to normalize time string (HH:mm)
    const normalizeTime = (time: string) => time ? time.slice(0, 5) : '';

    const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
    const dayMapping: { [key: string]: string } = {
        'Monday': 'จันทร์',
        'Tuesday': 'อังคาร',
        'Wednesday': 'พุธ',
        'Thursday': 'พฤหัสบดี',
        'Friday': 'ศุกร์'
    };

    // Compute period numbers counting only Study/Learning slots (breaks don't get a period number)
    const periodNumbers: Record<number, number> = {};
    let periodCount = 0;
    data.timeSlots?.forEach(slot => {
        if (slot.type === 'Study') {
            periodCount++;
            periodNumbers[slot.id] = periodCount;
        }
    });

    return (
        <div className="font-sarabun" style={{ backgroundColor: '#ffffff', color: '#000000', fontFamily: 'var(--font-sarabun), sans-serif' }}>
            {/* A4 Landscape Container */}
            <div className="p-4 landscape-page" style={{ backgroundColor: '#ffffff', width: '100%' }}>

                {/* Header */}
                <div className="text-center mb-2 relative">
                    {school.logo_url && (
                        <div className="absolute left-4 top-0 w-16 h-16">
                            <img src={school.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    )}
                    <h1 className="text-xl font-bold">ตาราง{type === 'student' ? 'เรียน' : 'สอน'}{header.term_info}</h1>
                    <h2 className="text-lg font-bold">{school.school_name}</h2>
                    <h2 className="text-lg font-bold">{school.affiliation}</h2>
                    <div className="flex justify-between mt-2 px-4 font-semibold text-base">
                        <div>{header.title}</div>
                        <div>{header.subtitle}</div>
                        {header.info_right && <div>{header.info_right}</div>}
                    </div>
                </div>

                {/* Schedule Grid (Table) */}
                <div style={{ border: '1px solid #000000' }}>
                    <table className="w-full table-fixed" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr className="text-center font-bold text-sm" style={{ backgroundColor: theme.header }}>
                                <th className="w-24 py-2" style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}>วัน/เวลา</th>
                                {data.timeSlots?.map((slot) => {
                                    const isStudy = slot.type === 'Study';
                                    return (
                                        <th key={slot.id} className="py-2" style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', backgroundColor: isStudy ? 'transparent' : '#f3f4f6' }}>
                                            {isStudy
                                                ? <div>{periodNumbers[slot.id]}</div>
                                                : <div className="text-xs">{slot.name || (slot.type === 'Break' ? 'พัก' : slot.type === 'Assembly' ? 'เข้าแถว' : 'โฮมรูม')}</div>
                                            }
                                            <div className="text-xs font-normal mt-1">
                                                {normalizeTime(slot.start_time)}-{normalizeTime(slot.end_time)}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map((day, dayIndex) => (
                                <tr key={day} className="h-20 text-center text-sm">
                                    <td className="font-bold" style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', backgroundColor: theme.day }}>
                                        {day}
                                    </td>
                                    {data.timeSlots?.map((slot) => {
                                        // Find schedule for this day and start_time
                                        const scheduleItem = schedule.find(s => {
                                            const sDay = (s.day_of_week || '').trim().toLowerCase();
                                            const tDay = day.trim().toLowerCase();
                                            const engDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                                            const engDay = engDays[dayIndex];

                                            // Check day match
                                            const dayMatches = sDay === tDay ||
                                                sDay === engDay ||
                                                (dayMapping[s.day_of_week] === day);

                                            // Check time match
                                            const sStart = normalizeTime(s.start_time);
                                            const slotStart = normalizeTime(slot.start_time);
                                            const timeMatches = sStart === slotStart;

                                            return dayMatches && timeMatches;
                                        });

                                        // Handle Break Slots
                                        if (slot.type === 'Break') {
                                            return (
                                                <td key={slot.id} className="align-middle" style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', backgroundColor: '#f3f4f6' }}>
                                                    <div className="flex items-center justify-center h-full">
                                                        <span className="text-xs rotate-90 whitespace-nowrap" style={{ color: '#6b7280' }}>{slot.name || 'พัก'}</span>
                                                    </div>
                                                </td>
                                            );
                                        }

                                        return (
                                            <td key={slot.id} className="p-1 align-middle relative"
                                                style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', backgroundColor: scheduleItem?.color_code || 'transparent' }}>
                                                {scheduleItem ? (
                                                    <div className="flex flex-col justify-center items-center h-full">
                                                        <div className="font-bold">{scheduleItem.subject_name}</div>
                                                        <div className="text-xs mt-1">
                                                            {type === 'student' ? (scheduleItem.teacher_name ? `ครู${scheduleItem.teacher_name}` : '') : scheduleItem.class_name}
                                                        </div>
                                                        {scheduleItem.room_name && <div className="text-[10px]" style={{ color: '#4b5563' }}>({scheduleItem.room_name})</div>}
                                                    </div>
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer: Summary & Signatures */}
                <div className="mt-4 flex gap-4">
                    {/* Signatures */}
                    {(() => {
                        const VALID_RANK_TITLES = [
                            'ว่าที่ร้อยตรี', 'ว่าที่ร้อยตรีหญิง', 'ว่าที่ร้อยโท', 'ว่าที่ร้อยเอก',
                            'ร้อยตรี', 'ร้อยโท', 'ร้อยเอก',
                            'พันตรี', 'พันโท', 'พันเอก',
                            'พลตรี', 'พลโท', 'พลเอก',
                            'ร้อยตำรวจตรี', 'ร้อยตำรวจโท', 'ร้อยตำรวจเอก',
                            'พันตำรวจตรี', 'พันตำรวจโท', 'พันตำรวจเอก',
                            'พลตำรวจตรี', 'พลตำรวจโท', 'พลตำรวจเอก'
                        ];
                        const validRank = (rank?: string | null) => VALID_RANK_TITLES.includes(rank || '') ? rank : '';
                        
                        const isTwoAdvisors = type === 'student' && !!header.advisor2_name;
                        const textSmClass = isTwoAdvisors ? 'text-[11px]' : 'text-sm';
                        const textBaseClass = isTwoAdvisors ? 'text-[13px]' : 'text-base';
                        const dotsWithRank = isTwoAdvisors ? '...................................' : '..................................................';
                        const dotsWithoutRank = isTwoAdvisors ? '...................................................' : '......................................................................';
                        
                        return (
                            <div className={`flex-1 flex justify-between items-end pb-0 ${type === 'teacher' ? 'w-full' : ''}`}>
                                {[...signatories].sort((a, b) => {
                                        const order: Record<string, number> = { ISSUER: 0, ACADEMIC: 1, DIRECTOR: 2 };
                                        return (order[a.role_key] ?? 9) - (order[b.role_key] ?? 9);
                                    }).map((sig, index) => {
                                    // Custom Logic for Student Schedule: Replace first signature (usually Teacher) with Class Advisor
                            if (type === 'student' && (sig.role_key === 'ISSUER' || sig.position_name.includes('ครูผู้สอน'))) {
                                return (
                                    <React.Fragment key={sig.id}>
                                        <div className="flex-1 px-2 flex justify-center">
                                            <div className="grid grid-cols-[auto_auto] items-end justify-center">
                                                    <div className={`mb-2 ${textSmClass} whitespace-nowrap pr-1 text-right`}>
                                                        ลงชื่อ {validRank(header.advisor_rank) ? `${validRank(header.advisor_rank)}` : ''}
                                                    </div>
                                                    <div className={`mb-2 ${textSmClass} whitespace-nowrap text-left`}>
                                                        {validRank(header.advisor_rank) ? dotsWithRank : dotsWithoutRank}
                                                    </div>
                                                    <div className={`col-start-2 text-center font-bold mb-1 ${textBaseClass} whitespace-nowrap`}>
                                                        ({header.advisor_name ? `${header.advisor_prefix || (validRank(header.advisor_rank) ? '' : 'ครู')}${header.advisor_name}` : '..........................................................'})
                                                    </div>
                                                    <div className={`col-start-2 text-center ${textSmClass} whitespace-nowrap`}>
                                                        ครูประจำชั้น
                                                    </div>
                                            </div>
                                        </div>
                                        {header.advisor2_name && (
                                            <div className="flex-1 px-2 flex justify-center">
                                                <div className="grid grid-cols-[auto_auto] items-end justify-center">
                                                        <div className={`mb-2 ${textSmClass} whitespace-nowrap pr-1 text-right`}>
                                                            ลงชื่อ {validRank(header.advisor2_rank) ? `${validRank(header.advisor2_rank)}` : ''}
                                                        </div>
                                                        <div className={`mb-2 ${textSmClass} whitespace-nowrap text-left`}>
                                                            {validRank(header.advisor2_rank) ? dotsWithRank : dotsWithoutRank}
                                                        </div>
                                                        <div className={`col-start-2 text-center font-bold mb-1 ${textBaseClass} whitespace-nowrap`}>
                                                            ({`${header.advisor2_prefix || (validRank(header.advisor2_rank) ? '' : 'ครู')}${header.advisor2_name}`})
                                                        </div>
                                                        <div className={`col-start-2 text-center ${textSmClass} whitespace-nowrap`}>
                                                            ครูประจำชั้น
                                                        </div>
                                                </div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            }

                            // Custom Logic for Teacher Schedule: Auto-fill Teacher Name
                            if (type === 'teacher' && (sig.role_key === 'ISSUER' || sig.position_name.includes('ครูผู้สอน'))) {
                                return (
                                    <div key={sig.id} className="flex-1 px-2 flex justify-center">
                                        <div className="grid grid-cols-[auto_auto] items-end justify-center">
                                                <div className={`mb-2 ${textSmClass} whitespace-nowrap pr-1 text-right`}>
                                                    ลงชื่อ {validRank(header.teacher_rank) ? `${validRank(header.teacher_rank)}` : ''}
                                                </div>
                                                <div className={`mb-2 ${textSmClass} whitespace-nowrap text-left`}>
                                                    {validRank(header.teacher_rank) ? dotsWithRank : dotsWithoutRank}
                                                </div>
                                                <div className={`col-start-2 text-center font-bold mb-1 ${textBaseClass} whitespace-nowrap`}>
                                                    ({header.teacher_name ? `${header.teacher_prefix || (validRank(header.teacher_rank) ? '' : 'ครู')}${header.teacher_name}` : '..........................................................'})
                                                </div>
                                                <div className={`col-start-2 text-center ${textSmClass} whitespace-nowrap`}>
                                                    ครูผู้สอน
                                                </div>
                                        </div>
                                    </div>
                                );
                            }

                            // Default Signature Rendering
                            return (
                                <div key={sig.id} className="flex-1 px-2 flex justify-center">
                                    <div className="grid grid-cols-[auto_auto] items-end justify-center">
                                        <div className={`mb-2 ${textSmClass} whitespace-nowrap pr-1 text-right`}>
                                            ลงชื่อ {validRank(sig.rank_title) ? `${validRank(sig.rank_title)}` : ''}
                                        </div>
                                        <div className={`mb-2 ${textSmClass} whitespace-nowrap text-left`}>
                                            {validRank(sig.rank_title) ? dotsWithRank : dotsWithoutRank}
                                        </div>
                                        <div className={`col-start-2 text-center font-bold mb-1 ${textBaseClass} whitespace-nowrap`}>
                                            ({sig.person_name ? `${sig.person_prefix || ''}${sig.person_name}` : '..........................................................'})
                                        </div>
                                        <div className={`col-start-2 text-center ${textSmClass} whitespace-nowrap`}>
                                            {sig.position_name}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    );
                })()}
                </div>

            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: landscape; margin: 0; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    table, th, td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print\\:hidden { display: none; }
                    .print\\:shadow-none { box-shadow: none; }
                    .print\\:w-full { width: 100%; max-width: none; }
                    .print\\:p-0 { padding: 0; }
                }
            ` }} />
        </div>
    );
}
