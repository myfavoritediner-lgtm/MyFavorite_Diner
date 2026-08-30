import Image from 'next/image';
import { ABOUT_IMAGE } from '@/lib/fallback-data';

/** The faded rubber stamp in the corner. */
function Stamp() {
  return (
    <svg className="stamp" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path id="stamp-top" d="M100 100 m-74 0 a74 74 0 1 1 148 0" />
        <path id="stamp-bot" d="M100 100 m-62 0 a62 62 0 1 0 124 0" />
      </defs>
      <circle cx="100" cy="100" r="86" />
      <circle cx="100" cy="100" r="78" strokeDasharray="3 5" />
      <text>
        <textPath href="#stamp-top" startOffset="50%" textAnchor="middle">
          GOOD FOOD
        </textPath>
      </text>
      <text>
        <textPath href="#stamp-bot" startOffset="50%" textAnchor="middle">
          GOOD TIMES
        </textPath>
      </text>
      <text className="stamp-mid" x="100" y="112" textAnchor="middle">
        EST. JOMTIEN
      </text>
    </svg>
  );
}

export default function About() {
  return (
    <section className="section about" id="about">
      <Stamp />
      <div className="wrap">
        <div className="about-grid">
          <div data-fx="left">
            <span className="welcome">
              Welcome to <b>★</b>
            </span>
            <h2>
              American classics, <em>made to feel like home</em>
            </h2>
            <p>
              Step into <strong>My Favorite Diner</strong> and enjoy the
              comforting flavors of{' '}
              <strong>
                classic American cuisine in the heart of Jomtien, Pattaya.
              </strong>
            </p>
            <p>
              From hearty breakfasts and juicy burgers to tender steaks, crispy
              fries, fresh salads, pancakes, sandwiches, and delicious desserts
              — there&rsquo;s something for everyone.
            </p>
            <p>
              We believe great food is best enjoyed with good company. Whether
              you&rsquo;re starting your day with breakfast, meeting friends for
              lunch, or relaxing with a drink in the evening, we&rsquo;re here
              to make every visit feel special.
            </p>

            <p className="about-sign">
              Good food. Friendly faces. A place that feels like home.
            </p>

            <p className="about-where">
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              Jomtien Complex, Pattaya, Thailand
            </p>

            <a className="btn" href="#menu" style={{ marginTop: 18 }}>
              Browse the Menu
            </a>
          </div>

          <div className="about-photo" data-fx="right">
            <div className="tape" aria-hidden="true" />
            <div className="shot">
              <Image
                src={ABOUT_IMAGE}
                alt="A diner burger with fries"
                width={900}
                height={1125}
                data-par="0.05"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
