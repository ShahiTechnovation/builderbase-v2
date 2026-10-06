/** Homepage content. Swapping a photo here must not require touching components. */
import { getPhoto, type PhotoId } from './photos';

const cultureOrder: PhotoId[] = [
	'room-full-house',
	'room-stage-steps',
	'room-builder-base-banner',
	'room-restaurant',
	'room-hackathon-floor',
];

export const hero = {
	statement: {
		lead: 'The',
		anchor: 'distribution',
		tail: 'layer for builders.',
	},
	// Kept from the approved composition. Truthful only while Builder Base is
	// active in more than one Indian city — revisit with verified city data.
	meta: 'Building across India',
	photo: getPhoto('room-hackathon-floor'),
};

export const culture = {
	title: ['You had to', 'be there.'],
	galleryLabel: 'Photographs from Builder Base rooms',
	photos: cultureOrder.map(getPhoto),
};
