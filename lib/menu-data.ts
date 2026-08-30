import type { MenuData, MenuItem } from '@/lib/types';

/**
 * ============================================================
 *  THE MENU
 * ============================================================
 *
 * This file is the menu. Edit it here and the website updates —
 * no database work needed.
 *
 * Supabase can still take over: if a category in the database has
 * dishes in it, those replace the ones written here for that
 * section only. That way the admin panel keeps working, but the
 * site is never empty and never needs SQL to get going.
 *
 * To add a dish, copy a line and change it. Only `name` and
 * `price` are required.
 *
 *   photo — a file in public/menu/dishes/, without the .jpg
 *   tag   — a small badge on the photo, e.g. 'Spicy', 'New'
 *
 * The photos you can choose from are the files in public/menu/dishes/ —
 * there is no list to keep in step here, because a list kept by hand goes
 * out of date the first time somebody adds a photo and forgets. Look in
 * the folder.
 *
 * Adding one: name the file after the dish in lower case with hyphens
 * ('Fork-It Scramble' -> fork-it-scramble.jpg), save it to that folder at
 * about 1200px wide, and put the name without .jpg in `photo`. Anything
 * bigger than roughly 150 KB wants re-encoding first: the lightbox serves
 * these files as they are, so their weight lands on the guest's phone.
 * Originals live outside public/ in menu/, where they are not deployed.
 *
 * A few dishes deliberately share a general photo (steak, scramble,
 * breakfast) until one of their own is taken.
 */

type Dish = {
  name: string;
  price: number;
  desc?: string;
  photo?: string;
  tag?: string;
};

type Section = {
  slug: string;
  name: string;
  /** Shown in small type under the section, e.g. what comes with it. */
  note?: string;
  dishes: Dish[];
};

// =====================================================================
//  SALADS
// =====================================================================
const SALADS: Dish[] = [
  {
    name: 'Chopped Salad',
    price: 265,
    photo: 'chopped-salad',
    desc: 'Iceberg lettuce, red onion, diced tomatoes, chickpeas, cucumber, sweet corn and bell peppers tossed in our own Italian vinaigrette dressing.',
  },
  {
    name: 'Caesar Salad',
    price: 195,
    photo: 'caesar-salad',
    desc: 'Fresh romaine lettuce dressed in our house made creamy Caesar dressing — anchovies, garlic, lemon and parmesan — topped with fresh toasted croutons. Add grilled chicken breast +75, grilled salmon +90.',
  },
  {
    name: 'Club Salad',
    price: 275,
    photo: 'club-salad',
    desc: 'Romaine lettuce, bacon, ham, grilled chicken, cucumbers, fresh tomatoes, diced carrots, hard boiled eggs, cheddar cheese and sourdough croutons, tossed in our classic Italian dressing.',
  },
  {
    name: 'Cobb Salad',
    price: 265,
    photo: 'cobb-salad',
    desc: 'Fresh romaine lettuce, grilled chicken, hard boiled egg, tomatoes, avocado and crumbled blue cheese, all tossed in a blue cheese dressing.',
  },
  {
    name: 'Greek Salad',
    price: 240,
    photo: 'greek-salad',
    desc: 'Sliced cucumbers, tomatoes, green bell peppers, red onions, black olives and feta cheese tossed in our special Greek salad dressing.',
  },
  {
    name: 'Chinese Chicken Salad',
    price: 275,
    photo: 'chinese-chicken-salad',
    desc: 'Fresh chopped Napa cabbage, romaine lettuce, bell peppers, scallions, grated carrots and salted cashews, tossed with marinated grilled chicken breast in our honey sesame oil dressing and topped with fried wontons.',
  },
  {
    name: 'Crab Cake Salad',
    price: 295,
    photo: 'crab-cake-salad',
    desc: 'Two jumbo crab cakes, pan-seared golden brown, served on a bed of crisp greens tossed with cherry tomatoes, shaved cucumber, red onions and a bright champagne vinaigrette.',
  },
  {
    name: 'Deli Style Tuna Salad',
    price: 265,
    photo: 'deli-style-tuna-salad',
    desc: 'A scoop of our own tuna salad — tuna, chopped celery, capers, red onions, mayonnaise and a hint of lemon for extra zest — on a bed of crisp romaine tossed in a light lemon vinaigrette.',
  },
  {
    name: 'Chicken Salad Delight',
    price: 265,
    photo: 'chicken-salad-delight',
    desc: 'Deli style chicken salad with celery, green onions, mayonnaise, salt and pepper. Served on a bed of romaine lettuce with blue cheese dressing.',
  },
];

// =====================================================================
//  SANDWICHES
// =====================================================================
const SANDWICHES: Dish[] = [
  {
    name: 'Classic BLT',
    price: 245,
    photo: 'classic-blt',
    desc: 'An all-American classic made with crispy bacon, fresh lettuce, ripe tomatoes and mayonnaise on sourdough toasted bread.',
  },
  {
    name: 'Club Sandwich',
    price: 255,
    photo: 'club-sandwich',
    desc: 'Slow roasted chicken breast, bacon, edam cheese, lettuce, tomato and mayo, stacked together with perfectly toasted bread. Add a fried egg +35.',
  },
  {
    name: 'Grilled Cheese Sandwich',
    price: 175,
    photo: 'grilled-cheese-sandwich',
    desc: 'Three cheese melted fusion of American, cheddar and edam stacked on garlic bread and grilled to gooey goodness. Add bacon and tomato +35.',
  },
  {
    name: 'Chicken Salad Sandwich',
    price: 225,
    photo: 'chicken-salad-sandwich',
    desc: 'Chunks of grilled chicken, celery, red onion and mayo served on sourdough bread.',
  },
  {
    name: 'Tuna Salad Sandwich',
    price: 235,
    photo: 'tuna-salad-sandwich',
    desc: 'Flakey albacore tuna, red onion, celery, spices and mayo served on rye bread.',
  },
  {
    name: 'Meatloaf Sandwich',
    price: 215,
    photo: 'meatloaf-sandwich',
    desc: 'Our house made meatloaf, pan seared with melted cheese, served on toasted bread with mayo, mustard, lettuce and tomato slices.',
  },
  {
    name: 'Steak Sandwich with Chimichurri Sauce',
    price: 345,
    photo: 'steak-sandwich-with-chimichurri-sauce',
    desc: 'Open faced sandwich with tender grilled steak, caramelized red onions and wild greens on a thick slice of garlic bread, topped with chimichurri sauce.',
  },
  {
    name: 'Monte Cristo Sandwich',
    price: 275,
    photo: 'monte-cristo-sandwich',
    desc: 'Ham, chicken, edam cheese and Dijon mustard, smothered in French toast batter and simmered until golden, then dusted with powdered sugar.',
  },
  {
    name: 'Pulled Pork Sandwich',
    price: 275,
    photo: 'pulled-pork-sandwich',
    desc: 'Tender slow-cooked BBQ pork, cheddar cheese and mild jalapeno coleslaw stacked on a buttery toasted bun.',
  },
  {
    name: 'Nashville Flaming Chicken Sandwich',
    price: 285,
    photo: 'nashville-flaming-chicken-sandwich',
    tag: 'Spicy',
    desc: 'Tender buttermilk marinated grilled chicken breast, spices and our signature hot sauce, served on a toasted brioche bun with pickles and our creamy coleslaw.',
  },
];

// =====================================================================
//  BURGERS  — half pound (225g) fresh wagyu beef, cooked to order
// =====================================================================
const BURGERS: Dish[] = [
  {
    name: 'MFD Classic Hamburger',
    price: 295,
    photo: 'mfd-classic-hamburger',
    desc: 'Half a pound (225g) of fresh wagyu beef grilled to order, served with lettuce, tomato, sliced onion and our house made burger sauce.',
  },
  {
    name: 'MFD Classic Cheeseburger',
    price: 310,
    photo: 'mfd-classic-cheeseburger',
    desc: 'Half a pound (225g) of fresh wagyu beef grilled to order, topped with a choice of cheese and served with lettuce, sliced onion and our house made burger sauce.',
  },
  {
    name: 'Sizzling Ultimate Cheeseburger',
    price: 325,
    photo: 'sizzling-ultimate-cheeseburger',
    desc: 'Our MFD cheeseburger made with half a pound (225g) of wagyu beef, served on a sizzling plate of molten cheeses. A cheese lover’s ultimate burger.',
  },
  {
    name: 'MFD Classic Bacon Cheeseburger',
    price: 325,
    photo: 'mfd-classic-bacon-cheeseburger',
    desc: 'Half a pound (225g) of fresh wagyu beef grilled to order, topped with a slice of aged cheddar and two strips of crispy bacon, served with lettuce, tomato, onion and our house made special burger sauce.',
  },
  {
    name: 'The Bishop Ron Burger',
    price: 325,
    photo: 'the-bishop-ron-burger',
    desc: 'A massive burger stack starting with a half pound (225g) wagyu beef patty cooked to order, then topped with a fried egg, bacon, a slice of beetroot and pineapple. A favourite down under.',
  },
  {
    name: 'Smoky Roadhouse Burger',
    price: 325,
    photo: 'smoky-roadhouse-burger',
    desc: 'Texas BBQ in a burger. Half a pound (225g) of fresh wagyu beef grilled to order, topped with a slice of cheddar cheese, a strip of bacon and crispy onion rings, dressed with our house made smoky BBQ sauce.',
  },
  {
    name: 'The Atomic Burger',
    price: 345,
    photo: 'the-atomic-burger',
    tag: 'Spicy',
    desc: 'Half a pound (225g) of fresh wagyu beef grilled to order, topped with jalapenos, pepperjack cheese, lettuce, tomato, onion rings and our own special chipotle sauce.',
  },
  {
    name: 'The Cowboy Burger',
    price: 345,
    photo: 'the-cowboy-burger',
    desc: 'Half a pound (225g) of fresh wagyu beef mixed with cheddar cheese, pepperjack cheese, onions, jalapenos and bacon, grilled to order. Served on garlic toast with lettuce, tomatoes, sliced onions and our own special burger sauce.',
  },
  {
    name: 'The Chili Size',
    price: 315,
    photo: 'the-chili-size',
    desc: 'A chili lover’s delight. Half a pound (225g) of fresh wagyu beef grilled to order and topped with cheddar cheese, served open faced and smothered in our house made chili.',
  },
  {
    name: 'Blue Cheese Burger',
    price: 325,
    photo: 'blue-cheese-burger',
    desc: 'Half a pound (225g) of wagyu beef patty grilled to order, topped with blue cheese and served on a toasted bun with lettuce, tomato and sliced onion.',
  },
  {
    name: 'Patty Melt',
    price: 325,
    photo: 'patty-melt',
    desc: 'Half a pound (225g) of wagyu beef grilled to order, topped with grilled onions and cheddar cheese, pressed between two slices of toasted bread and grilled to a toasty perfection.',
  },
  {
    name: 'The Ranch Hand Burger',
    price: 345,
    photo: 'the-ranch-hand-burger',
    desc: 'Half a pound (225g) of wagyu beef topped with our tender slow cooked pulled BBQ pork, smoky bacon and our jalapeno coleslaw. Add a slice of cheddar cheese +35.',
  },
  {
    name: 'The Impossible Burger',
    price: 310,
    photo: 'the-impossible-burger',
    tag: 'Plant-based',
    desc: 'The non-burger burger, made from plants — but you would never know it by the taste. Grilled and topped with lettuce, tomato, chopped onion, relish, pickles, mustard and mayo.',
  },
];

// =====================================================================
//  BREAKFAST
// =====================================================================
/* Every dish here has its own photograph, rather than the two stand-ins
   the whole section used to share. Files in public/menu/dishes/. */
const BREAKFAST: Dish[] = [
  {
    name: 'Croissant',
    price: 95,
    photo: 'croissant',
    desc: 'Served with butter and jam.',
  },
  {
    name: 'Croissant Breakfast Sandwich',
    price: 175,
    photo: 'croissant-breakfast-sandwich',
    desc: 'Ham, edam cheese, fried egg and Dijon mustard on a warm croissant.',
  },
  {
    name: 'Classic Waffle',
    price: 180,
    photo: 'classic-waffle',
    desc: 'A crispy golden brown exterior and a soft, fluffy centre.',
  },
  {
    name: 'Fruit Topped Waffle',
    price: 180,
    photo: 'fruit-topped-waffle',
    desc: 'Classic waffle topped with a fruit medley.',
  },
  {
    name: 'Croffle',
    price: 135,
    photo: 'croffle',
    desc: 'Buttery croissant pressed in a waffle iron, served with butter and syrup. Add mixed berries on top +40, melted chocolate sauce +20.',
  },
  {
    name: 'Ham and Cheese Croffle',
    price: 225,
    photo: 'ham-and-cheese-croffle',
    desc: 'Buttery croissant stuffed with ham and cheese and a dollop of Dijon mustard, pressed in a waffle iron.',
  },
  {
    name: 'Classic Stack',
    price: 180,
    photo: 'classic-stack',
    desc: 'Three buttermilk pancakes cooked until golden brown.',
  },
];

// =====================================================================
//  PANCAKES & WAFFLES
// =====================================================================
/* Every dish here has its own photograph too. Files in
   public/menu/dishes/; the originals live in menu/pancakes-waffles/. */
const PANCAKES: Dish[] = [
  {
    name: 'The 2 by 4',
    price: 205,
    photo: 'the-2-by-4',
    desc: 'Two eggs cooked to order, served with four buttermilk pancakes.',
  },
  {
    name: 'Bacon Pancakes',
    price: 215,
    photo: 'bacon-pancakes',
    desc: 'Three buttermilk pancakes cooked with bacon bits inside the pancakes.',
  },
  {
    name: 'Chocolate Chip Pancakes',
    price: 205,
    photo: 'chocolate-chip-pancakes',
    desc: 'Three buttermilk pancakes cooked with chocolate chips inside.',
  },
  {
    name: 'Peanut Butter Pancakes',
    price: 215,
    photo: 'peanut-butter-pancakes',
    desc: 'Three buttermilk pancakes infused with creamy peanut butter and topped with a peanut butter drizzle.',
  },
  {
    name: 'Banana Pancakes',
    price: 210,
    photo: 'banana-pancakes',
    desc: 'Three buttermilk pancakes grilled with sliced bananas.',
  },
  {
    name: 'Pineapple Upside Down Pancakes',
    price: 215,
    photo: 'pineapple-upside-down-pancakes',
    desc: 'Traditional buttermilk pancakes with rings of sliced pineapple, topped with a cherry.',
  },
];

// =====================================================================
//  EGG SCRAMBLES
// =====================================================================
const SCRAMBLES: Dish[] = [
  {
    name: 'Two Eggs Any Style with Country Breakfast Potatoes',
    price: 155,
    photo: 'two-eggs-any-style-with-country-breakfast-potatoes',
    desc: 'Eggs cooked to order, with breakfast potatoes and toast. Add ham +50, two sausage patties +65, two bacon slices +45, baked beans +40, cheese — American, cheddar or Monterey Jack +35.',
  },
  {
    name: 'Grand Slam Breakfast',
    price: 175,
    photo: 'grand-slam-breakfast',
    desc: 'Two eggs cooked to order, two strips of bacon, two sausage patties, two slices of toast and two buttermilk pancakes.',
  },
  {
    name: 'Eggs Benedict',
    price: 200,
    photo: 'eggs-benedict',
    desc: 'Two poached eggs with Canadian bacon on a toasted English muffin, topped with our house made hollandaise sauce.',
  },
  {
    name: 'Crab Cake Benedict',
    price: 275,
    photo: 'crab-cake-benedict',
    desc: 'Crispy fried crab cakes topped with poached eggs on a toasted English muffin, topped with our house made hollandaise sauce.',
  },
  {
    name: 'Chicken Fried Steak and Eggs with Sausage Gravy',
    price: 295,
    photo: 'chicken-fried-steak-and-eggs-with-sausage-gravy',
    desc: 'Tenderised beef steak breaded and fried to a golden crisp, served with eggs and smothered in a creamy pork gravy.',
  },
  {
    name: 'Biscuits and Sausage Gravy with Eggs',
    price: 190,
    photo: 'biscuits-and-sausage-gravy-with-eggs',
    desc: 'Two buttermilk biscuits topped with house made sausage gravy, with two eggs cooked to order.',
  },
  {
    name: 'Steak and Eggs',
    price: 355,
    photo: 'steak-and-eggs',
    desc: 'Grilled Australian beef steak cooked to order, served with two eggs cooked your way, breakfast potatoes and toast.',
  },
  {
    name: 'Pork Chop and Eggs',
    price: 250,
    photo: 'pork-chop-and-eggs',
    desc: 'Tender grilled pork chop served with two eggs cooked to order, breakfast potatoes and toast.',
  },
  {
    name: 'Fork-It Scramble',
    price: 210,
    photo: 'fork-it-scramble',
    desc: 'Two scrambled eggs with ground beef, red onions, diced tomatoes, spinach and cheddar cheese. Served with breakfast potatoes and toast.',
  },
  {
    name: 'Chipotle Scramble',
    price: 245,
    photo: 'chipotle-scramble',
    tag: 'Spicy',
    desc: 'Grilled chicken breast with two scrambled eggs mixed with bell peppers, red onions, jalapenos, scallions, mozzarella and cheddar cheese, topped with a tangy chipotle sauce and sour cream. Served with breakfast potatoes and toast.',
  },
  {
    name: 'Everything But The Kitchen Sink Scramble',
    price: 275,
    photo: 'everything-but-the-kitchen-sink-scramble',
    desc: 'Two eggs scrambled with bacon, ground beef, diced chicken breast, sausage, red onions, spinach, diced tomatoes, diced fried potatoes and cheddar cheese. Served with breakfast potatoes and toast.',
  },
];

// =====================================================================
//  BREAKFAST PASTAS
// =====================================================================
const PASTAS: Dish[] = [
  {
    name: 'Pasta Lonnie',
    price: 275,
    photo: 'pasta-lonnie',
    desc: 'Linguine, scrambled eggs, garlic, bacon, sausage, scallions and parmesan cheese, tossed in olive oil and butter.',
  },
  {
    name: 'Pasta Suzie',
    price: 250,
    photo: 'pasta-suzie',
    desc: 'Linguine, scrambled eggs, diced chicken breast, pesto and parmesan cheese.',
  },
  {
    name: 'Pasta Dana',
    price: 265,
    photo: 'pasta-dana',
    desc: 'Linguine, scrambled eggs and diced grilled salmon with capers in a lemon garlic butter white wine sauce.',
  },
  {
    name: 'Pasta Pattaya',
    price: 250,
    photo: 'pasta-pattaya',
    desc: 'Pasta carbonara made with penne pasta, smoked bacon, garlic scrambled eggs, grated parmesan and chopped parsley.',
  },
  {
    name: 'Pasta Bangkok',
    price: 265,
    photo: 'pasta-bangkok',
    desc: 'Penne pasta with scrambled egg, diced onion, bell peppers, tomatoes and a vegetarian sausage, all tossed in olive oil and garlic and topped with fresh avocado slices.',
  },
];

// =====================================================================
//  HOT DOGS
//  The "served with coleslaw and fries" line is the section note, so it
//  isn't repeated on all seven cards.
// =====================================================================
const HOTDOGS: Dish[] = [
  {
    name: 'Ball Park Dog',
    price: 185,
    photo: 'ball-park-dog',
    desc: 'The MVP of stadium dogs. A jumbo dog on a grilled bun with ketchup, mustard and mayo.',
  },
  {
    name: 'Cheese Dog',
    price: 205,
    photo: 'cheese-dog',
    desc: 'Jumbo dog on a grilled bun, drenched in melted cheddar cheese.',
  },
  {
    name: 'Classic Chili Cheese Dog',
    price: 225,
    photo: 'classic-chili-cheese-dog',
    desc: 'Jumbo hot dog topped with our hearty house made chili, melted sharp cheddar cheese and a sprinkle of fresh jalapenos for extra kick.',
  },
  {
    name: 'New York Street Dog',
    price: 205,
    photo: 'new-york-street-dog',
    desc: 'Our signature dog served in a toasted bun, blanketed with zesty sauerkraut, spicy tangy onion relish and yellow mustard.',
  },
  {
    name: 'Corn Dog',
    price: 195,
    photo: 'corn-dog',
    desc: 'Jumbo dog on a stick, dipped in honey infused cornmeal batter and fried to a golden brown.',
  },
  {
    name: 'South of the Border Dog',
    price: 215,
    photo: 'south-of-the-border-dog',
    desc: 'Jumbo hot dog wrapped in bacon, served with grilled sliced peppers, onions and jalapenos.',
  },
  {
    name: 'Argentinian A Punch',
    price: 215,
    photo: 'argentinian-a-punch',
    desc: 'Jumbo dog slathered in chimichurri sauce with a pickled red onion and pepper relish. Es tu bueno!',
  },
];

// =====================================================================
//  MAIN COURSES
// =====================================================================
const MAINS: Dish[] = [
  {
    name: 'Meatloaf',
    price: 355,
    photo: 'meatloaf',
    desc: 'Comfort food at its best. Fresh wagyu beef mixed with onion, celery, garlic, breadcrumbs and a blend of our special herbs and spices, baked with a classic tomato sauce topping and served on a bed of mashed potatoes.',
  },
  {
    name: 'Baked Mac and 4 Cheeses',
    price: 275,
    photo: 'baked-mac-and-4-cheeses',
    desc: 'A classic diner favourite — baked macaroni elbows with cheddar, Monterey Jack, gruyère and parmesan for the ultimate blend of flavours.',
  },
  {
    name: 'Grilled Cedar Plank Salmon',
    price: 375,
    photo: 'grilled-cedar-plank-salmon',
    desc: 'Fresh salmon fillets baked on a cedar plank for a light smoky flavour. Served with a side of fries and a side salad.',
  },
  {
    name: 'Fish and Chips',
    price: 335,
    photo: 'fish-and-chips',
    desc: 'Fillet of white fish breaded and fried to perfection, served with tartar sauce and our house made chips.',
  },
  {
    name: 'Grilled Steak with Chimichurri Sauce',
    price: 420,
    photo: 'grilled-steak-with-chimichurri-sauce',
    desc: 'Wagyu beef steak marinated in garlic, olive oil and spices, grilled to order and topped with our own chimichurri sauce. Served with mashed potatoes and a side salad.',
  },
  {
    name: 'Smothered Pork Chops',
    price: 540,
    photo: 'smothered-pork-chops',
    desc: 'Tender pork chops smothered in southern style onion gravy, served with creamy mashed potatoes and a side salad.',
  },
  {
    name: 'Salisbury Steak',
    price: 315,
    photo: 'salisbury-steak',
    desc: 'Ground beef mixed with our own special spice blend, grilled and then bathed in a rich mushroom gravy. Served on a bed of mashed potatoes.',
  },
  {
    name: 'Chicken Fried Steak',
    price: 295,
    photo: 'chicken-fried-steak',
    desc: 'A southern American staple. A tenderised beef cutlet breaded and fried like crispy fried chicken — dredged in seasoned flour, dipped in buttermilk and egg, and fried until golden. Served with mashed potatoes and jalapeno coleslaw.',
  },
  {
    name: 'Golden Fried Chicken & Waffle',
    price: 295,
    photo: 'golden-fried-chicken-waffle',
    desc: 'Juicy chicken marinated in buttermilk and spices, dredged in our double coating and fried to perfection. Served on top of a golden waffle.',
  },
  {
    name: 'Spicy Fried Chicken',
    price: 295,
    photo: 'spicy-fried-chicken',
    tag: 'Spicy',
    desc: 'Farm fresh chicken marinated in our secret blend of herbs and spices and fried until golden brown and crispy. Served with a side of shoestring fries.',
  },
  {
    name: 'Buffalo Chicken Wings',
    price: 195,
    photo: 'buffalo-chicken-wings',
    desc: 'The classic buffalo chicken wings, fried to perfection and tossed in Louisiana hot sauce. Served with blue cheese dipping sauce, carrots and celery spears. 6 pieces ฿195 · 12 pieces ฿295.',
  },
  {
    name: 'BBQ Chicken Wings',
    price: 195,
    photo: 'bbq-chicken-wings',
    desc: 'Marinated and deep fried chicken wings coated in our own BBQ sauce and served with a side of shoestring fries. 6 pieces ฿195 · 12 pieces ฿295.',
  },
];

// =====================================================================
//  FRIES
// =====================================================================
const FRIES: Dish[] = [
  {
    name: 'Traditional Fries',
    price: 95,
    photo: 'traditional-fries',
    desc: 'The perfect sidekick to any meal, or just on their own.',
  },
  {
    name: 'Cheese Fries',
    price: 120,
    photo: 'cheese-fries',
    desc: 'Shoestring fries topped with melted cheddar cheese. Add bacon crumbles +55.',
  },
  {
    name: 'Animal Fries',
    price: 120,
    photo: 'animal-fries',
    desc: 'Perfectly fried shoestring potatoes topped with melted American cheese, caramelised onions and our special “animal” sauce.',
  },
  {
    name: 'Chili Cheese Fries',
    price: 145,
    photo: 'chili-cheese-fries',
    desc: 'A diner classic — an order of golden fries smothered in our house made chili and topped with melted cheddar cheese.',
  },
  {
    name: 'MFD Loaded Fries',
    price: 165,
    photo: 'mfd-loaded-fries',
    desc: 'Classic shoestring fries topped with our house made chili and melted cheese, then crowned with sliced steak.',
  },
  {
    name: 'Buffalo Chicken Fries',
    price: 215,
    photo: 'buffalo-chicken-fries',
    tag: 'Spicy',
    desc: 'Golden shoestring fries topped with sliced chicken, buffalo hot sauce, blue cheese crumbles and ranch dressing.',
  },
];

// =====================================================================
//  SIDE DISHES
// =====================================================================
const SIDES: Dish[] = [
  {
    name: 'MFD Jalapeno Coleslaw',
    price: 55,
    photo: 'mfd-jalapeno-coleslaw',
    desc: 'Red and white shredded cabbage, grated carrots and a hint of jalapeno, tossed in our special apple cider, Dijon and mayo dressing.',
  },
  {
    name: 'Baked Beans',
    price: 55,
    photo: 'baked-beans',
    desc: 'Slow cooked beans in molasses and spices, then baked to perfection.',
  },
  {
    name: 'Slice of Ham',
    price: 55,
    photo: 'slice-of-ham',
    desc: 'Thick cut smoky ham grilled to perfection.',
  },
  {
    name: 'Sausage Patties',
    price: 65,
    photo: 'sausage-patties',
    desc: 'Two breakfast sausage patties.',
  },
  {
    name: 'Bacon',
    price: 65,
    photo: 'bacon',
    desc: 'Thick cut crispy bacon, two pieces.',
  },
  {
    name: 'Potato Salad',
    price: 55,
    photo: 'potato-salad',
    desc: 'Red potatoes with the skins on, boiled until al dente and mixed with red onions, celery, mayo and spices.',
  },
  {
    name: 'Egg',
    price: 30,
    photo: 'egg',
    desc: 'Farm fresh egg cooked to order.',
  },
  {
    name: 'Onion Rings',
    price: 125,
    photo: 'onion-rings',
    desc: 'Thick slices of yellow onion, dipped and fried for the perfect onion ring crunch.',
  },
  {
    name: 'Country Style Potatoes',
    price: 45,
    photo: 'country-style-potatoes',
    desc: 'Seasoned diced country style potatoes, deep fried.',
  },
];

// =====================================================================
//  SHAKES & SUNDAES  — the "Scoops, Swirls and Floats" page
// =====================================================================
const SWEETS: Dish[] = [
  {
    name: 'Soft Serve Ice Cream',
    price: 65,
    photo: 'soft-serve',
    desc: 'Cone or cup — chocolate, vanilla or swirl.',
  },
  {
    name: 'French Vanilla Milk Shake',
    price: 145,
    photo: 'shake-strawberry',
    desc: 'Vanilla ice cream blended with whole milk and topped with whipped cream.',
  },
  {
    name: 'Double Dutch Chocolate Milk Shake',
    price: 145,
    photo: 'shake-chocolate',
    desc: 'A blend of dark chocolate ice cream and fudge sauce, topped with a swirl of whipped cream.',
  },
  {
    name: 'Strawberry Milk Shake',
    price: 145,
    photo: 'shake-strawberry',
    desc: 'Fresh strawberries blended into a creamy vanilla ice cream and topped with whipped cream.',
  },
  {
    name: 'Cookies and Cream Milk Shake',
    price: 145,
    photo: 'shake-chocolate',
    desc: 'Chunks of real chocolate sandwich cookies topped with whipped cream and a drizzle of chocolate sauce.',
  },
  {
    name: 'Peanut Butter Milk Shake',
    price: 145,
    photo: 'shake-chocolate',
    desc: 'Creamy peanut butter blended into our creamy vanilla ice cream and topped with whipped cream.',
  },
  {
    name: 'Ice Cream Float',
    price: 145,
    photo: 'float',
    desc: 'Root beer, Coke or Fanta Orange served over a scoop of our vanilla ice cream in a frozen mug.',
  },
  {
    name: 'Hot Fudge Sundae',
    price: 125,
    photo: 'sundae-hotfudge',
    desc: 'Vanilla ice cream smothered in thick hot fudge, finished with whipped cream, chopped nuts and a maraschino cherry.',
  },
  {
    name: 'Old Fashioned Strawberry Sundae',
    price: 125,
    photo: 'sundae-strawberry',
    desc: 'Smooth vanilla ice cream topped with a generous ladle of strawberry topping and whipped cream.',
  },
  {
    name: 'Grilled Pineapple Sundae',
    price: 125,
    photo: 'sundae-pineapple',
    desc: 'Grilled pineapple slices topped with creamy vanilla ice cream, then drenched in pineapple sauce and topped with whipped cream.',
  },
  {
    name: 'Peanut Butter Cup Sundae',
    price: 125,
    photo: 'sundae-peanut',
    desc: 'Creamy vanilla ice cream topped with our peanut butter sauce, hot fudge and Reese’s peanut butter cup chunks, then topped with whipped cream and a cherry.',
  },
  {
    name: 'Oreo Cookie Sundae',
    price: 125,
    photo: 'sundae-oreo',
    desc: 'Crunchy, crushed Oreo cookie pieces mixed with our creamy vanilla ice cream, then topped with hot fudge and mounds of whipped cream.',
  },
  {
    name: 'Banana Split',
    price: 175,
    photo: 'banana-split',
    tag: 'Sharer',
    desc: 'Chocolate and vanilla ice cream served in a split banana, topped with chocolate fudge, strawberries and pineapple sauce, then finished with whipped cream and a cherry.',
  },
];

// =====================================================================
//  THE SECTIONS, in the order they appear on the website
// =====================================================================
const SECTIONS: Section[] = [
  {
    slug: 'burgers',
    name: 'Burgers',
    note: 'All burgers served with shoestring fries · Make any burger a double +100',
    dishes: BURGERS,
  },
  {
    slug: 'sandwiches',
    name: 'Sandwiches',
    note: 'All sandwiches are served with shoestring fries.',
    dishes: SANDWICHES,
  },
  {
    slug: 'hotdogs',
    name: 'Hot Dogs',
    note: 'All hot dogs served with our jalapeno coleslaw and fries on the side',
    dishes: HOTDOGS,
  },
  { slug: 'mains', name: 'Main Courses', dishes: MAINS },
  { slug: 'salads', name: 'Salads', dishes: SALADS },

  { slug: 'breakfast', name: 'Breakfast', dishes: BREAKFAST },
  {
    slug: 'pancakes',
    name: 'Pancakes & Waffles',
    note: 'All pancakes and waffles served with whipped butter and warm maple syrup',
    dishes: PANCAKES,
  },
  { slug: 'scrambles', name: 'Egg Scrambles', dishes: SCRAMBLES },
  {
    slug: 'pastas',
    name: 'Breakfast Pastas',
    note: 'Available any time of day · All pastas served with two slices of garlic buttered baguette',
    dishes: PASTAS,
  },

  { slug: 'fries', name: 'Fries', dishes: FRIES },
  { slug: 'sides', name: 'Side Dishes', dishes: SIDES },

  { slug: 'sweets', name: 'Shakes & Sundaes', dishes: SWEETS },
];

/**
 * How the full menu page is chaptered: four courses, in the order you'd
 * actually eat them. Sections not listed here fall under "More".
 */
export const MENU_GROUPS: { name: string; blurb: string; slugs: string[] }[] = [
  {
    name: 'From the Grill',
    blurb: 'Burgers, sandwiches, dogs and plates',
    slugs: ['burgers', 'sandwiches', 'hotdogs', 'mains', 'salads'],
  },
  {
    name: 'Breakfast, All Day',
    blurb: 'Served from open until close',
    slugs: ['breakfast', 'pancakes', 'scrambles', 'pastas'],
  },
  {
    name: 'On the Side',
    blurb: 'Fries and everything with them',
    slugs: ['fries', 'sides'],
  },
  {
    name: 'Sweet Things',
    blurb: 'Scoops, swirls and floats',
    slugs: ['sweets'],
  },
];

// ---------------------------------------------------------------------
//  Below here is plumbing — you don't need to edit it.
// ---------------------------------------------------------------------

function toItem(d: Dish, slug: string, i: number): MenuItem {
  return {
    id: `${slug}-${i + 1}`,
    category_id: slug,
    code: null,
    name: d.name,
    description: d.desc ?? null,
    price: d.price,
    image_url: d.photo ? `/menu/dishes/${d.photo}.jpg` : null,
    tag: d.tag ?? null,
    sort_order: i + 1,
    is_available: true,
  };
}

/** The menu as the website renders it. */
export const CODE_MENU: MenuData = SECTIONS.map((s, i) => ({
  id: s.slug,
  slug: s.slug,
  name: s.name,
  note: s.note ?? null,
  sort_order: i + 1,
  is_active: true,
  items: s.dishes.map((d, n) => toItem(d, s.slug, n)),
}));

/**
 * Which course a written-in section belongs to, for sections that have not
 * been given one in the admin panel. Used when importing the printed menu
 * and when laying out /menu.
 */
export function groupNameFor(slug: string): string | null {
  return MENU_GROUPS.find((g) => g.slugs.includes(slug))?.name ?? null;
}

/**
 * Every dish photograph the printed menu uses, in one list.
 *
 * Admin -> Menu shows this as a "choose an existing photo" picker, so a
 * dish can be given a picture without anyone having to remember the file
 * naming convention or re-upload a photo the site already ships.
 *
 * Built from the menu above rather than by reading public/menu/dishes at
 * runtime: on Vercel the public folder is served by the CDN and is not a
 * directory the server can list, so a readdir would work in development
 * and quietly come back empty in production.
 */
export const PHOTO_LIBRARY: string[] = Array.from(
  new Set(
    CODE_MENU.flatMap((s) => s.items.map((i) => i.image_url)).filter(
      (u): u is string => Boolean(u)
    )
  )
).sort();
