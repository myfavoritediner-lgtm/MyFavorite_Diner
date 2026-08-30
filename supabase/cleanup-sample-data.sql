-- =====================================================================
--  REMOVE THE SAMPLE CONTENT
--
--  An earlier version of this project shipped a seed.sql full of stock
--  photos and a placeholder review, to give an empty install something to
--  look at. If it was ever run, that content is still on the website.
--
--  Run this once, in Supabase SQL Editor, when you have real photos and
--  real reviews to put in their place. It is safe to run on a database
--  that was never seeded — it simply deletes nothing.
--
--  Every statement below is deliberately narrow. Nothing you added
--  yourself is matched: your own photos live in Supabase Storage or come
--  from Facebook, and your own reviews have real names on them.
-- =====================================================================

-- ---------------------------------------------------------------------
--  1. Stock gallery photos
--
--  These are Unsplash stock images of food this diner does not serve —
--  wagyu, draft beer, a bar that is not yours. Uploaded photos are served
--  from *.supabase.co and photos linked from Facebook from *.fbcdn.net,
--  so matching on the Unsplash host cannot touch either.
--
--  Check what will go before you delete it:
--    select caption, image_url from public.gallery_images
--     where image_url like 'https://images.unsplash.com/%';
-- ---------------------------------------------------------------------
delete from public.gallery_images
 where image_url like 'https://images.unsplash.com/%';

-- ---------------------------------------------------------------------
--  2. The placeholder review
--
--  Matched on the exact author line the sample shipped with, so a real
--  review can never be caught by it.
-- ---------------------------------------------------------------------
delete from public.reviews
 where author = 'Sample review — swap in a real Google review';

-- ---------------------------------------------------------------------
--  3. Old hero headline rows
--
--  The headline lives in components/site/Hero.tsx, not in settings — it
--  has to sit exactly right against the artwork. schema.sql clears these
--  too; this is here so this file stands on its own.
-- ---------------------------------------------------------------------
delete from public.site_settings where key like 'hero_line%';

-- ---------------------------------------------------------------------
--  What is left to do by hand, in the admin panel
--
--    Gallery   upload the diner's own photos
--    Reviews   type in real Google or Facebook reviews
--    Settings  phone, email and the real opening hours
--    Home      the daily booking limit
--
--  A photo linked from Facebook stops loading after about a week — those
--  URLs are signed and expire. Use the upload button in Admin -> Gallery
--  instead, which stores the file in Supabase and does not expire.
-- ---------------------------------------------------------------------
