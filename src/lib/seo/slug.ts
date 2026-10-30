/**
 * Slugging and URL utilities for events, cities, and editorial content.
 */

export function slugify(text?: string | null): string {
	if (!text) return '';
	return text
		.toLowerCase()
		.replace(/[\u2018\u2019]/g, "'") // curly quotes
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60)
		.replace(/-+$/, '');
}

export function eventToSlug(event: { id?: string; title?: string }): string {
	const titleSlug = slugify(event.title || event.id || 'event');
	const idSuffix = (event.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toLowerCase();
	return idSuffix ? `${titleSlug}-${idSuffix}` : titleSlug;
}
