import { loadBaserowContent } from '../lib/baserow/repository';
import { baserowConfig, contentSource, contentStrict, lumaConfig } from '../lib/env';
import {
	fetchUpcomingEvents,
	getLumaCalendarEvents,
	localDay,
	type UpcomingEvents,
} from '../lib/luma/events';
import { loadLocalContent } from './local';
import type {
	Activation,
	ContentSnapshot,
	Event,
	Partner as PartnerModel,
	Project as ProjectModel,
} from './model';
import {
	isPublicActivation,
	isPublicProject,
} from './public';
import { destinations } from './site';
import { resolveSnapshot } from './snapshot';


export function getContent(): Promise<ContentSnapshot> {
    // In SSR mode, we fetch fresh data on every page request so admin panel changes show instantly
    return loadSnapshot();
}

function loadSnapshot(): Promise<ContentSnapshot> {
	return resolveSnapshot({
		source: 'baserow',
		strict: false,
		baserow: baserowConfig(),
		loadLocal: loadLocalContent,
		loadBaserow: (config) => loadBaserowContent(config),
	});
}

// ── Homepage ───────────────────────────────────────────────────────────

export interface CulturePhoto {
	photoUrl: string;
	caption: string[];
}

export interface HomepageContent {
	heroPhotoUrl?: string;
	culturePhotos: CulturePhoto[];
}

export async function getHomepageContent(): Promise<HomepageContent> {
	// The user requested photos from Vercel CDN on the homepage.
    // For now we just return some placeholders, or read from env/config if preferred.
	return { 
        heroPhotoUrl: 'https://builderbase.xyz/hero.jpg', 
        culturePhotos: [
            { photoUrl: 'https://res.cloudinary.com/yic4m8kq/image/upload/v1793103970/20260405_185344.jpg', caption: ['Builder Base', 'Event'] },
            { photoUrl: 'https://res.cloudinary.com/yic4m8kq/image/upload/v1793104868/6161153281179194441.jpg', caption: ['Builder Base', 'Community'] },
            { photoUrl: 'https://res.cloudinary.com/yic4m8kq/video/upload/v1793103983/video6210907281387694049.mp4', caption: ['Builder Base', 'Session'] },
            { photoUrl: 'https://res.cloudinary.com/yic4m8kq/video/upload/v1793103980/video6210907281387694051.mp4', caption: ['Builder Base', 'Highlights'] }
        ] 
    };
}

// ── Collections for later sections ─────────────────────────────────────

const byRank = (a: { homepageRank?: number; featured: boolean }, b: { homepageRank?: number; featured: boolean }) =>
	(a.homepageRank ?? Infinity) - (b.homepageRank ?? Infinity) || Number(b.featured) - Number(a.featured);

export async function getFeaturedActivations(limit = 6): Promise<Activation[]> {
	const { activations } = await getContent();
	return activations
		.filter((entry) => entry.featured && isPublicActivation(entry))
		.sort((a, b) => byRank(a, b) || b.date.localeCompare(a.date))
		.slice(0, limit);
}

export async function getPublicProjects(): Promise<ProjectModel[]> {
	const { projects } = await getContent();
	return projects.filter(isPublicProject).sort((a, b) => byRank(a, b) || a.title.localeCompare(b.title));
}

// ── Ecosystem ──────────────────────────────────────────────────────────

export interface ResolvedEcosystemOrganization extends PartnerModel {
	number: number;
	roles: string[];
	typeName: string;
	activationCount: number;
	identityLines: string[];
	logoImage?: { src: string; width: number; height: number };
	urlLabel?: string;
}

export interface ResolvedEcosystemArtifact {
	kind: 'identity' | 'image';
	organizationSlug: string;
	position: { x: number; y: number; z: number };
	lean: { x: number; y: number; z: number };
	picture?: { src: string; width: number; height: number };
}

export interface EcosystemContent {
	organizations: ResolvedEcosystemOrganization[];
	artifacts: ResolvedEcosystemArtifact[];
	years?: { from: number; to: number };
	fixture: boolean;
}

export async function getEcosystemContent(): Promise<EcosystemContent> {
	const content = await getContent();
    
    // Generate an 'identity' artifact for every partner on a Fibonacci sphere
    const artifacts = content.partners.map((partner, i) => {
        const phi = Math.acos(1 - 2 * (i + 0.5) / content.partners.length);
        const theta = Math.PI * (1 + Math.pow(5, 0.5)) * i;
        
        return {
            kind: 'identity',
            organizationSlug: partner.slug || partner.id.toString(), // fallback if slug is missing
            position: {
                x: Math.cos(theta) * Math.sin(phi),
                y: Math.sin(theta) * Math.sin(phi),
                z: Math.cos(phi)
            },
            lean: {
                x: (Math.random() - 0.5) * 10,
                y: (Math.random() - 0.5) * 10,
                z: (Math.random() - 0.5) * 10
            }
        };
    });

    const organizations = content.partners.map((p, i) => ({
        ...p,
        slug: p.slug || p.id.toString(),
        number: i + 1,
        roles: [p.type || 'Partner'], // Use the custom Type from Baserow!
        typeName: p.type || 'Partner',
        activationCount: 0,
        identityLines: [p.name],
        logoImage: p.logo ? { src: p.logo.url, width: p.logo.width, height: p.logo.height } : undefined
    })) as any;

    return {
        organizations,
		artifacts,
		years: undefined,
        fixture: false
    };
}

export function getUpcomingEvents(limit = 3): Promise<UpcomingEvents> {
	return fetchUpcomingEvents(lumaConfig(), { limit });
}

export interface EventsPageContent {
	status: 'live' | 'fallback' | 'unavailable';
	upcoming: Event[];
	past: Event[];
	years: Map<string, Event[]>;
}

function matchesActivation(event: Event, activation: Activation): boolean {
	if (activation.externalUrl) {
		const cleanExt = activation.externalUrl.trim().toLowerCase();
		const cleanEvUrl = event.url.toLowerCase();
		if (cleanExt === cleanEvUrl) return true;
		const evSlug = cleanEvUrl.split('/').pop();
		if (evSlug && cleanExt.includes(evSlug)) return true;
	}

	const evDay = localDay(event);
	if (activation.date && activation.date.slice(0, 10) === evDay) {
		const words = activation.title
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((w) => w.length > 3);
		if (words.some((w) => event.title.toLowerCase().includes(w))) {
			return true;
		}
	}
	return false;
}

export async function getEventsContent(): Promise<EventsPageContent> {
	const [lumaResult, snapshot] = await Promise.all([
		getLumaCalendarEvents(),
		getContent().catch(() => null),
	]);

	const publicActivations = (snapshot?.activations ?? []).filter(isPublicActivation);
	const matchedActivationIds = new Set<string>();

	let upcoming: Event[] = [];
	let past: Event[] = [];
	let status: EventsPageContent['status'] = 'live';

	if (lumaResult) {
		// Attach any Baserow gallery photo URLs to matched Luma events
		upcoming = lumaResult.upcoming.map((ev) => {
			const matched = publicActivations.find((act) => matchesActivation(ev, act));
			if (matched) {
				matchedActivationIds.add(matched.id);
				const photo = matched.photoUrls?.[0] || matched.coverPhotoUrl;
				return photo ? { ...ev, photosUrl: photo } : ev;
			}
			return ev;
		});

		past = lumaResult.past.map((ev) => {
			const matched = publicActivations.find((act) => matchesActivation(ev, act));
			if (matched) {
				matchedActivationIds.add(matched.id);
				const photo = matched.photoUrls?.[0] || matched.coverPhotoUrl;
				return photo ? { ...ev, photosUrl: photo } : ev;
			}
			return ev;
		});
	} else {
		status = publicActivations.length > 0 ? 'fallback' : 'unavailable';
	}

	// Add any unmatched Baserow activations as supplementary past events to avoid losing local records
	const now = Date.now();
	for (const act of publicActivations) {
		if (!matchedActivationIds.has(act.id)) {
			const startsAt = act.date ? `${act.date.slice(0, 10)}T10:00:00.000Z` : new Date().toISOString();
			const isPast = Date.parse(startsAt) <= now;
			const ev: Event = {
				id: act.id,
				title: act.title,
				startsAt,
				endsAt: null,
				timezone: 'Asia/Kolkata',
				url: act.externalUrl || destinations.lumaCalendar,
				coverUrl: act.coverPhotoUrl,
				city: undefined,
				online: false,
				source: 'baserow',
				hostedByBuilderBase: true,
				photosUrl: act.photoUrls?.[0],
			};

			if (isPast) {
				past.push(ev);
			} else {
				upcoming.push(ev);
			}
		}
	}

	// Sort upcoming chronologically (soonest first)
	upcoming.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

	// Sort past newest first
	past.sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));

	// Group past events by year
	const years = new Map<string, Event[]>();
	for (const e of past) {
		const y = localDay(e).slice(0, 4) || '2026';
		const list = years.get(y) ?? [];
		list.push(e);
		years.set(y, list);
	}

	return {
		status,
		upcoming,
		past,
		years,
	};
}

export async function getAllEvents(): Promise<Event[]> {
	const { upcoming, past } = await getEventsContent();
	const map = new Map<string, Event>();
	for (const e of [...upcoming, ...past]) {
		if (!map.has(e.id)) {
			map.set(e.id, e);
		}
	}
	return Array.from(map.values());
}

export async function getEventBySlug(slug: string): Promise<Event | undefined> {
	const events = await getAllEvents();
	const { eventToSlug } = await import('../lib/seo/slug');
	const cleanSlug = (slug || '').toLowerCase();
	return events.find((e) => {
		if (!e) return false;
		const evSlug = eventToSlug(e).toLowerCase();
		const eId = (e.id != null ? String(e.id) : '').toLowerCase();
		const urlPart = e.url ? String(e.url).split('/').pop()?.toLowerCase() : undefined;
		return (
			evSlug === cleanSlug ||
			(eId && eId === cleanSlug) ||
			(urlPart && urlPart === cleanSlug) ||
			(urlPart && cleanSlug.endsWith(urlPart))
		);
	});
}


