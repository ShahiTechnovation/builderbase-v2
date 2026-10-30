/**
 * Typed JSON-LD structured data generators for Builder Base.
 * Follows Schema.org and Google Search Central specifications.
 */
import { site, destinations } from '../../data/site';

export const SITE_URL = 'https://builderbase.xyz';
export const LOGO_URL = 'https://builderbase.xyz/images/brand-flag-logo.png';
export const DEFAULT_OG_IMAGE = 'https://builderbase.xyz/images/about/room-builder-base-banner.jpg';

export interface BreadcrumbItem {
	name: string;
	url: string;
}

export function buildOrganizationSchema() {
	return {
		'@type': 'Organization',
		'@id': `${SITE_URL}/#organization`,
		name: site.name,
		alternateName: ['BuilderBase', 'Builder Base India'],
		url: SITE_URL,
		logo: {
			'@type': 'ImageObject',
			'@id': `${SITE_URL}/#logo`,
			url: LOGO_URL,
			caption: 'Builder Base — The distribution layer for builders',
		},
		image: DEFAULT_OG_IMAGE,
		description: site.description,
		sameAs: [
			destinations.x,
			destinations.linkedIn,
			destinations.instagram,
			destinations.lumaCalendar,
			destinations.join,
		],
		areaServed: {
			'@type': 'Country',
			name: 'India',
		},
		knowsAbout: [
			'Developer Communities',
			'Hackathons',
			'Artificial Intelligence',
			'Web3 & Protocol Engineering',
			'Developer Ecosystem Partnerships',
			'Technical Workshops',
		],
	};
}

export function buildWebSiteSchema() {
	return {
		'@type': 'WebSite',
		'@id': `${SITE_URL}/#website`,
		url: SITE_URL,
		name: site.name,
		description: site.description,
		publisher: {
			'@id': `${SITE_URL}/#organization`,
		},
		inLanguage: 'en-IN',
	};
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
	return {
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
		})),
	};
}

export interface EventSchemaParams {
	id: string;
	title: string;
	description?: string;
	url: string;
	startsAt: string;
	endsAt?: string | null;
	timezone?: string;
	city?: string;
	venueName?: string;
	address?: string;
	online?: boolean;
	coverUrl?: string;
	organizerName?: string;
	price?: number | string;
	priceCurrency?: string;
	status?: 'scheduled' | 'cancelled' | 'postponed' | 'movedOnline';
}

export function buildEventSchema(params: EventSchemaParams) {
	const eventStatusMap = {
		scheduled: 'https://schema.org/EventScheduled',
		cancelled: 'https://schema.org/EventCancelled',
		postponed: 'https://schema.org/EventPostponed',
		movedOnline: 'https://schema.org/EventMovedOnline',
	};

	const attendanceMode = params.online
		? 'https://schema.org/OnlineEventAttendanceMode'
		: 'https://schema.org/OfflineEventAttendanceMode';

	const location = params.online
		? {
				'@type': 'VirtualLocation',
				url: params.url,
			}
		: {
				'@type': 'Place',
				name: params.venueName || params.city || 'Builder Base Event Space',
				address: {
					'@type': 'PostalAddress',
					addressLocality: params.city || 'India',
					addressCountry: 'IN',
				},
			};

	const offerObj: Record<string, unknown> = {
		'@type': 'Offer',
		url: params.url,
		availability: 'https://schema.org/InStock',
		validFrom: params.startsAt,
	};

	// Authoritative pricing: only output explicit price when verified; never fabricate '0'
	if (params.price !== undefined) {
		offerObj.price = String(params.price);
		offerObj.priceCurrency = params.priceCurrency || 'INR';
	}

	return {
		'@type': 'Event',
		'@id': `${SITE_URL}/events/${params.id}/#event`,
		name: params.title,
		description: params.description || `${params.title} — Organized by Builder Base.`,
		url: params.url,
		startDate: params.startsAt,
		endDate: params.endsAt || params.startsAt,
		eventStatus: eventStatusMap[params.status ?? 'scheduled'],
		eventAttendanceMode: attendanceMode,
		location,
		image: params.coverUrl ? [params.coverUrl] : [DEFAULT_OG_IMAGE],
		organizer: {
			'@type': 'Organization',
			name: params.organizerName || site.name,
			url: SITE_URL,
		},
		offers: offerObj,
	};
}

export interface ArticleSchemaParams {
	slug: string;
	title: string;
	description: string;
	datePublished: string;
	dateModified?: string;
	authorName?: string;
	coverImage?: string;
}

export function buildArticleSchema(params: ArticleSchemaParams) {
	const canonicalUrl = `${SITE_URL}/stories/${params.slug}`;
	return {
		'@type': 'TechArticle',
		'@id': `${canonicalUrl}/#article`,
		headline: params.title,
		description: params.description,
		url: canonicalUrl,
		mainEntityOfPage: {
			'@type': 'WebPage',
			'@id': canonicalUrl,
		},
		datePublished: params.datePublished,
		dateModified: params.dateModified || params.datePublished,
		author: {
			'@type': 'Organization',
			name: params.authorName || 'Builder Base Editorial',
			url: SITE_URL,
		},
		publisher: {
			'@id': `${SITE_URL}/#organization`,
		},
		image: params.coverImage || DEFAULT_OG_IMAGE,
		inLanguage: 'en-IN',
	};
}

