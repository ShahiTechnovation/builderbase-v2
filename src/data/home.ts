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
		/**
		 * Editorial geography line beside "The". Never inferred from data: a
		 * city count overstates breadth (several verified cities share one
		 * metro region). It appears only when someone deliberately approves it
		 * against broader geographic evidence — set `approved: true` then.
		 */
		geography: { text: 'Building across India', approved: false },
	},
	culture: {
		title: ['You had to', 'be there.'],
		galleryLabel: 'Photographs from Builder Base rooms',
		maxPhotos: 5,
	},
	nextRooms: {
		marker: 'Upcoming',
		title: ['Next', 'rooms'],
		/**
		 * The Builder Base calendar also lists events other organisers run, so the
		 * section must not imply Builder Base hosts every one of them.
		 */
		note: "Rooms we're hosting, supporting, and watching.",
		calendarTitle: 'Builder Base upcoming events calendar',
		loadingLabel: 'Loading the calendar from Luma',
	},
} as const;
