import { NextResponse } from 'next/server';
import { runHealthChecks, overallStatus } from '@/lib/health';
import { isStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Machine-readable health check.
 *
 *   GET /api/health
 *
 * Returns 200 when everything is fine or only has warnings, and 503 when
 * something is actually down — so you can point a free uptime monitor
 * (UptimeRobot, BetterStack, Vercel monitors…) at this URL and get an
 * alert if the database or email provider stops responding.
 *
 * Anyone can reach this URL, so the public answer is deliberately dull:
 * check names and a traffic light, nothing else. The `detail` field is the
 * interesting one and it is also the leaky one — it carries the sending
 * address, the alert address and raw Postgres error text — so it is only
 * included for a signed-in member of staff. Admin → Settings shows the
 * same checks in full.
 */
export async function GET() {
  const [checks, staff] = await Promise.all([runHealthChecks(), isStaff()]);
  const status = overallStatus(checks);

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: checks.map((c) =>
        staff
          ? { name: c.name, status: c.status, detail: c.detail, hint: c.hint }
          : { name: c.name, status: c.status }
      ),
    },
    {
      status: status === 'down' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store',
        // Nothing here should ever be embedded or framed elsewhere.
        'X-Robots-Tag': 'noindex',
      },
    }
  );
}
