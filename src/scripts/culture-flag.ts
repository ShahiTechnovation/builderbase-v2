import { FLAG_LOGO_FALLBACK } from './flag-logo-fallback';

export interface CultureFlagConfig {
	artwork: {
		type: 'gradient' | 'image' | 'solid';
		src: string;
		fit: 'cover' | 'contain';
		focal: [number, number];
		stops: string[];
		angle: number;
		color: string;
	};
	logo: {
		src: string;
		fallbackSrc?: string;
		width: number;
	};
	colors: {
		stage: string;
		sheen: string;
		sheenAccent: string;
		artworkOverlay: string;
	};
	physics: {
		stiffness: number;
		damping: number;
		grabRadius: number;
		lift: [number, number];
		iterations: number;
		introRipple: boolean;
		wind: number;
	};
	shading: {
		glossiness: number;
		ambient: number;
		light: [number, number, number];
		iridescence: number;
		perspective: number;
	};
	grid: [number, number];
	aspect: number;
}

const DEFAULT_CONFIG: CultureFlagConfig = {
	artwork: {
		type: 'gradient',
		src: '',
		fit: 'cover',
		focal: [0.5, 0.5],
		stops: ['#efeee6', '#dddcd2'],
		angle: 160,
		color: '#f1efe8',
	},
	logo: {
		src: '/images/brand-flag-logo.webp',
		fallbackSrc: FLAG_LOGO_FALLBACK,
		width: 0.45,
	},
	colors: {
		stage: '#0e0f13',
		sheen: '#fff0cc',
		sheenAccent: '#ffb8ea',
		artworkOverlay: 'rgba(0,0,0,0)',
	},
	physics: {
		stiffness: 0.014,
		damping: 0.975,
		grabRadius: 0.08,
		lift: [70, 180],
		iterations: 5,
		introRipple: true,
		wind: 66,
	},
	shading: {
		glossiness: 38,
		ambient: 0.42,
		light: [-0.45, -0.6, 0.75],
		iridescence: 0.8,
		perspective: 1300,
	},
	grid: [44, 32],
	aspect: 1.35,
};

interface Grab {
	id: number;
	x0: number;
	y0: number;
	dx: number;
	dy: number;
	idx: number[];
	bx: number[];
	by: number[];
	bz: number[];
	w: number[];
}

const VS = `#version 300 es
in vec3 aP;
in vec3 aN;
in vec2 aUV;
uniform vec2 uView;
uniform float uF;
out vec2 vUV;
out vec3 vN;
void main() {
  float s = uF / (uF - aP.z);
  vec2 c = uView * 0.5;
  vec2 q = c + (aP.xy - c) * s;
  gl_Position = vec4(q.x / uView.x * 2.0 - 1.0, 1.0 - q.y / uView.y * 2.0, -aP.z / 4000.0, 1.0);
  vUV = aUV;
  vN = aN;
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vUV;
in vec3 vN;
out vec4 o;
uniform sampler2D uT;
uniform vec3 uL, uS, uS2;
uniform float uG, uA, uI;
void main() {
  vec3 n = normalize(vN);
  float back = 1.0;
  if (n.z < 0.0) {
    n = -n;
    back = 0.82;
  }
  vec3 L = normalize(uL);
  float d = min(max(dot(n, L), 0.0) / L.z, 1.1);
  vec3 col = texture(uT, vUV).rgb * (uA + (1.0 - uA) * d) * back;
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float nh = max(dot(n, H), 0.0);
  vec3 tint = mix(uS, uS2, clamp(0.5 + n.x * 1.6, 0.0, 1.0) * uI);
  col += tint * (pow(nh, uG) * 0.4 + pow(nh, 7.0) * 0.05) * back;
  col *= 1.04 - 0.08 * length(vUV - vec2(0.35, 0.3));
  o = vec4(col, 1.0);
}`;

function parseRgb(color: string): [number, number, number] {
	if (typeof document === 'undefined') return [0, 0, 0];
	const c = document.createElement('canvas');
	c.width = 1;
	c.height = 1;
	const ctx = c.getContext('2d');
	if (!ctx) return [0, 0, 0];
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, 1, 1);
	const data = ctx.getImageData(0, 0, 1, 1).data;
	return [data[0] / 255, data[1] / 255, data[2] / 255];
}

export function initCultureFlag(stageElement: HTMLElement, userConfig: Partial<CultureFlagConfig> = {}) {
	const canvas = stageElement.querySelector<HTMLCanvasElement>('canvas[data-flag-canvas]');
	if (!canvas) return;

	// Inherit computed stage background if on a themed surface
	const computedBg = window.getComputedStyle(stageElement).backgroundColor;
	const config: CultureFlagConfig = {
		...DEFAULT_CONFIG,
		...userConfig,
		colors: {
			...DEFAULT_CONFIG.colors,
			...(userConfig.colors || {}),
			stage: computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent'
				? computedBg
				: DEFAULT_CONFIG.colors.stage,
		},
	};

	let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	const onMotionChange = (e: MediaQueryListEvent) => {
		reduced = e.matches;
	};
	motionQuery.addEventListener('change', onMotionChange);

	const PH = config.physics;
	const SH = config.shading;

	const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
	let ctx2d: CanvasRenderingContext2D | null = null;
	if (!gl) {
		ctx2d = canvas.getContext('2d');
	}

	let prog: WebGLProgram | null = null;
	const U: Record<string, WebGLUniformLocation | null> = {};
	let bufP: WebGLBuffer | null = null;
	let bufN: WebGLBuffer | null = null;
	let bufUV: WebGLBuffer | null = null;
	let bufI: WebGLBuffer | null = null;
	let glTex: WebGLTexture | null = null;
	let vao: WebGLVertexArrayObject | null = null;
	let stageColor = parseRgb(config.colors.stage);

	/* ── Physics State ── */
	let cols = 0;
	let rows = 0;
	let n = 0;
	let P = new Float32Array(0);
	let Q = new Float32Array(0);
	let Rs = new Float32Array(0);
	let N = new Float32Array(0);
	let UV = new Float32Array(0);
	let IDX = new Uint16Array(0);
	let sp = 0;
	let ox = 0;
	let oy = 0;
	let t = 0;
	let cA = new Int32Array(0);
	let cB = new Int32Array(0);
	let cL = new Float32Array(0);
	let cK = new Float32Array(0);

	let grab: Grab | null = null;
	const hv = { on: false, x: 0, y: 0, vx: 0, vy: 0 };

	/* ── Texture State ── */
	const art = {
		img: null as HTMLImageElement | null,
		logo: null as HTMLImageElement | null,
		showLogo: Boolean(config.logo.src || config.logo.fallbackSrc),
	};
	const tex = document.createElement('canvas');
	const tx = tex.getContext('2d')!;
	let vw = 0;
	let vh = 0;
	let S = 0;
	let SW = 0;

	// Noise pattern for fabric grain
	const grain = (() => {
		const c = document.createElement('canvas');
		c.width = c.height = 128;
		const g = c.getContext('2d');
		if (!g) return null;
		const d = g.createImageData(128, 128);
		for (let i = 0; i < d.data.length; i += 4) {
			d.data[i] = d.data[i + 1] = d.data[i + 2] = Math.random() * 255;
			d.data[i + 3] = 255;
		}
		g.putImageData(d, 0, 0);
		return tx.createPattern(c, 'repeat');
	})();

	function loadImg(src: string, cb: (img: HTMLImageElement | null) => void) {
		const im = new Image();
		if (!/^data:|^blob:/.test(src)) im.crossOrigin = 'anonymous';
		im.onload = () => cb(im);
		im.onerror = () => cb(null);
		im.src = src;
	}

	function paint() {
		const H = (tex.height = Math.max(256, Math.min(2048, Math.round(S * 1.7))));
		const W = (tex.width = Math.round(H * config.aspect));
		const A = config.artwork;

		if (A.type === 'gradient') {
			const a = (A.angle * Math.PI) / 180;
			const dx = Math.sin(a);
			const dy = -Math.cos(a);
			const h = ((Math.abs(dx) + Math.abs(dy)) * W) / 2;
			const g = tx.createLinearGradient(W / 2 - dx * h, H / 2 - dy * h, W / 2 + dx * h, H / 2 + dy * h);
			A.stops.forEach((c, i) => g.addColorStop(i / Math.max(1, A.stops.length - 1), c));
			tx.fillStyle = g;
			tx.fillRect(0, 0, W, H);
		} else {
			tx.fillStyle = A.color;
			tx.fillRect(0, 0, W, H);
		}

		tx.fillStyle = config.colors.artworkOverlay;
		tx.fillRect(0, 0, W, H);

		if (art.showLogo && art.logo) {
			const lw = W * config.logo.width;
			const lh = (lw * art.logo.height) / art.logo.width;
			tx.drawImage(art.logo, (W - lw) / 2, (H - lh) / 2, lw, lh);
		}

		if (grain) {
			tx.globalCompositeOperation = 'soft-light';
			tx.globalAlpha = 0.45;
			tx.fillStyle = grain;
			tx.fillRect(0, 0, W, H);
			tx.globalCompositeOperation = 'source-over';
			tx.globalAlpha = 1;
		}

		upload();
	}

	function initPhysics() {
		[cols, rows] = config.grid;
		n = cols * rows;
		P = new Float32Array(n * 3);
		Q = new Float32Array(n * 3);
		Rs = new Float32Array(n * 3);
		N = new Float32Array(n * 3);
		UV = new Float32Array(n * 2);

		sp = SW / (cols - 1);
		const spy = S / (rows - 1);
		ox = (vw - SW) / 2;
		oy = (vh - S) / 2;

		for (let j = 0; j < rows; j++) {
			for (let i = 0; i < cols; i++) {
				const k = j * cols + i;
				Rs[k * 3] = ox + i * sp;
				Rs[k * 3 + 1] = oy + j * spy;
				UV[k * 2] = i / (cols - 1);
				UV[k * 2 + 1] = j / (rows - 1);
			}
		}

		const a: number[] = [];
		const b: number[] = [];
		const l: number[] = [];
		const kk: number[] = [];

		const add = (i: number, j: number, i2: number, j2: number, s: number) => {
			if (i2 < 0 || j2 < 0 || i2 >= cols || j2 >= rows) return;
			const p1 = j * cols + i;
			const q1 = j2 * cols + i2;
			a.push(p1);
			b.push(q1);
			kk.push(s);
			l.push(Math.hypot(Rs[p1 * 3] - Rs[q1 * 3], Rs[p1 * 3 + 1] - Rs[q1 * 3 + 1]));
		};

		for (let j = 0; j < rows; j++) {
			for (let i = 0; i < cols; i++) {
				add(i, j, i + 1, j, 0.9);
				add(i, j, i, j + 1, 0.9);
				add(i, j, i + 1, j + 1, 0.5);
				add(i, j, i - 1, j + 1, 0.5);
				add(i, j, i + 2, j, 0.1);
				add(i, j, i, j + 2, 0.1);
			}
		}

		cA = Int32Array.from(a);
		cB = Int32Array.from(b);
		cL = Float32Array.from(l);
		cK = Float32Array.from(kk);

		const idx: number[] = [];
		for (let j = 0; j < rows - 1; j++) {
			for (let i = 0; i < cols - 1; i++) {
				const p1 = j * cols + i;
				idx.push(p1, p1 + 1, p1 + cols, p1 + 1, p1 + cols + 1, p1 + cols);
			}
		}
		IDX = new Uint16Array(idx);

		t = 0;
		wind();
		P.set(Rs);
		Q.set(Rs);
		grab = null;

		if (PH.introRipple && !reduced) {
			for (let j = 0; j < rows; j++) {
				for (let i = 0; i < cols; i++) {
					Q[(j * cols + i) * 3 + 2] -= (70 / 60) * Math.sin(i * 0.4 + j * 0.3);
				}
			}
		}

		glInit();
	}

	function wind() {
		const A = PH.wind * (reduced ? 0.5 : 1);
		for (let j = 0; j < rows; j++) {
			for (let i = 0; i < cols; i++) {
				const u = i / (cols - 1);
				const v = j / (rows - 1);
				Rs[(j * cols + i) * 3 + 2] =
					A * (0.35 + 0.65 * u) * (Math.sin(u * 5.6 - t * 4 + v * 3.4) + 0.45 * Math.sin(u * 14 - t * 3 - v * 2.6 + 1.3));
			}
		}
	}

	function step() {
		t += 1 / 60;
		wind();
		const kS = PH.stiffness;
		const d = PH.damping;

		for (let k = 0; k < n * 3; k++) {
			const p1 = P[k];
			const v1 = (p1 - Q[k]) * d;
			Q[k] = p1;
			P[k] = p1 + v1 + (Rs[k] - p1) * kS;
		}

		if (hv.on) {
			const sp2 = Math.hypot(hv.vx, hv.vy);
			const r = PH.grabRadius * S * 0.8;
			if (sp2 > 0.05) {
				for (let k = 0; k < n; k++) {
					const dx = Rs[k * 3] - hv.x;
					const dy = Rs[k * 3 + 1] - hv.y;
					const w = Math.exp(-(dx * dx + dy * dy) / (r * r));
					if (w > 0.03) {
						P[k * 3] += hv.vx * w * 0.1;
						P[k * 3 + 1] += hv.vy * w * 0.1;
						P[k * 3 + 2] += w * Math.min(4, sp2 * 0.15);
					}
				}
			}
			hv.vx *= 0.85;
			hv.vy *= 0.85;
		}

		for (let it = 0; it < PH.iterations; it++) {
			if (grab) {
				const lm = reduced ? 0.5 : 1;
				const dist = Math.hypot(grab.dx, grab.dy);
				const lift = (PH.lift[0] + Math.min(PH.lift[1] - PH.lift[0], dist * 0.35)) * lm;
				for (let m = 0; m < grab.idx.length; m++) {
					const k = grab.idx[m] * 3;
					const w = grab.w[m];
					P[k] += (grab.bx[m] + grab.dx - P[k]) * w * 0.4;
					P[k + 1] += (grab.by[m] + grab.dy - P[k + 1]) * w * 0.4;
					P[k + 2] += (grab.bz[m] + w * lift - P[k + 2]) * w * 0.4;
				}
			}
			for (let c = 0; c < cA.length; c++) {
				const a = cA[c] * 3;
				const b = cB[c] * 3;
				const dx = P[b] - P[a];
				const dy = P[b + 1] - P[a + 1];
				const dz = P[b + 2] - P[a + 2];
				const len = Math.hypot(dx, dy, dz) || 1e-6;
				const f = ((len - cL[c]) / len) * cK[c] * 0.5;
				P[a] += dx * f;
				P[a + 1] += dy * f;
				P[a + 2] += dz * f;
				P[b] -= dx * f;
				P[b + 1] -= dy * f;
				P[b + 2] -= dz * f;
			}
		}
	}

	function normals() {
		for (let j = 0; j < rows; j++) {
			for (let i = 0; i < cols; i++) {
				const a = j * cols + i;
				const l = (j * cols + Math.max(i - 1, 0)) * 3;
				const r = (j * cols + Math.min(i + 1, cols - 1)) * 3;
				const u = (Math.max(j - 1, 0) * cols + i) * 3;
				const d = (Math.min(j + 1, rows - 1) * cols + i) * 3;

				const ax = P[r] - P[l];
				const ay = P[r + 1] - P[l + 1];
				const az = P[r + 2] - P[l + 2];
				const bx = P[d] - P[u];
				const by = P[d + 1] - P[u + 1];
				const bz = P[d + 2] - P[u + 2];

				const x = ay * bz - az * by;
				const y = az * bx - ax * bz;
				const z = ax * by - ay * bx;
				const m = Math.hypot(x, y, z) || 1;

				N[a * 3] = x / m;
				N[a * 3 + 1] = y / m;
				N[a * 3 + 2] = z / m;
			}
		}
	}

	function glInit() {
		if (!gl) return;
		if (!prog) {
			const sh = (type: number, src: string) => {
				const o = gl.createShader(type)!;
				gl.shaderSource(o, src);
				gl.compileShader(o);
				return o;
			};
			prog = gl.createProgram()!;
			gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
			gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
			gl.linkProgram(prog);

			['uView', 'uF', 'uT', 'uL', 'uS', 'uS2', 'uG', 'uA', 'uI'].forEach((k) => {
				U[k] = gl.getUniformLocation(prog!, k);
			});

			vao = gl.createVertexArray();
			bufP = gl.createBuffer();
			bufN = gl.createBuffer();
			bufUV = gl.createBuffer();
			bufI = gl.createBuffer();
			glTex = gl.createTexture();
			gl.enable(gl.DEPTH_TEST);
		}

		gl.bindVertexArray(vao);
		const attribs: [WebGLBuffer | null, string, number, Float32Array, number][] = [
			[bufP, 'aP', 3, P, gl.DYNAMIC_DRAW],
			[bufN, 'aN', 3, N, gl.DYNAMIC_DRAW],
			[bufUV, 'aUV', 2, UV, gl.STATIC_DRAW],
		];
		attribs.forEach(([b, nm, sz, data, use]) => {
			const loc = gl.getAttribLocation(prog!, nm);
			gl.bindBuffer(gl.ARRAY_BUFFER, b);
			gl.bufferData(gl.ARRAY_BUFFER, data, use);
			gl.enableVertexAttribArray(loc);
			gl.vertexAttribPointer(loc, sz, gl.FLOAT, false, 0, 0);
		});
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufI);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, IDX, gl.STATIC_DRAW);
	}

	function upload() {
		if (!gl || !glTex) return;
		gl.bindTexture(gl.TEXTURE_2D, glTex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}

	function draw() {
		if (!gl || !prog || !vao) return;
		gl.clearColor(stageColor[0], stageColor[1], stageColor[2], 1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.useProgram(prog);
		gl.bindVertexArray(vao);

		gl.bindBuffer(gl.ARRAY_BUFFER, bufP);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, P);

		gl.bindBuffer(gl.ARRAY_BUFFER, bufN);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, N);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, glTex);

		gl.uniform1i(U.uT, 0);
		gl.uniform2f(U.uView, vw, vh);
		gl.uniform1f(U.uF, SH.perspective);
		gl.uniform3fv(U.uL, SH.light);
		gl.uniform3fv(U.uS, parseRgb(config.colors.sheen));
		gl.uniform3fv(U.uS2, parseRgb(config.colors.sheenAccent));
		gl.uniform1f(U.uG, SH.glossiness);
		gl.uniform1f(U.uA, SH.ambient);
		gl.uniform1f(U.uI, SH.iridescence);

		gl.drawElements(gl.TRIANGLES, IDX.length, gl.UNSIGNED_SHORT, 0);
	}

	function drawFallback() {
		if (!ctx2d) return;
		ctx2d.setTransform(canvas.width / vw, 0, 0, canvas.height / vh, 0, 0);
		ctx2d.fillStyle = config.colors.stage;
		ctx2d.fillRect(0, 0, vw, vh);
		ctx2d.drawImage(tex, ox, oy, SW, S);
		ctx2d.fillStyle = '#888';
		ctx2d.font = '13px system-ui, sans-serif';
		ctx2d.textAlign = 'center';
		ctx2d.fillText('WebGL2 is unavailable, so the satin cloth is shown flat.', vw / 2, oy + S + 28);
	}

	/* ── Loop & Resize ── */
	let raf = 0;
	let last = 0;
	let acc = 0;
	let isVisible = false;

	function frame(now: number) {
		if (!isVisible) {
			raf = 0;
			return;
		}
		raf = requestAnimationFrame(frame);
		acc = Math.min(acc + (now - last) / 1000, 0.05);
		last = now;
		while (acc >= 1 / 60) {
			step();
			acc -= 1 / 60;
		}
		normals();
		if (gl) draw();
		else if (ctx2d) drawFallback();
	}

	function resize() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const rect = stageElement.getBoundingClientRect();
		vw = Math.round(rect.width) || window.innerWidth;
		vh = Math.round(rect.height) || Math.round(window.innerHeight * 0.6);

		S = Math.min((vw * 0.90) / config.aspect, vh * 0.84);
		SW = S * config.aspect;

		canvas.width = Math.round(vw * dpr);
		canvas.height = Math.round(vh * dpr);
		canvas.style.width = `${vw}px`;
		canvas.style.height = `${vh}px`;

		stageColor = parseRgb(config.colors.stage);
		if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
		initPhysics();
		paint();
		if (!gl && ctx2d) drawFallback();
	}

	/* ── Input Handling (relative to canvas rect) ── */
	const pos = (e: PointerEvent): [number, number] => {
		const rect = canvas.getBoundingClientRect();
		return [e.clientX - rect.left, e.clientY - rect.top];
	};

	const onPointerDown = (e: PointerEvent) => {
		if (!gl) return;
		const [x, y] = pos(e);
		const r = PH.grabRadius * S;
		const g: Grab = {
			id: e.pointerId,
			x0: x,
			y0: y,
			dx: 0,
			dy: 0,
			idx: [],
			bx: [],
			by: [],
			bz: [],
			w: [],
		};

		for (let k = 0; k < n; k++) {
			const dx = P[k * 3] - x;
			const dy = P[k * 3 + 1] - y;
			const w = Math.exp(-(dx * dx + dy * dy) / (r * r));
			if (w > 0.03) {
				g.idx.push(k);
				g.bx.push(P[k * 3]);
				g.by.push(P[k * 3 + 1]);
				g.bz.push(P[k * 3 + 2]);
				g.w.push(w);
			}
		}

		if (g.idx.length) {
			grab = g;
			try {
				canvas.setPointerCapture(e.pointerId);
			} catch {
				// Pointer capture can be unsupported or restricted in synthetic test environments
			}
			canvas.style.cursor = 'grabbing';
			canvas.setAttribute('data-grabbing', 'true');
		} else {
			grab = null;
		}
		hv.on = false;
	};

	const onPointerMove = (e: PointerEvent) => {
		const [x, y] = pos(e);
		if (grab && e.pointerId === grab.id) {
			grab.dx = x - grab.x0;
			grab.dy = y - grab.y0;
		} else if (!grab && e.pointerType === 'mouse') {
			hv.vx = Math.max(-40, Math.min(40, x - hv.x));
			hv.vy = Math.max(-40, Math.min(40, y - hv.y));
			hv.x = x;
			hv.y = y;
			hv.on = true;
		}
	};

	const onPointerUp = (e: PointerEvent) => {
		if (grab && e.pointerId === grab.id) {
			grab = null;
			try {
				canvas.releasePointerCapture(e.pointerId);
			} catch {}
			canvas.style.cursor = 'grab';
			canvas.removeAttribute('data-grabbing');
		}
	};

	const onPointerLeave = () => {
		hv.on = false;
	};

	canvas.addEventListener('pointerdown', onPointerDown);
	canvas.addEventListener('pointermove', onPointerMove);
	canvas.addEventListener('pointerup', onPointerUp);
	canvas.addEventListener('pointercancel', onPointerUp);
	canvas.addEventListener('pointerleave', onPointerLeave);

	/* ── Visibility & Performance Observer ── */
	const visObserver = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				isVisible = entry.isIntersecting;
				if (isVisible) {
					last = performance.now();
					acc = 0;
					if (!raf) raf = requestAnimationFrame(frame);
				} else {
					if (raf) {
						cancelAnimationFrame(raf);
						raf = 0;
					}
				}
			}
		},
		{ rootMargin: '100px 0px' }
	);
	visObserver.observe(stageElement);

	const onVisibilityChange = () => {
		if (document.hidden) {
			if (raf) {
				cancelAnimationFrame(raf);
				raf = 0;
			}
		} else if (isVisible) {
			last = performance.now();
			acc = 0;
			if (!raf) raf = requestAnimationFrame(frame);
		}
	};
	document.addEventListener('visibilitychange', onVisibilityChange);

	const resizeObserver = new ResizeObserver(() => {
		resize();
	});
	resizeObserver.observe(stageElement);

	/* ── Asset Loading & Start ── */
	const startLoop = () => {
		resize();
		isVisible = true;
		canvas.setAttribute('data-flag-active', '');
		stageElement.setAttribute('data-flag-ready', '');
		last = performance.now();
		if (!raf) raf = requestAnimationFrame(frame);
	};

	// Start simulation immediately so physics and rendering are ready without waiting for image I/O
	startLoop();

	const primaryLogoSrc = config.logo.src;
	const fallbackLogoSrc = config.logo.fallbackSrc;

	if (primaryLogoSrc) {
		loadImg(primaryLogoSrc, (im) => {
			if (im) {
				art.logo = im;
				paint();
			} else if (fallbackLogoSrc) {
				loadImg(fallbackLogoSrc, (fallbackIm) => {
					if (fallbackIm) {
						art.logo = fallbackIm;
						paint();
					}
				});
			}
		});
	}

	return () => {
		visObserver.disconnect();
		resizeObserver.disconnect();
		motionQuery.removeEventListener('change', onMotionChange);
		document.removeEventListener('visibilitychange', onVisibilityChange);
		canvas.removeEventListener('pointerdown', onPointerDown);
		canvas.removeEventListener('pointermove', onPointerMove);
		canvas.removeEventListener('pointerup', onPointerUp);
		canvas.removeEventListener('pointercancel', onPointerUp);
		canvas.removeEventListener('pointerleave', onPointerLeave);
		if (raf) cancelAnimationFrame(raf);
	};
}
