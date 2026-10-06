// Builder Base — Baserow schema setup (schema as code).
//
// Usage:
//   node scripts/baserow-setup.mjs preflight   read-only safety checks
//   node scripts/baserow-setup.mjs apply       create the database/tables/fields/views (resumable)
//   node scripts/baserow-setup.mjs verify      read the live schema and compare with SCHEMA below
//
// Credentials come from `.env.setup` (git-ignored) and are only needed for
// schema work. They are never printed; output contains names and IDs only.
// The production website never uses this account — it reads with a
// read-only database token (see docs/baserow.md).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WORKSPACE_NAME = 'Builder Base';
const DATABASE_NAME = 'Builder Base';
const FORBIDDEN = /with\s*claude/i;

// ── Credentials (never logged) ────────────────────────────────────────

function readSetupEnv() {
	const file = resolve(import.meta.dirname, '../.env.setup');
	const env = {};
	for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
		const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
		if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
	}
	for (const key of ['BASEROW_API_URL', 'BASEROW_SETUP_EMAIL', 'BASEROW_SETUP_PASSWORD']) {
		if (!env[key]) throw new Error(`.env.setup is missing ${key}`);
	}
	return env;
}

const env = readSetupEnv();
const API = env.BASEROW_API_URL.replace(/\/+$/, '');

// ── HTTP with JWT (tokens kept in memory only) ────────────────────────

let accessToken;
let refreshToken;

async function authenticate() {
	const response = await fetch(`${API}/api/user/token-auth/`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email: env.BASEROW_SETUP_EMAIL, password: env.BASEROW_SETUP_PASSWORD }),
	});
	if (!response.ok) throw new Error(`Authentication failed (HTTP ${response.status}).`);
	const body = await response.json();
	accessToken = body.access_token ?? body.token;
	refreshToken = body.refresh_token;
	if (!accessToken) throw new Error('Authentication returned no access token.');
}

async function refresh() {
	if (!refreshToken) return authenticate();
	const response = await fetch(`${API}/api/user/token-refresh/`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ refresh_token: refreshToken }),
	});
	if (!response.ok) return authenticate();
	const body = await response.json();
	accessToken = body.access_token ?? body.token;
}

async function api(method, path, body, { retried = false } = {}) {
	const response = await fetch(`${API}/api${path}`, {
		method,
		headers: { Authorization: `JWT ${accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
		body: body ? JSON.stringify(body) : undefined,
	});
	if (response.status === 401 && !retried) {
		await refresh();
		return api(method, path, body, { retried: true });
	}
	const text = await response.text();
	const data = text ? JSON.parse(text) : undefined;
	if (!response.ok) {
		const detail = data?.detail ?? data?.error ?? text.slice(0, 300);
		throw new Error(`${method} ${path} → HTTP ${response.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
	}
	return data;
}

// ── Preflight ─────────────────────────────────────────────────────────

async function listWorkspaces() {
	try {
		return await api('GET', '/workspaces/');
	} catch (error) {
		if (!String(error.message).includes('404')) throw error;
		return api('GET', '/groups/'); // older Baserow versions
	}
}

async function listApplications(workspaceId) {
	return api('GET', `/applications/workspace/${workspaceId}/`);
}

async function preflight() {
	const host = new URL(API).hostname;
	console.log(`Instance: ${host === 'api.baserow.io' ? 'baserow.io (cloud)' : 'self-hosted'}`);

	await authenticate();
	console.log('1. Authentication: OK');

	const workspaces = await listWorkspaces();
	console.log(`2. Workspaces visible to the setup account: ${workspaces.length}`);
	const summary = [];
	for (const workspace of workspaces) {
		const applications = await listApplications(workspace.id);
		summary.push({ workspace, applications });
		console.log(`   - "${workspace.name}" (id ${workspace.id})`);
		for (const application of applications) {
			console.log(
				`       · ${application.type} "${application.name}" (id ${application.id})` +
					(application.tables ? ` — ${application.tables.length} table(s)` : ''),
			);
		}
	}

	const failures = [];
	const target = summary.filter(({ workspace }) => workspace.name === WORKSPACE_NAME);
	if (workspaces.length !== 1) failures.push(`expected exactly 1 visible workspace, found ${workspaces.length}`);
	if (target.length !== 1) failures.push(`expected exactly one workspace named "${WORKSPACE_NAME}"`);
	console.log(`3. Target workspace is exactly "${WORKSPACE_NAME}": ${target.length === 1 && workspaces.length === 1 ? 'YES' : 'NO'}`);

	const forbiddenSeen = summary.some(
		({ workspace, applications }) =>
			FORBIDDEN.test(workspace.name) ||
			applications.some((application) => FORBIDDEN.test(application.name) || application.tables?.some((t) => FORBIDDEN.test(t.name))),
	);
	if (forbiddenSeen) failures.push('the setup account can see WITH CLAUDE content');
	console.log(`4. WITH CLAUDE visible to this account: ${forbiddenSeen ? 'YES — STOP' : 'NO'}`);

	const conflict = target[0]?.applications.find((application) => application.name === DATABASE_NAME);
	if (conflict) failures.push(`a database named "${DATABASE_NAME}" already exists (id ${conflict.id})`);
	console.log(`5. Existing "${DATABASE_NAME}" database in the workspace: ${conflict ? `YES (id ${conflict.id}) — STOP` : 'NO'}`);

	if (failures.length) {
		console.log(`\nPREFLIGHT FAILED — no changes made:\n - ${failures.join('\n - ')}`);
		process.exitCode = 1;
		return undefined;
	}
	console.log('\nPREFLIGHT PASSED — safe to create the schema.');
	return target[0].workspace;
}

// ── Schema (the approved specification) ───────────────────────────────

const text = { type: 'text' };
const longText = { type: 'long_text' };
const url = { type: 'url' };
const bool = { type: 'boolean' };
const int = { type: 'number', number_decimal_places: 0, number_negative: false };
const date = { type: 'date', date_format: 'ISO', date_include_time: false };
const file = { type: 'file' };
const tags = { type: 'multiple_select', select_options: [] };
const COLORS = ['blue', 'green', 'yellow', 'red', 'cyan', 'orange', 'purple', 'gray'];
const select = (...values) => ({
	type: 'single_select',
	select_options: values.map((value, index) => ({ value, color: COLORS[index % COLORS.length] })),
});
const verification = [
	['Public', bool],
	['Verified', bool],
	['Verification source', longText],
];
const status = select('Draft', 'Published', 'Archived');

/** Tables in creation order: primary field, then scalar fields (links come later). */
export const SCHEMA = {
	Photos: {
		primary: 'Label',
		fields: [
			['Asset key', text],
			['Asset URL', url],
			['Width', int],
			['Height', int],
			['Alt text', longText],
			['Focal X', int],
			['Focal Y', int],
			['Portrait focal X', int],
			['Portrait focal Y', int],
			['Usage', select('Approved', 'Pending', 'Restricted')],
			['Hero rank', int],
			['Culture rank', int],
			['Featured', bool],
			['Tags', tags],
			['Credit', text],
			['Internal note', longText],
			['Preview', file],
		],
	},
	Cities: {
		primary: 'Name',
		fields: [['Slug', text], ['Country', text], ['Featured', bool], ['Sort order', int], ...verification],
	},
	Organizations: {
		primary: 'Name',
		fields: [
			['Slug', text],
			['Type', select('Technology company', 'Ecosystem', 'Community', 'University', 'Venue', 'Other')],
			['Website', url],
			['Logo URL', url],
			['Logo width', int],
			['Logo height', int],
			['Logo use permitted', bool],
		],
	},
	Relationships: {
		primary: 'Label',
		fields: [
			[
				'Kind',
				select(
					'Partner',
					'Sponsor',
					'Co-host',
					'Community partner',
					'Ecosystem collaboration',
					'Venue',
					'Supported',
					'Activation',
				),
			],
			['Public label', text],
			...verification,
		],
	},
	Activations: {
		primary: 'Title',
		fields: [
			['Slug', text],
			['Short title', text],
			['Date', date],
			['Type', select('Build night', 'Hackathon', 'Workshop', 'Meetup', 'Summit', 'Residency', 'Other')],
			['Summary', longText],
			['External URL', url],
			['Featured', bool],
			['Homepage rank', int],
			['Status', status],
			...verification,
		],
	},
	Projects: {
		primary: 'Title',
		fields: [
			['Slug', text],
			['Description', longText],
			['Stack', tags],
			['Live URL', url],
			['Repository URL', url],
			['Featured', bool],
			['Homepage rank', int],
			['Status', status],
			...verification,
		],
	},
	Builders: {
		primary: 'Name',
		fields: [
			['Role / Headline', text],
			['Handle', text],
			['X', url],
			['LinkedIn', url],
			['GitHub', url],
			['Website', url],
			['Featured', bool],
			['Homepage rank', int],
			['Public', bool],
			['Consent to publish', bool],
		],
	},
	Team: {
		primary: 'Name',
		fields: [
			['Role', text],
			['X', url],
			['LinkedIn', url],
			['GitHub', url],
			['Website', url],
			['Order', int],
			['Active', bool],
			['Featured', bool],
			['Public', bool],
			['Consent to publish', bool],
		],
	},
};

/**
 * Link-to-table pairs. Each is ONE Baserow relationship: the field is created
 * on `table`, and Baserow creates the reciprocal on `target`, which is then
 * renamed. `single` sides disallow multiple links.
 */
export const LINKS = [
	{ table: 'Photos', name: 'Activation', target: 'Activations', reciprocal: 'Photos', single: 'source' },
	{ table: 'Photos', name: 'City', target: 'Cities', reciprocal: 'Photos', single: 'source' },
	{ table: 'Cities', name: 'Representative photo', target: 'Photos', reciprocal: 'Representative photo of', single: 'source' },
	{ table: 'Relationships', name: 'Organization', target: 'Organizations', reciprocal: 'Relationships', single: 'source' },
	{ table: 'Relationships', name: 'Activation', target: 'Activations', reciprocal: 'Relationships', single: 'source' },
	{ table: 'Activations', name: 'City', target: 'Cities', reciprocal: 'Activations', single: 'source' },
	{ table: 'Activations', name: 'Cover photo', target: 'Photos', reciprocal: 'Cover photo of', single: 'source' },
	{ table: 'Activations', name: 'Projects', target: 'Projects', reciprocal: 'Activation', single: 'target' },
	{ table: 'Projects', name: 'Builders', target: 'Builders', reciprocal: 'Projects', single: 'none' },
	{ table: 'Projects', name: 'City', target: 'Cities', reciprocal: 'Projects', single: 'source' },
	{ table: 'Projects', name: 'Screenshots', target: 'Photos', reciprocal: 'Screenshot of', single: 'none' },
	{ table: 'Builders', name: 'City', target: 'Cities', reciprocal: 'Builders', single: 'source' },
	{ table: 'Builders', name: 'Portrait', target: 'Photos', reciprocal: 'Portrait of builder', single: 'source' },
	{ table: 'Team', name: 'City', target: 'Cities', reciprocal: 'Team', single: 'source' },
	{ table: 'Team', name: 'Portrait', target: 'Photos', reciprocal: 'Portrait of team member', single: 'source' },
];

/**
 * "Website" grid views: editorial convenience and defence in depth only.
 * The application truth gate stays authoritative.
 */
export const WEBSITE_VIEWS = {
	Photos: [['Usage', 'single_select_equal', 'Approved']],
	Cities: [['Public', 'boolean', '1'], ['Verified', 'boolean', '1']],
	Relationships: [['Public', 'boolean', '1'], ['Verified', 'boolean', '1']],
	Activations: [['Public', 'boolean', '1'], ['Verified', 'boolean', '1'], ['Status', 'single_select_equal', 'Published']],
	Projects: [['Public', 'boolean', '1'], ['Verified', 'boolean', '1'], ['Status', 'single_select_equal', 'Published']],
	Builders: [['Public', 'boolean', '1'], ['Consent to publish', 'boolean', '1']],
	Team: [['Public', 'boolean', '1'], ['Consent to publish', 'boolean', '1'], ['Active', 'boolean', '1']],
};

// ── Apply (resumable: everything is find-or-create by name) ───────────

const listFields = (tableId) => api('GET', `/database/fields/table/${tableId}/`);
const byName = (items, name) => items.find((item) => item.name === name);

async function findBuilderBaseDatabase(workspaceId) {
	const applications = await listApplications(workspaceId);
	return applications.find((application) => application.type === 'database' && application.name === DATABASE_NAME);
}

async function apply() {
	const resume = process.argv.includes('--resume');
	let workspace;
	let database;

	if (resume) {
		await authenticate();
		const workspaces = await listWorkspaces();
		workspace = workspaces.find((entry) => entry.name === WORKSPACE_NAME);
		if (!workspace || workspaces.length !== 1) throw new Error('Workspace check failed on resume.');
		database = await findBuilderBaseDatabase(workspace.id);
		if (!database) throw new Error('Nothing to resume: no Builder Base database.');
		console.log(`Resuming in database "${database.name}" (id ${database.id})`);
	} else {
		workspace = await preflight();
		if (!workspace) return;
		database = await api('POST', `/applications/workspace/${workspace.id}/`, { type: 'database', name: DATABASE_NAME });
		console.log(`\nCreated database "${database.name}" (id ${database.id})`);
	}

	// Tables, each created from a header-only row so Baserow adds no example data.
	const existingTables = await api('GET', `/database/tables/database/${database.id}/`);
	const tables = {};
	for (const [name, spec] of Object.entries(SCHEMA)) {
		tables[name] =
			byName(existingTables, name) ??
			(await api('POST', `/database/tables/database/${database.id}/`, {
				name,
				data: [[spec.primary]],
				first_row_header: true,
			}));
		console.log(`Table ${name}: id ${tables[name].id}`);
	}

	// Scalar fields.
	for (const [name, spec] of Object.entries(SCHEMA)) {
		const existing = await listFields(tables[name].id);
		const primary = existing.find((field) => field.primary);
		if (primary && primary.name !== spec.primary) {
			await api('PATCH', `/database/fields/${primary.id}/`, { name: spec.primary });
		}
		for (const [fieldName, definition] of spec.fields) {
			if (byName(existing, fieldName)) continue;
			await api('POST', `/database/fields/table/${tables[name].id}/`, { name: fieldName, ...definition });
		}
		console.log(`Fields ${name}: ${spec.fields.length + 1}`);
	}

	// Link-to-table pairs, then name and constrain the reciprocal side.
	for (const link of LINKS) {
		const sourceFields = await listFields(tables[link.table].id);
		let field = byName(sourceFields, link.name);
		if (!field) {
			field = await api('POST', `/database/fields/table/${tables[link.table].id}/`, {
				name: link.name,
				type: 'link_row',
				link_row_table_id: tables[link.target].id,
				has_related_field: true,
				link_row_multiple_relationships: link.single !== 'source',
			});
		}
		const relatedId = field.link_row_related_field_id;
		if (!relatedId) throw new Error(`${link.table}.${link.name} has no reciprocal field.`);
		await api('PATCH', `/database/fields/${relatedId}/`, {
			name: link.reciprocal,
			link_row_multiple_relationships: link.single !== 'target',
		});
		console.log(`Link ${link.table}.${link.name} ↔ ${link.target}.${link.reciprocal}`);
	}

	// Website views.
	for (const [name, filters] of Object.entries(WEBSITE_VIEWS)) {
		const tableId = tables[name].id;
		const views = await api('GET', `/database/views/table/${tableId}/`);
		if (byName(views, 'Website')) continue;
		const view = await api('POST', `/database/views/table/${tableId}/`, { name: 'Website', type: 'grid', filter_type: 'AND' });
		const fields = await listFields(tableId);
		for (const [fieldName, type, value] of filters) {
			const field = byName(fields, fieldName);
			const filterValue =
				type === 'single_select_equal' ? String(field.select_options.find((option) => option.value === value).id) : value;
			await api('POST', `/database/views/${view.id}/filters/`, { field: field.id, type, value: filterValue });
		}
		console.log(`View ${name}/Website: ${filters.length} filter(s)`);
	}

	console.log('\nApply finished. Run `verify` next.');
}

// ── Verify (independent read of the live schema) ──────────────────────

async function verify() {
	await authenticate();
	const problems = [];
	const workspaces = await listWorkspaces();
	const workspace = workspaces.find((entry) => entry.name === WORKSPACE_NAME);
	if (!workspace) throw new Error('Builder Base workspace not visible.');
	if (workspaces.some((entry) => FORBIDDEN.test(entry.name))) problems.push('WITH CLAUDE workspace visible');

	const applications = await listApplications(workspace.id);
	const database = applications.find((application) => application.type === 'database' && application.name === DATABASE_NAME);
	if (!database) throw new Error('Builder Base database not found.');
	console.log(`Workspace "${workspace.name}" (id ${workspace.id})`);
	console.log(`Database  "${database.name}" (id ${database.id})`);
	console.log(
		`Other applications in workspace (untouched): ${
			applications
				.filter((application) => application.id !== database.id)
				.map((application) => `"${application.name}" (id ${application.id}, ${application.tables?.length ?? 0} tables)`)
				.join(', ') || 'none'
		}`,
	);

	const tables = await api('GET', `/database/tables/database/${database.id}/`);
	const tableNames = tables.map((table) => table.name);
	const expectedTables = Object.keys(SCHEMA);
	if (tables.length !== expectedTables.length || expectedTables.some((name) => !tableNames.includes(name))) {
		problems.push(`tables: expected ${expectedTables.join(', ')}; found ${tableNames.join(', ')}`);
	}
	const tableById = new Map(tables.map((table) => [table.id, table]));
	const report = { databaseId: database.id, tables: {} };

	for (const table of tables) {
		const spec = SCHEMA[table.name];
		if (!spec) continue;
		const fields = await listFields(table.id);
		const rows = await api('GET', `/database/rows/table/${table.id}/?size=1`);
		if (rows.count !== 0) problems.push(`${table.name}: expected 0 rows, found ${rows.count}`);

		const expected = new Map([[spec.primary, { type: 'text', primary: true }], ...spec.fields.map(([n, d]) => [n, d])]);
		for (const link of LINKS) {
			if (link.table === table.name) expected.set(link.name, { type: 'link_row', to: link.target, single: link.single === 'source' });
			if (link.target === table.name) expected.set(link.reciprocal, { type: 'link_row', to: link.table, single: link.single === 'target' });
		}

		for (const [name, definition] of expected) {
			const field = byName(fields, name);
			if (!field) {
				problems.push(`${table.name}.${name}: missing`);
				continue;
			}
			if (field.type !== definition.type) problems.push(`${table.name}.${name}: type ${field.type}, expected ${definition.type}`);
			if (definition.primary && !field.primary) problems.push(`${table.name}.${name}: should be primary`);
			if (definition.select_options) {
				const actual = field.select_options.map((option) => option.value).join('|');
				const wanted = definition.select_options.map((option) => option.value).join('|');
				if (actual !== wanted) problems.push(`${table.name}.${name}: options "${actual}", expected "${wanted}"`);
			}
			if (definition.type === 'number' && field.number_decimal_places !== 0) problems.push(`${table.name}.${name}: decimals`);
			if (definition.type === 'link_row') {
				const target = tableById.get(field.link_row_table_id)?.name;
				if (target !== definition.to) problems.push(`${table.name}.${name}: links to ${target}, expected ${definition.to}`);
				if (field.link_row_multiple_relationships === definition.single) {
					problems.push(`${table.name}.${name}: multiple=${field.link_row_multiple_relationships}`);
				}
				const reciprocal = (await listFields(field.link_row_table_id)).find((f) => f.id === field.link_row_related_field_id);
				if (!reciprocal || reciprocal.link_row_related_field_id !== field.id) {
					problems.push(`${table.name}.${name}: reciprocal not paired`);
				}
			}
		}
		const unexpected = fields.filter((field) => !expected.has(field.name)).map((field) => field.name);
		if (unexpected.length) problems.push(`${table.name}: unexpected fields ${unexpected.join(', ')}`);

		const views = await api('GET', `/database/views/table/${table.id}/?include=filters`);
		const website = byName(views, 'Website');
		const wantedFilters = WEBSITE_VIEWS[table.name];
		if (wantedFilters) {
			if (!website) problems.push(`${table.name}: Website view missing`);
			else if (website.filters.length !== wantedFilters.length || website.filter_type !== 'AND') {
				problems.push(`${table.name}: Website view has ${website.filters.length} filters (${website.filter_type})`);
			}
		}

		report.tables[table.name] = {
			id: table.id,
			rows: rows.count,
			websiteView: website?.id,
			fields: fields.map((field) => ({
				name: field.name,
				type: field.type,
				id: field.id,
				...(field.primary ? { primary: true } : {}),
				...(field.select_options?.length ? { options: field.select_options.map((option) => option.value) } : {}),
				...(field.type === 'link_row'
					? { to: tableById.get(field.link_row_table_id)?.name, multiple: field.link_row_multiple_relationships }
					: {}),
			})),
		};
		console.log(`Table ${table.name.padEnd(13)} id ${table.id}  fields ${fields.length}  rows ${rows.count}  Website view ${website?.id ?? '—'}`);
	}

	// Every column the website adapter reads must exist on the live table.
	const { FIELDS } = await import('../src/lib/baserow/types.ts');
	const C = FIELDS.common;
	const adapterColumns = {
		Photos: [...Object.values(FIELDS.photos), C.featured, C.city],
		Cities: [...Object.values(FIELDS.cities), C.slug, C.featured, C.public, C.verified, C.verificationSource],
		Organizations: [...Object.values(FIELDS.organizations), C.slug],
		Relationships: [...Object.values(FIELDS.relationships), C.public, C.verified, C.verificationSource],
		Activations: [
			...Object.values(FIELDS.activations),
			...[C.slug, C.featured, C.city, C.status, C.homepageRank, C.public, C.verified, C.verificationSource],
		],
		Projects: [
			...Object.values(FIELDS.projects),
			...[C.slug, C.featured, C.city, C.status, C.homepageRank, C.public, C.verified, C.verificationSource],
		],
		Builders: [
			...Object.values(FIELDS.builders),
			...[C.city, C.x, C.linkedIn, C.github, C.website, C.featured, C.homepageRank, C.public, C.consent],
		],
		Team: [...Object.values(FIELDS.team), ...[C.city, C.x, C.linkedIn, C.github, C.website, C.featured, C.public, C.consent]],
	};
	let checked = 0;
	for (const [tableName, columns] of Object.entries(adapterColumns)) {
		const live = new Set(report.tables[tableName]?.fields.map((field) => field.name) ?? []);
		for (const column of columns) {
			checked++;
			if (!live.has(column)) problems.push(`adapter reads ${tableName}."${column}" but the live table has no such field`);
		}
	}
	console.log(`Adapter column map: ${checked} column references checked against the live schema`);

	if (process.argv.includes('--json')) console.log(`\nJSON ${JSON.stringify(report)}`);
	if (problems.length) {
		console.log(`\nVERIFY FAILED:\n - ${problems.join('\n - ')}`);
		process.exitCode = 1;
	} else {
		console.log('\nVERIFY PASSED — live schema matches the specification.');
	}
}

// ── Entry ─────────────────────────────────────────────────────────────

const command = process.argv[2];
const commands = { preflight, apply, verify };
if (!commands[command]) {
	console.error(`Usage: node scripts/baserow-setup.mjs <${Object.keys(commands).join('|')}>`);
	process.exit(1);
}
await commands[command]();
