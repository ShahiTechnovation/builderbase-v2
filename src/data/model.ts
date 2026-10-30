import type { ImageMetadata } from 'astro';

export interface Publishable {
	public: boolean;
}

export type PublicationStatus = 'draft' | 'published' | 'archived';

export interface FocalPoint {
	x: number;
	y: number;
}

export type PhotoAssetRef =
	| { kind: 'local'; key: string }
	| { kind: 'remote'; url: string; width: number; height: number };

export type PhotoImage = ImageMetadata | { src: string; width: number; height: number };

export type PhotoUsage = 'approved' | 'pending' | 'restricted';

export interface Photo {
	id: string;
	asset: PhotoAssetRef;
	alt: string;
	focal: FocalPoint;
	focalPortrait?: FocalPoint;
	usage?: PhotoUsage;
	heroRank?: number;
	cultureRank?: number;
	featured?: boolean;
	tags?: string[];
	activationId?: string;
	cityId?: string;
	credit?: string;
	internalNote?: string;
}

export interface ResolvedPhoto extends Photo {
	image: PhotoImage;
}

export interface Partner {
	id: string;
	slug: string;
	name: string;
	type?: string;
	url?: string;
	logo?: { kind: 'remote'; url: string; width: number; height: number };
}

export type ActivationType = 'build-night' | 'hackathon' | 'workshop' | 'meetup' | 'summit' | 'residency' | 'other';

export interface Activation extends Publishable {
	id: string;
	slug: string;
	title: string;
	shortTitle?: string;
	date: string;
	type?: ActivationType;
	partnerIds: Partner['id'][];
	summary?: string;
	coverPhotoUrl?: string;
	photoUrls: string[];
	projectIds: Project['id'][];
	externalUrl?: string;
	featured: boolean;
	homepageRank?: number;
	status: PublicationStatus;
}

export interface Project extends Publishable {
	id: string;
	slug: string;
	title: string;
	description?: string;
	activationId?: Activation['id'];
	stack: string[];
	screenshotUrl?: string;
	liveUrl?: string;
	repositoryUrl?: string;
	featured: boolean;
	homepageRank?: number;
	status: PublicationStatus;
}

export type ContentSourceName = 'local' | 'baserow';

export interface ContentSnapshot {
	source: ContentSourceName;
	degraded: boolean;
	partners: Partner[];
	activations: Activation[];
	projects: Project[];
}

/** An event, sourced from Luma or Builder Base activations. */
export interface Event {
	id: string;
	title: string;
	startsAt: string;
	endsAt: string | null;
	timezone: string;
	url: string;
	coverUrl?: string;
	city?: string;
	country?: string;
	online: boolean;
	source: 'luma' | 'baserow' | 'local';
	hostedByBuilderBase: boolean;
	hostName?: string;
	guestCount?: number;
	photosUrl?: string;
}

