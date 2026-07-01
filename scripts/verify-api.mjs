import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

async function verify() {
    console.log('Starting Verification...');

    // 1. Create Resources
    console.log('Creating resources...');
    const teacher = await fetch(`${BASE_URL}/teachers`, {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Teacher', email: 'test@test.com', color: '#000000' })
    }).then(r => r.json());

    const subject = await fetch(`${BASE_URL}/subjects`, {
        method: 'POST',
        body: JSON.stringify({ code: 'TEST101', name: 'Test Subject', credits: 3, hours_per_week: 3 })
    }).then(r => r.json());

    const room = await fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Room', type: 'Lecture', capacity: 50 })
    }).then(r => r.json());

    const cls = await fetch(`${BASE_URL}/classes`, {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Class' })
    }).then(r => r.json());

    console.log('Resources created:', { teacherId: teacher.id, subjectId: subject.id, roomId: room.id, classId: cls.id });

    // 2. Create Schedule
    console.log('Creating first schedule...');
    const schedule1 = await fetch(`${BASE_URL}/schedules`, {
        method: 'POST',
        body: JSON.stringify({
            teacher_id: teacher.id,
            subject_id: subject.id,
            room_id: room.id,
            class_id: cls.id,
            day_of_week: 'Monday',
            start_time: '09:00:00',
            end_time: '10:00:00'
        })
    }).then(r => r.json());

    if (schedule1.id) {
        console.log('Schedule 1 created successfully.');
    } else {
        console.error('Failed to create Schedule 1:', schedule1);
    }

    // 3. Test Conflict (Same Teacher)
    console.log('Testing Conflict (Same Teacher)...');
    const conflict1 = await fetch(`${BASE_URL}/schedules`, {
        method: 'POST',
        body: JSON.stringify({
            teacher_id: teacher.id,
            subject_id: subject.id,
            room_id: room.id + 1,
            class_id: cls.id + 1,
            day_of_week: 'Monday',
            start_time: '09:00:00',
            end_time: '10:00:00'
        })
    });

    if (conflict1.status === 409) {
        console.log('SUCCESS: Conflict detected correctly (Same Teacher).');
    } else {
        console.error('FAILURE: Conflict NOT detected (Same Teacher). Status:', conflict1.status);
    }

    // 4. Test Conflict (Same Room)
    console.log('Testing Conflict (Same Room)...');
    const conflict2 = await fetch(`${BASE_URL}/schedules`, {
        method: 'POST',
        body: JSON.stringify({
            teacher_id: teacher.id + 1,
            subject_id: subject.id,
            room_id: room.id,
            class_id: cls.id + 1,
            day_of_week: 'Monday',
            start_time: '09:30:00', // Overlap
            end_time: '10:30:00'
        })
    });

    if (conflict2.status === 409) {
        console.log('SUCCESS: Conflict detected correctly (Same Room & Overlap).');
    } else {
        console.error('FAILURE: Conflict NOT detected (Same Room). Status:', conflict2.status);
    }

    // Cleanup
    console.log('Cleaning up...');
    await fetch(`${BASE_URL}/schedules?id=${schedule1.id}`, { method: 'DELETE' });
    await fetch(`${BASE_URL}/teachers?id=${teacher.id}`, { method: 'DELETE' });
    await fetch(`${BASE_URL}/subjects?id=${subject.id}`, { method: 'DELETE' });
    await fetch(`${BASE_URL}/rooms?id=${room.id}`, { method: 'DELETE' });
    await fetch(`${BASE_URL}/classes?id=${cls.id}`, { method: 'DELETE' });
    console.log('Cleanup done.');
}

verify().catch(console.error);
