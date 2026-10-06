/**
 * The spatial ecosystem (see EcosystemStage.astro).
 *
 * CSS 3D transforms + one requestAnimationFrame loop + pointer events. No
 * WebGL. The loop runs only while something moves (drag, inertia, settling,
 * a focus turn) and stops when the world is at rest — there is no auto-spin.
 *
 * Every artifact is a physical plane. Its transform, read right to left:
 *
 *   perspective(P)            one shared camera, centred on the volume
 *   translate3d(X, Y, Z)      its place on the (rotated) sphere
 *   rotateX(pitch) rotateY(yaw)            the world's rotation
 *   rotateY(θ) rotateX(φ)     facing outward from the sphere's centre
 *   rotateY/X/Z(lean)         a few stable degrees off the surface
 *   scale(s) translate(-50%, -50%)         fitted, centred on its origin
 *
 * so the browser projects each plane with real perspective: planes at the
 * silhouette turn edge-on and open toward the viewer as they come round
 * (past the rim a plane turns its face back to the camera, at the instant it
 * is edge-on, so no organisation is ever a blank reverse). Depth decides stacking
 * against the screen-aligned title (nearer than the centre → in front).
 * Coordinates follow CSS: x right, y down, z toward the viewer.
 *
 *  - sphere (≥1024px): drag rotates with restrained inertia; keyboard focus
 *    in the index turns the world to face that organisation.
 *  - ring (<1024px): identity planes on a horizontal orbit; the front one
 *    faces the viewer, neighbours turn away; swipe or tap a neighbour.
 *  - reduced motion: a static composition; selection works the same.
 *
 * Planes are pointer targets only (aria-hidden). The index links are the
 * accessible representation and the keyboard path.
 */

export interface PlaneSource {
	/** The plane's on-screen bounding box. */
	rect: DOMRect;
	color: string;
	/** Maps the plane's own box (0…width, 0…height) to viewport pixels — the exact rendered quad. */
	matrix: DOMMatrix;
	width: number;
	height: number;
}

export interface WorldHandle {
	/** Where (and in what colour and shape) a detail plate should travel from, if visible. */
	source(slug: string): PlaneSource | undefined;
	setLifted(slug: string | undefined): void;
	/** Returns a lifted plane to the world, fading it in at its own depth over `ms`. */
	land(ms: number): void;
	setFocusMode(on: boolean): void;
}

interface Vec3 {
	x: number;
	y: number;
	z: number;
}

interface Plane {
	slug: string;
	identity: boolean;
	/** Position in the orbit (identity planes, index order). */
	ringIndex: number;
	element: HTMLElement;
	/** Unit-sphere position, CSS axes. */
	base: Vec3;
	/** Outward orientation (radians) and lean (degrees). */
	theta: number;
	phi: number;
	lean: Vec3;
	about: string;
	/** Untransformed size, measured on layout changes. */
	width: number;
	height: number;
	/** Fit scale for the current layout. */
	fit: number;
	/** Last frame: the CSS transform written, and visibility. */
	transform: string;
	visible: boolean;
}

type Mode = 'sphere' | 'ring';

const REST_OFFSET = 0.55; // the first organisation rests this far (radians) off front-centre
const REST_PITCH = -0.1; // the upper planes tip slightly toward the viewer
const PITCH_LIMIT = 0.6;
const FRICTION = 0.935; // velocity kept per 60fps frame
const RING_STEP = 0.62; // radians between orbit neighbours (~36°)
const DRAG_THRESHOLD = 6; // px before a press becomes a drag
const SETTLE_MS = 1800;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const deg = (radians: number) => (radians * 180) / Math.PI;

export function initEcosystemWorld(stage: HTMLElement, onSelect: (slug: string) => void): WorldHandle | undefined {
	const world = stage.querySelector<HTMLElement>('[data-eco-world]');
	const caption = stage.querySelector<HTMLElement>('[data-eco-caption]');
	const counter = stage.querySelector<HTMLElement>('[data-eco-current]');
	const aboutSlot = stage.querySelector<HTMLElement>('[data-eco-about]');
	const links = [...stage.querySelectorAll<HTMLAnchorElement>('[data-eco-link]')];

	let ringCount = 0;
	const planes: Plane[] = [...stage.querySelectorAll<HTMLElement>('[data-eco-node]')].map((element) => {
		// Server positions are y-up; CSS is y-down.
		const base = { x: Number(element.dataset.x), y: -Number(element.dataset.y), z: Number(element.dataset.z) };
		const [leanX = 0, leanY = 0, leanZ = 0] = (element.dataset.lean ?? '').split(' ').map(Number);
		const identity = element.dataset.kind === 'identity';
		return {
			slug: element.dataset.slug ?? '',
			identity,
			ringIndex: identity ? ringCount++ : -1,
			element,
			base,
			theta: Math.atan2(base.x, base.z),
			phi: -Math.asin(clamp(base.y, -1, 1)),
			lean: { x: leanX, y: leanY, z: leanZ },
			about: element.dataset.about ?? '',
			width: 0,
			height: 0,
			fit: 1,
			transform: '',
			visible: true,
		};
	});
	if (!world || planes.length === 0 || ringCount === 0) return undefined;
	const identities = planes.filter((plane) => plane.identity);

	const desktop = window.matchMedia('(min-width: 64rem)');
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const pad = (value: number) => String(value).padStart(2, '0');

	// Development only: ?layout=sphere|ring forces a layout for evaluation.
	const forced = import.meta.env.DEV ? new URLSearchParams(location.search).get('layout') : null;
	const forcedMode: Mode | undefined = forced === 'sphere' || forced === 'ring' ? forced : undefined;
	const layoutMode = (): Mode => forcedMode ?? (desktop.matches ? 'sphere' : 'ring');
	let mode = layoutMode();

	// ── State ────────────────────────────────────────────────────────

	let width = 0;
	let height = 0;
	let camera = 1000; // perspective distance
	let radius = 0; // sphere radius (x and z)
	let radiusY = 0; // vertical radius: the volume is wider than tall

	// Rest pose: the organisation with the most verified work sits in front,
	// just off-centre, rather than wherever the spiral happens to put it.
	const first = identities[0]!.base;
	const REST_YAW = Math.atan2(-first.x, first.z) + REST_OFFSET;

	let yaw = REST_YAW;
	let pitch = REST_PITCH;
	let velocityYaw = 0;
	let velocityPitch = 0;
	let target: { yaw: number; pitch: number } | undefined;

	let ring = 0; // fractional index of the organisation in front
	let ringVelocity = 0;
	let ringTarget: number | undefined;

	let appear = 1; // 0 → 1 during the entrance
	let settle: { start: number; from: number } | undefined;
	let dolly = 0; // 0 → 1 over the first part of the page scroll

	let dragging = false;
	let press: { id: number; x: number; y: number; node?: string } | undefined;
	let last = { x: 0, y: 0, time: 0 };

	let started = false;
	/** A plane returning from the detail plate, fading in at its own depth. */
	let landingState: { slug: string; start: number; duration: number } | undefined;
	let highlighted: string | undefined;
	let lifted: string | undefined;
	let frame = 0;
	let lastTime = 0;

	const moving = () => reducedMotion.matches === false;

	// ── Measurement (ResizeObserver callbacks only: never a forced reflow) ──

	function measure(): void {
		width = world!.clientWidth;
		height = world!.clientHeight;
		stage.dataset.layout = mode;
		for (const plane of planes) {
			plane.width = plane.element.offsetWidth;
			plane.height = plane.element.offsetHeight;
		}

		if (mode === 'sphere') {
			radius = Math.min(width * 0.36, 620);
			radiusY = Math.min(height * 0.42, radius * 0.78);
			camera = radius * 2.05; // the nearest plane is ~2× its size at the centre, the farthest ~0.7×
			const nearest = camera / (camera - radius);
			for (const plane of planes) {
				// At its closest a plane may take up to ~34% of the width and ~46% of the height.
				plane.fit = Math.min(1, (width * 0.34) / (plane.width * nearest), (height * 0.46) / (plane.height * nearest));
			}
		} else {
			radius = Math.min(width * 0.58, 320);
			radiusY = 0;
			camera = Math.max(700, width * 1.6);
			for (const plane of planes) {
				plane.fit = Math.min(1, (width * 0.74) / plane.width, (height * 0.78) / plane.height);
			}
		}
	}

	// ── Projection ───────────────────────────────────────────────────

	/** 0 → 1 opacity factor for a plane that is landing back in the world. */
	function landing(slug: string): number {
		if (!landingState || landingState.slug !== slug) return 1;
		return clamp((performance.now() - landingState.start) / landingState.duration, 0, 1);
	}

	/** World rotation: rotateX(pitch) · rotateY(yaw), as CSS applies it. */
	function rotate(point: Vec3): Vec3 {
		const cosYaw = Math.cos(yaw);
		const sinYaw = Math.sin(yaw);
		const x1 = point.x * cosYaw + point.z * sinYaw;
		const z1 = -point.x * sinYaw + point.z * cosYaw;
		const cosPitch = Math.cos(pitch);
		const sinPitch = Math.sin(pitch);
		return { x: x1, y: point.y * cosPitch - z1 * sinPitch, z: point.y * sinPitch + z1 * cosPitch };
	}

	const rotY = (v: Vec3, a: number): Vec3 => ({
		x: v.x * Math.cos(a) + v.z * Math.sin(a),
		y: v.y,
		z: -v.x * Math.sin(a) + v.z * Math.cos(a),
	});
	const rotX = (v: Vec3, a: number): Vec3 => ({
		x: v.x,
		y: v.y * Math.cos(a) - v.z * Math.sin(a),
		z: v.y * Math.sin(a) + v.z * Math.cos(a),
	});
	const RAD = Math.PI / 180;

	/**
	 * How squarely a plane faces the camera: its normal against the direction
	 * from the plane to the camera (not the screen's z axis — near the
	 * silhouette, real perspective shows the back of a plane that still points
	 * slightly toward the screen). 1 square on, 0 edge-on, <0 seen from behind.
	 */
	function facingCamera(normal: Vec3, position: Vec3): number {
		const toCamera = { x: -position.x, y: -position.y, z: camera - position.z };
		const length = Math.hypot(toCamera.x, toCamera.y, toCamera.z) || 1;
		return (normal.x * toCamera.x + normal.y * toCamera.y + normal.z * toCamera.z) / length;
	}

	function ringOffset(index: number): number {
		let offset = index - ring;
		if (ringCount > 3) offset = ((((offset + ringCount / 2) % ringCount) + ringCount) % ringCount) - ringCount / 2;
		return offset;
	}

	const px = (value: number) => `${value.toFixed(1)}px`;
	const dg = (value: number) => `${value.toFixed(2)}deg`;

	function render(): void {
		const zoom = dolly * 0.22; // the camera's step into the volume, as a share of the radius

		for (const plane of planes) {
			let x: number;
			let y: number;
			let z: number;
			let depth: number; // 0 back → 1 front
			let facing: number; // 1 toward the viewer, 0 edge-on, <0 away
			let orientation: string;

			if (mode === 'sphere') {
				const unit = rotate(plane.base);
				const scaled = rotate({ x: plane.base.x * radius, y: plane.base.y * radiusY, z: plane.base.z * radius });
				x = scaled.x;
				y = scaled.y;
				z = scaled.z + zoom * radius;
				depth = (unit.z + 1) / 2;
				// The plane's own normal: lean, then outward orientation, then the world.
				const leaned = rotY(rotX({ x: 0, y: 0, z: 1 }, plane.lean.x * RAD), plane.lean.y * RAD);
				facing = facingCamera(rotate(rotY(rotX(leaned, plane.phi), plane.theta)), { x, y, z });
				orientation = `rotateX(${dg(deg(pitch))}) rotateY(${dg(deg(yaw))}) rotateY(${dg(deg(plane.theta))}) rotateX(${dg(deg(plane.phi))})`;
				plane.visible = true;
			} else {
				if (!plane.identity) {
					plane.visible = false;
					plane.element.style.visibility = 'hidden';
					continue;
				}
				const offset = ringOffset(plane.ringIndex);
				const angle = offset * RING_STEP;
				x = Math.sin(angle) * radius;
				y = 0;
				z = (Math.cos(angle) - 1) * radius;
				depth = (Math.cos(angle) + 1) / 2;
				facing = facingCamera({ x: Math.sin(angle), y: 0, z: Math.cos(angle) }, { x, y, z });
				orientation = `rotateY(${dg(deg(angle))})`;
				plane.visible = Math.abs(offset) < 2.4;
			}

			const emphasis = plane.slug === highlighted;
			const fade = clamp(appear * 1.6 - (1 - depth) * 0.6, 0, 1);
			// Past the silhouette, a sphere plane turns its face back toward the
			// camera — exactly edge-on at that moment, so the turn is never seen.
			// Every organisation stays readable; edge-on still happens at the rim.
			const turned = mode === 'sphere' && facing < 0;
			if (turned) facing = -facing;
			const away = facing < 0;
			// Light falls off with distance and with the angle to the viewer.
			let shade = 0.62 * Math.pow(1 - depth, 1.15) + 0.32 * (1 - clamp(facing, 0, 1));
			// A reverse side is turned away from the light: it falls into shadow.
			if (away) shade = Math.max(shade, 0.8 + 0.12 * (1 - depth));
			if (emphasis) shade *= 0.35;
			shade = clamp(shade, 0, 0.93);

			const style = plane.element.style;
			// Pixel units throughout (centred with px, not %), so the same string
			// can be read back as a DOMMatrix for the caption and the detail plate.
			plane.transform =
				`perspective(${px(camera)}) translate3d(${px(x)}, ${px(y)}, ${px(z)}) ${orientation} ` +
				`rotateY(${dg(plane.lean.y)}) rotateX(${dg(plane.lean.x)}) rotateZ(${dg(plane.lean.z)}) ` +
				(turned ? 'rotateY(180deg) ' : '') +
				`scale(${plane.fit.toFixed(3)}) translate(${px(-plane.width / 2)}, ${px(-plane.height / 2)})`;
			style.transform = plane.transform;
			style.opacity = (plane.slug === lifted ? 0 : fade * landing(plane.slug)).toFixed(3);
			style.setProperty('--shade', shade.toFixed(3));
			style.zIndex = String(Math.round(depth * 100));
			style.visibility = plane.visible && fade > 0.01 ? 'visible' : 'hidden';
			plane.element.toggleAttribute('data-back', away);
		}

		placeCaption();

		if (mode === 'ring') {
			const active = ((Math.round(ring) % ringCount) + ringCount) % ringCount;
			if (counter) counter.textContent = pad(active + 1);
			const front = identities[active];
			if (aboutSlot && front && aboutSlot.textContent !== front.about) aboutSlot.textContent = front.about;
			identities.forEach((plane) => plane.element.toggleAttribute('data-active', plane === front));
		}
	}

	/**
	 * The plane's projected corners, relative to the world's centre: its own
	 * transform applied to the four corners of its box. No layout reads.
	 */
	function projectedCorners(plane: Plane): DOMPoint[] {
		const matrix = new DOMMatrix(plane.transform);
		return [
			[0, 0],
			[plane.width, 0],
			[plane.width, plane.height],
			[0, plane.height],
		].map(([cx = 0, cy = 0]) => {
			const point = matrix.transformPoint(new DOMPoint(cx, cy, 0, 1));
			return new DOMPoint(point.x / point.w, point.y / point.w);
		});
	}

	/**
	 * Screen-aligned caption attached to the highlighted plane (sphere only):
	 * just below the plane's projected outline, aligned to its leftmost corner
	 * — or just above it when there is no room below — so it never lands on a
	 * steeply turned plane.
	 */
	function placeCaption(): void {
		if (!caption) return;
		const plane = mode === 'sphere' && highlighted ? identities.find((candidate) => candidate.slug === highlighted) : undefined;
		if (!plane || plane.slug === lifted || !plane.transform) {
			caption.removeAttribute('data-visible');
			return;
		}
		if (caption.textContent !== plane.about) caption.textContent = plane.about;
		const corners = projectedCorners(plane);
		const xs = corners.map((point) => width / 2 + point.x);
		const ys = corners.map((point) => height / 2 + point.y);
		const gap = 10;
		const captionHeight = 26;
		const below = Math.max(...ys) + gap;
		const top = below + captionHeight <= height - 8 ? below : Math.min(...ys) - gap - captionHeight;
		const left = clamp(Math.min(...xs), 8, Math.max(8, width - 420));
		caption.style.transform = `translate3d(${px(left)}, ${px(clamp(top, 8, height - captionHeight))}, 0)`;
		caption.setAttribute('data-visible', '');
	}

	// ── Loop ─────────────────────────────────────────────────────────

	function schedule(): void {
		if (!frame) frame = requestAnimationFrame(tick);
	}

	function tick(time: number): void {
		frame = 0;
		const dt = lastTime ? Math.min(64, time - lastTime) : 16.7;
		lastTime = time;
		let active = false;

		if (settle) {
			const t = clamp((time - settle.start) / SETTLE_MS, 0, 1);
			appear = clamp((time - settle.start) / 900, 0, 1);
			if (mode === 'sphere') yaw = settle.from + (REST_YAW - settle.from) * easeOut(t);
			if (t >= 1) settle = undefined;
			else active = true;
		}

		if (mode === 'sphere' && !dragging) {
			if (target) {
				const k = 1 - Math.exp(-dt / 150);
				yaw += wrapAngle(target.yaw - yaw) * k;
				pitch += (target.pitch - pitch) * k;
				if (Math.abs(wrapAngle(target.yaw - yaw)) < 0.0008 && Math.abs(target.pitch - pitch) < 0.0008) target = undefined;
				else active = true;
			} else if (Math.abs(velocityYaw) > 0.00002 || Math.abs(velocityPitch) > 0.00002) {
				yaw += velocityYaw * dt;
				pitch += velocityPitch * dt;
				const keep = Math.pow(FRICTION, dt / 16.7);
				velocityYaw *= keep;
				velocityPitch *= keep;
				active = true;
			}
			// Pitch springs back inside its limits.
			if (Math.abs(pitch) > PITCH_LIMIT) {
				pitch += (clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT) - pitch) * (1 - Math.exp(-dt / 90));
				velocityPitch = 0;
				active = true;
			}
		}

		if (mode === 'ring' && !dragging && ringTarget !== undefined) {
			const k = 1 - Math.exp(-dt / 110);
			ring += (ringTarget - ring) * k;
			if (Math.abs(ringTarget - ring) < 0.001) {
				ring = ringTarget;
				ringTarget = undefined;
			} else active = true;
		}

		if (landingState && performance.now() - landingState.start >= landingState.duration) landingState = undefined;
		else if (landingState) active = true;

		render();
		if (!world!.hasAttribute('data-ready')) world!.setAttribute('data-ready', '');
		if (active || dragging) schedule();
		else lastTime = 0;
	}

	// ── Pointer: drag to rotate, press to select ─────────────────────

	stage.addEventListener('pointerdown', (event) => {
		if (event.button !== 0 || stage.hasAttribute('data-focus')) return;
		if ((event.target as Element).closest('a, button')) return; // index links handle themselves
		const node = (event.target as Element).closest<HTMLElement>('[data-eco-node]');
		if (!node && !(event.target as Element).closest('[data-eco-world]')) return;
		press = { id: event.pointerId, x: event.clientX, y: event.clientY, node: node?.dataset.slug };
		last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
		velocityYaw = velocityPitch = ringVelocity = 0;
		target = undefined;
		settle = undefined;
		appear = 1;
	});

	stage.addEventListener('pointermove', (event) => {
		if (!press || event.pointerId !== press.id) return;
		const dx = event.clientX - last.x;
		const dy = event.clientY - last.y;
		const dt = Math.max(1, event.timeStamp - last.time);

		if (!dragging) {
			const distance = Math.hypot(event.clientX - press.x, event.clientY - press.y);
			if (distance < DRAG_THRESHOLD) return;
			// Static composition under reduced motion: the sphere does not turn.
			if (mode === 'sphere' && !moving()) return;
			dragging = true;
			stage.setPointerCapture(event.pointerId);
			stage.toggleAttribute('data-dragging', true);
			highlight(undefined);
		}

		if (mode === 'sphere') {
			// The front of the world follows the pointer.
			const turnYaw = (dx / radius) * 0.85;
			const turnPitch = event.pointerType === 'touch' ? 0 : -(dy / radius) * 0.6;
			yaw += turnYaw;
			pitch = clamp(pitch + turnPitch, -PITCH_LIMIT - 0.15, PITCH_LIMIT + 0.15);
			// Smoothed velocity in radians per ms.
			velocityYaw = velocityYaw * 0.6 + (turnYaw / dt) * 0.4;
			velocityPitch = velocityPitch * 0.6 + (turnPitch / dt) * 0.4;
		} else {
			const step = radius * Math.sin(RING_STEP);
			ring -= dx / step;
			ringVelocity = ringVelocity * 0.6 + (-dx / step / dt) * 0.4;
		}
		last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
		schedule();
	});

	const endPress = (event: PointerEvent) => {
		if (!press || event.pointerId !== press.id) return;
		const wasDragging = dragging;
		const pressed = press.node;
		press = undefined;
		dragging = false;
		stage.removeAttribute('data-dragging');
		if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);

		if (wasDragging) {
			// A pause before release means no throw.
			if (event.timeStamp - last.time > 80) velocityYaw = velocityPitch = ringVelocity = 0;
			if (!moving()) velocityYaw = velocityPitch = 0;
			if (mode === 'ring') {
				const projected = moving() ? ring + clamp(ringVelocity * 220, -2, 2) : ring;
				ringTarget = Math.round(projected);
				if (!moving()) ring = ringTarget;
			}
			schedule();
			return;
		}

		if (event.type === 'pointercancel' || !pressed) return;
		if (mode === 'ring') {
			const plane = identities.find((candidate) => candidate.slug === pressed);
			if (plane && Math.abs(ringOffset(plane.ringIndex)) > 0.5) {
				moveRingTo(plane.ringIndex);
				return;
			}
		}
		onSelect(pressed);
	};

	stage.addEventListener('pointerup', endPress);
	stage.addEventListener('pointercancel', endPress);
	// A drag that starts on a plane must not also start a native image/text drag.
	stage.addEventListener('dragstart', (event) => event.preventDefault());

	function moveRingTo(index: number): void {
		ringTarget = Math.round(ring + ringOffset(index));
		if (!moving()) ring = ringTarget;
		schedule();
	}

	// ── Index ↔ world ────────────────────────────────────────────────

	function highlight(slug: string | undefined): void {
		if (highlighted === slug) return;
		highlighted = slug;
		planes.forEach((plane) => plane.element.toggleAttribute('data-highlighted', plane.slug === slug));
		links.forEach((link) => link.toggleAttribute('data-highlighted', link.dataset.slug === slug));
		schedule();
	}

	/** Turn the world so this organisation's identity plane faces the viewer. */
	function face(slug: string): void {
		const plane = identities.find((candidate) => candidate.slug === slug);
		if (!plane) return;
		if (mode === 'ring') return moveRingTo(plane.ringIndex);
		if (!moving()) return;
		const { x, y, z } = plane.base;
		const targetYaw = Math.atan2(-x, z);
		// Brought round just above the title, so it frames the headline rather than covering it.
		const targetPitch = clamp(Math.atan2(y, Math.hypot(x, z)) + 0.42, -PITCH_LIMIT, PITCH_LIMIT);
		velocityYaw = velocityPitch = 0;
		settle = undefined;
		appear = 1;
		target = { yaw: yaw + wrapAngle(targetYaw - yaw), pitch: targetPitch };
		schedule();
	}

	world.addEventListener('pointerover', (event) => {
		if (dragging) return;
		const node = (event.target as Element).closest<HTMLElement>('[data-eco-node]');
		highlight(node?.dataset.slug);
	});
	world.addEventListener('pointerleave', () => highlight(undefined));

	for (const link of links) {
		link.addEventListener('pointerenter', () => highlight(link.dataset.slug));
		link.addEventListener('pointerleave', () => highlight(undefined));
		link.addEventListener('focus', () => {
			highlight(link.dataset.slug);
			// Keyboard focus turns the world; a mouse click does not spin it first,
			// and neither does focus returning from a closed detail plate (the
			// plane has just landed where it belongs).
			if (!link.hasAttribute('data-eco-returning') && link.matches(':focus-visible') && link.dataset.slug) face(link.dataset.slug);
		});
		link.addEventListener('blur', () => highlight(undefined));
	}

	// ── Scroll: a short, subtle step into the world ──────────────────

	let scrollFrame = 0;
	const onScroll = () => {
		if (scrollFrame || !moving()) return;
		scrollFrame = requestAnimationFrame(() => {
			scrollFrame = 0;
			const next = clamp(window.scrollY / Math.max(1, stage.offsetHeight * 0.6), 0, 1);
			if (Math.abs(next - dolly) < 0.002) return;
			dolly = next;
			schedule();
		});
	};
	window.addEventListener('scroll', onScroll, { passive: true });

	// ── Layout changes ───────────────────────────────────────────────

	// The first callback arrives after the initial layout, so measuring there
	// never forces a synchronous reflow during page load. Nothing is written
	// here: rendering waits for the next frame (still before paint), so text
	// changes such as the orbit caption cannot resize anything another
	// ResizeObserver (e.g. the motion runtime's) is delivering.
	const relayout = () => {
		mode = layoutMode();
		measure();
		if (!started) start();
		schedule();
	};
	new ResizeObserver(relayout).observe(world);
	desktop.addEventListener('change', relayout);
	reducedMotion.addEventListener('change', () => {
		settle = undefined;
		appear = 1;
		velocityYaw = velocityPitch = 0;
		schedule();
	});

	// ── Start ────────────────────────────────────────────────────────

	function start(): void {
		started = true;
		if (moving()) {
			// Entrance: planes fade in by depth while the world settles into its rest pose, once.
			appear = 0;
			settle = { start: performance.now(), from: mode === 'sphere' ? REST_YAW - 0.9 : REST_YAW };
		}
	}

	return {
		source(slug) {
			const plane = identities.find((candidate) => candidate.slug === slug);
			if (!plane || !plane.visible || !plane.transform) return undefined;
			// The plane's box starts at the world's centre (left/top 50%, origin 0 0).
			const box = world.getBoundingClientRect();
			const matrix = new DOMMatrix()
				.translate(box.left + box.width / 2, box.top + box.height / 2)
				.multiply(new DOMMatrix(plane.transform));
			return {
				rect: plane.element.getBoundingClientRect(),
				color: getComputedStyle(plane.element).backgroundColor,
				matrix,
				width: plane.width,
				height: plane.height,
			};
		},
		setLifted(slug) {
			lifted = slug;
			landingState = undefined;
			schedule();
		},
		land(ms) {
			if (!lifted) return;
			landingState = ms > 0 ? { slug: lifted, start: performance.now(), duration: ms } : undefined;
			lifted = undefined;
			schedule();
		},
		setFocusMode(on) {
			stage.toggleAttribute('data-focus', on);
			if (on) {
				velocityYaw = velocityPitch = 0;
				highlight(undefined);
			}
		},
	};
}
