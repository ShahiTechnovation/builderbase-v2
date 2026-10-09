export function activationCountLabel(count: number): string {
	return `${count} verified ${count === 1 ? 'activation' : 'activations'}`;
}
