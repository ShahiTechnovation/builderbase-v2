/**
 * Verified facts. Intentionally empty in Phase 1.
 *
 * Add an entry only once it has been confirmed, and record the source. The
 * old repository's seed data (event counts, chapter lists, partner lists) is
 * not evidence and must not be copied here.
 */
import type { Activation, Builder, City, Organization, Project, Relationship } from './model';

export const cities: City[] = [];
export const organizations: Organization[] = [];
export const relationships: Relationship[] = [];
export const activations: Activation[] = [];
export const builders: Builder[] = [];
export const projects: Project[] = [];
