import type { Settings } from '@/lib/types';
import BookingForm from '@/components/site/BookingForm';

export default function Visit({ settings }: { settings: Settings }) {
  return (
    <section className="section visit" id="visit">
      <div className="wrap visit-grid">
        <div data-fx="left">
          <span className="kicker">Come See Us</span>
          <h2>Find the diner</h2>
          <p>
            We&rsquo;re on Thappraya Road in Jomtien Complex, open every day.
            Walk-ins always welcome — book ahead for bigger groups.
          </p>

          <ul className="infos">
            <li>
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <div>
                <b>{settings.address_line1}</b>
                <span>{settings.address_line2}</span>
              </div>
            </li>

            <li>
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
              </svg>
              <div>
                <b>{settings.phone || 'Add your phone number'}</b>
                <span>For takeaway orders and group bookings</span>
              </div>
            </li>

            <li>
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
              <div>
                <b>Opening Hours</b>
                <span>{settings.hours}</span>
              </div>
            </li>

            <li>
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16v12H4z" />
                <path d="M4 7l8 6 8-6" />
              </svg>
              <div>
                <b>{settings.email || settings.facebook_url || 'Add your Facebook or email'}</b>
                <span>So guests can message you online</span>
              </div>
            </li>
          </ul>

          {settings.maps_url ? (
            <a
              className="btn ghost"
              style={{ marginTop: 26 }}
              href={settings.maps_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Google Maps
            </a>
          ) : null}
        </div>

        <div data-fx="right">
          <BookingForm />
        </div>
      </div>
    </section>
  );
}
