/**
 * Decides which content snapshot a build uses. Pure (dependencies are
 * injected) so every fallback path is unit-tested.
 *
 *  - CONTENT_SOURCE=local    → the repository dataset.
 *  - CONTENT_SOURCE=baserow  → Baserow, with these fallbacks:
 *      not configured        → local dataset (degraded)
 *      a table fails         → that table contributes nothing (degraded)
 *      photos table fails    → local photographs (degraded)
 *      no approved photos    → local photographs, so the homepage keeps its
 *                              imagery while the Photos table is being filled
 *    CONTENT_STRICT=true turns "not configured" and any table failure into a
 *    build error instead.
 *
 * The local dataset holds only approved photographs and no facts, so a
 * fallback can never publish an unverified claim.
 */
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
		const reason = 'CONTENT_SOURCE=baserow but BASEROW_DATABASE_TOKEN / BASEROW_TABLE_PHOTOS are not set';
		if (strict) throw new Error(`[content] ${reason}.`);
		warn(`[content] ${reason} — using the local dataset.`);
		return { ...loadLocal(), degraded: true };
	}

	const { snapshot, failed, issues } = await loadBaserow(baserow);
	for (const issue of issues) warn(`[content] baserow ${issue}`);

	if (failed.length > 0 && strict) {
		throw new Error(`[content] Baserow tables failed (${failed.join(', ')}) and CONTENT_STRICT is set.`);
	}

	if (failed.includes('photos')) {
		warn('[content] Baserow photos unavailable — using local photographs.');
		return { ...snapshot, photos: loadLocal().photos, degraded: true };
	}

	if (failed.length > 0) warn(`[content] Baserow degraded: ${failed.join(', ')} unavailable.`);

	if (snapshot.photos.length === 0) {
		warn('[content] Baserow has no approved photos yet — keeping the local photographs.');
		return { ...snapshot, photos: loadLocal().photos };
	}

	return snapshot;
}
