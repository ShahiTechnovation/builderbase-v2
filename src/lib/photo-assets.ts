/**
 * Photo binary delivery.
 *
 * Content records (local or Baserow) only *refer* to an image. This module
 * turns a reference into something Astro's image pipeline can optimise:
 *  - local keys resolve to masters in `src/assets/photos/`;
 *  - remote URLs pass through with their stored dimensions (the host must be
 *    allowed via PHOTO_ASSET_HOSTS for build-time optimisation).
 *
 * A reference that cannot be resolved yields `undefined` so the page renders
 * without that photo instead of failing.
 */
import type { ImageMetadata } from 'astro';
import type { Photo, PhotoAssetRef, PhotoImage, ResolvedPhoto } from '../data/model';

const masters = import.meta.glob<{ default: ImageMetadata }>('/src/assets/photos/*.{jpg,jpeg,png,webp,avif}', {
	eager: true,
});

const localAssets = new Map(
	Object.entries(masters).map(([path, module]) => [
		path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.')),
		module.default,
	]),
);

export function resolvePhotoAsset(asset: PhotoAssetRef): PhotoImage | undefined {
	if (asset.kind === 'local') return localAssets.get(asset.key);
	if (asset.width > 0 && asset.height > 0) return { src: asset.url, width: asset.width, height: asset.height };
	return undefined;
}

export function resolvePhoto(photo: Photo): ResolvedPhoto | undefined {
	const image = resolvePhotoAsset(photo.asset);
	if (!image) {
		console.warn(`[photos] Asset for "${photo.id}" could not be resolved; the photo is skipped.`);
		return undefined;
	}
	return { ...photo, image };
}
