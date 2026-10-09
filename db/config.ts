import { defineDb, defineTable, column } from 'astro:db';

const Events = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    date: column.text(),
    type: column.text({ optional: true }),
    public: column.boolean({ default: true }),
  }
});

const Partner = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    website: column.text({ optional: true }),
    public: column.boolean({ default: true }),
  }
});

const Project = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    title: column.text(),
    url: column.text({ optional: true }),
    public: column.boolean({ default: true }),
  }
});

export default defineDb({
  tables: { Events, Partner, Project }
});
