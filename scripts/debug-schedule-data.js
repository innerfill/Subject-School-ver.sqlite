(async () => {
    try {
        const res = await fetch('http://localhost:3000/api/reports/print?type=student&id=1');
        const data = await res.json();

        console.log('--- Time Slots ---');
        if (data.timeSlots) {
            data.timeSlots.forEach(s => console.log(`ID: ${s.id}, Start: "${s.start_time}", End: "${s.end_time}", Type: ${s.type}`));
        } else {
            console.log('No Time Slots found');
        }

        console.log('\n--- Schedule Items ---');
        if (data.data && data.data.schedule) {
            data.data.schedule.forEach(s => console.log(`ID: ${s.id}, Day: ${s.day_of_week}, Start: "${s.start_time}", Subject: ${s.subject_name}`));
        } else {
            console.log('No Schedule Items found');
        }

    } catch (e) {
        console.error(e);
    }
})();
