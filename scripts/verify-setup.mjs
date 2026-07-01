import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

async function verify() {
    console.log('Starting Verification of Setup (No Course Assignments)...');

    try {
        // Helper to check response
        const check = async (res, name) => {
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Failed to create ${name}: ${res.status} ${res.statusText} - ${txt}`);
            }
            return res.json();
        };

        // 1. Academic Term
        console.log('1. Creating Academic Term...');
        const term = await check(await fetch(`${BASE_URL}/academic-terms`, {
            method: 'POST',
            body: JSON.stringify({ year: 2568, term: 1, status: 'Active' })
        }), 'Term');
        console.log('   Term created:', term.id);

        // 2. Master Data
        console.log('2. Creating Master Data...');
        const grade = await check(await fetch(`${BASE_URL}/master-data`, {
            method: 'POST',
            body: JSON.stringify({ type: 'grades', name: 'M.1', order_index: 1 })
        }), 'Grade');

        const dept = await check(await fetch(`${BASE_URL}/master-data`, {
            method: 'POST',
            body: JSON.stringify({ type: 'departments', name: 'Science' })
        }), 'Department');

        const building = await check(await fetch(`${BASE_URL}/master-data`, {
            method: 'POST',
            body: JSON.stringify({ type: 'buildings', name: 'Building A', zone: 'North' })
        }), 'Building');
        console.log('   Master Data created.');

        // 3. Teacher
        console.log('3. Creating Teacher...');
        const teacher = await check(await fetch(`${BASE_URL}/teachers`, {
            method: 'POST',
            body: JSON.stringify({ name: 'Teacher A', email: 'a@test.com', department_id: dept.id })
        }), 'Teacher');
        console.log('   Teacher created:', teacher.id);

        // 4. Subject
        console.log('4. Creating Subject...');
        const subject = await check(await fetch(`${BASE_URL}/subjects`, {
            method: 'POST',
            body: JSON.stringify({ code: 'SCI101', name: 'Science 1', credits: 1.5, grade_level_id: grade.id })
        }), 'Subject');
        console.log('   Subject created:', subject.id);

        // 5. Room
        console.log('5. Creating Room...');
        const room = await check(await fetch(`${BASE_URL}/rooms`, {
            method: 'POST',
            body: JSON.stringify({ name: 'Room 101', building_id: building.id, capacity: 40, type: 'Lecture' })
        }), 'Room');
        console.log('   Room created:', room.id);

        // 6. Class
        console.log('6. Creating Class...');
        const cls = await check(await fetch(`${BASE_URL}/classes`, {
            method: 'POST',
            body: JSON.stringify({ name: '1/1', grade_level_id: grade.id, academic_term_id: term.id, advisor_id: teacher.id, home_room_id: room.id })
        }), 'Class');
        console.log('   Class created:', cls.id);

        // 7. Time Slot
        console.log('7. Creating Time Slot...');
        const slot = await check(await fetch(`${BASE_URL}/time-slots`, {
            method: 'POST',
            body: JSON.stringify({ order_index: 1, start_time: '08:00', end_time: '09:00', type: 'Study' })
        }), 'Time Slot');
        console.log('   Time Slot created:', slot.id);

        // 8. Schedule (Direct, no assignment check)
        console.log('8. Creating Schedule...');
        const schedule = await check(await fetch(`${BASE_URL}/schedules`, {
            method: 'POST',
            body: JSON.stringify({
                teacher_id: teacher.id,
                subject_id: subject.id,
                room_id: room.id,
                class_id: cls.id,
                day_of_week: 'Monday',
                start_time: '08:00',
                end_time: '09:00',
                academic_year: term.year,
                semester: term.term
            })
        }), 'Schedule');
        console.log('   Schedule created:', schedule.id);

        console.log('SUCCESS: All steps verified.');

    } catch (error) {
        console.error('FAILED:', error);
        process.exit(1);
    }
}

verify();
