/** Site-wide identity, navigation and actions. */

export interface NavLink {
	label: string;
	href: string;
	/** Renders the ↗ marker used for partner-facing and external links. */
	arrow?: boolean;
	/** Extra words for assistive tech only, e.g. "on Luma" for an external destination. */
	hint?: string;
}

export const site = {
	name: 'Builder Base',
	/** Text wordmark. The existing logo file is a bitmap inside an SVG, so it is not used until a vector exists. */
	wordmark: 'builder base',
	statement: 'The distribution layer for builders.',
	description:
		'Builder Base is the distribution layer for builders in India — connecting builders with the products, technology ecosystems and opportunities worth building on.',
	locale: 'en_IN',
	themeColor: '#f4f2ed',
	themeColorDark: '#0e0f13',
	contact: '/contact',
} as const;

/**
 * Where actions lead. Components read these; changing a destination never
 * requires editing a component.
 */
export const destinations = {
	// TEMPORARY: there is no join/community flow yet. Replace with the real one.
	join: '/events',
	partner: '/partners',
	collaborate: '/collaborate',
	contact: '/contact',
	// Public Builder Base calendar on Luma (verified 2026-10-06).
	lumaCalendar: 'https://luma.com/Builderbase',
	// Official Luma calendar embed (supplied by Builder Base). No extra parameters.
	lumaCalendarEmbed: 'https://luma.com/embed/calendar/cal-Rmfu84P0S7JWiHl/events',
	// Official Builder Base X / Twitter profile
	x: 'https://x.com/theBuilder_base',
	// Official Builder Base LinkedIn company profile
	linkedIn: 'https://www.linkedin.com/company/builder-base',
	// Official Builder Base Instagram profile
	instagram: 'https://www.instagram.com/the.builderbase/?hl=en',
	// Official Tally form destinations
	tallyPartnership: 'https://tally.so/r/rDD0QM',
	tallyCollaborate: 'https://tally.so/r/xVV07G',
	tallyContact: 'https://tally.so/r/Z99GA0',
} as const;

export const primaryNav: NavLink[] = [
	{ label: 'Events', href: '/events' },
	{ label: 'Ecosystem', href: '/ecosystem' },
	{ label: 'About', href: '/about' },
];

export const partnersNav: NavLink = { label: 'For partners', href: destinations.partner, arrow: true };

export const actions = {
	join: { label: 'Join the base', href: destinations.join },
	partner: { label: 'Partner with us', href: destinations.partner, arrow: true },
	collaborate: { label: 'Host an event', href: destinations.collaborate, arrow: true },
	contact: { label: 'Contact us', href: destinations.contact, arrow: true },
	lumaCalendar: { label: 'See the calendar on Luma', href: destinations.lumaCalendar, arrow: true },
	fullCalendar: { label: 'View full calendar', href: destinations.lumaCalendar, arrow: true, hint: 'on Luma' },
} satisfies Record<string, NavLink>;

export interface FooterNavGroup {
	title: string;
	links: Array<{
		label: string;
		href: string;
		external?: boolean;
		hint?: string;
	}>;
}

export const footerNav: FooterNavGroup[] = [
	{
		title: 'EXPLORE',
		links: [
			{ label: 'Home', href: '/' },
			{ label: 'Events', href: '/events' },
			{ label: 'Ecosystem', href: '/ecosystem' },
			{ label: 'About', href: '/about' },
		],
	},
	{
		title: 'GET INVOLVED',
		links: [
			{ label: 'Join the Base', href: destinations.join },
			{ label: 'For Partners', href: destinations.partner },
			{ label: 'Host an Event', href: destinations.collaborate },
			{ label: 'Contact', href: destinations.contact },
		],
	},
	{
		title: 'CONNECT',
		links: [
			{ label: 'X / Twitter', href: destinations.x, external: true, hint: 'opens in new tab' },
			{ label: 'LinkedIn', href: destinations.linkedIn, external: true, hint: 'opens in new tab' },
			{ label: 'Instagram', href: destinations.instagram, external: true, hint: 'opens in new tab' },
			{ label: 'Luma Calendar', href: destinations.lumaCalendar, external: true, hint: 'opens in new tab' },
		],
	},
];
