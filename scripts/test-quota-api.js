const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/course-assignments?type=quota&class_id=1&term_id=1',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
        const data = JSON.parse(body);
        console.log('\n📊 Quota API Response:');
        console.log(JSON.stringify(data, null, 2));

        if (data.subjects) {
            console.log(`\n✅ Found ${data.subjects.length} subjects needing scheduling`);
            data.subjects.forEach(s => {
                const badge = s.remaining_periods > 1 ? '🟢' : '🟡';
                console.log(`${badge} ${s.code}: ${s.remaining_periods}/${s.total_periods} คาบ (${s.teacher_name})`);
            });
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.end();
