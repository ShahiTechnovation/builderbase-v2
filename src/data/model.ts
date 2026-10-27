export interface Publishable {
	public: boolean;
}

export type PublicationStatus = 'draft' | 'published' | 'archived';

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

