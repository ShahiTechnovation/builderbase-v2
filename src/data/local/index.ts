/**
 * The local content source: typed records kept in the repository.
 *
 * It is the default source and the fallback when Baserow is unavailable. It
 * holds photographs only. Facts (cities, activations, relationships, people,
 * projects) are intentionally empty: they belong in Baserow once verified,
 * and the old repository's seed data is not evidence.
 */
import type { ContentSnapshot } from '../model';
import { localPhotos } from './photos';

export function loadLocalContent(): ContentSnapshot {
	return {
		source: 'local',
		degraded: false,
		photos: localPhotos,
		cities: [],
		organizations: [],
		relationships: [],
		activations: [],
		projects: [],
		builders: [],
		teamMembers: [],
	};
}
