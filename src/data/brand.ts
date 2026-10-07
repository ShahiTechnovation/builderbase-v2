/**
 * The Builder Base BB monogram, read once from its single local asset
 * (src/assets/brand/bb-monogram.svg — a cleaned, simplified copy of the traced
 * mark, viewBox cropped to the mark itself). The header defines it as an SVG
 * <symbol>; the header mark and the opening sequence both <use> that symbol,
 * so they are the same geometry and the page carries the path only once.
 */
import source from '../assets/brand/bb-monogram.svg?raw';

const viewBox = /viewBox="([^"]+)"/.exec(source)?.[1];
const path = /\sd="([^"]+)"/.exec(source)?.[1];
if (!viewBox || !path) throw new Error('[brand] bb-monogram.svg must have a viewBox and one path.');

export const monogram = {
	/** Shared <symbol> id (defined in SiteHeader.astro). */
	id: 'bb-monogram',
	viewBox,
	path,
} as const;
