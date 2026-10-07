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
	isPhotoPublishable,
	isPublicActivation,
	isPublicBuilder,
	isPublicCity,
	isPublicProject,
	isPublicRelationship,
	isPublicTeamMember,
} from '../../data/public';
import type { FetchLike } from '../http';
import { listAllRows } from './client';
import {
	mapActivation,
	mapBuilder,
	mapCity,
	mapOrganization,
	mapPhoto,
	mapProject,
	mapRelationship,
	mapRows,
	mapTeamMember,
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

	const [photos, cities, organizations, relationships, activations, projects, builders, team] = await Promise.all([
		load('photos'),
		load('cities'),
		load('organizations'),
		load('relationships'),
		load('events'),
		load('projects'),
		load('builders'),
		load('team'),
	]);

	const collect = <T>(result: { records: T[]; issues: string[] }) => {
		issues.push(...result.issues);
		return result.records;
	};

	// Publication rules come from the truth gate, so the adapter and the pages
	// can never disagree about what is public.
	return {
		failed,
		issues,
		snapshot: {
			source: 'baserow',
			degraded: failed.length > 0,
			photos: collect(mapRows(photos, mapPhoto, isPhotoPublishable)),
			cities: collect(mapRows(cities, mapCity, isPublicCity)),
			// An organisation on its own makes no claim; claims live in relationships.
			organizations: collect(mapRows(organizations, mapOrganization, () => true)),
			relationships: collect(mapRows(relationships, mapRelationship, isPublicRelationship)),
			activations: collect(mapRows(activations, mapActivation, isPublicActivation)), // Map to the domain term 'activations'
			projects: collect(mapRows(projects, mapProject, isPublicProject)),
			builders: collect(mapRows(builders, mapBuilder, isPublicBuilder)),
			teamMembers: collect(mapRows(team, mapTeamMember, isPublicTeamMember)),
		},
	};
}
