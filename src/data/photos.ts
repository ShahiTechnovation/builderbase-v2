/**
 * Photography library.
 *
 * All five photographs are TEMPORARY Phase 1 content. Masters are produced with
 * `scripts/prepare-photos.mjs` (resize + metadata strip only).
 *
 * None of these photos is linked to an activation yet, so no public
 * metadata (city, event, organisation, date) is displayed for them.
 */
import type { Photo } from './model';

import roomBuilderBaseBanner from '../assets/photos/room-builder-base-banner.jpg';
import roomFullHouse from '../assets/photos/room-full-house.jpg';
import roomHackathonFloor from '../assets/photos/room-hackathon-floor.jpg';
import roomRestaurant from '../assets/photos/room-restaurant.jpg';
import roomStageSteps from '../assets/photos/room-stage-steps.jpg';

export const photos = [
	{
		id: 'room-hackathon-floor',
		image: roomHackathonFloor,
		alt: 'Two builders wearing hackathon lanyards raise their fists to the camera while teams work at laptops across the room behind them.',
		focal: { x: 60, y: 45 },
		focalPortrait: { x: 74, y: 50 },
		internalNote:
			'Source is already upscaled (2010px). Third-party logos on badges and a roll-up banner. Event, organiser and city unverified.',
	},
	{
		id: 'room-full-house',
		image: roomFullHouse,
		alt: 'A packed group photo in a venue with gold curtains and arched wall panels, the front row kneeling.',
		focal: { x: 50, y: 60 },
		focalPortrait: { x: 50, y: 62 },
		internalNote:
			'Stellar branding visible (projector, roll-up, t-shirts). Builder Base role and relationship unverified — do not imply a partnership.',
	},
	{
		id: 'room-stage-steps',
		image: roomStageSteps,
		alt: 'A large group stands together on tiered steps in front of a bright LED screen in an industrial venue.',
		focal: { x: 50, y: 62 },
		focalPortrait: { x: 48, y: 64 },
		internalNote:
			'Arbitrum branding visible (LED wall, tote bags). City and relationship unverified — do not imply a partnership.',
	},
	{
		id: 'room-builder-base-banner',
		image: roomBuilderBaseBanner,
		alt: 'A large group of builders gathered behind a white Builder Base banner.',
		focal: { x: 50, y: 55 },
		focalPortrait: { x: 50, y: 58 },
		internalNote: 'Only photo with Builder Base branding in frame. Low resolution (1654px, upscaled). City and date unverified.',
	},
	{
		id: 'room-restaurant',
		image: roomRestaurant,
		alt: 'A group holds a large banner inside a restaurant with carved lattice arches and hanging lamps.',
		focal: { x: 40, y: 58 },
		focalPortrait: { x: 42, y: 56 },
		internalNote:
			'Sentient branding visible on the banner. City and relationship unverified — do not imply a partnership.',
	},
] as const satisfies readonly Photo[];

export type PhotoId = (typeof photos)[number]['id'];

export function getPhoto(id: PhotoId): Photo {
	const photo = photos.find((entry) => entry.id === id);
	if (!photo) throw new Error(`Unknown photo: ${id}`);
	return photo;
}
