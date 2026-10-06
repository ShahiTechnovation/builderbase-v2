/**
 * Deferred third-party embeds.
 *
 * `[data-deferred-embed]` hosts carry their iframe inside a <template>, so
 * the browser fetches nothing until we mount it. Mounting waits for the page's
 * own load to finish (never competing with the hero, fonts or gallery), then
 * happens once the host is within one viewport of being seen. Space is
 * reserved by the host's CSS, so mounting causes no layout shift.
 * Without JavaScript, a <noscript> copy with native lazy loading is used.
 */

function mount(host: Element): void {
	const template = host.querySelector('template');
	if (!template) return;
	host.append(template.content.cloneNode(true));
	template.remove();
	host.setAttribute('data-mounted', '');
}

function observe(hosts: Element[]): void {
	if (!('IntersectionObserver' in window)) {
		hosts.forEach(mount);
		return;
	}
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				mount(entry.target);
				observer.unobserve(entry.target);
			}
		},
		{ rootMargin: '100% 0px' },
	);
	hosts.forEach((host) => observer.observe(host));
}

export function initDeferredEmbeds(): void {
	const hosts = [...document.querySelectorAll('[data-deferred-embed]')];
	if (hosts.length === 0) return;

	// Safari has no requestIdleCallback; a short timeout is close enough.
	const whenIdle: (callback: () => void) => void =
		typeof window.requestIdleCallback === 'function'
			? (callback) => window.requestIdleCallback(callback, { timeout: 2000 })
			: (callback) => window.setTimeout(callback, 200);
	const start = () => whenIdle(() => observe(hosts));

	if (document.readyState === 'complete') start();
	else window.addEventListener('load', start, { once: true });
}
