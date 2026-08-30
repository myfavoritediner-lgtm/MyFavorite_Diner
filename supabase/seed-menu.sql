-- =====================================================================
--  THE MENU  —  My Favorite Diner Bar and Grill
--
--  GENERATED FILE. Do not edit by hand.
--    source:    lib/menu-data.ts
--    regenerate: npm run seed:menu
--    generated:  12 sections, 108 dishes
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

-- ---------------------------------------------------------------------
--  Sections. Matched on slug, so renaming one in the admin panel sticks.
-- ---------------------------------------------------------------------
insert into public.menu_categories (slug, name, note, sort_order) values
  ('burgers'::text, 'Burgers'::text, 'All burgers served with shoestring fries · Make any burger a double +100'::text, 1),
  ('sandwiches'::text, 'Sandwiches'::text, 'All sandwiches are served with shoestring fries.'::text, 2),
  ('hotdogs'::text, 'Hot Dogs'::text, 'All hot dogs served with our jalapeno coleslaw and fries on the side'::text, 3),
  ('mains'::text, 'Main Courses'::text, null::text, 4),
  ('salads'::text, 'Salads'::text, null::text, 5),
  ('breakfast'::text, 'Breakfast'::text, null::text, 6),
  ('pancakes'::text, 'Pancakes & Waffles'::text, 'All pancakes and waffles served with whipped butter and warm maple syrup'::text, 7),
  ('scrambles'::text, 'Egg Scrambles'::text, null::text, 8),
  ('pastas'::text, 'Breakfast Pastas'::text, 'Available any time of day · All pastas served with two slices of garlic buttered baguette'::text, 9),
  ('fries'::text, 'Fries'::text, null::text, 10),
  ('sides'::text, 'Side Dishes'::text, null::text, 11),
  ('sweets'::text, 'Shakes & Sundaes'::text, null::text, 12)
on conflict (slug) do update
  set name       = excluded.name,
      note       = excluded.note,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------
--  BURGERS  (13)
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = 'burgers'::text
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
      ('MFD Classic Hamburger'::text, 'Half a pound (225g) of fresh wagyu beef grilled to order, served with lettuce, tomato, sliced onion and our house made burger sauce.'::text, 295::numeric, '/menu/dishes/mfd-classic-hamburger.jpg'::text, null::text, 1::int),
      ('MFD Classic Cheeseburger'::text, 'Half a pound (225g) of fresh wagyu beef grilled to order, topped with a choice of cheese and served with lettuce, sliced onion and our house made burger sauce.'::text, 310::numeric, '/menu/dishes/mfd-classic-cheeseburger.jpg'::text, null::text, 2::int),
      ('Sizzling Ultimate Cheeseburger'::text, 'Our MFD cheeseburger made with half a pound (225g) of wagyu beef, served on a sizzling plate of molten cheeses. A cheese lover’s ultimate burger.'::text, 325::numeric, '/menu/dishes/sizzling-ultimate-cheeseburger.jpg'::text, null::text, 3::int),
      ('MFD Classic Bacon Cheeseburger'::text, 'Half a pound (225g) of fresh wagyu beef grilled to order, topped with a slice of aged cheddar and two strips of crispy bacon, served with lettuce, tomato, onion and our house made special burger sauce.'::text, 325::numeric, '/menu/dishes/mfd-classic-bacon-cheeseburger.jpg'::text, null::text, 4::int),
      ('The Bishop Ron Burger'::text, 'A massive burger stack starting with a half pound (225g) wagyu beef patty cooked to order, then topped with a fried egg, bacon, a slice of beetroot and pineapple. A favourite down under.'::text, 325::numeric, '/menu/dishes/the-bishop-ron-burger.jpg'::text, null::text, 5::int),
      ('Smoky Roadhouse Burger'::text, 'Texas BBQ in a burger. Half a pound (225g) of fresh wagyu beef grilled to order, topped with a slice of cheddar cheese, a strip of bacon and crispy onion rings, dressed with our house made smoky BBQ sauce.'::text, 325::numeric, '/menu/dishes/smoky-roadhouse-burger.jpg'::text, null::text, 6::int),
      ('The Atomic Burger'::text, 'Half a pound (225g) of fresh wagyu beef grilled to order, topped with jalapenos, pepperjack cheese, lettuce, tomato, onion rings and our own special chipotle sauce.'::text, 345::numeric, '/menu/dishes/the-atomic-burger.jpg'::text, 'Spicy'::text, 7::int),
      ('The Cowboy Burger'::text, 'Half a pound (225g) of fresh wagyu beef mixed with cheddar cheese, pepperjack cheese, onions, jalapenos and bacon, grilled to order. Served on garlic toast with lettuce, tomatoes, sliced onions and our own special burger sauce.'::text, 345::numeric, '/menu/dishes/the-cowboy-burger.jpg'::text, null::text, 8::int),
      ('The Chili Size'::text, 'A chili lover’s delight. Half a pound (225g) of fresh wagyu beef grilled to order and topped with cheddar cheese, served open faced and smothered in our house made chili.'::text, 315::numeric, '/menu/dishes/the-chili-size.jpg'::text, null::text, 9::int),
      ('Blue Cheese Burger'::text, 'Half a pound (225g) of wagyu beef patty grilled to order, topped with blue cheese and served on a toasted bun with lettuce, tomato and sliced onion.'::text, 325::numeric, '/menu/dishes/blue-cheese-burger.jpg'::text, null::text, 10::int),
      ('Patty Melt'::text, 'Half a pound (225g) of wagyu beef grilled to order, topped with grilled onions and cheddar cheese, pressed between two slices of toasted bread and grilled to a toasty perfection.'::text, 325::numeric, '/menu/dishes/patty-melt.jpg'::text, null::text, 11::int),
      ('The Ranch Hand Burger'::text, 'Half a pound (225g) of wagyu beef topped with our tender slow cooked pulled BBQ pork, smoky bacon and our jalapeno coleslaw. Add a slice of cheddar cheese +35.'::text, 345::numeric, '/menu/dishes/the-ranch-hand-burger.jpg'::text, null::text, 12::int),
      ('The Impossible Burger'::text, 'The non-burger burger, made from plants — but you would never know it by the taste. Grilled and topped with lettuce, tomato, chopped onion, relish, pickles, mustard and mayo.'::text, 310::numeric, '/menu/dishes/the-impossible-burger.jpg'::text, 'Plant-based'::text, 13::int)
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );

-- ---------------------------------------------------------------------
--  SANDWICHES  (10)
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = 'sandwiches'::text
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
      ('Classic BLT'::text, 'An all-American classic made with crispy bacon, fresh lettuce, ripe tomatoes and mayonnaise on sourdough toasted bread.'::text, 245::numeric, '/menu/dishes/classic-blt.jpg'::text, null::text, 1::int),
      ('Club Sandwich'::text, 'Slow roasted chicken breast, bacon, edam cheese, lettuce, tomato and mayo, stacked together with perfectly toasted bread. Add a fried egg +35.'::text, 255::numeric, '/menu/dishes/club-sandwich.jpg'::text, null::text, 2::int),
      ('Grilled Cheese Sandwich'::text, 'Three cheese melted fusion of American, cheddar and edam stacked on garlic bread and grilled to gooey goodness. Add bacon and tomato +35.'::text, 175::numeric, '/menu/dishes/grilled-cheese-sandwich.jpg'::text, null::text, 3::int),
      ('Chicken Salad Sandwich'::text, 'Chunks of grilled chicken, celery, red onion and mayo served on sourdough bread.'::text, 225::numeric, '/menu/dishes/chicken-salad-sandwich.jpg'::text, null::text, 4::int),
      ('Tuna Salad Sandwich'::text, 'Flakey albacore tuna, red onion, celery, spices and mayo served on rye bread.'::text, 235::numeric, '/menu/dishes/tuna-salad-sandwich.jpg'::text, null::text, 5::int),
      ('Meatloaf Sandwich'::text, 'Our house made meatloaf, pan seared with melted cheese, served on toasted bread with mayo, mustard, lettuce and tomato slices.'::text, 215::numeric, '/menu/dishes/meatloaf-sandwich.jpg'::text, null::text, 6::int),
      ('Steak Sandwich with Chimichurri Sauce'::text, 'Open faced sandwich with tender grilled steak, caramelized red onions and wild greens on a thick slice of garlic bread, topped with chimichurri sauce.'::text, 345::numeric, '/menu/dishes/steak-sandwich-with-chimichurri-sauce.jpg'::text, null::text, 7::int),
      ('Monte Cristo Sandwich'::text, 'Ham, chicken, edam cheese and Dijon mustard, smothered in French toast batter and simmered until golden, then dusted with powdered sugar.'::text, 275::numeric, '/menu/dishes/monte-cristo-sandwich.jpg'::text, null::text, 8::int),
      ('Pulled Pork Sandwich'::text, 'Tender slow-cooked BBQ pork, cheddar cheese and mild jalapeno coleslaw stacked on a buttery toasted bun.'::text, 275::numeric, '/menu/dishes/pulled-pork-sandwich.jpg'::text, null::text, 9::int),
      ('Nashville Flaming Chicken Sandwich'::text, 'Tender buttermilk marinated grilled chicken breast, spices and our signature hot sauce, served on a toasted brioche bun with pickles and our creamy coleslaw.'::text, 285::numeric, '/menu/dishes/nashville-flaming-chicken-sandwich.jpg'::text, 'Spicy'::text, 10::int)
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );

-- ---------------------------------------------------------------------
--  HOT DOGS  (7)
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = 'hotdogs'::text
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
      ('Ball Park Dog'::text, 'The MVP of stadium dogs. A jumbo dog on a grilled bun with ketchup, mustard and mayo.'::text, 185::numeric, '/menu/dishes/ball-park-dog.jpg'::text, null::text, 1::int),
      ('Cheese Dog'::text, 'Jumbo dog on a grilled bun, drenched in melted cheddar cheese.'::text, 205::numeric, '/menu/dishes/cheese-dog.jpg'::text, null::text, 2::int),
      ('Classic Chili Cheese Dog'::text, 'Jumbo hot dog topped with our hearty house made chili, melted sharp cheddar cheese and a sprinkle of fresh jalapenos for extra kick.'::text, 225::numeric, '/menu/dishes/classic-chili-cheese-dog.jpg'::text, null::text, 3::int),
      ('New York Street Dog'::text, 'Our signature dog served in a toasted bun, blanketed with zesty sauerkraut, spicy tangy onion relish and yellow mustard.'::text, 205::numeric, '/menu/dishes/new-york-street-dog.jpg'::text, null::text, 4::int),
      ('Corn Dog'::text, 'Jumbo dog on a stick, dipped in honey infused cornmeal batter and fried to a golden brown.'::text, 195::numeric, '/menu/dishes/corn-dog.jpg'::text, null::text, 5::int),
      ('South of the Border Dog'::text, 'Jumbo hot dog wrapped in bacon, served with grilled sliced peppers, onions and jalapenos.'::text, 215::numeric, '/menu/dishes/south-of-the-border-dog.jpg'::text, null::text, 6::int),
      ('Argentinian A Punch'::text, 'Jumbo dog slathered in chimichurri sauce with a pickled red onion and pepper relish. Es tu bueno!'::text, 215::numeric, '/menu/dishes/argentinian-a-punch.jpg'::text, null::text, 7::int)
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );

-- ---------------------------------------------------------------------
--  MAIN COURSES  (12)
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = 'mains'::text
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
      ('Meatloaf'::text, 'Comfort food at its best. Fresh wagyu beef mixed with onion, celery, garlic, breadcrumbs and a blend of our special herbs and spices, baked with a classic tomato sauce topping and served on a bed of mashed potatoes.'::text, 355::numeric, '/menu/dishes/meatloaf.jpg'::text, null::text, 1::int),
      ('Baked Mac and 4 Cheeses'::text, 'A classic diner favourite — baked macaroni elbows with cheddar, Monterey Jack, gruyère and parmesan for the ultimate blend of flavours.'::text, 275::numeric, '/menu/dishes/baked-mac-and-4-cheeses.jpg'::text, null::text, 2::int),
      ('Grilled Cedar Plank Salmon'::text, 'Fresh salmon fillets baked on a cedar plank for a light smoky flavour. Served with a side of fries and a side salad.'::text, 375::numeric, '/menu/dishes/grilled-cedar-plank-salmon.jpg'::text, null::text, 3::int),
      ('Fish and Chips'::text, 'Fillet of white fish breaded and fried to perfection, served with tartar sauce and our house made chips.'::text, 335::numeric, '/menu/dishes/fish-and-chips.jpg'::text, null::text, 4::int),
      ('Grilled Steak with Chimichurri Sauce'::text, 'Wagyu beef steak marinated in garlic, olive oil and spices, grilled to order and topped with our own chimichurri sauce. Served with mashed potatoes and a side salad.'::text, 420::numeric, '/menu/dishes/grilled-steak-with-chimichurri-sauce.jpg'::text, null::text, 5::int),
      ('Smothered Pork Chops'::text, 'Tender pork chops smothered in southern style onion gravy, served with creamy mashed potatoes and a side salad.'::text, 540::numeric, '/menu/dishes/smothered-pork-chops.jpg'::text, null::text, 6::int),
      ('Salisbury Steak'::text, 'Ground beef mixed with our own special spice blend, grilled and then bathed in a rich mushroom gravy. Served on a bed of mashed potatoes.'::text, 315::numeric, '/menu/dishes/salisbury-steak.jpg'::text, null::text, 7::int),
      ('Chicken Fried Steak'::text, 'A southern American staple. A tenderised beef cutlet breaded and fried like crispy fried chicken — dredged in seasoned flour, dipped in buttermilk and egg, and fried until golden. Served with mashed potatoes and jalapeno coleslaw.'::text, 295::numeric, '/menu/dishes/chicken-fried-steak.jpg'::text, null::text, 8::int),
      ('Golden Fried Chicken & Waffle'::text, 'Juicy chicken marinated in buttermilk and spices, dredged in our double coating and fried to perfection. Served on top of a golden waffle.'::text, 295::numeric, '/menu/dishes/golden-fried-chicken-waffle.jpg'::text, null::text, 9::int),
      ('Spicy Fried Chicken'::text, 'Farm fresh chicken marinated in our secret blend of herbs and spices and fried until golden brown and crispy. Served with a side of shoestring fries.'::text, 295::numeric, '/menu/dishes/spicy-fried-chicken.jpg'::text, 'Spicy'::text, 10::int),
      ('Buffalo Chicken Wings'::text, 'The classic buffalo chicken wings, fried to perfection and tossed in Louisiana hot sauce. Served with blue cheese dipping sauce, carrots and celery spears. 6 pieces ฿195 · 12 pieces ฿295.'::text, 195::numeric, '/menu/dishes/buffalo-chicken-wings.jpg'::text, null::text, 11::int),
      ('BBQ Chicken Wings'::text, 'Marinated and deep fried chicken wings coated in our own BBQ sauce and served with a side of shoestring fries. 6 pieces ฿195 · 12 pieces ฿295.'::text, 195::numeric, '/menu/dishes/bbq-chicken-wings.jpg'::text, null::text, 12::int)
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );

-- ---------------------------------------------------------------------
--  SALADS  (9)
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = 'salads'::text
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
      ('Chopped Salad'::text, 'Iceberg lettuce, red onion, diced tomatoes, chickpeas, cucumber, sweet corn and bell peppers tossed in our own Italian vinaigrette dressing.'::text, 265::numeric, '/menu/dishes/chopped-salad.jpg'::text, null::text, 1::int),
      ('Caesar Salad'::text, 'Fresh romaine lettuce dressed in our house made creamy Caesar dressing — anchovies, garlic, lemon and parmesan — topped with fresh toasted croutons. Add grilled chicken breast +75, grilled salmon +90.'::text, 195::numeric, '/menu/dishes/caesar-salad.jpg'::text, null::text, 2::int),
      ('Club Salad'::text, 'Romaine lettuce, bacon, ham, grilled chicken, cucumbers, fresh tomatoes, diced carrots, hard boiled eggs, cheddar cheese and sourdough croutons, tossed in our classic Italian dressing.'::text, 275::numeric, '/menu/dishes/club-salad.jpg'::text, null::text, 3::int),
      ('Cobb Salad'::text, 'Fresh romaine lettuce, grilled chicken, hard boiled egg, tomatoes, avocado and crumbled blue cheese, all tossed in a blue cheese dressing.'::text, 265::numeric, '/menu/dishes/cobb-salad.jpg'::text, null::text, 4::int),
      ('Greek Salad'::text, 'Sliced cucumbers, tomatoes, green bell peppers, red onions, black olives and feta cheese tossed in our special Greek salad dressing.'::text, 240::numeric, '/menu/dishes/greek-salad.jpg'::text, null::text, 5::int),
      ('Chinese Chicken Salad'::text, 'Fresh chopped Napa cabbage, romaine lettuce, bell peppers, scallions, grated carrots and salted cashews, tossed with marinated grilled chicken breast in our honey sesame oil dressing and topped with fried wontons.'::text, 275::numeric, '/menu/dishes/chinese-chicken-salad.jpg'::text, null::text, 6::int),
      ('Crab Cake Salad'::text, 'Two jumbo crab cakes, pan-seared golden brown, served on a bed of crisp greens tossed with cherry tomatoes, shaved cucumber, red onions and a bright champagne vinaigrette.'::text, 295::numeric, '/menu/dishes/crab-cake-salad.jpg'::text, null::text, 7::int),
      ('Deli Style Tuna Salad'::text, 'A scoop of our own tuna salad — tuna, chopped celery, capers, red onions, mayonnaise and a hint of lemon for extra zest — on a bed of crisp romaine tossed in a light lemon vinaigrette.'::text, 265::numeric, '/menu/dishes/deli-style-tuna-salad.jpg'::text, null::text, 8::int),
      ('Chicken Salad Delight'::text, 'Deli style chicken salad with celery, green onions, mayonnaise, salt and pepper. Served on a bed of romaine lettuce with blue cheese dressing.'::text, 265::numeric, '/menu/dishes/chicken-salad-delight.jpg'::text, null::text, 9::int)
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );

-- ---------------------------------------------------------------------
--  BREAKFAST  (7)
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = 'breakfast'::text
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
      ('Croissant'::text, 'Served with butter and jam.'::text, 95::numeric, '/menu/dishes/croissant.jpg'::text, null::text, 1::int),
      ('Croissant Breakfast Sandwich'::text, 'Ham, edam cheese, fried egg and Dijon mustard on a warm croissant.'::text, 175::numeric, '/menu/dishes/croissant-breakfast-sandwich.jpg'::text, null::text, 2::int),
      ('Classic Waffle'::text, 'A crispy golden brown exterior and a soft, fluffy centre.'::text, 180::numeric, '/menu/dishes/classic-waffle.jpg'::text, null::text, 3::int),
      ('Fruit Topped Waffle'::text, 'Classic waffle topped with a fruit medley.'::text, 180::numeric, '/menu/dishes/fruit-topped-waffle.jpg'::text, null::text, 4::int),
      ('Croffle'::text, 'Buttery croissant pressed in a waffle iron, served with butter and syrup. Add mixed berries on top +40, melted chocolate sauce +20.'::text, 135::numeric, '/menu/dishes/croffle.jpg'::text, null::text, 5::int),
      ('Ham and Cheese Croffle'::text, 'Buttery croissant stuffed with ham and cheese and a dollop of Dijon mustard, pressed in a waffle iron.'::text, 225::numeric, '/menu/dishes/ham-and-cheese-croffle.jpg'::text, null::text, 6::int),
      ('Classic Stack'::text, 'Three buttermilk pancakes cooked until golden brown.'::text, 180::numeric, '/menu/dishes/classic-stack.jpg'::text, null::text, 7::int)
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );

-- ---------------------------------------------------------------------
--  PANCAKES & WAFFLES  (6)
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = 'pancakes'::text
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
      ('The 2 by 4'::text, 'Two eggs cooked to order, served with four buttermilk pancakes.'::text, 205::numeric, '/menu/dishes/the-2-by-4.jpg'::text, null::text, 1::int),
      ('Bacon Pancakes'::text, 'Three buttermilk pancakes cooked with bacon bits inside the pancakes.'::text, 215::numeric, '/menu/dishes/bacon-pancakes.jpg'::text, null::text, 2::int),
      ('Chocolate Chip Pancakes'::text, 'Three buttermilk pancakes cooked with chocolate chips inside.'::text, 205::numeric, '/menu/dishes/chocolate-chip-pancakes.jpg'::text, null::text, 3::int),
      ('Peanut Butter Pancakes'::text, 'Three buttermilk pancakes infused with creamy peanut butter and topped with a peanut butter drizzle.'::text, 215::numeric, '/menu/dishes/peanut-butter-pancakes.jpg'::text, null::text, 4::int),
      ('Banana Pancakes'::text, 'Three buttermilk pancakes grilled with sliced bananas.'::text, 210::numeric, '/menu/dishes/banana-pancakes.jpg'::text, null::text, 5::int),
      ('Pineapple Upside Down Pancakes'::text, 'Traditional buttermilk pancakes with rings of sliced pineapple, topped with a cherry.'::text, 215::numeric, '/menu/dishes/pineapple-upside-down-pancakes.jpg'::text, null::text, 6::int)
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );

-- ---------------------------------------------------------------------
--  EGG SCRAMBLES  (11)
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = 'scrambles'::text
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
      ('Two Eggs Any Style with Country Breakfast Potatoes'::text, 'Eggs cooked to order, with breakfast potatoes and toast. Add ham +50, two sausage patties +65, two bacon slices +45, baked beans +40, cheese — American, cheddar or Monterey Jack +35.'::text, 155::numeric, '/menu/dishes/two-eggs-any-style-with-country-breakfast-potatoes.jpg'::text, null::text, 1::int),
      ('Grand Slam Breakfast'::text, 'Two eggs cooked to order, two strips of bacon, two sausage patties, two slices of toast and two buttermilk pancakes.'::text, 175::numeric, '/menu/dishes/grand-slam-breakfast.jpg'::text, null::text, 2::int),
      ('Eggs Benedict'::text, 'Two poached eggs with Canadian bacon on a toasted English muffin, topped with our house made hollandaise sauce.'::text, 200::numeric, '/menu/dishes/eggs-benedict.jpg'::text, null::text, 3::int),
      ('Crab Cake Benedict'::text, 'Crispy fried crab cakes topped with poached eggs on a toasted English muffin, topped with our house made hollandaise sauce.'::text, 275::numeric, '/menu/dishes/crab-cake-benedict.jpg'::text, null::text, 4::int),
      ('Chicken Fried Steak and Eggs with Sausage Gravy'::text, 'Tenderised beef steak breaded and fried to a golden crisp, served with eggs and smothered in a creamy pork gravy.'::text, 295::numeric, '/menu/dishes/chicken-fried-steak-and-eggs-with-sausage-gravy.jpg'::text, null::text, 5::int),
      ('Biscuits and Sausage Gravy with Eggs'::text, 'Two buttermilk biscuits topped with house made sausage gravy, with two eggs cooked to order.'::text, 190::numeric, '/menu/dishes/biscuits-and-sausage-gravy-with-eggs.jpg'::text, null::text, 6::int),
      ('Steak and Eggs'::text, 'Grilled Australian beef steak cooked to order, served with two eggs cooked your way, breakfast potatoes and toast.'::text, 355::numeric, '/menu/dishes/steak-and-eggs.jpg'::text, null::text, 7::int),
      ('Pork Chop and Eggs'::text, 'Tender grilled pork chop served with two eggs cooked to order, breakfast potatoes and toast.'::text, 250::numeric, '/menu/dishes/pork-chop-and-eggs.jpg'::text, null::text, 8::int),
      ('Fork-It Scramble'::text, 'Two scrambled eggs with ground beef, red onions, diced tomatoes, spinach and cheddar cheese. Served with breakfast potatoes and toast.'::text, 210::numeric, '/menu/dishes/fork-it-scramble.jpg'::text, null::text, 9::int),
      ('Chipotle Scramble'::text, 'Grilled chicken breast with two scrambled eggs mixed with bell peppers, red onions, jalapenos, scallions, mozzarella and cheddar cheese, topped with a tangy chipotle sauce and sour cream. Served with breakfast potatoes and toast.'::text, 245::numeric, '/menu/dishes/chipotle-scramble.jpg'::text, 'Spicy'::text, 10::int),
      ('Everything But The Kitchen Sink Scramble'::text, 'Two eggs scrambled with bacon, ground beef, diced chicken breast, sausage, red onions, spinach, diced tomatoes, diced fried potatoes and cheddar cheese. Served with breakfast potatoes and toast.'::text, 275::numeric, '/menu/dishes/everything-but-the-kitchen-sink-scramble.jpg'::text, null::text, 11::int)
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );

-- ---------------------------------------------------------------------
--  BREAKFAST PASTAS  (5)
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = 'pastas'::text
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
      ('Pasta Lonnie'::text, 'Linguine, scrambled eggs, garlic, bacon, sausage, scallions and parmesan cheese, tossed in olive oil and butter.'::text, 275::numeric, '/menu/dishes/pasta-lonnie.jpg'::text, null::text, 1::int),
      ('Pasta Suzie'::text, 'Linguine, scrambled eggs, diced chicken breast, pesto and parmesan cheese.'::text, 250::numeric, '/menu/dishes/pasta-suzie.jpg'::text, null::text, 2::int),
      ('Pasta Dana'::text, 'Linguine, scrambled eggs and diced grilled salmon with capers in a lemon garlic butter white wine sauce.'::text, 265::numeric, '/menu/dishes/pasta-dana.jpg'::text, null::text, 3::int),
      ('Pasta Pattaya'::text, 'Pasta carbonara made with penne pasta, smoked bacon, garlic scrambled eggs, grated parmesan and chopped parsley.'::text, 250::numeric, '/menu/dishes/pasta-pattaya.jpg'::text, null::text, 4::int),
      ('Pasta Bangkok'::text, 'Penne pasta with scrambled egg, diced onion, bell peppers, tomatoes and a vegetarian sausage, all tossed in olive oil and garlic and topped with fresh avocado slices.'::text, 265::numeric, '/menu/dishes/pasta-bangkok.jpg'::text, null::text, 5::int)
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );

-- ---------------------------------------------------------------------
--  FRIES  (6)
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = 'fries'::text
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
      ('Traditional Fries'::text, 'The perfect sidekick to any meal, or just on their own.'::text, 95::numeric, '/menu/dishes/traditional-fries.jpg'::text, null::text, 1::int),
      ('Cheese Fries'::text, 'Shoestring fries topped with melted cheddar cheese. Add bacon crumbles +55.'::text, 120::numeric, '/menu/dishes/cheese-fries.jpg'::text, null::text, 2::int),
      ('Animal Fries'::text, 'Perfectly fried shoestring potatoes topped with melted American cheese, caramelised onions and our special “animal” sauce.'::text, 120::numeric, '/menu/dishes/animal-fries.jpg'::text, null::text, 3::int),
      ('Chili Cheese Fries'::text, 'A diner classic — an order of golden fries smothered in our house made chili and topped with melted cheddar cheese.'::text, 145::numeric, '/menu/dishes/chili-cheese-fries.jpg'::text, null::text, 4::int),
      ('MFD Loaded Fries'::text, 'Classic shoestring fries topped with our house made chili and melted cheese, then crowned with sliced steak.'::text, 165::numeric, '/menu/dishes/mfd-loaded-fries.jpg'::text, null::text, 5::int),
      ('Buffalo Chicken Fries'::text, 'Golden shoestring fries topped with sliced chicken, buffalo hot sauce, blue cheese crumbles and ranch dressing.'::text, 215::numeric, '/menu/dishes/buffalo-chicken-fries.jpg'::text, 'Spicy'::text, 6::int)
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );

-- ---------------------------------------------------------------------
--  SIDE DISHES  (9)
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = 'sides'::text
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
      ('MFD Jalapeno Coleslaw'::text, 'Red and white shredded cabbage, grated carrots and a hint of jalapeno, tossed in our special apple cider, Dijon and mayo dressing.'::text, 55::numeric, '/menu/dishes/mfd-jalapeno-coleslaw.jpg'::text, null::text, 1::int),
      ('Baked Beans'::text, 'Slow cooked beans in molasses and spices, then baked to perfection.'::text, 55::numeric, '/menu/dishes/baked-beans.jpg'::text, null::text, 2::int),
      ('Slice of Ham'::text, 'Thick cut smoky ham grilled to perfection.'::text, 55::numeric, '/menu/dishes/slice-of-ham.jpg'::text, null::text, 3::int),
      ('Sausage Patties'::text, 'Two breakfast sausage patties.'::text, 65::numeric, '/menu/dishes/sausage-patties.jpg'::text, null::text, 4::int),
      ('Bacon'::text, 'Thick cut crispy bacon, two pieces.'::text, 65::numeric, '/menu/dishes/bacon.jpg'::text, null::text, 5::int),
      ('Potato Salad'::text, 'Red potatoes with the skins on, boiled until al dente and mixed with red onions, celery, mayo and spices.'::text, 55::numeric, '/menu/dishes/potato-salad.jpg'::text, null::text, 6::int),
      ('Egg'::text, 'Farm fresh egg cooked to order.'::text, 30::numeric, '/menu/dishes/egg.jpg'::text, null::text, 7::int),
      ('Onion Rings'::text, 'Thick slices of yellow onion, dipped and fried for the perfect onion ring crunch.'::text, 125::numeric, '/menu/dishes/onion-rings.jpg'::text, null::text, 8::int),
      ('Country Style Potatoes'::text, 'Seasoned diced country style potatoes, deep fried.'::text, 45::numeric, '/menu/dishes/country-style-potatoes.jpg'::text, null::text, 9::int)
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );

-- ---------------------------------------------------------------------
--  SHAKES & SUNDAES  (13)
-- ---------------------------------------------------------------------
with cat as (
  select id from public.menu_categories where slug = 'sweets'::text
),
incoming (name, description, price, image_url, tag, sort_order) as (
  values
      ('Soft Serve Ice Cream'::text, 'Cone or cup — chocolate, vanilla or swirl.'::text, 65::numeric, '/menu/dishes/soft-serve.jpg'::text, null::text, 1::int),
      ('French Vanilla Milk Shake'::text, 'Vanilla ice cream blended with whole milk and topped with whipped cream.'::text, 145::numeric, '/menu/dishes/shake-strawberry.jpg'::text, null::text, 2::int),
      ('Double Dutch Chocolate Milk Shake'::text, 'A blend of dark chocolate ice cream and fudge sauce, topped with a swirl of whipped cream.'::text, 145::numeric, '/menu/dishes/shake-chocolate.jpg'::text, null::text, 3::int),
      ('Strawberry Milk Shake'::text, 'Fresh strawberries blended into a creamy vanilla ice cream and topped with whipped cream.'::text, 145::numeric, '/menu/dishes/shake-strawberry.jpg'::text, null::text, 4::int),
      ('Cookies and Cream Milk Shake'::text, 'Chunks of real chocolate sandwich cookies topped with whipped cream and a drizzle of chocolate sauce.'::text, 145::numeric, '/menu/dishes/shake-chocolate.jpg'::text, null::text, 5::int),
      ('Peanut Butter Milk Shake'::text, 'Creamy peanut butter blended into our creamy vanilla ice cream and topped with whipped cream.'::text, 145::numeric, '/menu/dishes/shake-chocolate.jpg'::text, null::text, 6::int),
      ('Ice Cream Float'::text, 'Root beer, Coke or Fanta Orange served over a scoop of our vanilla ice cream in a frozen mug.'::text, 145::numeric, '/menu/dishes/float.jpg'::text, null::text, 7::int),
      ('Hot Fudge Sundae'::text, 'Vanilla ice cream smothered in thick hot fudge, finished with whipped cream, chopped nuts and a maraschino cherry.'::text, 125::numeric, '/menu/dishes/sundae-hotfudge.jpg'::text, null::text, 8::int),
      ('Old Fashioned Strawberry Sundae'::text, 'Smooth vanilla ice cream topped with a generous ladle of strawberry topping and whipped cream.'::text, 125::numeric, '/menu/dishes/sundae-strawberry.jpg'::text, null::text, 9::int),
      ('Grilled Pineapple Sundae'::text, 'Grilled pineapple slices topped with creamy vanilla ice cream, then drenched in pineapple sauce and topped with whipped cream.'::text, 125::numeric, '/menu/dishes/sundae-pineapple.jpg'::text, null::text, 10::int),
      ('Peanut Butter Cup Sundae'::text, 'Creamy vanilla ice cream topped with our peanut butter sauce, hot fudge and Reese’s peanut butter cup chunks, then topped with whipped cream and a cherry.'::text, 125::numeric, '/menu/dishes/sundae-peanut.jpg'::text, null::text, 11::int),
      ('Oreo Cookie Sundae'::text, 'Crunchy, crushed Oreo cookie pieces mixed with our creamy vanilla ice cream, then topped with hot fudge and mounds of whipped cream.'::text, 125::numeric, '/menu/dishes/sundae-oreo.jpg'::text, null::text, 12::int),
      ('Banana Split'::text, 'Chocolate and vanilla ice cream served in a split banana, topped with chocolate fudge, strawberries and pineapple sauce, then finished with whipped cream and a cherry.'::text, 175::numeric, '/menu/dishes/banana-split.jpg'::text, 'Sharer'::text, 13::int)
)
insert into public.menu_items
  (category_id, name, description, price, image_url, tag, sort_order)
select cat.id, i.name, i.description, i.price, i.image_url, i.tag, i.sort_order
  from incoming i cross join cat
 where not exists (
   select 1 from public.menu_items m
    where m.category_id = cat.id and m.name = i.name
 );
