import type { BaserowConfig, BaserowLoadResult } from '../lib/baserow/repository';
import type { ContentSnapshot, ContentSourceName } from './model';

export interface SnapshotOptions {
	source: ContentSourceName;
	strict: boolean;
	baserow: BaserowConfig | undefined;
	loadLocal: () => ContentSnapshot;
	loadBaserow: (config: BaserowConfig) => Promise<BaserowLoadResult>;
	warn?: (message: string) => void;
}

export async function resolveSnapshot(options: SnapshotOptions): Promise<ContentSnapshot> {
	const { source, strict, baserow, loadLocal, loadBaserow, warn = (message) => console.warn(message) } = options;
	if (source === 'local') return loadLocal();

	if (!baserow) {
		const reason = 'CONTENT_SOURCE=baserow but missing configuration';
		if (strict) throw new Error(`[content] ${reason}.`);
		warn(`[content] ${reason} — using the local dataset.`);
		return { ...loadLocal(), degraded: true };
	}

	const { snapshot, failed, issues } = await loadBaserow(baserow);
	for (const issue of issues) warn(`[content] baserow ${issue}`);

	if (failed.length > 0 && strict) {
		throw new Error(`[content] Baserow tables failed (${failed.join(', ')}) and CONTENT_STRICT is set.`);
	}

	if (failed.length > 0) warn(`[content] Baserow degraded: ${failed.join(', ')} unavailable.`);

	return snapshot;
}
