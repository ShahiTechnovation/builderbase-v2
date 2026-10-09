/**
 * Loads a full content snapshot from Baserow.
 *
 * Tables load in parallel and independently: if one fails or is not
 * configured it contributes nothing (and the snapshot is marked degraded),
 * so a single broken table cannot take the homepage down. Photos are the
 * exception the caller handles — see `src/data/content.ts`.
 */
import type { ContentSnapshot } from '../../data/model';
import {
	isPublicActivation,
	isPublicProject,
} from '../../data/public';
import type { FetchLike } from '../http';
import { listAllRows } from './client';
import {
	mapActivation,
	mapPartner,
	mapProject,
	mapRows,
} from './mappers';
import type { BaserowRow, BaserowTable } from './types';

export interface BaserowConfig {
	apiUrl: string;
	token: string;
	tables: Partial<Record<BaserowTable, number>>;
}

export interface BaserowLoadResult {
	snapshot: ContentSnapshot;
	/** Tables that could not be loaded. */
	failed: BaserowTable[];
	issues: string[];
}

export async function loadBaserowContent(config: BaserowConfig, fetchImpl?: FetchLike): Promise<BaserowLoadResult> {
	const failed: BaserowTable[] = [];
	const issues: string[] = [];

	const load = async (table: BaserowTable): Promise<BaserowRow[]> => {
		const tableId = config.tables[table];
		if (!tableId) return [];
		try {
			return await listAllRows({ apiUrl: config.apiUrl, token: config.token, fetchImpl }, tableId);
		} catch (error) {
			failed.push(table);
			issues.push(`${table}: ${error instanceof Error ? error.message : String(error)}`);
			return [];
		}
	};

	const [activations, partners, projects] = await Promise.all([
		load('events'),
		load('partners'),
		load('projects'),
	]);

	const collect = <T>(result: { records: T[]; issues: string[] }) => {
		issues.push(...result.issues);
		return result.records;
	};

	return {
		failed,
		issues,
		snapshot: {
			source: 'baserow',
			degraded: failed.length > 0,
			activations: collect(mapRows(activations, mapActivation, isPublicActivation)),
			partners: collect(mapRows(partners, mapPartner, () => true)),
			projects: collect(mapRows(projects, mapProject, isPublicProject)),
		},
	};
}
