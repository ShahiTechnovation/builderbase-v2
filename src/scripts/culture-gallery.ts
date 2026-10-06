/**
 * Behaviour for the culture gallery (see CultureGallery.astro).
 *
 * Desktop (≥1024px): click / Enter / Space selects a photograph; arrow keys,
 * Home and End move focus between photographs (focus previews via CSS).
 * Mobile: the track scrolls natively; the active photo follows the scroll
 * position, and tapping a peeking photo scrolls it into place.
 */

const DESKTOP_QUERY = '(min-width: 64rem)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const pad = (value: number) => String(value).padStart(2, '0');

export function initCultureGallery(root: HTMLElement): void {
	const track = root.querySelector<HTMLElement>('[data-gallery-track]');
	const items = [...root.querySelectorAll<HTMLElement>('[data-gallery-item]')];
	const triggers = [...root.querySelectorAll<HTMLButtonElement>('[data-gallery-trigger]')];
	const steps = [...root.querySelectorAll<HTMLElement>('[data-gallery-step]')];
	const current = root.querySelector<HTMLElement>('[data-gallery-current]');
	const captionSlot = root.querySelector<HTMLElement>('[data-gallery-caption]');
	const status = root.querySelector<HTMLElement>('[data-gallery-status]');
	if (!track || items.length === 0 || items.length !== triggers.length) return;

	const desktop = window.matchMedia(DESKTOP_QUERY);
	const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
	const total = items.length;
	const captions = items.map((item) => JSON.parse(item.dataset.caption ?? '[]') as string[]);

	let activeIndex = Math.max(
		0,
		items.findIndex((item) => item.classList.contains('is-active')),
	);

	function setActive(index: number, { announce = false } = {}): void {
		if (index === activeIndex && items[index]?.classList.contains('is-active')) return;
		activeIndex = index;

		items.forEach((item, i) => item.classList.toggle('is-active', i === index));
		steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
		triggers.forEach((trigger, i) => {
			if (i === index) trigger.setAttribute('aria-current', 'true');
			else trigger.removeAttribute('aria-current');
		});

		if (current) current.textContent = pad(index + 1);
		if (captionSlot) {
			captionSlot.replaceChildren(
				...(captions[index] ?? []).map((line) => {
					const span = document.createElement('span');
					span.textContent = line;
					return span;
				}),
			);
		}

		if (announce && status) {
			const caption = captions[index]?.join(', ');
			status.textContent = `Showing photograph ${index + 1} of ${total}${caption ? `: ${caption}` : ''}`;
		}
	}

	// ── Mobile: scroll position drives the active photo ──────────────

	function scrollTargetFor(index: number): number {
		const item = items[index];
		if (!item || !track) return 0;
		const paddingStart = parseFloat(getComputedStyle(track).paddingInlineStart) || 0;
		return item.offsetLeft - paddingStart;
	}

	function scrollToIndex(index: number, behavior: ScrollBehavior): void {
		track?.scrollTo({ left: scrollTargetFor(index), behavior });
	}

	function indexFromScroll(): number {
		if (!track) return 0;
		const maxScroll = track.scrollWidth - track.clientWidth;
		if (maxScroll > 0 && track.scrollLeft >= maxScroll - 2) return total - 1;

		let nearest = 0;
		let nearestDistance = Infinity;
		items.forEach((_, i) => {
			const distance = Math.abs(scrollTargetFor(i) - track.scrollLeft);
			if (distance < nearestDistance) {
				nearest = i;
				nearestDistance = distance;
			}
		});
		return nearest;
	}

	let scrollFrame = 0;
	track.addEventListener(
		'scroll',
		() => {
			if (desktop.matches || scrollFrame) return;
			scrollFrame = requestAnimationFrame(() => {
				scrollFrame = 0;
				setActive(indexFromScroll());
			});
		},
		{ passive: true },
	);

	// ── Selection ────────────────────────────────────────────────────

	triggers.forEach((trigger, index) => {
		trigger.addEventListener('click', () => {
			if (desktop.matches) {
				setActive(index, { announce: true });
			} else {
				scrollToIndex(index, reducedMotion.matches ? 'auto' : 'smooth');
			}
		});
	});

	// ── Keyboard: arrows / Home / End move focus between photographs ─

	track.addEventListener('keydown', (event) => {
		const from = triggers.indexOf(document.activeElement as HTMLButtonElement);
		if (from === -1) return;

		let to: number;
		switch (event.key) {
			case 'ArrowRight':
				to = Math.min(from + 1, total - 1);
				break;
			case 'ArrowLeft':
				to = Math.max(from - 1, 0);
				break;
			case 'Home':
				to = 0;
				break;
			case 'End':
				to = total - 1;
				break;
			default:
				return;
		}

		event.preventDefault();
		triggers[to]?.focus({ preventScroll: desktop.matches });
		if (!desktop.matches) scrollToIndex(to, reducedMotion.matches ? 'auto' : 'smooth');
	});

	// ── Layout changes: keep the active photo in view across modes ───

	desktop.addEventListener('change', () => {
		if (desktop.matches) {
			track.scrollLeft = 0;
		} else {
			scrollToIndex(activeIndex, 'auto');
		}
	});
}
