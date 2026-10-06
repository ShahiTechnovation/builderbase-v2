/**
 * The only path from the content model to public copy.
 *
 * Every helper here returns nothing unless the underlying facts are verified,
 * so unverified context can never reach the page as a claim or a placeholder.
 */
import type { Photo } from './model';
import { activations, cities } from './registry';

/** Caption lines for a photo: verified city (if any), then activation title. Empty when unverified. */
export function publicPhotoCaption(photo: Photo): string[] {
	if (!photo.activationId) return [];

	const activation = activations.find((entry) => entry.id === photo.activationId);
	if (!activation?.verification.verified) return [];

	const city = cities.find((entry) => entry.id === activation.cityId);
	const lines = [activation.title];
	if (city?.verification.verified) lines.unshift(city.name);
	return lines;
}
