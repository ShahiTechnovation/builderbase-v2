import { db, Events, Partner, Project } from 'astro:db';

export default async function seed() {
  await db.insert(Events).values([
    { id: '1', name: 'Builder Base Initial Launch', date: '2026-10-07', public: true }
  ]);
  
  await db.insert(Partner).values([
    { id: '1', name: 'Vercel', public: true }
  ]);
  
  await db.insert(Project).values([
    { id: '1', title: 'Astro DB Migration', public: true }
  ]);
}
