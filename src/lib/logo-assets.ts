/**
 * Organisation logo (and ecosystem artifact image) delivery.
 *
 * A logo reaches the page only when the content record permits its use (the
 * Baserow mapper drops it otherwise) AND it is stored on an approved asset
 * host (PHOTO_ASSET_HOSTS → `image.remotePatterns`), where Astro optimises it
 * at build time. Third-party logo URLs are never hotlinked and favicons are
 * never fetched: anything else falls back to the organisation's name.
 */
import { imageConfig } from 'astro:assets';
import { isRemoteAllowed } from 'astro/assets/utils';
import type { PhotoAssetRef, PhotoImage } from '../data/model';

export function resolveLogo(asset: PhotoAssetRef | undefined, organization: string): PhotoImage | undefined {
	// Also used for ecosystem image artifacts: same permission, same hosts.
	if (!asset) return undefined;
	if (asset.kind !== 'remote' || !(asset.width > 0 && asset.height > 0)) return undefined;
	if (!isRemoteAllowed(asset.url, imageConfig)) {
		console.warn(`[logos] "${organization}": image is not on an approved asset host — not shown.`);
		return undefined;
	}
	return { src: asset.url, width: asset.width, height: asset.height };
}
