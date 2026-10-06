/**
 * /ecosystem copy. Organisations, relationships and counts are NOT here: they
 * come from content records through the truth gate (src/data/ecosystem.ts).
 */
import { destinations, type NavLink } from './site';

export const ecosystemPage = {
	seo: {
		title: 'Ecosystem',
		description:
			'The organisations Builder Base has verifiably worked with — co-hosts, partners and communities — and the work behind each relationship.',
	},
	stage: {
		lead: 'The',
		anchor: 'Ecosystem',
		marker: 'Builder Base — Network',
		indexTitle: 'Index',
		hintPointer: 'Drag to rotate',
		hintTouch: 'Swipe to move',
		/** Shown instead of the sphere when no relationship is publishable yet. */
		empty: 'Relationships appear here once they are verified.',
		fixtureNotice: 'Development fixture — fictional organisations',
		cursorLabel: 'View',
	},
	detail: {
		close: 'Close',
		dialogLabel: 'Organisation details',
		website: 'Website',
		workTitle: 'The work',
		eventLink: 'Event page',
		/** Works listed before "View the work" reveals the rest. */
		initialWorks: 3,
		moreWorks: 'View the work',
	},
	invitation: {
		marker: 'For partners',
		quote: 'We want to grow in India.',
		answer: 'Good. We know some builders.',
		action: { label: 'Build with Builder Base', href: destinations.partner, arrow: true } satisfies NavLink,
	},
} as const;
