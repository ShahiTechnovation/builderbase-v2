/**
 * Editorial photo selection. Placement is data (`heroRank`, `cultureRank`);
 * these functions only apply it. Pure — no asset resolution here.
 */
import type { Photo } from './model';
import { isPhotoPublishable } from './public';

function ranked(photos: Photo[], rank: (photo: Photo) => number | undefined): Photo[] {
	return photos
		.filter((photo) => isPhotoPublishable(photo) && rank(photo) !== undefined)
		.sort((a, b) => rank(a)! - rank(b)! || a.id.localeCompare(b.id));
}

/** Hero candidates in priority order; the first resolvable one is used. */
export function heroCandidates(photos: Photo[]): Photo[] {
	return ranked(photos, (photo) => photo.heroRank);
}

/** Culture gallery candidates in display order (limit after resolving assets). */
export function cultureCandidates(photos: Photo[]): Photo[] {
	return ranked(photos, (photo) => photo.cultureRank);
}
