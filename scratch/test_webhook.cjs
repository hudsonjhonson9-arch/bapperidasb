const https = require('https');

const options = {
  hostname: 'mindcloud.my.id',
  path: '/webhook/bapperida-inovasi-list',
  method: 'GET',
  headers: {
    'X-App-Token': 'BAPPERIDA_SECURE_TOKEN_2026'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      console.log('Data:', JSON.parse(data));
    } catch (e) {
      console.log('Raw Data:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
