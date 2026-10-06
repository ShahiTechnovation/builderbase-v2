/** Site-wide identity, navigation and actions. */

export interface NavLink {
	label: string;
	href: string;
	/** Renders the ↗ marker used for partner-facing links. */
	arrow?: boolean;
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
} as const;

/**
 * Where actions lead. Components read these; changing a destination never
 * requires editing a component.
 */
export const destinations = {
	// TEMPORARY: there is no join/community flow yet. Replace with the real one.
	join: '/events',
	partner: '/partners',
	// Public Builder Base calendar on Luma (verified 2026-10-06).
	lumaCalendar: 'https://luma.com/Builderbase',
} as const;

export const primaryNav: NavLink[] = [
	{ label: 'Events', href: '/events' },
	{ label: 'Projects', href: '/projects' },
	{ label: 'Stories', href: '/stories' },
	{ label: 'About', href: '/about' },
];

export const partnersNav: NavLink = { label: 'For partners', href: destinations.partner, arrow: true };

export const actions = {
	join: { label: 'Join the base', href: destinations.join },
	partner: { label: 'Partner with us', href: destinations.partner, arrow: true },
	lumaCalendar: { label: 'See the calendar on Luma', href: destinations.lumaCalendar, arrow: true },
} satisfies Record<string, NavLink>;
