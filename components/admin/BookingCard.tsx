'use client';

import { useTransition } from 'react';
import type { Booking } from '@/lib/types';
import { setBookingStatus, deleteBooking } from '@/app/admin/actions';

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-diner-red text-white',
  confirmed: 'bg-diner-yellow text-body-dark',
  done: 'bg-body-darkSoft text-white',
  cancelled: 'bg-body-dark text-cream',
};

/** Phone-friendly version of a booking row. */
export default function BookingCard({ booking }: { booking: Booking }) {
  const [pending, start] = useTransition();

  const date = new Date(booking.booking_date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div
      className={`bg-white border-[3px] rounded-2xl p-4 ${
        booking.status === 'new' ? 'border-diner-red' : 'border-body-dark'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-slab text-lg leading-tight">{booking.name}</p>
          <p className="text-body-darkSoft text-sm mt-0.5">
            {date} · {booking.booking_time} · {booking.guests}{' '}
            {booking.guests === '1' ? 'guest' : 'guests'}
          </p>
        </div>
        <span
          className={`font-cond text-[10px] tracking-[.1em] uppercase px-3 py-1.5 rounded-full shrink-0 ${
            STATUS_STYLE[booking.status] ?? ''
          }`}
        >
          {booking.status}
        </span>
      </div>

      {booking.notes && (
        <p className="mt-3 text-sm text-body-dark bg-cream/70 border-l-[3px] border-diner-yellow rounded-r-lg px-3 py-2 whitespace-pre-line">
          {booking.notes}
        </p>
      )}

      <div className="flex gap-2 mt-3">
        <a
          href={`tel:${booking.phone}`}
          className="flex-1 text-center font-cond text-xs tracking-[.1em] uppercase border-2 border-body-dark rounded-full py-2.5"
        >
          Call
        </a>
        {booking.email && (
          <a
            href={`mailto:${booking.email}`}
            className="flex-1 text-center font-cond text-xs tracking-[.1em] uppercase border-2 border-body-dark rounded-full py-2.5"
          >
            Email
          </a>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <select
          defaultValue={booking.status}
          disabled={pending}
          onChange={(e) =>
            start(async () => {
              await setBookingStatus(booking.id, e.target.value);
            })
          }
          className="flex-1 rounded-full border-2 border-body-dark px-4 py-2.5 text-sm bg-white"
        >
          <option value="new">New</option>
          <option value="confirmed">
            Confirmed{booking.email ? ' (emails guest)' : ''}
          </option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          aria-label="Delete booking"
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (confirm(`Delete the booking for ${booking.name}?`)) {
                await deleteBooking(booking.id);
              }
            })
          }
          className="w-11 h-11 shrink-0 rounded-full border-2 border-body-dark flex items-center justify-center text-body-darkSoft"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
