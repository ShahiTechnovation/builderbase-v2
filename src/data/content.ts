/**
 * Application-level content API. Pages call these; components receive the
 * results as props and never know where content came from.
 *
 *   local dataset ─┐
 *                  ├─ snapshot (normalised domain records) ─ truth gate ─ UI
 *   Baserow ───────┘
 *   Luma ───────────── upcoming events ───────────────────────────────── UI
 *
 * Everything is read at build time (static output) and memoised, so each
 * service is called at most once per build. Content updates ship by
 * rebuilding (e.g. a Baserow webhook → Vercel deploy hook).
 */
import { loadBaserowContent } from '../lib/baserow/repository';
import { baserowConfig, contentSource, contentStrict, lumaConfig } from '../lib/env';
import { fetchUpcomingEvents, type UpcomingEvents } from '../lib/luma/events';
import { resolvePhoto } from '../lib/photo-assets';
import { cultureCandidates, heroCandidates } from './curation';
import { home } from './home';
import { loadLocalContent } from './local';
import type { Activation, Builder, City, ContentSnapshot, Project, ResolvedPhoto, TeamMember } from './model';
import {
	canClaimNationalPresence,
	citiesWithVerifiedActivity,
	isPublicActivation,
	isPublicBuilder,
	isPublicProject,
	isPublicTeamMember,
	publicPhotoCaption,
} from './public';
import { resolveSnapshot } from './snapshot';

let snapshotPromise: Promise<ContentSnapshot> | undefined;
const eventsByLimit = new Map<number, Promise<UpcomingEvents>>();

/** The content snapshot for this build. */
export function getContent(): Promise<ContentSnapshot> {
	snapshotPromise ??= loadSnapshot();
	return snapshotPromise;
}

function loadSnapshot(): Promise<ContentSnapshot> {
	return resolveSnapshot({
		source: contentSource,
		strict: contentStrict,
		baserow: baserowConfig(),
		loadLocal: loadLocalContent,
		loadBaserow: (config) => loadBaserowContent(config),
	});
}

// ── Homepage ───────────────────────────────────────────────────────────

export interface CulturePhoto {
	photo: ResolvedPhoto;
	/** Verified caption lines; empty when nothing is verified. */
	caption: string[];
}

export interface HomepageContent {
	heroPhoto?: ResolvedPhoto;
	culturePhotos: CulturePhoto[];
	/** "Building across India" may be stated (verified activity in 2+ Indian cities). */
	nationalPresence: boolean;
}

export async function getHomepageContent(): Promise<HomepageContent> {
	const content = await getContent();

	const heroPhoto = heroCandidates(content.photos)
		.map(resolvePhoto)
		.find((photo) => photo !== undefined);

	const culturePhotos = cultureCandidates(content.photos)
		.map(resolvePhoto)
		.filter((photo): photo is ResolvedPhoto => photo !== undefined)
		.slice(0, home.culture.maxPhotos)
		.map((photo) => ({ photo, caption: publicPhotoCaption(photo, content) }));

	return { heroPhoto, culturePhotos, nationalPresence: canClaimNationalPresence(content) };
}

// ── Collections for later sections ─────────────────────────────────────

/** Ranked items first (lowest rank leads), then featured, then the fallback order. */
const byRank = (a: { homepageRank?: number; featured: boolean }, b: { homepageRank?: number; featured: boolean }) =>
	(a.homepageRank ?? Infinity) - (b.homepageRank ?? Infinity) || Number(b.featured) - Number(a.featured);

/** Published past work (Public AND Verified AND Status = Published), featured only. */
export async function getFeaturedActivations(limit = 6): Promise<Activation[]> {
	const { activations } = await getContent();
	return activations
		.filter((entry) => entry.featured && isPublicActivation(entry))
		.sort((a, b) => byRank(a, b) || b.date.localeCompare(a.date))
		.slice(0, limit);
}

/** Public AND Verified AND Status = Published. */
export async function getPublicProjects(): Promise<Project[]> {
	const { projects } = await getContent();
	return projects.filter(isPublicProject).sort((a, b) => byRank(a, b) || a.title.localeCompare(b.title));
}

/** Public AND Consent to publish. */
export async function getPublicBuilders(): Promise<Builder[]> {
	const { builders } = await getContent();
	return builders.filter(isPublicBuilder).sort((a, b) => byRank(a, b) || a.name.localeCompare(b.name));
}

/** Public AND Consent to publish AND Active. */
export async function getTeamMembers(): Promise<TeamMember[]> {
	const { teamMembers } = await getContent();
	return teamMembers.filter(isPublicTeamMember).sort((a, b) => a.order - b.order);
}

/** Cities with verified public activity: featured first, then sort order, then name. */
export async function getActiveCities(): Promise<City[]> {
	const content = await getContent();
	return citiesWithVerifiedActivity(content).sort(
		(a, b) =>
			Number(b.featured) - Number(a.featured) ||
			(a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) ||
			a.name.localeCompare(b.name),
	);
}

/** Upcoming Builder Base–managed events from Luma (empty when unconfigured or failing). */
export function getUpcomingEvents(limit = 3): Promise<UpcomingEvents> {
	let events = eventsByLimit.get(limit);
	if (!events) {
		events = fetchUpcomingEvents(lumaConfig(), { limit });
		eventsByLimit.set(limit, events);
	}
	return events;
}
