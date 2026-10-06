/**
 * Organisation detail plate (see EcosystemRecords.astro).
 *
 * The records are server-rendered articles inside one <dialog>; opening shows
 * one of them. Without JavaScript the dialog is shown as an in-page archive
 * and the index links jump to it.
 *
 * Motion (FLIP): the paper plate travels from the organisation's plate in the
 * world to its place, then its content settles; closing reverses it back to
 * where the organisation now sits. Reduced motion: opens and closes in place.
 *
 * Close button, Escape and a click outside the plate all close it; focus
 * returns to the organisation's index link.
 */
import type { PlaneSource, WorldHandle } from './ecosystem-world';

const EASE = 'cubic-bezier(0.2, 0.7, 0.1, 1)'; // --ease-editorial
const OPEN_MS = 620;
const CLOSE_MS = 520;
/** Share of the return during which the plate dissolves into the plane at its own depth. */
const HANDOVER = 0.3;
const PAPER = 'rgb(244 242 237)'; // --paper

export function initEcosystemDetail(dialog: HTMLDialogElement, world: WorldHandle | undefined) {
	const panel = dialog.querySelector<HTMLElement>('[data-eco-panel]');
	const body = dialog.querySelector<HTMLElement>('[data-eco-body]');
	const bar = dialog.querySelector<HTMLElement>('[data-eco-bar]');
	const records = [...dialog.querySelectorAll<HTMLElement>('[data-eco-record]')];
	if (!panel || !body) return undefined;

	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	let current: string | undefined;
	let closing: Animation | undefined;
	let origin = PAPER;

	// Records become one-at-a-time and the "more work" buttons start working.
	records.forEach((record) => (record.hidden = true));
	dialog.setAttribute('aria-modal', 'true');

	function opener(slug: string): HTMLElement | null {
		return document.querySelector<HTMLElement>(`[data-eco-link][data-slug="${CSS.escape(slug)}"]`);
	}

	/** What travels is the plate; its contents (and the Close bar) fade in after it lands. */
	const contents = () => [body!, ...(bar ? [bar] : [])];

	/**
	 * Transform that lays the panel exactly over the plane as rendered — its
	 * projected quad, perspective included — not just its bounding box.
	 */
	function onto(source: PlaneSource): string {
		const box = panel!.getBoundingClientRect();
		return new DOMMatrix()
			.translate(-box.left, -box.top)
			.multiply(source.matrix)
			.scale(source.width / box.width, source.height / box.height, 1)
			.toString();
	}

	function open(slug: string): void {
		const record = records.find((candidate) => candidate.dataset.slug === slug);
		if (!record || dialog.open) return;
		current = slug;
		records.forEach((candidate) => (candidate.hidden = candidate !== record));
		record.removeAttribute('data-expanded');
		dialog.setAttribute('aria-labelledby', `${record.id}-name`);

		const source = world?.source(slug);
		const scrollbar = window.innerWidth - document.documentElement.clientWidth;
		document.documentElement.style.setProperty('--eco-scrollbar', `${scrollbar}px`);
		dialog.showModal();
		panel!.scrollTop = 0;
		world?.setFocusMode(true);

		if (reducedMotion.matches || !source) return;
		world?.setLifted(slug);
		// Leaves as the organisation's plane (paper or ink), lands as paper.
		origin = source.color;
		panel!.animate(
			[
				{ transform: onto(source), backgroundColor: origin, offset: 0 },
				{ backgroundColor: origin, offset: 0.12 },
				{ backgroundColor: PAPER, offset: 0.5 },
				{ transform: 'none', backgroundColor: PAPER, offset: 1 },
			],
			{ duration: OPEN_MS, easing: EASE },
		);
		for (const element of contents()) {
			element.animate(
				[
					{ opacity: 0, transform: 'translateY(0.75rem)' },
					{ opacity: 1, transform: 'none' },
				],
				{ duration: 420, delay: OPEN_MS * 0.5, easing: EASE, fill: 'backwards' },
			);
		}
	}

	function finish(): void {
		closing = undefined;
		const slug = current;
		current = undefined;
		const link = slug ? opener(slug) : null;
		// Focus goes back to the index entry — first by the browser as the dialog
		// closes, then explicitly. Neither may turn the world: the plane has just
		// landed where it belongs.
		link?.setAttribute('data-eco-returning', '');
		dialog.classList.remove('is-closing');
		if (dialog.open) dialog.close();
		world?.land(0); // no-op if the plane has already landed
		world?.setFocusMode(false);
		link?.focus({ preventScroll: true });
		link?.removeAttribute('data-eco-returning');
	}

	function close(): void {
		if (!dialog.open || closing) return;
		// The world only dims behind the plate (it never moves), so the
		// organisation's plate is still exactly where the travel began.
		const target = current ? world?.source(current) : undefined;
		world?.setFocusMode(false);

		if (reducedMotion.matches || !target) return finish();
		dialog.classList.add('is-closing');
		for (const element of contents()) {
			element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'linear', fill: 'forwards' });
		}
		// Returns in the plane's own colour onto the plane's exact projected
		// shape. The plate lives in the top layer, above the title; so for the
		// last stretch it dissolves while the real plane fades in beneath it, at
		// its own depth — the return ends behind (or in front of) the title
		// wherever the plane belongs, with no jump.
		const color = target.color || origin;
		const destination = onto(target);
		closing = panel!.animate(
			[
				{ transform: 'none', backgroundColor: PAPER, opacity: 1, offset: 0, easing: EASE },
				{ transform: destination, backgroundColor: color, opacity: 1, offset: 1 - HANDOVER * 0.55 },
				{ transform: destination, backgroundColor: color, opacity: 0, offset: 1 },
			],
			{ duration: CLOSE_MS, delay: 100, easing: 'linear', fill: 'forwards' },
		);
		const handover = window.setTimeout(
			() => world?.land(CLOSE_MS * HANDOVER),
			100 + CLOSE_MS * (1 - HANDOVER * 0.75),
		);
		closing.addEventListener('cancel', () => window.clearTimeout(handover), { once: true });
		closing.finished.then(() => {
			closing?.cancel();
			contents().forEach((element) => element.getAnimations().forEach((animation) => animation.cancel()));
			finish();
		}, finish);
	}

	dialog.querySelector('[data-eco-close]')?.addEventListener('click', close);

	// Escape: animate instead of closing at once. If the browser closes anyway
	// (e.g. a repeated Escape), the `close` handler still restores everything.
	dialog.addEventListener('cancel', (event) => {
		event.preventDefault();
		close();
	});
	dialog.addEventListener('close', () => {
		if (current) {
			closing?.cancel();
			contents().forEach((element) => element.getAnimations().forEach((animation) => animation.cancel()));
			finish();
		}
	});

	// A click outside the plate (on the dialog's own backdrop area) closes it.
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) close();
	});

	// "View the work": reveal the rest of the list in place.
	dialog.addEventListener('click', (event) => {
		const more = (event.target as Element).closest<HTMLButtonElement>('[data-eco-more]');
		if (!more) return;
		const record = more.closest<HTMLElement>('[data-eco-record]');
		record?.setAttribute('data-expanded', '');
		more.setAttribute('aria-expanded', 'true');
		record?.querySelector<HTMLElement>('[data-eco-more-first]')?.focus();
	});

	return { open, close };
}
