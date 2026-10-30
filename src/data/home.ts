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
	proof: {
		title: ['Proof,', 'not promises.'],
		items: [
			{
				stat: '10K+',
				label: 'Builders activated through our ecosystem',
			},
			{
				stat: '1M+',
				label: 'Reach across builder campaigns',
			},
			{
				stat: '25',
				label: 'Organizations across our ecosystem',
				link: { text: 'Organizations', href: '/ecosystem' },
			},
			{
				stat: '100+',
				label: 'Past events across our network',
				link: { text: 'Past events', href: '/events' },
			},
		],
	},
	ecosystemBridge: {
		title: 'Connected to the ecosystem',
		description: 'A network of founders, investors, and operators.'
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
	partnerConversion: {
		title: 'Scale your distribution.',
	},
	cultureFlag: {
		eyebrow: 'BUILDER BASE / THE CULTURE',
		headline: ['Not just a community.', 'A flag worth carrying.'],
		supporting: 'Built by builders. Carried everywhere.',
	},
	builderClosing: {
		title: 'Build something worth distributing.',
		marquee: 'BUILDER BASE '
	},
} as const;
