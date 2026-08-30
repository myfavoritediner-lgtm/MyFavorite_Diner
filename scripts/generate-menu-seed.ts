/**
 * Generates supabase/seed-menu.sql from lib/menu-data.ts.
 *
 *   npm run seed:menu
 *
 * The menu is written once, in lib/menu-data.ts. This turns it into SQL so
 * the same dishes land in Postgres and become editable in Admin -> Menu.
 * Nothing is transcribed by hand, so the two cannot drift: change a price
 * in menu-data.ts, re-run this, re-run the file in Supabase.
 *
 * Requires Node 22.6+ (it imports a .ts file directly).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CODE_MENU } from '../lib/menu-data.ts';

/** Single-quote a value for SQL, or emit a typed null. */
function text(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'null::text';
  return `'${v.replace(/'/g, "''")}'::text`;
}

const out: string[] = [];
const totalDishes = CODE_MENU.reduce((n, s) => n + s.items.length, 0);

out.push(`-- =====================================================================
--  THE MENU  —  My Favorite Diner Bar and Grill
--
--  GENERATED FILE. Do not edit by hand.
--    source:    lib/menu-data.ts
--    regenerate: npm run seed:menu
--    generated:  ${CODE_MENU.length} sections, ${totalDishes} dishes
--
--  Run this in Supabase SQL Editor after schema.sql.
--
--  SAFE TO RE-RUN. It does not truncate anything, and it will not touch a
--  dish that already exists: a dish is inserted only when that section has
--  nothing by that name yet. So staff edits made in Admin -> Menu survive,
--  and re-running only fills in whatever is new.
--
--  Because of that, this file cannot be used to push a price change through
--  to a database that already has the dish. Change those in Admin -> Menu,
--  which is the point of putting the menu in Postgres in the first place.
-- =====================================================================
`);

// ---------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------
out.push(`-- ---------------------------------------------------------------------
--  Sections. Matched on slug, so renaming one in the admin panel sticks.
-- ---------------------------------------------------------------------
insert into public.menu_categories (slug, name, note, sort_order) values`);

out.push(
  CODE_MENU.map(
    (s) =>
      `  (${text(s.slug)}, ${text(s.name)}, ${text(s.note)}, ${s.sort_order})`
  ).join(',\n') + `
on conflict (slug) do update
  set name       = excluded.name,
      note       = excluded.note,
      sort_order = excluded.sort_order;
`
);

// ---------------------------------------------------------------------
// dishes, one statement per section
// ---------------------------------------------------------------------
for (const section of CODE_MENU) {
  const rows = section.items
    .map(
      (i) =>
        `      (${text(i.name)}, ${text(i.description)}, ` +
        `${i.price}::numeric, ${text(i.image_url)}, ${text(i.tag)}, ${i.sort_order}::int)`
    )
    .join(',\n');

  out.push(`-- ---------------------------------------------------------------------
--  ${section.name.toUpperCase()}  (${section.items.length})
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = ${text(section.slug)}
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
${rows}
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );
`);
}

const path = fileURLToPath(new URL('../supabase/seed-menu.sql', import.meta.url));
writeFileSync(path, out.join('\n'), 'utf8');
console.log(
  `wrote supabase/seed-menu.sql — ${CODE_MENU.length} sections, ${totalDishes} dishes`
);
