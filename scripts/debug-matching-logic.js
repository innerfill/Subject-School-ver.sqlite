const schedule = [
    { id: 85, day_of_week: "Monday", start_time: "09:00:00", subject_name: "ภาษาอังกฤษ (ป.1)" },
    { id: 84, day_of_week: "Wednesday", start_time: "10:00:00", subject_name: "ภาษาไทย (ป.1)" }
];

const timeSlots = [
    { id: 12, start_time: "09:00:00", end_time: "10:00:00", type: "Study" },
    { id: 13, start_time: "10:00:00", end_time: "11:00:00", type: "Study" }
];

const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
const dayMapping = {
    'Monday': 'จันทร์',
    'Tuesday': 'อังคาร',
    'Wednesday': 'พุธ',
    'Thursday': 'พฤหัสบดี',
    'Friday': 'ศุกร์'
};

const normalizeTime = (time) => time ? time.slice(0, 5) : '';

console.log("--- Debugging Matching Logic ---");

days.forEach((day, dayIndex) => {
    console.log(`\nChecking Day: ${day} (Index: ${dayIndex})`);

    timeSlots.forEach(slot => {
        const slotStart = normalizeTime(slot.start_time);
        console.log(`  Slot: ${slotStart}`);

        const match = schedule.find(s => {
            const dayMatches = s.day_of_week === day ||
                s.day_of_week === Object.keys(dayMapping).find(key => dayMapping[key] === day) ||
                s.day_of_week === (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][dayIndex]);

            const sStart = normalizeTime(s.start_time);
            const timeMatches = sStart === slotStart;

            if (s.day_of_week === 'Monday' && day === 'จันทร์' && slotStart === '09:00') {
                console.log(`    Comparing with Schedule ID ${s.id}:`);
                console.log(`      s.day: "${s.day_of_week}" vs day: "${day}"`);
                console.log(`      Mapped day: "${Object.keys(dayMapping).find(key => dayMapping[key] === day)}"`);
                console.log(`      Day Match: ${dayMatches}`);
                console.log(`      Time: "${sStart}" vs "${slotStart}" -> Match: ${timeMatches}`);
            }

            return dayMatches && timeMatches;
        });

        if (match) {
            console.log(`    FOUND MATCH: ${match.subject_name}`);
        } else {
            // console.log(`    No match`);
        }
    });
});
