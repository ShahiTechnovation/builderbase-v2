import fs from 'fs';

const API_URL = 'https://api.baserow.io';
const EMAIL = 'solmeetapp@gmail.com';
const PASSWORD = 'Shahi@205';

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

    console.log('Fetching workspaces...');
    const workspaces = await fetchAPI('/api/workspaces/', 'GET', null, token);
    const workspace = workspaces[0];
    if (!workspace) throw new Error('No workspace found');
    
    console.log(`Using Workspace: ${workspace.name}`);

    console.log('Fetching applications...');
    const apps = await fetchAPI(`/api/applications/workspace/${workspace.id}/`, 'GET', null, token);
    const db = apps.find(app => app.type === 'database');
    if (!db) throw new Error('No database application found');

    console.log(`Using Database: ${db.name} (ID: ${db.id})`);

    // Helper to create table
    async function createTable(name) {
        console.log(`Creating table: ${name}`);
        const table = await fetchAPI(`/api/database/tables/database/${db.id}/`, 'POST', { name }, token);
        return table;
    }

    // Helper to create field
    async function createField(tableId, name, type, extraOpts = {}) {
        await fetchAPI(`/api/database/fields/table/${tableId}/`, 'POST', { name, type, ...extraOpts }, token);
    }

    try {
        const partnersTable = await createTable('Partners');
        await createField(partnersTable.id, 'Type', 'single_select', { select_options: [{value: 'Company', color: 'blue'}, {value: 'DAO', color: 'red'}, {value: 'Community', color: 'green'}] });
        await createField(partnersTable.id, 'Website', 'url');
        await createField(partnersTable.id, 'Logo URL', 'url');
        await createField(partnersTable.id, 'Logo width', 'number');
        await createField(partnersTable.id, 'Logo height', 'number');
        await createField(partnersTable.id, 'Logo use permitted', 'boolean');
        await createField(partnersTable.id, 'Public', 'boolean');
        await createField(partnersTable.id, 'Status', 'single_select', { select_options: [{value: 'Published', color: 'green'}, {value: 'Draft', color: 'red'}] });

        const eventsTable = await createTable('Events');
        await createField(eventsTable.id, 'Short title', 'text');
        await createField(eventsTable.id, 'Date', 'date');
        await createField(eventsTable.id, 'Type', 'single_select', { select_options: [{value: 'Hackathon', color: 'blue'}, {value: 'Build Night', color: 'orange'}, {value: 'Workshop', color: 'purple'}, {value: 'Meetup', color: 'cyan'}] });
        await createField(eventsTable.id, 'Summary', 'long_text');
        await createField(eventsTable.id, 'Cover photo URL', 'url');
        await createField(eventsTable.id, 'Photos URLs', 'long_text');
        await createField(eventsTable.id, 'External URL', 'url');
        await createField(eventsTable.id, 'Public', 'boolean');
        await createField(eventsTable.id, 'Featured', 'boolean');
        await createField(eventsTable.id, 'Status', 'single_select', { select_options: [{value: 'Published', color: 'green'}, {value: 'Draft', color: 'red'}] });

        const projectsTable = await createTable('Projects');
        await createField(projectsTable.id, 'Description', 'long_text');
        await createField(projectsTable.id, 'Stack', 'long_text');
        await createField(projectsTable.id, 'Screenshot URL', 'url');
        await createField(projectsTable.id, 'Live URL', 'url');
        await createField(projectsTable.id, 'Repository URL', 'url');
        await createField(projectsTable.id, 'Public', 'boolean');
        await createField(projectsTable.id, 'Featured', 'boolean');
        await createField(projectsTable.id, 'Status', 'single_select', { select_options: [{value: 'Published', color: 'green'}, {value: 'Draft', color: 'red'}] });

        console.log('\n--- SUCCESS ---');
        console.log(`BASEROW_TABLE_PARTNERS=${partnersTable.id}`);
        console.log(`BASEROW_TABLE_EVENTS=${eventsTable.id}`);
        console.log(`BASEROW_TABLE_PROJECTS=${projectsTable.id}`);

        // Automatically update the .env file
        const envPath = 'C:/builder base/compress/compress/builderbase-v2/.env';
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        envContent = envContent.replace(/BASEROW_TABLE_PARTNERS=.*/g, `BASEROW_TABLE_PARTNERS=${partnersTable.id}`);
        envContent = envContent.replace(/BASEROW_TABLE_EVENTS=.*/g, `BASEROW_TABLE_EVENTS=${eventsTable.id}`);
        envContent = envContent.replace(/BASEROW_TABLE_PROJECTS=.*/g, `BASEROW_TABLE_PROJECTS=${projectsTable.id}`);
        
        fs.writeFileSync(envPath, envContent);
        console.log('Successfully updated .env file with new table IDs!');
    } catch(e) {
        console.error(e);
    }
}

run();
