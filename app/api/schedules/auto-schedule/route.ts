import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const DAY_IDX: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };

/**
 * Slot preference scores indexed by position in studySlots[] (0 = earliest morning).
 * Supports up to 8 study slots; extra slots get the last value.
 *
 * Tier 1 — Hard academic   : wants morning
 * Tier 2 — Language/Social : flexible, slight post-break preference
 * Tier 3 — Arts/Applied    : afternoon preferred
 * Tier 4 — Activities      : end-of-day only
 */
const SLOT_PREF: Record<number, number[]> = {
    1: [10, 9, 7, 4, 3, 2, 1, 0],
    2: [5,  6, 8, 10, 8, 5, 3, 1],
    3: [1,  2, 3,  6, 8, 10, 8, 5],
    4: [0,  0, 0,  1, 2,  5, 9, 10],
};

// Keywords for tier detection (lowercase)
const TIER_KEYWORDS: Record<number, string[]> = {
    1: ['คณิต', 'วิทยาศาสตร์', 'ฟิสิกส์', 'เคมี', 'ชีววิทยา', 'วิทยาการคำนวณ',
        'คอมพิวเตอร์', 'เทคโนโลย', 'ภาษาอังกฤษ', 'english', 'math', 'science',
        'physics', 'chemistry', 'biology', 'ประวัติศาสตร์'],
    2: ['ภาษาไทย', 'สังคม', 'ภูมิศาสตร์', 'หน้าที่พลเมือง', 'ภาษาจีน',
        'ภาษาญี่ปุ่น', 'ภาษาเกาหลี', 'ภาษาฝรั่งเศส',
        'thai', 'social'],
    3: ['ศิลปะ', 'ดนตรี', 'นาฏศิลป์', 'พลศึกษา', 'สุขศึกษา',
        'การงาน', 'งานอาชีพ', 'อาชีพ', 'art', 'music', 'pe', 'sport'],
    4: ['ลูกเสือ', 'เนตรนารี', 'ยุวกาชาด', 'ชุมนุม', 'แนะแนว',
        'กิจกรรม', 'โฮมรูม', 'homeroom', 'scout', 'club'],
};

function detectTier(name: string): number {
    const n = name.toLowerCase();
    for (const tier of [4, 3, 2, 1]) {
        if (TIER_KEYWORDS[tier].some(kw => n.includes(kw))) return tier;
    }
    return 2; // default: medium
}

function slotPrefScore(tier: number, slotPos: number): number {
    const arr = SLOT_PREF[tier] ?? SLOT_PREF[2];
    return arr[Math.min(slotPos, arr.length - 1)];
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

interface PlacedRecord { day: string; slotPos: number; }

// Scoring lives inside POST as a closure (needs teacher/class state). See scoreCandidate there.

// ─── Placement helper ─────────────────────────────────────────────────────────

interface Placement {
    subject_id: number;
    subject_name: string;
    subject_code: string;
    teacher_id: number | null;
    teacher_name: string;
    room_id: number | null;
    class_id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    academic_term_id: number;
}

function makeConflictKey(id: number | string, day: string, time: string) {
    return `${id}|${day}|${time.slice(0, 5)}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { class_id, term_id, dry_run = true } = body;

        if (!class_id || !term_id) {
            return NextResponse.json({ error: 'class_id and term_id required' }, { status: 400 });
        }

        // 1. Class meta
        const [classRows] = await pool.query('SELECT grade_level_id FROM Classes WHERE id = ?', [class_id]) as any;
        if (!classRows.length) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        const grade_level_id = classRows[0].grade_level_id;

        const [termRows] = await pool.query('SELECT term FROM AcademicTerms WHERE id = ?', [term_id]) as any;
        const termNumber = termRows[0]?.term ?? null;

        // 2. Study slots only, ordered morning → afternoon
        const [allSlots] = await pool.query(
            'SELECT id, start_time, end_time, order_index, type FROM TimeSlots ORDER BY order_index ASC'
        ) as any;
        const studySlots = allSlots.filter((s: any) => s.type === 'Study');

        if (!studySlots.length) {
            return NextResponse.json({ error: 'ยังไม่มีคาบเรียน (TimeSlots) ที่เป็น Study' }, { status: 400 });
        }

        // 3. Build conflict sets from ALL existing schedules in this term
        const [existing] = await pool.query(
            'SELECT teacher_id, class_id, day_of_week, start_time FROM Schedules WHERE academic_term_id = ?',
            [term_id]
        ) as any;

        const teacherBusy = new Set<string>();
        const classBusy   = new Set<string>();
        // day load for THIS class only (for balance scoring)
        const dayLoad: Record<string, number> = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };

        for (const s of existing) {
            if (s.teacher_id) teacherBusy.add(makeConflictKey(s.teacher_id, s.day_of_week, s.start_time));
            classBusy.add(makeConflictKey(s.class_id, s.day_of_week, s.start_time));
            if (s.class_id === Number(class_id)) {
                dayLoad[s.day_of_week] = (dayLoad[s.day_of_week] ?? 0) + 1;
            }
        }

        // 4. Subjects with remaining periods
        const [assignments] = await pool.query(`
            SELECT s.id AS subject_id, s.code, s.name AS subject_name, s.hours_per_week,
                   ca.teacher_id, ca.room_id, ca.periods_per_week,
                   t.name AS teacher_name
            FROM Subjects s
            LEFT JOIN CourseAssignments ca ON s.id = ca.subject_id
                AND ca.class_id = ? AND ca.academic_term_id = ?
            LEFT JOIN Teachers t ON ca.teacher_id = t.id
            WHERE s.grade_level_id = ? AND s.is_active = TRUE
            AND (s.semester IS NULL OR s.semester = ?)
        `, [class_id, term_id, grade_level_id, termNumber]) as any;

        // Precompute slot metadata (position + normalized time)
        const slotMeta = studySlots.map((s: any, i: number) => ({
            slot: s, slotPos: i, t5: s.start_time.slice(0, 5),
        }));
        const numSlots = slotMeta.length;
        const globalPos = (day: string, slotPos: number) => (DAY_IDX[day] ?? 0) * numSlots + slotPos;

        // Build subject states with remaining need + seeded history (existing placements)
        interface SubState {
            sub: any;
            tier: number;
            count: number;       // periods still to place
            need: number;        // original requirement (for skipped reporting)
            history: PlacedRecord[];
            searchMaxPos: number; // symmetry breaking: new periods must use a higher global pos
        }
        const subjects: SubState[] = [];

        // Batch query — หนึ่ง query แทน N+1
        const subjectIds: number[] = assignments.map((a: any) => a.subject_id);
        const [allExisting] = (subjectIds.length > 0
            ? await pool.query(
                `SELECT subject_id, day_of_week, start_time FROM Schedules WHERE class_id=? AND academic_term_id=? AND subject_id IN (${subjectIds.map(() => '?').join(',')})`,
                [class_id, term_id, ...subjectIds]
            )
            : [[]]) as any;

        const existingBySubject = new Map<number, any[]>();
        for (const r of allExisting) {
            if (!existingBySubject.has(r.subject_id)) existingBySubject.set(r.subject_id, []);
            existingBySubject.get(r.subject_id)!.push(r);
        }

        for (const sub of assignments) {
            const existingPlacements = existingBySubject.get(sub.subject_id) ?? [];
            const total = sub.hours_per_week || sub.periods_per_week || 0;
            const need  = total - existingPlacements.length;
            if (need <= 0) continue;

            const history: PlacedRecord[] = existingPlacements.map((r: any) => {
                const t5 = r.start_time.slice(0, 5);
                const m = slotMeta.find((x: any) => x.t5 === t5);
                return { day: r.day_of_week, slotPos: m ? m.slotPos : 0 };
            });

            subjects.push({ sub, tier: detectTier(sub.subject_name), count: need, need, history, searchMaxPos: -1 });
        }

        // ─── Backtracking search (CSP: MRV + value ordering + symmetry breaking) ───
        // Hard constraints: a class/teacher cannot be double-booked at one day+time.
        // Soft (scoring) constraints only influence the order we try moves, so the
        // FIRST complete solution we find is also a well-distributed one.
        const placedStack: Placement[] = [];
        let best: Placement[] = [];        // best partial if no complete solution exists
        let nodes = 0;
        const NODE_BUDGET = 20000;         // ponytail: caps pathological over-constrained inputs; raise if real timetables exceed it

        const buildPlacement = (st: SubState, day: string, slotPos: number): Placement => ({
            subject_id:      st.sub.subject_id,
            subject_name:    st.sub.subject_name,
            subject_code:    st.sub.code,
            teacher_id:      st.sub.teacher_id ?? null,
            teacher_name:    st.sub.teacher_name ?? 'ไม่ระบุครู',
            room_id:         st.sub.room_id ?? null,
            class_id:        Number(class_id),
            day_of_week:     day,
            start_time:      slotMeta[slotPos].slot.start_time,
            end_time:        slotMeta[slotPos].slot.end_time,
            academic_term_id: Number(term_id),
        });

        // ─── Adjacency state for distribution & teacher load ───────────────────
        // order_index ↔ time maps over study slots only. Two study slots are
        // "consecutive" (คาบรวด) iff their order_index differ by 1 — any Break
        // between them occupies an order_index, so it naturally breaks the run.
        const oiToT5 = new Map<number, string>();
        const t5ToOi = new Map<string, number>();
        for (const m of slotMeta) { oiToT5.set(m.slot.order_index, m.t5); t5ToOi.set(m.t5, m.slot.order_index); }

        // Which teacher teaches THIS class at each (day|order_index). Lets us avoid
        // one teacher holding the same class for 3 consecutive periods even across
        // different subjects. Seeded from already-placed rows, updated during search.
        const classTeacherByDayOi = new Map<string, number>();
        for (const s of existing) {
            if (s.class_id === Number(class_id) && s.teacher_id) {
                const oi = t5ToOi.get(s.start_time.slice(0, 5));
                if (oi !== undefined) classTeacherByDayOi.set(`${s.day_of_week}|${oi}`, s.teacher_id);
            }
        }

        // Consecutive run length (incl. the candidate) the teacher would have...
        const teacherRun = (tid: number, day: string, oi: number): number => {   // ...across ALL classes
            let run = 1;
            for (let o = oi - 1; oiToT5.has(o); o--) { if (teacherBusy.has(makeConflictKey(tid, day, oiToT5.get(o)!))) run++; else break; }
            for (let o = oi + 1; oiToT5.has(o); o++) { if (teacherBusy.has(makeConflictKey(tid, day, oiToT5.get(o)!))) run++; else break; }
            return run;
        };
        const classTeacherRun = (tid: number, day: string, oi: number): number => {   // ...for THIS class only
            let run = 1;
            for (let o = oi - 1; oiToT5.has(o); o--) { if (classTeacherByDayOi.get(`${day}|${o}`) === tid) run++; else break; }
            for (let o = oi + 1; oiToT5.has(o); o++) { if (classTeacherByDayOi.get(`${day}|${o}`) === tid) run++; else break; }
            return run;
        };

        // Tunable weights. Higher = stronger pull/penalty. Tune here if distribution feels off.
        const W = {
            sameDaySubject:   12,  // student: spread a subject across days
            consecSubject:     8,  // student: avoid back-to-back same subject
            slotRepeat:        6,  // avoid same slot position on nearby days
            dayBalance:        3,  // prefer days with fewer periods
            teacherCompact:    1,  // slight reward for teacher 2-in-a-row across different classes
            teacherLongRun:    8,  // penalize teacher 3+ consecutive (any class)
            classTeacherPair:  7,  // penalize same teacher 2 consecutive in THIS class (different subjects)
            classTeacherRun:  10,  // penalize same teacher 3+ consecutive in THIS class
        };

        const scoreCandidate = (st: SubState, day: string, slotPos: number): number => {
            let score = slotPrefScore(st.tier, slotPos);
            const oi = slotMeta[slotPos].slot.order_index;
            const dIdx = DAY_IDX[day] ?? 0;

            for (const h of st.history) {
                if (h.day === day) {
                    score -= W.sameDaySubject;
                    if (Math.abs(slotMeta[h.slotPos].slot.order_index - oi) === 1) score -= W.consecSubject;
                }
                if (h.slotPos === slotPos) {
                    const dist = Math.abs(dIdx - (DAY_IDX[h.day] ?? 0));
                    if (dist > 0) score -= W.slotRepeat / dist;
                }
            }

            score -= (dayLoad[day] ?? 0) * W.dayBalance;

            // Tier 3 (พลศึกษา/ศิลปะ) prefers mid-week
            if (st.tier === 3 && (day === 'Tuesday' || day === 'Wednesday')) score += 6;

            const tid = st.sub.teacher_id;
            if (tid) {
                const tRun = teacherRun(tid, day, oi);
                // only reward compactness when teacher is switching between different classes
                const cRun = classTeacherRun(tid, day, oi);
                if (tRun === 2 && cRun < 2) score += W.teacherCompact;
                else if (tRun >= 3) score -= W.teacherLongRun * (tRun - 2);

                // penalize same teacher consecutive in THIS class (even 2-in-a-row = boring for students)
                if (cRun >= 2) score -= W.classTeacherPair * (cRun - 1);
                if (cRun >= 3) score -= W.classTeacherRun * (cRun - 2);
            }

            score += Math.random() * 0.9;  // tie-break noise
            return score;
        };

        const validMoves = (st: SubState) => {
            const moves: { day: string; slotPos: number; score: number }[] = [];
            for (const day of DAYS) {
                // Hard: max 2 periods of same subject per day — prevents 3-in-a-row on same day
                if (st.history.filter(h => h.day === day).length >= 2) continue;

                for (const m of slotMeta) {
                    // Symmetry breaking: periods of the same subject are interchangeable,
                    // so force strictly increasing global position to skip permutations.
                    if (globalPos(day, m.slotPos) <= st.searchMaxPos) continue;
                    if (classBusy.has(makeConflictKey(class_id, day, m.t5))) continue;
                    if (st.sub.teacher_id && teacherBusy.has(makeConflictKey(st.sub.teacher_id, day, m.t5))) continue;

                    // Hard: consecutive same-subject — Tier 1 (คณิตฯ/อังกฤษ/วิทยาฯ) blocks ANY back-to-back;
                    // Tier 2+ allows 2-in-a-row but blocks 3+
                    const oi = m.slot.order_index;
                    const dayOis = new Set(st.history.filter(h => h.day === day).map(h => slotMeta[h.slotPos].slot.order_index));
                    const p1 = dayOis.has(oi - 1), p2 = dayOis.has(oi - 2);
                    const n1 = dayOis.has(oi + 1), n2 = dayOis.has(oi + 2);
                    if (st.tier === 1 && (p1 || n1)) continue;
                    if (st.tier !== 1 && ((p1 && p2) || (n1 && n2) || (p1 && n1))) continue;

                    moves.push({ day, slotPos: m.slotPos, score: scoreCandidate(st, day, m.slotPos) });
                }
            }
            return moves;
        };

        const backtrack = (): boolean => {
            if (placedStack.length > best.length) best = placedStack.slice();

            const remaining = subjects.filter(s => s.count > 0);
            if (remaining.length === 0) return true;          // all periods placed
            if (++nodes > NODE_BUDGET) return false;          // give up → use best partial

            // MRV: place the subject with the fewest legal moves first (fail fast)
            let target: SubState | null = null;
            let targetMoves: { day: string; slotPos: number; score: number }[] = [];
            let min = Infinity;
            for (const st of remaining) {
                const mv = validMoves(st);
                if (mv.length < min) { min = mv.length; target = st; targetMoves = mv; if (min === 0) break; }
            }
            if (!target || min === 0) return false;           // dead end → backtrack

            targetMoves.sort((a, b) => b.score - a.score);    // value ordering: best slot first
            for (const mv of targetMoves) {
                const t5 = slotMeta[mv.slotPos].t5;
                const oi = slotMeta[mv.slotPos].slot.order_index;
                const prevMax = target.searchMaxPos;
                // apply
                classBusy.add(makeConflictKey(class_id, mv.day, t5));
                if (target.sub.teacher_id) {
                    teacherBusy.add(makeConflictKey(target.sub.teacher_id, mv.day, t5));
                    classTeacherByDayOi.set(`${mv.day}|${oi}`, target.sub.teacher_id);
                }
                dayLoad[mv.day] = (dayLoad[mv.day] ?? 0) + 1;
                target.history.push({ day: mv.day, slotPos: mv.slotPos });
                target.searchMaxPos = globalPos(mv.day, mv.slotPos);
                target.count--;
                placedStack.push(buildPlacement(target, mv.day, mv.slotPos));

                if (backtrack()) return true;

                // undo
                placedStack.pop();
                target.count++;
                target.searchMaxPos = prevMax;
                target.history.pop();
                dayLoad[mv.day]--;
                if (target.sub.teacher_id) {
                    teacherBusy.delete(makeConflictKey(target.sub.teacher_id, mv.day, t5));
                    classTeacherByDayOi.delete(`${mv.day}|${oi}`);
                }
                classBusy.delete(makeConflictKey(class_id, mv.day, t5));
            }
            return false;
        };

        const complete = backtrack();
        const placed: Placement[] = complete ? placedStack.slice() : best;

        // Report subjects that couldn't be fully placed (only when no complete solution)
        const skipped: string[] = [];
        if (!complete) {
            const placedCount: Record<number, number> = {};
            for (const p of placed) placedCount[p.subject_id] = (placedCount[p.subject_id] ?? 0) + 1;
            for (const st of subjects) {
                const gap = st.need - (placedCount[st.sub.subject_id] ?? 0);
                if (gap > 0) skipped.push(`${st.sub.subject_name} (เหลือ ${gap} คาบ — ไม่มีช่องว่าง)`);
            }
        }

        // Sort placed by day → slot for readable preview
        const dayOrder: Record<string, number> = DAY_IDX;
        placed.sort((a, b) =>
            (dayOrder[a.day_of_week] ?? 0) - (dayOrder[b.day_of_week] ?? 0) ||
            a.start_time.localeCompare(b.start_time)
        );

        // 6. Persist if not dry_run
        if (!dry_run && placed.length > 0) {
            for (const p of placed) {
                await pool.query(
                    'INSERT INTO Schedules (teacher_id, subject_id, room_id, class_id, day_of_week, start_time, end_time, academic_term_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [p.teacher_id, p.subject_id, p.room_id, p.class_id, p.day_of_week, p.start_time, p.end_time, p.academic_term_id]
                );
            }
        }

        return NextResponse.json({ placed, skipped, dry_run });
    } catch (error: any) {
        console.error('Auto-schedule error:', error);
        return NextResponse.json({ error: 'Auto-schedule failed', details: error.message }, { status: 500 });
    }
}
