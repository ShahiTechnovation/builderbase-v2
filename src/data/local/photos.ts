/**
 * Local photography records — the repository's own content source.
 *
 * All five are TEMPORARY Round 2 photographs, approved for use while better
 * assets are gathered. None is linked to an activation, so no city, event or
 * organisation is shown for them. Masters live in `src/assets/photos/` and
 * are produced with `scripts/prepare-photos.mjs`.
 *
 * Curation is data: change `heroRank` / `cultureRank` to re-order or swap the
 * hero and the lead culture image. Lower rank leads; omit to exclude.
 */
import type { Photo } from '../model';

export const localPhotos: Photo[] = [
	{
		id: 'room-hackathon-floor',
		asset: { kind: 'local', key: 'room-hackathon-floor' },
		alt: 'Two builders wearing hackathon lanyards raise their fists to the camera while teams work at laptops across the room behind them.',
		focal: { x: 60, y: 45 },
		focalPortrait: { x: 74, y: 50 },
		usage: 'approved',
		heroRank: 1,
		cultureRank: 5,
		featured: true,
		tags: ['round-2', 'temporary'],
		internalNote:
			'Source is already upscaled (2010px). Third-party logos on badges and a roll-up banner. Event, organiser and city unverified.',
	},
	{
		id: 'room-full-house',
		asset: { kind: 'local', key: 'room-full-house' },
		alt: 'A packed group photo in a venue with gold curtains and arched wall panels, the front row kneeling.',
		focal: { x: 50, y: 60 },
		focalPortrait: { x: 50, y: 62 },
		usage: 'approved',
		cultureRank: 1,
		featured: true,
		tags: ['round-2', 'temporary'],
		internalNote:
			'Stellar branding visible (projector, roll-up, t-shirts). Builder Base role and relationship unverified — do not imply a partnership. Lead position is temporary.',
	},
	{
		id: 'room-stage-steps',
		asset: { kind: 'local', key: 'room-stage-steps' },
		alt: 'A large group stands together on tiered steps in front of a bright LED screen in an industrial venue.',
		focal: { x: 50, y: 62 },
		focalPortrait: { x: 48, y: 64 },
		usage: 'approved',
		cultureRank: 2,
		featured: false,
		tags: ['round-2', 'temporary'],
		internalNote:
			'Arbitrum branding visible (LED wall, tote bags). City and relationship unverified — do not imply a partnership.',
	},
	{
		id: 'room-builder-base-banner',
		asset: { kind: 'local', key: 'room-builder-base-banner' },
		alt: 'A large group of builders gathered behind a white Builder Base banner.',
		focal: { x: 50, y: 55 },
		focalPortrait: { x: 50, y: 58 },
		usage: 'approved',
		cultureRank: 3,
		featured: true,
		tags: ['round-2', 'temporary'],
		internalNote: 'Only photo with Builder Base branding in frame. Low resolution (1654px, upscaled). City and date unverified.',
	},
	{
		id: 'room-restaurant',
		asset: { kind: 'local', key: 'room-restaurant' },
		alt: 'A group holds a large banner inside a restaurant with carved lattice arches and hanging lamps.',
		focal: { x: 40, y: 58 },
		focalPortrait: { x: 42, y: 56 },
		usage: 'approved',
		cultureRank: 4,
		featured: false,
		tags: ['round-2', 'temporary'],
		internalNote:
			'Sentient branding visible on the banner. City and relationship unverified — do not imply a partnership.',
	},
];
