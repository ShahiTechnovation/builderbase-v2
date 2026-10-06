/**
 * Homepage copy and section settings. Photography is NOT bound here: hero and
 * gallery images are chosen by the photo records' `heroRank` / `cultureRank`
 * (see src/data/curation.ts), so swapping them is a content change.
 */
export const home = {
	hero: {
		statement: {
			lead: 'The',
			anchor: 'distribution',
			tail: 'layer for builders.',
		},
		/** Rendered only when the truth gate allows it (verified activity in 2+ Indian cities). */
		nationalPresenceMeta: 'Building across India',
	},
	culture: {
		title: ['You had to', 'be there.'],
		galleryLabel: 'Photographs from Builder Base rooms',
		maxPhotos: 5,
	},
} as const;
