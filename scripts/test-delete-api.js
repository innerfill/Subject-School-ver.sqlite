const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/fixed-activities?id=1',
    method: 'DELETE'
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
    console.error('Error:', error);
});

req.end();
