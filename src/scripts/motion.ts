/**
 * Motion runtime — the only scroll-aware script on the site.
 *
 *  - Reveals: one IntersectionObserver marks `[data-reveal]` elements as
 *    revealed once; CSS (src/styles/motion.css) does the animating.
 *  - Scroll progress: `[data-scroll~="start"|"through"]` elements receive
 *    0→1 custom properties from a single passive, rAF-throttled listener,
 *    active only while the element is near the viewport.
 *
 * Native scrolling is never intercepted. Under prefers-reduced-motion the
 * runtime stands down and the static composition is shown.
 */

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ── Reveals ────────────────────────────────────────────────────────────

function initReveals(): void {
	const targets = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
	const reveal = (element: Element) => element.setAttribute('data-revealed', '');

	let initial = true;
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				// First pass: anything already on screen is shown as-is (no pop).
				// Uses the observer's own geometry, so no forced layout.
				const onScreen = initial
					? entry.boundingClientRect.top < window.innerHeight && entry.boundingClientRect.bottom > 0
					: entry.isIntersecting;
				if (!onScreen) continue;
				reveal(entry.target);
				observer.unobserve(entry.target);
			}
			if (initial) {
				initial = false;
				// Only now may unrevealed content be hidden — it is all off-screen.
				root.classList.add('motion-ready');
			}
		},
		{ rootMargin: '0px 0px -12% 0px' },
	);

	targets.forEach((target) => observer.observe(target));

	// Never leave content hidden on paper.
	window.addEventListener('beforeprint', () => targets.forEach(reveal));
}

// ── Scroll progress ────────────────────────────────────────────────────

interface Tracked {
	element: HTMLElement;
	start: boolean;
	through: boolean;
	/** Document offset of the element's top, re-measured on resize. */
	top: number;
	last: { start?: number; through?: number };
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function initScrollProgress(): void {
	const tracked: Tracked[] = [...document.querySelectorAll<HTMLElement>('[data-scroll]')].map((element) => {
		const modes = (element.dataset.scroll ?? '').split(/\s+/);
		return { element, start: modes.includes('start'), through: modes.includes('through'), top: 0, last: {} };
	});
	if (tracked.length === 0) return;

	const near = new Set<Tracked>();
	let frame = 0;
	let measured = false; // never write progress from unmeasured positions

	const measure = () => {
		for (const item of tracked) item.top = item.element.getBoundingClientRect().top + window.scrollY;
		measured = true;
	};

	const write = (item: Tracked, key: 'start' | 'through', value: number) => {
		const rounded = Math.round(value * 1000) / 1000;
		if (item.last[key] === rounded) return;
		item.last[key] = rounded;
		item.element.style.setProperty(`--scroll-${key}`, String(rounded));
	};

	const update = () => {
		frame = 0;
		if (!measured) return;
		const viewportHeight = window.innerHeight;
		for (const item of near) {
			// start: 0 at page top → 1 when the element's top reaches the viewport top.
			if (item.start) write(item, 'start', item.top <= 0 ? 1 : clamp01(window.scrollY / item.top));
			// through: 0 as the element enters at the bottom → 1 as it leaves at the top.
			if (item.through) {
				const { top, height } = item.element.getBoundingClientRect();
				write(item, 'through', clamp01((viewportHeight - top) / (viewportHeight + height)));
			}
		}
	};

	const schedule = () => {
		if (!frame && root.classList.contains('motion')) frame = requestAnimationFrame(update);
	};

	const proximity = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const item = tracked.find((candidate) => candidate.element === entry.target);
				if (!item) continue;
				if (entry.isIntersecting) near.add(item);
				else near.delete(item);
			}
			schedule();
		},
		{ rootMargin: '25% 0px' },
	);

	tracked.forEach((item) => proximity.observe(item.element));
	window.addEventListener('scroll', schedule, { passive: true });
	// Fires once after the first layout (the initial measurement), then on resize.
	new ResizeObserver(() => {
		measure();
		schedule();
	}).observe(document.body);
}

// ── Boot ───────────────────────────────────────────────────────────────

function syncPreference(): void {
	root.classList.toggle('motion', !reducedMotion.matches);
}

reducedMotion.addEventListener('change', syncPreference);
syncPreference();

if (!reducedMotion.matches) {
	initReveals();
	initScrollProgress();
}
