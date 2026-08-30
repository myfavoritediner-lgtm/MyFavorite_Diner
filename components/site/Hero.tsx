import Image from 'next/image';
import type { Settings } from '@/lib/types';

/** The dashes-and-stars rule that sits under the headline. */
function Ornament() {
  return (
    <span className="orn" aria-hidden="true">
      <i />
      <svg viewBox="0 0 60 12">
        <path d="M8 6h44" />
        <path d="M6 3l-4 3 4 3M54 3l4 3-4 3" />
      </svg>
      <i />
    </span>
  );
}

export default function Hero({ settings }: { settings: Settings }) {
  /* The headline lives here, not in the database. It's the one piece of
     copy that has to sit exactly right against the artwork, so it isn't
     something to change casually from the admin panel. */
  const boldText = 'Classic American';

  const address =
    [settings.address_line1, settings.address_line2].filter(Boolean).join(', ') ||
    'Jomtien Complex, Pattaya, Thailand';

  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        {/* ---------------- words ---------------- */}
        <div className="hero-copy" id="heroIn">
          {/* Three parts, because the two layouts break the sentence in
              different places: desktop reads "CLASSIC AMERICAN" big with
              "Comfort Food" in script beneath, while the phone leads with a
              small red "CLASSIC AMERICAN" and stacks "COMFORT" over "Food". */}
          <h1>
            <span className="h-kick">{boldText}</span>
            <span className="h-line">
              <span className="h-a">Comfort</span>{' '}
              <span className="h-b">Food</span>
            </span>
          </h1>

          <Ornament />

          <p className="hero-tail">Made to feel like home.</p>

          {/* Mobile Image Placement */}
          <div className="hero-cut-wrapper mobile-only">
            <Image
              className="hero-cut"
              src="/hero-plate-v5.png"
              alt="A bacon cheeseburger with fries and a milkshake on a diner plate"
              width={1200}
              height={1200}
              quality={95}
              priority
              sizes="(max-width: 768px) 90vw, 620px"
            />
          </div>

          <p className="hero-sub">
            Burgers, steaks, pancakes and more classic favourites — right in
            the heart of <b>Jomtien, Pattaya.</b>
          </p>

          <div className="hero-cta">
            <a className="btn" href="#menu">
              Browse Menu
            </a>
            <a className="btn ghost-dark" href="#visit">
              Find Us
            </a>
          </div>

          <p className="hero-where">
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {address}
          </p>
        </div>

        {/* Desktop Image Placement */}
        <div className="hero-cut-wrapper desktop-only">
          <Image
            className="hero-cut"
            src="/hero-plate-v5.png"
            alt="A bacon cheeseburger with fries and a milkshake on a diner plate"
            width={1200}
            height={1200}
            quality={95}
            priority
            sizes="(max-width: 768px) 100vw, 620px"
          />
        </div>
      </div>
    </section>
  );
}
