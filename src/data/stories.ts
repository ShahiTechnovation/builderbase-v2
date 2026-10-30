/**
 * Editorial Content & Story repository for Builder Base.
 * Authentic recaps, practical guides, and ecosystem insights.
 */

export interface Story {
	slug: string;
	title: string;
	headline: string;
	summary: string;
	category: 'Event Recaps' | 'Builder Stories' | 'Hackathon Guides' | 'Ecosystem Insights';
	author: {
		name: string;
		role: string;
	};
	datePublished: string;
	dateModified: string;
	readTimeMinutes: number;
	coverImage: string;
	coverAlt: string;
	contentParagraphs: {
		heading?: string;
		text: string;
	}[];
	tags: string[];
	relatedSlugs: string[];
}

export const STORIES: Record<string, Story> = {
	'claude-code-build-day-bhopal': {
		slug: 'claude-code-build-day-bhopal',
		title: 'Inside Claude Code Build Day: What Happens When 300+ Builders Ship in Bhopal',
		headline: 'Moving beyond chat prompts to autonomous terminal agent loops in Central India.',
		summary:
			'An inside recap of the Claude Code Build Day in Bhopal, where over 300 engineers gathered with open terminals, agent architectures, and one mission: ship working software before the sun set.',
		category: 'Event Recaps',
		author: {
			name: 'Builder Base Editorial',
			role: 'Field Dispatch',
		},
		datePublished: '2026-04-12T10:00:00+05:30',
		dateModified: '2026-04-15T14:30:00+05:30',
		readTimeMinutes: 5,
		coverImage: '/images/events/fable-5-1-build-day.webp',
		coverAlt: 'Developers collaborating with laptops open during Claude Code Build Day.',
		tags: ['Claude Code', 'Autonomous Agents', 'Bhopal', 'Build Day', 'CLI Workflows'],
		relatedSlugs: ['ai-hackathon-preparation-guide', 'delhi-ncr-developer-meetup-guide'],
		contentParagraphs: [
			{
				heading: 'The Shift from Prompting to Terminal Execution',
				text: 'For the past two years, AI engineering often looked like copying code snippets out of browser chat windows. Claude Code changed that equation entirely. By giving autonomous agents native file system access, terminal execution capabilities, and multi-file reasoning, developer workflows shifted from manual typing to architectural direction.',
			},
			{
				text: 'At Builder Base’s Bhopal Node, we brought together 300+ software engineers, university developers, and founders for a focused Saturday build session. There were no 45-minute keynote decks or theoretical sales pitches. Within twenty minutes of arrival, attendees had initiated their local environments, configured API access, and opened active terminal prompts.',
			},
			{
				heading: 'What Was Built in the Room',
				text: 'Teams tackled complex multi-system problems: local code review daemons, real-time audio pipeline agents using WebRTC, database migration verifiers, and autonomous documentation scrapers. Watching builders inspect agent scratchpads and iterate on test loops demonstrated the velocity unlocked when engineers treat models as autonomous junior teammates.',
			},
			{
				heading: 'Central India’s Builder Density',
				text: 'One of the most persistent misconceptions in Indian tech is that high-density builder energy only lives in Bengaluru or Gurugram. Bhopal demonstrated once again that exceptional technical talent exists everywhere in India when given high-signal rooms, fast internet, and peers who value shipping over talk.',
			},
		],
	},

	'hack-in-the-hills-manali-residency': {
		slug: 'hack-in-the-hills-manali-residency',
		title: 'Behind the Scenes of Hack in the Hills: A Himalayan Builder Residency',
		headline: 'Escaping the metro noise to write protocols and ship deep work in the mountains.',
		summary:
			'Why Builder Base took developers to the mountains of Himachal Pradesh, and how uninterrupted focus transforms the velocity of technical teams.',
		category: 'Builder Stories',
		author: {
			name: 'Builder Base Editorial',
			role: 'Residency Dispatch',
		},
		datePublished: '2026-06-20T09:00:00+05:30',
		dateModified: '2026-06-22T11:00:00+05:30',
		readTimeMinutes: 6,
		coverImage: '/images/about/room-builder-base-banner.jpg',
		coverAlt: 'Builders holding the Builder Base banner together in Manali.',
		tags: ['Manali', 'Residency', 'Deep Work', 'Himalayas', 'Hackathon'],
		relatedSlugs: ['claude-code-build-day-bhopal', 'ai-hackathon-preparation-guide'],
		contentParagraphs: [
			{
				heading: 'The Problem with City Noise',
				text: 'Most developer meetups last two hours. By the time engineers break through small talk and establish real technical alignment, the venue starts packing up chairs. Hack in the Hills was built on a different thesis: what happens when exceptional builders live, eat, and build together in the mountains for days at a time?',
			},
			{
				heading: 'The Mountain Routine',
				text: 'In Manali, mornings started with crisp mountain air and architecture debates over chai. Afternoons were reserved for uninterrupted focus sprints—no commuting, no meeting pings, no distractions. Teams built decentralized state machines, LLM memory architectures, and high-throughput tooling.',
			},
			{
				heading: 'Shared Craft as the Foundation',
				text: 'When you strip away status signaling and vanity networking, what remains is the pure craft of engineering. The builders who completed Hack in the Hills left not just with shipped repositories, but with trusted lifelong collaborators who know how they write, debug, and solve hard problems under pressure.',
			},
		],
	},

	'ai-hackathon-preparation-guide': {
		slug: 'ai-hackathon-preparation-guide',
		title: 'How to Prepare for an AI Hackathon in India: The Practical Field Guide',
		headline: 'A tactical blueprint for software engineers entering 24-to-48-hour build competitions.',
		summary:
			'Everything you need to know before stepping onto the hackathon floor: scoping realistic architectures, managing API latency, testing edge cases, and pitching working code.',
		category: 'Hackathon Guides',
		author: {
			name: 'Builder Base Engineering',
			role: 'Technical Guide',
		},
		datePublished: '2026-08-10T08:30:00+05:30',
		dateModified: '2026-08-15T16:00:00+05:30',
		readTimeMinutes: 7,
		coverImage: '/images/about/room-hackathon-floor.jpg',
		coverAlt: 'Hackathon participants focused on laptop screens building software.',
		tags: ['Hackathons', 'Developer Guide', 'AI Prototyping', 'System Architecture'],
		relatedSlugs: ['claude-code-build-day-bhopal', 'delhi-ncr-developer-meetup-guide'],
		contentParagraphs: [
			{
				heading: '1. Pick One Hard Problem, Not Ten Shallow Ones',
				text: 'The most common mistake at technical hackathons is building an entire SaaS dashboard with user settings, billing pages, and five different sub-features. Winning teams do the opposite: they isolate one technically difficult problem—such as structured multi-agent verification or sub-second vector retrieval—and make that single workflow flawless.',
			},
			{
				heading: '2. Prepare Your Boilerplate Before the Timer Starts',
				text: 'Do not spend the first two hours of a hackathon configuring Tailwind, setting up database connections, or debugging build tools. Maintain a production-tested starter template with your favorite full-stack framework (e.g. Astro or Next.js), database client, and LLM SDK pre-configured.',
			},
			{
				heading: '3. Build Defensive Fallbacks for API Latency',
				text: 'During a live demo in front of judges, the internet connection will fluctuate and third-party AI APIs will hit rate limits. Always implement optimistic UI states, local response caching, and defensive fallback mocks so your live presentation never hangs on a spinning loader.',
			},
			{
				heading: '4. The 3-Minute Demo Rule',
				text: 'Judges care about working software. Spend 30 seconds establishing the exact technical bottleneck, 2 minutes demonstrating your working application live on screen, and 30 seconds explaining the production architecture and next steps.',
			},
		],
	},

	'delhi-ncr-developer-meetup-guide': {
		slug: 'delhi-ncr-developer-meetup-guide',
		title: 'How to Find Developer Meetups and Hackathons in Delhi NCR',
		headline: 'Navigating the technical communities of Delhi, Gurugram, and Noida.',
		summary:
			'A comprehensive guide for developers, students, and founders looking for high-signal engineering rooms, Web3 sprints, and AI workshops in the National Capital Region.',
		category: 'Ecosystem Insights',
		author: {
			name: 'Builder Base Editorial',
			role: 'City Guide',
		},
		datePublished: '2026-09-05T12:00:00+05:30',
		dateModified: '2026-09-10T15:00:00+05:30',
		readTimeMinutes: 5,
		coverImage: '/images/about/room-full-house.jpg',
		coverAlt: 'Audience gathered in Delhi NCR for a technical developer session.',
		tags: ['Delhi NCR', 'Developer Meetups', 'Tech Events India', 'Networking'],
		relatedSlugs: ['ai-hackathon-preparation-guide', 'claude-code-build-day-bhopal'],
		contentParagraphs: [
			{
				heading: 'The Delhi NCR Engineering Landscape',
				text: 'Delhi NCR is one of India’s most diverse technical regions. South Delhi and Central Delhi host intense university builder clubs and hacker houses; Gurugram is the center for venture-backed AI startups and enterprise infrastructure; Noida houses large-scale software engineering institutes and protocol teams.',
			},
			{
				heading: 'Filtering High-Signal Rooms from Vanity Networking',
				text: 'Not all tech events are worth your Saturday. High-signal gatherings share three characteristics: they have hands-on coding requirements or live technical demos, organizers maintain strict curation on attendee RSVPs, and attendees are actively building rather than exchanging business cards.',
			},
			{
				heading: 'How Builder Base Rooms Operate in NCR',
				text: 'Builder Base hosts regular build nights and hackathon tracks across Delhi NCR. Follow our official calendar on Luma (https://luma.com/Builderbase) and check our Delhi NCR hub page (/cities/delhi-ncr) to get invited to the next room.',
			},
		],
	},
};

