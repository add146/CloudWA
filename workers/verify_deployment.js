const https = require('https');

const BASE_URL = 'https://cloudwa-flow.khibroh.workers.dev';

function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(`${BASE_URL}${path}`, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function verify() {
    console.log('Verifying Health...');
    try {
        const health = await request('/health');
        console.log('Health:', health);
    } catch (e) {
        console.error('Health Check Failed:', e);
    }

    console.log('\nVerifying Login...');
    try {
        const login = await request('/api/auth/super-admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: 'glowboxstudio@gmail.com',
            password: 'CloudWA2026!Secure'
        });
        console.log('Login:', login);
        if (login.body.success) {
            console.log('✅ Login Successful!');
            console.log('Token:', login.body.data.token);
        } else {
            console.error('❌ Login Failed');
        }
    } catch (e) {
        console.error('Login Check Failed:', e);
    }
}

verify();
