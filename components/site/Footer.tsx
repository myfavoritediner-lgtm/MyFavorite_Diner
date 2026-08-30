import type { Settings } from '@/lib/types';

export default function Footer({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div data-fx="up">
            <span className="logo">
              <span className="l1 neon-y">My Favorite Diner</span>
              <span className="l2">Bar and Grill</span>
            </span>
            <p>
              American diner, bar and grill in Jomtien Complex, Pattaya. Big
              wagyu burgers, all-day breakfast, pasta, cocktails and ice-cold
              beer.
            </p>
          </div>

          <div data-fx="up" style={{ ['--d' as string]: '100ms' }}>
            <h4>Visit</h4>
            <ul>
              <li>{settings.address_line1}</li>
              <li>{settings.address_line2}</li>
              {settings.phone ? <li>{settings.phone}</li> : null}
              {settings.maps_url ? (
                <li>
                  <a href={settings.maps_url} target="_blank" rel="noopener noreferrer">
                    View on Google Maps
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <div data-fx="up" style={{ ['--d' as string]: '190ms' }}>
            <h4>Explore</h4>
            <ul>
              <li><a href="#about">About Us</a></li>
              <li><a href="#menu">Menu</a></li>
              <li><a href="#gallery">Gallery</a></li>
              <li><a href="#visit">Book a Table</a></li>
            </ul>
          </div>

          <div data-fx="up" style={{ ['--d' as string]: '280ms' }}>
            <h4>Good to Know</h4>
            <ul>
              <li>{settings.hours}</li>
              <li>All-day breakfast</li>
              <li>Takeaway available</li>
              <li>Groups welcome</li>
            </ul>
          </div>
        </div>

        <div className="foot-bot">
          <span>© {year} My Favorite Diner Bar and Grill</span>
          <span className="sc">Jomtien · Pattaya · Thailand</span>
        </div>
      </div>
    </footer>
  );
}
