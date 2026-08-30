import { getMenu, getGallery, getReviews, getSettings } from '@/lib/queries';

import Intro from '@/components/site/Intro';
import Effects from '@/components/site/Effects';
import Header from '@/components/site/Header';
import Hero from '@/components/site/Hero';
import Marquee from '@/components/site/Marquee';
import About from '@/components/site/About';
import Menu from '@/components/site/Menu';
import Features from '@/components/site/Features';
import Gallery from '@/components/site/Gallery';
import ReviewBand from '@/components/site/ReviewBand';
import Subscribe from '@/components/site/Subscribe';
import Visit from '@/components/site/Visit';
import Footer from '@/components/site/Footer';
import Lightbox from '@/components/site/Lightbox';
import BackToTop from '@/components/site/BackToTop';
import StructuredData from '@/components/site/StructuredData';

// Rebuild the page at most once a minute so menu edits show up quickly.
//
// This only works because nothing in here reads cookies or headers. It used
// to, to decide whether to show the intro splash, which quietly made the
// whole page dynamic and this line a no-op. Intro now makes that call in
// the browser instead. Keep it that way — check `next build` still prints
// a circle rather than an f next to "/".
export const revalidate = 60;

export default async function HomePage() {
  const [menu, gallery, reviews, settings] = await Promise.all([
    getMenu(),
    getGallery(),
    getReviews(),
    getSettings(),
  ]);

  return (
    <>
      <StructuredData settings={settings} menu={menu} />

      <Intro />
      <Effects />

      <div id="haze" aria-hidden="true" />
      <div className="progress" aria-hidden="true">
        <i id="bar" />
      </div>

      <Lightbox />
      <BackToTop />

      <Header />

      <main>
        <Hero settings={settings} />
        <div className="checker" aria-hidden="true" />
        <Marquee />
        <About />
        <div className="checker red" aria-hidden="true" />
        <Subscribe />
        <Menu menu={menu} />
        <div className="checker" aria-hidden="true" />
        <Features />
        <Gallery images={gallery} />
        <ReviewBand reviews={reviews} />
        <Visit settings={settings} />
      </main>

      <Footer settings={settings} />
    </>
  );
}
