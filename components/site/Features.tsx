const FEATURES = [
  {
    title: 'Cooked to Order',
    body: 'Nothing sits under a lamp. Burgers are pressed when you order them, eggs are cooked how you asked, and steaks come off the grill exactly the way you like.',
    icon: (
      <path d="M4 15h16M5 15a7 7 0 0 1 14 0M3 19h18M7 9c0-2 2-2 2-4M12 9c0-2 2-2 2-4M17 9c0-1.5 1.5-2 1.5-3.5" />
    ),
  },
  {
    title: 'Proper Bar',
    body: "Ice-cold draft beer, buckets, spirits and cocktails mixed by people who know what they're doing — with the sport on and a seat that feels like yours.",
    icon: (
      <>
        <path d="M7 3h10l-1 8a4 4 0 0 1-8 0L7 3zM12 15v6M8 21h8" />
        <path d="M7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5" />
      </>
    ),
  },
  {
    title: 'Takeaway & Groups',
    body: 'Everything travels — order the whole menu to go. Big tables, birthdays and match nights are all welcome, just give us a heads up.',
    icon: (
      <>
        <path d="M3 8h13l3 4h2v5h-3M3 8v9h3" />
        <circle cx="8" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </>
    ),
  },
];

export default function Features() {
  return (
    <section className="section feats-section" id="why">
      <div className="wrap">
        <div className="feat-head" data-fx="up">
          <span className="kicker">Why People Come Back</span>
          <h2>Good food, cold drinks, friendly faces</h2>
          <p>Three reasons this became everybody&rsquo;s favorite diner in Jomtien.</p>
        </div>

        <div className="feats">
          {FEATURES.map((f, i) => (
            <div
              className="feat"
              key={f.title}
              data-fx="up"
              style={{ ['--d' as string]: `${i * 130}ms` }}
            >
              <div className="ic">
                <svg
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {f.icon}
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
