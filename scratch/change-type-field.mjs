import fs from 'fs';

const API_URL = 'https://api.baserow.io';
const EMAIL = 'solmeetapp@gmail.com';
const PASSWORD = 'Shahi@205';

const PARTNERS_TABLE = '1249161';
const EVENTS_TABLE = '1249162';

async function fetchAPI(path, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `JWT ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_URL}${path}`, opts);
    if (!res.ok) {
        console.error(`Error on ${method} ${path}:`, await res.text());
        throw new Error('API Request Failed');
    }
    return res.json();
}

async function run() {
    console.log('Logging in...');
    const { token } = await fetchAPI('/api/user/token-auth/', 'POST', { username: EMAIL, password: PASSWORD });

    for (const tableId of [PARTNERS_TABLE, EVENTS_TABLE]) {
        console.log(`Fetching fields for table ${tableId}...`);
        const fields = await fetchAPI(`/api/database/fields/table/${tableId}/`, 'GET', null, token);
        
        const typeField = fields.find(f => f.name === 'Type');
        if (typeField && typeField.type !== 'text') {
            console.log(`Changing 'Type' field from ${typeField.type} to 'text' for table ${tableId}...`);
            await fetchAPI(`/api/database/fields/${typeField.id}/`, 'PATCH', { type: 'text' }, token);
            console.log('Changed successfully!');
        }
    }
    console.log('DONE');
}

run();
