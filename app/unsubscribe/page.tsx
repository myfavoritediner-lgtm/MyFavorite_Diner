import UnsubscribeConfirm, {
  type Notice,
} from '@/components/site/UnsubscribeConfirm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Unsubscribe — My Favorite Diner',
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Work out up front whether the link is usable, so a link that can't act
  // says why. A preview is not a failure, so it doesn't get an error heading.
  let notice: Notice | undefined;

  if (token === 'preview') {
    notice = {
      title: 'This is only a preview',
      body: 'Real subscribers who click this link will be asked to confirm, then removed from the mailing list. Nothing has changed.',
    };
  } else if (!token) {
    notice = {
      title: 'This link is incomplete',
      body: 'The unsubscribe code is missing. Try clicking the link in the email again, or reply to us and we will remove you.',
    };
  } else if (!UUID.test(token)) {
    notice = {
      title: 'This link is not valid',
      body: 'It may have been cut short by your email app. Try clicking it again from the original email, or reply to us and we will remove you.',
    };
  }

  return (
    <main className="un-wrap">
      <div className="un-card">
        <p className="un-logo">My Favorite Diner</p>
        <p className="un-sub">Bar and Grill</p>

        <UnsubscribeConfirm token={token ?? ''} notice={notice} />
      </div>
    </main>
  );
}
