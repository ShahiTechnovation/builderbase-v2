// Prepares source photographs for the repository.
//
// Camera originals (often 5000px+, 5–10 MB, with EXIF/GPS) are never committed
// or shipped. This script produces web masters that Astro's image pipeline
// then turns into responsive AVIF/WebP/JPEG at build time.
//
// It only resizes and re-encodes: no colour grading, no retouching, no
// generative changes. EXIF orientation is applied and all metadata (including
// location) is stripped.
//
// Usage:
//   node scripts/prepare-photos.mjs <source-file> <output-name> [<source-file> <output-name> ...]
//
// Example:
//   node scripts/prepare-photos.mjs ~/Downloads/IMG_0412.jpg room-hackathon-floor

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const OUTPUT_DIR = resolve(import.meta.dirname, '../src/assets/photos');
const MAX_LONG_EDGE = 2400;
const JPEG_QUALITY = 86;

const args = process.argv.slice(2);
if (args.length === 0 || args.length % 2 !== 0) {
	console.error('Usage: node scripts/prepare-photos.mjs <source> <name> [<source> <name> ...]');
	process.exit(1);
}

await mkdir(OUTPUT_DIR, { recursive: true });

for (let i = 0; i < args.length; i += 2) {
	const source = resolve(args[i]);
	const output = resolve(OUTPUT_DIR, `${args[i + 1]}.jpg`);

	const info = await sharp(source)
		.rotate()
		.resize({
			width: MAX_LONG_EDGE,
			height: MAX_LONG_EDGE,
			fit: 'inside',
			withoutEnlargement: true,
		})
		.jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: '4:4:4' })
		.toFile(output);

	console.log(`${args[i + 1]}.jpg  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
}
