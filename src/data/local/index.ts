import type { ContentSnapshot } from '../model';

export function loadLocalContent(): ContentSnapshot {
	return {
		source: 'local',
		degraded: false,
		partners: [],
		activations: [],
		projects: [],
	};
}
