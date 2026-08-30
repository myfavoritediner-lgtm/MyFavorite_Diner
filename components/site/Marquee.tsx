const WORDS = [
  'Wagyu Burgers',
  'All-Day Breakfast',
  'Pancakes',
  'Pasta',
  'Sandwiches',
  'Ice Cream',
  'Cold Beer',
];

function Strip() {
  return (
    <span>
      {WORDS.map((w, i) => (
        <span key={w} style={{ display: 'contents' }}>
          {w}
          {i < WORDS.length - 1 ? <i /> : null}
        </span>
      ))}
      <em>★</em>
    </span>
  );
}

export default function Marquee() {
  return (
    <div className="band" aria-hidden="true">
      <div className="band-track" id="band">
        <Strip />
        <Strip />
      </div>
    </div>
  );
}
