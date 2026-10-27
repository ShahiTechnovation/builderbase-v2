/**
 * Content and structured metadata for the refined 5-chapter Builder Base /about experience.
 *
 * Concise, editorial, and grounded purely in verified activations and authentic photography.
 */

export interface CulturePhotoItem {
	src: string;
	alt: string;
	caption: string;
	aspect: string;
}

export interface CityNodeItem {
	name: string;
	note: string;
}

export const aboutData = {
	seo: {
		title: 'About — Builder Base',
		description:
			'Builder Base is the distribution layer for builders in India — connecting builders with the products, technology ecosystems, and opportunities worth building on.',
	},

	// ── CHAPTER 01: THE STATEMENT ────────────────────────────────────────
	hero: {
		marker: '01 /// THIS IS BUILDER BASE',
		statementTop: "WE DON'T JUST CONNECT BUILDERS.",
		statementBottom: 'WE CREATE MOMENTUM.',
		supportingCopy:
			'Good things happen when the right builders find the right people, the right opportunities, and the right room.',
		anchorTag: 'THE DISTRIBUTION LAYER FOR BUILDERS',
		scrollPrompt: 'SCROLL TO EXPLORE',
		featuredPhoto: {
			src: '/images/about/room-builder-base-banner.jpg',
			alt: 'Builders gathered together behind the Builder Base banner after an activation.',
			caption: 'Builder Base room activation · Central India',
		},
	},

	// ── CHAPTER 02: WHAT WE DO ───────────────────────────────────────────
	whatWeDo: {
		marker: '02 /// WHAT WE DO',
		headline: 'CONNECT. ACTIVATE. AMPLIFY.',
		subhead:
			'Builder Base is the distribution layer for builders in India — bringing ambitious engineers together to learn, build, and reach the world.',
		pillars: [
			{
				step: '01',
				name: 'CONNECT',
				summary:
					'Bring ambitious builders, founders, and ecosystems into meaningful physical rooms. No surface networking — curated environments where shared craft comes first.',
			},
			{
				step: '02',
				name: 'ACTIVATE',
				summary:
					'Turn passive interest into real execution. Hands-on build days, intensive workshops, and hackathons where code actually gets written and shipped.',
			},
			{
				step: '03',
				name: 'AMPLIFY',
				summary:
					'Help exceptional builders and projects travel further. Connecting working software directly to ecosystem grants, developer teams, and distribution.',
			},
		],
	},

	// ── CHAPTER 03: THE CULTURE ──────────────────────────────────────────
	culture: {
		marker: '03 /// THE CULTURE',
		headline: 'YOU HAD TO BE THERE.',
		subhead:
			'Builder Base lives in the physical energy of rooms across the country — late nights, open laptops, and people building together.',
		photographs: [
			{
				src: '/images/events/fable-5-1-build-day.webp',
				alt: 'Developers building full-stack agentic applications side-by-side during a Claude Code Build Day.',
				caption: 'Claude Code Build Day · Bhopal',
				aspect: '16 / 10',
			},
			{
				src: '/images/about/room-full-house.jpg',
				alt: 'A packed hall of builders, founders, and community members gathered for an engineering session.',
				caption: 'Community Builder Night · Central Node',
				aspect: '4 / 3',
			},
			{
				src: '/images/about/room-hackathon-floor.jpg',
				alt: 'Hackathon floor filled with teams collaborating with open laptops and code on screen.',
				caption: 'Protocol Sprint & Hackathon Floor · Delhi NCR',
				aspect: '16 / 9',
			},
		] as CulturePhotoItem[],
		archiveLink: {
			label: 'View all rooms in the Events archive',
			href: '/events',
		},
	},

	// ── CHAPTER 04: BUILT ACROSS INDIA ───────────────────────────────────
	footprint: {
		marker: '04 /// OUR FOOTPRINT',
		headline: 'THE NEXT ROOM COULD BE ANYWHERE.',
		subhead:
			'From central engineering hubs to mountain residencies and metro builder nights, our physical activations happen where builders build.',
		nodes: [
			{ name: 'DELHI NCR', note: 'Build Nights, Meetups & Hackathons' },
			{ name: 'BHOPAL', note: 'Claude Build Days, Agent Labs & Community Sessions' },
			{ name: 'MUMBAI', note: 'Developer Gatherings & Roadshows' },
			{ name: 'INDORE', note: 'Community Nights & Developer Meetups' },
			{ name: 'MANALI', note: 'Hack in the Hills Residency' },
			{ name: 'KOLKATA', note: 'Protocol Nights & Technical Sessions' },
		] as CityNodeItem[],
		coverageNote: 'Curated calendar coverage also spans Pune, Gwalior, and Bengaluru.',
	},

	// ── CHAPTER 05: THE INVITATION ───────────────────────────────────────
	invitation: {
		marker: '05 /// YOUR NEXT MOVE',
		headline: 'THE NEXT BIG THING STARTS IN A ROOM.',
		subhead: 'Find yours.',
		builders: {
			badge: 'FOR BUILDERS',
			headline: 'Find your next room.',
			description: 'Step into a room of ambitious peers, hands-on build days, and real opportunities.',
			action: {
				label: 'Find your next room',
				href: '/events',
			},
		},
		ecosystems: {
			badge: 'FOR ECOSYSTEMS',
			headline: 'Grow with Builder Base.',
			description: 'Reach verified developers and establish authentic distribution across India.',
			action: {
				label: 'Grow with Builder Base',
				href: '/partners',
			},
		},
		closingStatement: 'BUILDER BASE — THE DISTRIBUTION LAYER FOR BUILDERS.',
	},
} as const;
