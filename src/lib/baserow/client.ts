/**
 * Minimal Baserow REST client (server-side, build time only).
 *
 * Uses a database token (`Authorization: Token …`) that should be scoped to
 * READ on the Builder Base tables only. Pages through the list-rows endpoint
 * with human field names.
 */
import { fetchJson, type FetchLike } from '../http';
import type { BaserowListResponse, BaserowRow } from './types';

export interface BaserowClientOptions {
	apiUrl: string;
	token: string;
	fetchImpl?: FetchLike;
}

const PAGE_SIZE = 200; // Baserow's maximum
const MAX_PAGES = 50; // 10,000 rows — far beyond expected content volume

export async function listAllRows(options: BaserowClientOptions, tableId: number): Promise<BaserowRow[]> {
	const base = options.apiUrl.replace(/\/+$/, '');
	let url: string | null = `${base}/api/database/rows/table/${tableId}/?user_field_names=true&size=${PAGE_SIZE}`;
	const rows: BaserowRow[] = [];

	for (let page = 0; url && page < MAX_PAGES; page++) {
		const response: BaserowListResponse<BaserowRow> = await fetchJson(url, {
			headers: { Authorization: `Token ${options.token}` },
			fetchImpl: options.fetchImpl,
		});
		rows.push(...response.results);
		url = response.next;
	}

	return rows;
}
