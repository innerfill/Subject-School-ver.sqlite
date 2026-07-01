import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Subject name to learning area group mapping
function mapSubjectToGroup(name: string): string {
    const n = name.trim();
    if (n.includes('ภาษาไทย')) return 'ภาษาไทย';
    if (n.includes('คณิตศาสตร์')) return 'คณิตศาสตร์';
    if (n.includes('วิทยาศาสตร์') || n.includes('วิทยาการคำนวณ') || n.includes('ซ่อมเสริมวิทยาศาสตร์')) return 'วิทยาศาสตร์และเทคโนโลยี';
    if (n.includes('สังคมศึกษา') || n.includes('ประวัติศาสตร์')) return 'สังคมศึกษา ศาสนาและวัฒนธรรม';
    if (n.includes('สุขศึกษา') || n.includes('พลศึกษา')) return 'สุขศึกษาและพลศึกษา';
    if (n.includes('ศิลป') || n.includes('ทัศนศิลป์') || n.includes('ดนตรี') || n.includes('นาฏศิลป์')) return 'ศิลปะ';
    if (n.includes('การงานอาชีพ')) return 'การงานอาชีพ';
    if (n.includes('ภาษาอังกฤษ') || n.includes('ภาษาต่างประเทศ')) return 'ภาษาต่างประเทศ';
    if (n.includes('คอมพิวเตอร์') || n.includes('ซ่อมเสริมคอม')) return 'วิทยาศาสตร์และเทคโนโลยี';
    if (n.includes('การปลูกผัก')) return 'การงานอาชีพ';
    return 'อื่นๆ';
}

// National curriculum standard hours per year
const STANDARDS: Record<string, Record<string, number>> = {
    'ภาษาไทย': { 'ป.1': 200, 'ป.2': 200, 'ป.3': 200, 'ป.4': 160, 'ป.5': 160, 'ป.6': 160, 'ม.1': 120, 'ม.2': 120, 'ม.3': 120 },
    'คณิตศาสตร์': { 'ป.1': 200, 'ป.2': 200, 'ป.3': 200, 'ป.4': 160, 'ป.5': 160, 'ป.6': 160, 'ม.1': 120, 'ม.2': 120, 'ม.3': 120 },
    'วิทยาศาสตร์และเทคโนโลยี': { 'ป.1': 80, 'ป.2': 80, 'ป.3': 80, 'ป.4': 80, 'ป.5': 80, 'ป.6': 80, 'ม.1': 120, 'ม.2': 120, 'ม.3': 120 },
    'สังคมศึกษา ศาสนาและวัฒนธรรม': { 'ป.1': 120, 'ป.2': 120, 'ป.3': 120, 'ป.4': 120, 'ป.5': 120, 'ป.6': 120, 'ม.1': 160, 'ม.2': 160, 'ม.3': 160 },
    'สุขศึกษาและพลศึกษา': { 'ป.1': 80, 'ป.2': 80, 'ป.3': 80, 'ป.4': 80, 'ป.5': 80, 'ป.6': 80, 'ม.1': 80, 'ม.2': 80, 'ม.3': 80 },
    'ศิลปะ': { 'ป.1': 80, 'ป.2': 80, 'ป.3': 80, 'ป.4': 80, 'ป.5': 80, 'ป.6': 80, 'ม.1': 80, 'ม.2': 80, 'ม.3': 80 },
    'การงานอาชีพ': { 'ป.1': 40, 'ป.2': 40, 'ป.3': 40, 'ป.4': 80, 'ป.5': 80, 'ป.6': 80, 'ม.1': 80, 'ม.2': 80, 'ม.3': 80 },
    'ภาษาต่างประเทศ': { 'ป.1': 40, 'ป.2': 40, 'ป.3': 40, 'ป.4': 80, 'ป.5': 80, 'ป.6': 80, 'ม.1': 120, 'ม.2': 120, 'ม.3': 120 },
};

// Total standards
const TOTAL_STANDARDS: Record<string, { fundamental: number; activity: number; additional_min: number; total_min: number }> = {
    'ป.1': { fundamental: 840, activity: 120, additional_min: 40, total_min: 1000 },
    'ป.2': { fundamental: 840, activity: 120, additional_min: 40, total_min: 1000 },
    'ป.3': { fundamental: 840, activity: 120, additional_min: 40, total_min: 1000 },
    'ป.4': { fundamental: 840, activity: 120, additional_min: 40, total_min: 1000 },
    'ป.5': { fundamental: 840, activity: 120, additional_min: 40, total_min: 1000 },
    'ป.6': { fundamental: 840, activity: 120, additional_min: 40, total_min: 1000 },
    'ม.1': { fundamental: 880, activity: 120, additional_min: 200, total_min: 1200 },
    'ม.2': { fundamental: 880, activity: 120, additional_min: 200, total_min: 1200 },
    'ม.3': { fundamental: 880, activity: 120, additional_min: 200, total_min: 1200 },
};

const WEEKS_PER_YEAR = 40;

const GRADE_ORDER = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'];

const GROUP_ORDER = [
    'ภาษาไทย',
    'คณิตศาสตร์',
    'วิทยาศาสตร์และเทคโนโลยี',
    'สังคมศึกษา ศาสนาและวัฒนธรรม',
    'สุขศึกษาและพลศึกษา',
    'ศิลปะ',
    'การงานอาชีพ',
    'ภาษาต่างประเทศ',
];

export async function GET() {
    try {
        // Get all active subjects with grade info
        const [subjects] = await pool.query(`
            SELECT s.name, s.type, s.hours_per_week, s.credits, g.name as grade_name, g.order_index
            FROM Subjects s
            LEFT JOIN GradeLevels g ON s.grade_level_id = g.id
            WHERE s.is_active = TRUE
            ORDER BY g.order_index, s.type, s.name
        `) as any[];

        interface SubjectDetail {
            name: string;
            hoursPerWeek: number;
            hoursPerYear: number;
        }

        // Build data structure: { gradeName -> { groupName -> { hours_per_week, hours_per_year } } }
        const data: Record<string, Record<string, { hoursPerWeek: number; hoursPerYear: number; subjectNames: SubjectDetail[] }>> = {};

        // Initialize
        for (const grade of GRADE_ORDER) {
            data[grade] = {};
            for (const group of GROUP_ORDER) {
                data[grade][group] = { hoursPerWeek: 0, hoursPerYear: 0, subjectNames: [] };
            }
            data[grade]['วิชาเพิ่มเติม'] = { hoursPerWeek: 0, hoursPerYear: 0, subjectNames: [] };
            data[grade]['กิจกรรมพัฒนาผู้เรียน'] = { hoursPerWeek: 0, hoursPerYear: 0, subjectNames: [] };
        }

        for (const subject of subjects as any[]) {
            const gradeName = subject.grade_name;
            if (!gradeName || !GRADE_ORDER.includes(gradeName)) continue;

            const hoursPerWeek = parseFloat(subject.hours_per_week || 0);
            const hoursPerYear = hoursPerWeek * WEEKS_PER_YEAR;
            const subjDetail = { name: subject.name, hoursPerWeek, hoursPerYear };

            if (subject.type === 'Activity') {
                data[gradeName]['กิจกรรมพัฒนาผู้เรียน'].hoursPerWeek += hoursPerWeek;
                data[gradeName]['กิจกรรมพัฒนาผู้เรียน'].hoursPerYear += hoursPerYear;
                data[gradeName]['กิจกรรมพัฒนาผู้เรียน'].subjectNames.push(subjDetail);
            } else if (subject.type === 'Additional') {
                data[gradeName]['วิชาเพิ่มเติม'].hoursPerWeek += hoursPerWeek;
                data[gradeName]['วิชาเพิ่มเติม'].hoursPerYear += hoursPerYear;
                data[gradeName]['วิชาเพิ่มเติม'].subjectNames.push(subjDetail);
            } else {
                // Fundamental - map to group
                const group = mapSubjectToGroup(subject.name);
                if (data[gradeName][group]) {
                    data[gradeName][group].hoursPerWeek += hoursPerWeek;
                    data[gradeName][group].hoursPerYear += hoursPerYear;
                    data[gradeName][group].subjectNames.push(subjDetail);
                }
            }
        }

        return NextResponse.json({
            grades: GRADE_ORDER,
            groups: GROUP_ORDER,
            data,
            standards: STANDARDS,
            totalStandards: TOTAL_STANDARDS,
            weeksPerYear: WEEKS_PER_YEAR,
        });
    } catch (error: any) {
        console.error('Error fetching time structure:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
