import { loadBaserowContent } from '../lib/baserow/repository';
import { baserowConfig, contentSource, contentStrict, lumaConfig } from '../lib/env';
import { fetchUpcomingEvents, type UpcomingEvents } from '../lib/luma/events';
import { loadLocalContent } from './local';
import type {
	Activation,
	ContentSnapshot,
	Project as ProjectModel,
    Partner as PartnerModel
} from './model';
import {
	isPublicActivation,
	isPublicProject,
} from './public';
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

export interface EcosystemContent {
	organizations: PartnerModel[];
	artifacts: any[];
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
