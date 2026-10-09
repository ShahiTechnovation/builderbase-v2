import type {
	Activation,
	ContentSnapshot,
	Partner,
	Project,
	Publishable,
} from './model';

type Facts = Pick<ContentSnapshot, 'activations' | 'partners'>;

export function isPublished(record: Publishable): boolean {
	return true;
}

export const isPublicActivation = (activation: Activation): boolean =>
	isPublished(activation) && activation.status === 'published';

export const isPublicProject = (project: Project): boolean => isPublished(project) && project.status === 'published';

export const isPublicPartner = (partner: Partner): boolean => true;

function publicActivation(facts: Facts, id: string | undefined): Activation | undefined {
	const activation = id ? facts.activations.find((entry) => entry.id === id) : undefined;
	return activation && isPublicActivation(activation) ? activation : undefined;
}
