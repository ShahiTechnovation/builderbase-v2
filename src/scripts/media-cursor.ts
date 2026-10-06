/**
 * Contextual media cursor.
 *
 * Supplements (never replaces) the native pointer over specific photographic
 * controls marked `[data-cursor-label]`, e.g. a collapsed gallery photo that
 * opens on click. Desktop fine pointers only, never on touch, never with
 * reduced motion. The label sits beside the pointer and ignores events, so it
 * cannot obscure what is being pointed at or intercept clicks.
 */

const capable = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let cursor: HTMLElement | undefined;
let label: HTMLElement | undefined;
let current: HTMLElement | null = null;

function ensureCursor(): HTMLElement {
	if (cursor) return cursor;
	cursor = document.createElement('div');
	cursor.className = 'media-cursor';
	cursor.setAttribute('aria-hidden', 'true');
	label = document.createElement('span');
	cursor.append(label);
	document.body.append(cursor);
	return cursor;
}

function hide(): void {
	current = null;
	cursor?.removeAttribute('data-visible');
}

function onPointerMove(event: PointerEvent): void {
	if (event.pointerType !== 'mouse' || !capable.matches || reducedMotion.matches) return hide();

	const target = (event.target as Element | null)?.closest<HTMLElement>('[data-cursor-label]') ?? null;
	if (!target) return hide();

	const element = ensureCursor();
	element.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
	if (target !== current) {
		current = target;
		if (label) label.textContent = target.dataset.cursorLabel ?? '';
		element.setAttribute('data-visible', '');
	}
}

let initialised = false;

export function initMediaCursor(): void {
	if (initialised) return;
	initialised = true;
	document.addEventListener('pointermove', onPointerMove, { passive: true });
	// Entering an iframe (e.g. the Luma calendar) stops pointermove in this
	// document; `pointerover` still fires on the iframe element itself, and
	// focus moving into it blurs the window. Both hide the label.
	document.addEventListener('pointerover', onPointerMove, { passive: true });
	document.addEventListener('pointerleave', hide);
	window.addEventListener('blur', hide);
	window.addEventListener('scroll', hide, { passive: true });
	document.addEventListener('keydown', hide);
	document.addEventListener('pointerdown', (event) => {
		if (event.pointerType !== 'mouse') hide();
	});
}

/** Call after changing a target's label (e.g. it became the active photo). */
export function refreshMediaCursor(): void {
	if (current && !current.hasAttribute('data-cursor-label')) hide();
}
