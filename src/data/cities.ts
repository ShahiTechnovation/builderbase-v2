/**
 * City Authority data for Builder Base.
 * Grounded in verified physical activations, real photography, and actual event history.
 */

export interface CityData {
	slug: string;
	name: string;
	displayName: string;
	state: string;
	region: string;
	eyebrow: string;
	headline: string;
	summary: string;
	technicalFocus: string[];
	authenticNarrative: string[];
	photo: {
		src: string;
		alt: string;
		caption: string;
	};
	verifiedStats: {
		eventsHosted: string;
		coreTheme: string;
		vibe: string;
	};
	aliases?: string[];
}

export const CITIES: Record<string, CityData> = {
	'delhi-ncr': {
		slug: 'delhi-ncr',
		name: 'Delhi NCR',
		displayName: 'Delhi NCR (Delhi · Gurugram · Noida)',
		state: 'National Capital Region',
		region: 'North India',
		eyebrow: '01 /// NORTHERN REGION NODE',
		headline: 'Where Protocol Sprints Meet Dense Engineering Energy.',
		summary:
			'Delhi NCR is one of Builder Base’s most active hubs, spanning university technical communities, AI hackathon floors, and late-night protocol sprints across Delhi, Gurugram, and Noida.',
		technicalFocus: [
			'Agentic AI Workflows',
			'Protocol & Smart Contract Security',
			'Developer Hackathons & Sprints',
			'Full-Stack LLM Engineering',
		],
		authenticNarrative: [
			'The rooms in Delhi NCR are characterized by intense collaboration. From multi-day hackathons packed with engineering teams to focused protocol meetups, builders come to write real code and test production systems.',
			'Builder Base activations across Delhi, Gurugram, and Noida connect student developers from premier institutes with technical teams building core protocols and developer tools.',
		],
		photo: {
			src: '/images/about/room-hackathon-floor.jpg',
			alt: 'Hackathon floor in Delhi NCR with developers actively building software side-by-side.',
			caption: 'Protocol Sprint & Hackathon Floor · Delhi NCR',
		},
		verifiedStats: {
			eventsHosted: '12+ Rooms',
			coreTheme: 'Hackathons & Sprints',
			vibe: 'High-Velocity Shipping',
		},
		aliases: ['delhi', 'gurugram', 'noida'],
	},
	bhopal: {
		slug: 'bhopal',
		name: 'Bhopal',
		displayName: 'Bhopal',
		state: 'Madhya Pradesh',
		region: 'Central India',
		eyebrow: '02 /// CENTRAL INNOVATION NODE',
		headline: 'The Birthplace of Claude Code Build Days & Agent Labs.',
		summary:
			'Bhopal is Builder Base’s most prolific engineering node in Central India, with over 19 physical activations spanning hands-on Claude Code workshops, autonomous agent build sessions, and community nights.',
		technicalFocus: [
			'Claude Code CLI Workflows',
			'Autonomous Multi-Agent Systems',
			'Full-Stack Prototyping',
			'Open Source Tooling',
		],
		authenticNarrative: [
			'Central India holds extraordinary engineering talent. In Bhopal, Builder Base runs intense, hands-on build days where developers transition from learning AI concepts to shipping functional agentic applications in a single afternoon.',
			'The rooms are dense with laptops, whiteboard architecture sketches, and engineers collaborating across campus borders.',
		],
		photo: {
			src: '/images/events/fable-5-1-build-day.webp',
			alt: 'Developers building full-stack applications during a Claude Code Build Day in Bhopal.',
			caption: 'Claude Code Build Day · Bhopal',
		},
		verifiedStats: {
			eventsHosted: '19+ Rooms',
			coreTheme: 'Claude Code & AI Agents',
			vibe: 'Deep Craft & Prototyping',
		},
	},
	mumbai: {
		slug: 'mumbai',
		name: 'Mumbai',
		displayName: 'Mumbai',
		state: 'Maharashtra',
		region: 'Western India',
		eyebrow: '03 /// WESTERN FINANCIAL & DEVCON NODE',
		headline: 'Devcon Gatherings, Agentic Nights & Western Ecosystem Hub.',
		summary:
			'From intimate builder dinners and Claude Code workshops to major international Devcon and India Blockchain Week nodes, Builder Base connects Mumbai’s ambitious software engineers with global ecosystems.',
		technicalFocus: [
			'Decentralized Infrastructure',
			'Agentic Systems & Developer Tooling',
			'Production Architecture & Security',
			'High-Performance Web Applications',
		],
		authenticNarrative: [
			'Mumbai is the commercial and Web3 heartbeat of the country. Builder Base curates rooms where engineers, protocol researchers, and startup founders gather to discuss real technical roadmaps rather than vanity networking.',
			'Whether running side-event nodes for Devcon 8 or technical roadshows, our Mumbai rooms provide direct distribution for engineering tools looking to establish deep roots in India.',
		],
		photo: {
			src: '/images/about/room-stage-steps.jpg',
			alt: 'Builders and engineering leads speaking on stage during a Builder Base gathering.',
			caption: 'Ecosystem Gathering & Speaker Sessions · Mumbai Node',
		},
		verifiedStats: {
			eventsHosted: '3+ Rooms · Devcon Node',
			coreTheme: 'Ecosystem & Devcon Nodes',
			vibe: 'Commercial & Global Scale',
		},
	},
	indore: {
		slug: 'indore',
		name: 'Indore',
		displayName: 'Indore',
		state: 'Madhya Pradesh',
		region: 'Central India',
		eyebrow: '04 /// CENTRAL METRO NODE',
		headline: 'AI Community Nights and Practical Engineering Gatherings.',
		summary:
			'Indore brings together Central India’s fastest-growing developer ecosystem. Builder Base hosts community nights, generative AI sessions, and peer build nights in the city.',
		technicalFocus: [
			'Generative AI & Media Pipelines',
			'Developer Community Meetups',
			'Full-Stack Web Engineering',
			'Technical Product Demos',
		],
		authenticNarrative: [
			'Indore’s developers are pragmatic, fast-moving, and eager to master emerging stacks. Builder Base partner sessions (including HeyGen Community Nights) provide local builders with hands-on tool access and immediate peer feedback.',
		],
		photo: {
			src: '/images/about/room-restaurant.jpg',
			alt: 'Developers gathered around tables collaborating and discussing technical architectures.',
			caption: 'Builder Community Dinner & Architecture Discussion · Indore',
		},
		verifiedStats: {
			eventsHosted: '3+ Rooms',
			coreTheme: 'Community Nights & Media AI',
			vibe: 'Pragmatic & Collaborative',
		},
	},
	manali: {
		slug: 'manali',
		name: 'Manali',
		displayName: 'Manali (Himachal Pradesh)',
		state: 'Himachal Pradesh',
		region: 'Himalayan Foothills',
		eyebrow: '05 /// BUILDER RESIDENCY NODE',
		headline: 'Hack in the Hills — Focused High-Craft Hacker Residency.',
		summary:
			'High in the Himalayas, Hack in the Hills provides an intensive residency environment where engineers escape the noise to write code, design protocols, and ship meaningful projects together.',
		technicalFocus: [
			'Deep Work & Focus Residencies',
			'Open Source Protocol Architecture',
			'AI Model Exploration',
			'Peer Code Reviews',
		],
		authenticNarrative: [
			'Great software requires uninterrupted focus. In Manali, Builder Base’s residency model strips away typical city distractions, creating an intimate cohort where developers live, hike, and build side-by-side.',
		],
		photo: {
			src: '/images/about/room-builder-base-banner.jpg',
			alt: 'Developers and founders gathered together holding the Builder Base banner.',
			caption: 'Hack in the Hills Residency Cohort · Manali',
		},
		verifiedStats: {
			eventsHosted: 'Residency Cohorts',
			coreTheme: 'Deep Work Hacker Residencies',
			vibe: 'Himalayan Focus',
		},
	},
	kolkata: {
		slug: 'kolkata',
		name: 'Kolkata',
		displayName: 'Kolkata',
		state: 'West Bengal',
		region: 'Eastern India',
		eyebrow: '06 /// EASTERN REGION NODE',
		headline: 'Protocol Nights and Deep Technical Discussions in the East.',
		summary:
			'Kolkata is Builder Base’s Eastern gateway, bringing together engineers, protocol researchers, and system builders for focused technical sessions and developer networking.',
		technicalFocus: [
			'Distributed Systems & Protocols',
			'Developer Education & Tooling',
			'Peer-to-Peer Networks',
			'Open Source Systems',
		],
		authenticNarrative: [
			'Kolkata’s developer community has a deep tradition of academic rigor and theoretical computer science. Builder Base rooms in Kolkata bridge theoretical foundations with practical shipping.',
		],
		photo: {
			src: '/images/about/room-full-house.jpg',
			alt: 'Audience of developers in Kolkata attending a technical session.',
			caption: 'Technical Protocol Session · Kolkata',
		},
		verifiedStats: {
			eventsHosted: '2+ Rooms',
			coreTheme: 'Protocol Nights & Systems',
			vibe: 'Intellectual & Thorough',
		},
	},
};

