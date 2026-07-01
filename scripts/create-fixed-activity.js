const http = require('http');

const data = JSON.stringify({
    activity_group: 'SCOUT',
    day_of_week: 'Thursday',
    start_time: '14:00',
    end_time: '15:00',
    target_grade_level_ids: [1, 2, 3, 4, 5, 6],
    academic_term_id: 1
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/fixed-activities',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
        console.log('Response:', body);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
