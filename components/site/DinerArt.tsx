'use client';

import { useEffect, useRef } from 'react';

/**
 * Line-art of the real diner — the open-air terrace on the Jomtien Complex
 * walking street: steel roof, cyan LED strips, the neon sign, hanging
 * lanterns, red lounge chairs out front.
 *
 * Three depth layers drift at different rates on scroll and mouse, the neon
 * switches on in sequence when the page loads, and a scooter buzzes past
 * every so often. Pure SVG, no images.
 */

const LANTERNS: [number, number, string][] = [
  [76, 74, 'g'],
  [126, 96, 'r'],
  [178, 66, 'o'],
  [232, 104, 'g'],
  [402, 70, 'r'],
  [462, 98, 'o'],
  [530, 76, 'g'],
];

export default function DinerArt() {
  const ref = useRef<SVGSVGElement>(null);

  /* Depth: scroll and pointer both feed two CSS variables that the layers
     read, each with its own multiplier. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let scrollY = 0;
    let mx = 0;
    let my = 0;
    let raf = 0;

    const apply = () => {
      el.style.setProperty('--sy', scrollY.toFixed(2));
      el.style.setProperty('--mx', mx.toFixed(3));
      el.style.setProperty('--my', my.toFixed(3));
      raf = 0;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onScroll = () => {
      const r = el.getBoundingClientRect();
      // -1 → 1 as the art crosses the viewport
      scrollY =
        (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      schedule();
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx = (e.clientX - (r.left + r.width / 2)) / r.width;
      my = (e.clientY - (r.top + r.height / 2)) / r.height;
      schedule();
    };

    const onLeave = () => {
      mx = 0;
      my = 0;
      schedule();
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <svg
      ref={ref}
      className="diner-art"
      viewBox="0 0 620 470"
      role="img"
      aria-label="Illustration of My Favorite Diner at night — the open terrace with its neon sign, blue light strips and red seating"
    >
      {/* warm light filling the terrace */}
      <ellipse className="da-halo" cx="310" cy="300" rx="250" ry="150" />

      {/* ================= BACK LAYER ================= */}
      <g className="da-layer back">
        {/* steel roof and trusses */}
        <g className="da-line">
          <path d="M20 44h580" />
          <path d="M20 44v22h580V44" />
        </g>
        <g className="da-thin">
          {Array.from({ length: 20 }).map((_, i) => (
            <path key={i} d={`M${34 + i * 29} 44v22`} />
          ))}
          <path d="M60 66l72 44M132 66l-72 44M340 66l72 44M412 66l-72 44" />
        </g>

        {/* hanging lanterns, swaying on their cords */}
        {LANTERNS.map(([x, y, tone], i) => (
          <g
            key={i}
            className={`da-sway tone-${tone} da-on`}
            style={{
              animationDelay: `${(i % 4) * 0.9}s`,
              ['--on' as string]: `${1.5 + i * 0.13}s`,
            }}
          >
            <g className="da-lantern" style={{ animationDelay: `${(i % 5) * 0.7}s` }}>
              <path className="da-cord" d={`M${x} 66v${y - 66}`} />
              <circle className="da-lamp" cx={x} cy={y + 10} r="9" />
              <path className="da-lamp-ring" d={`M${x - 9} ${y + 10}h18`} />
            </g>
          </g>
        ))}

        {/* moths circling the third lantern */}
        <g transform="translate(178 76)">
          <g className="da-moths">
            <circle className="da-moth" cx="17" cy="0" r="1.7" />
            <circle className="da-moth" cx="-15" cy="4" r="1.4" />
          </g>
        </g>
      </g>

      {/* ================= MID LAYER ================= */}
      <g className="da-layer mid">
        {/* fascia with the LED strips */}
        <g className="da-line">
          <path d="M40 176h540v54H40z" />
        </g>
        <path className="da-led da-on" style={{ ['--on' as string]: '.15s' }} d="M46 186h528" />
        <path
          className="da-led delay da-on"
          style={{ ['--on' as string]: '.35s' }}
          d="M46 222h528"
        />

        {/* the neon sign */}
        <g className="da-sign da-on" style={{ ['--on' as string]: '.9s' }}>
          <g transform="rotate(-5 310 152)">
            <rect className="da-plate-outer" x="214" y="98" width="192" height="98" rx="26" />
            <rect className="da-plate-face" x="222" y="106" width="176" height="82" rx="20" />
            <rect className="da-plate-inner" x="230" y="114" width="160" height="66" rx="16" />

            <g className="da-arrow">
              <path d="M228 168 L286 104" />
              <path d="M270 104h18v18" />
            </g>
            <g className="da-arrow-bulbs chase">
              <circle cx="240" cy="156" r="3.4" />
              <circle cx="252" cy="143" r="3.4" />
              <circle cx="264" cy="130" r="3.4" />
            </g>

            <text className="da-logo-my" x="268" y="130">My</text>
            <text className="da-logo-main" x="308" y="160">Favorite</text>
            <text className="da-logo-diner" x="366" y="176">Diner</text>

            <g className="da-arrow-bulbs chase slow">
              <circle cx="252" cy="172" r="3.4" />
              <circle cx="266" cy="176" r="3.4" />
              <circle cx="280" cy="178" r="3.4" />
            </g>
          </g>

          <rect className="da-sub-plate" x="266" y="196" width="108" height="22" rx="5" />
          <text className="da-sign-sub" x="320" y="211">Bar and Grill</text>
        </g>

        {/* ceiling */}
        <g className="da-line">
          <path d="M40 230h540" />
          <path d="M120 230v34M300 230v186M470 230v34" />
        </g>

        {/* ceiling fans, turning */}
        {[196, 396].map((x, i) => (
          <g key={x}>
            <path className="da-fan-rod" d={`M${x} 230v18`} />
            <g transform={`translate(${x} 250)`}>
              <g className="da-fan" style={{ animationDelay: `${i * -0.6}s` }}>
                <ellipse className="da-blade" rx="26" ry="4.5" />
                <ellipse className="da-blade" rx="4.5" ry="26" />
                <ellipse className="da-blade" rx="26" ry="4.5" transform="rotate(45)" />
                <ellipse className="da-blade" rx="4.5" ry="26" transform="rotate(45)" />
              </g>
              <circle className="da-fan-hub" r="4" />
            </g>
          </g>
        ))}

        {/* the bar, back left */}
        <g className="da-line">
          <path d="M62 264h180v44H62z" />
          <path d="M62 264v-52h180v52" />
        </g>
        <g className="da-thin">
          <path d="M70 226h164M70 242h164" />
          {Array.from({ length: 12 }).map((_, i) => (
            <path key={i} d={`M${78 + i * 14} 216v8`} />
          ))}
        </g>
        <g className="da-pendant da-on" style={{ ['--on' as string]: '1.2s' }}>
          {[104, 152, 200].map((x, i) => (
            <g key={i}>
              <path className="da-cord" d={`M${x} 230v18`} />
              <path className="da-shade" d={`M${x - 11} 262l11 -14 11 14z`} />
            </g>
          ))}
        </g>
        <g className="da-far">
          <circle cx="132" cy="250" r="8" />
          <path d="M124 308v-46a8 8 0 0 1 16 0v46" />
        </g>

        {/* the standing menu banner */}
        <g className="da-line">
          <rect className="da-banner" x="278" y="252" width="44" height="112" rx="3" />
        </g>
        <g className="da-thin">
          {['Burgers', 'Fries', 'Pancakes', 'Sandwiches', 'Breakfast'].map((t, i) => (
            <text key={t} className="da-banner-text" x="300" y={278 + i * 18}>
              {t}
            </text>
          ))}
        </g>
      </g>

      {/* ================= FRONT LAYER ================= */}
      <g className="da-layer front">
        {/* red lounge seating */}
        {[
          [40, 342], [126, 342], [212, 342],
          [396, 342], [482, 342], [552, 342],
          [76, 396], [176, 396], [420, 396], [520, 396],
        ].map(([x, y], i) => (
          <g key={i} className="da-chair">
            <rect className="da-seat" x={x} y={y + 18} width="56" height="14" rx="3" />
            <rect className="da-back" x={x} y={y - 6} width="56" height="24" rx="3" />
            <path className="da-legs" d={`M${x + 6} ${y + 32}v14M${x + 50} ${y + 32}v14`} />
          </g>
        ))}

        {/* a cat asleep on the end chair */}
        <g className="da-cat" transform="translate(486 350)">
          <ellipse className="da-cat-body" cx="0" cy="0" rx="17" ry="8" />
          <circle className="da-cat-body" cx="-15" cy="-4" r="7" />
          <path className="da-cat-ears" d="M-20 -9l-1 -6 5 3M-10 -10l2 -6 3 5" />
          <path className="da-cat-tail" d="M15 2 c 10 2, 12 -6, 6 -9" />
        </g>

        {/* small round tables */}
        <g className="da-line">
          {[[196, 372], [372, 372], [286, 424]].map(([x, y], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y} rx="20" ry="6" />
              <path d={`M${x} ${y + 6}v22M${x - 10} ${y + 28}h20`} />
            </g>
          ))}
        </g>

        {/* a coffee, steaming */}
        <g className="da-line">
          <path d="M368 372v-11h11v11" />
          <path d="M379 364h4a3 3 0 0 1 0 6h-4" />
        </g>
        <g className="da-steam">
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M${370 + i * 4} 356 c -3 -6, 3 -9, 0 -15`}
              style={{ animationDelay: `${i * 0.9}s` }}
            />
          ))}
        </g>

        {/* a beer on the other table, bubbling */}
        <g className="da-line">
          <path d="M190 372v-16h13v16" />
        </g>
        <path className="da-beer" d="M191 372v-9h11v9z" />
        <g className="da-bubbles">
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={193 + i * 4}
              cy="370"
              r="1.3"
              style={{ animationDelay: `${i * 1.1}s` }}
            />
          ))}
        </g>

        {/* floor */}
        <g className="da-line">
          <path d="M0 452h620" />
        </g>
        <g className="da-thin">
          <path d="M0 434h620" />
        </g>
      </g>
    </svg>
  );
}
