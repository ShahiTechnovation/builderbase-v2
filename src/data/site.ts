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

export const primaryNav: NavLink[] = [
	{ label: 'Events', href: '/events' },
	{ label: 'Projects', href: '/projects' },
	{ label: 'Stories', href: '/stories' },
	{ label: 'About', href: '/about' },
];

export const partnersNav: NavLink = { label: 'For partners', href: '/partners', arrow: true };

export const actions = {
	// Destination pending: there is no join flow yet. Confirm before launch.
	join: { label: 'Join the base', href: '/events' },
	partner: { label: 'Partner with us', href: '/partners', arrow: true },
} satisfies Record<string, NavLink>;
