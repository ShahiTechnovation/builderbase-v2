import fs from 'fs';

const API_URL = 'https://api.baserow.io';
const EMAIL = 'solmeetapp@gmail.com';
const PASSWORD = 'Shahi@205';

const EVENTS_TABLE = '1249162';
const PROJECTS_TABLE = '1249163';

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

    for (const tableId of [EVENTS_TABLE, PROJECTS_TABLE]) {
        console.log(`Fetching fields for table ${tableId}...`);
        const fields = await fetchAPI(`/api/database/fields/table/${tableId}/`, 'GET', null, token);
        
        const nameField = fields.find(f => f.name === 'Name');
        if (nameField) {
            console.log(`Renaming 'Name' field to 'Title' for table ${tableId}...`);
            await fetchAPI(`/api/database/fields/${nameField.id}/`, 'PATCH', { name: 'Title' }, token);
            console.log('Renamed successfully!');
        }
    }
    console.log('DONE');
}

run();
