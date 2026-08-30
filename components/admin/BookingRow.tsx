'use client';

import { useTransition } from 'react';
import type { Booking } from '@/lib/types';
import { setBookingStatus, deleteBooking } from '@/app/admin/actions';

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-diner-red text-white',
  confirmed: 'bg-diner-yellow text-body-dark',
  done: 'bg-body-darkSoft text-white',
  cancelled: 'bg-body-dark text-cream line-through',
};

export default function BookingRow({ booking }: { booking: Booking }) {
  const [pending, start] = useTransition();

  const dateLabel = new Date(booking.booking_date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <tr className="border-t-2 border-body-dark/15 hover:bg-cream/60">
      <td className="px-4 py-3 whitespace-nowrap font-medium">{dateLabel}</td>
      <td className="px-4 py-3 whitespace-nowrap">{booking.booking_time}</td>
      <td className="px-4 py-3">
        {booking.name}
        {booking.email && (
          <a
            href={`mailto:${booking.email}`}
            className="block text-xs text-body-darkSoft underline"
          >
            {booking.email}
          </a>
        )}
        {booking.notes && (
          <p className="mt-1.5 text-xs text-body-dark border-l-[3px] border-diner-yellow pl-2 max-w-[24rem] whitespace-pre-line">
            {booking.notes}
          </p>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <a href={`tel:${booking.phone}`} className="underline">
          {booking.phone}
        </a>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">{booking.guests}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            defaultValue={booking.status}
            disabled={pending}
            onChange={(e) =>
              start(async () => {
                await setBookingStatus(booking.id, e.target.value);
              })
            }
            className={`font-cond text-xs tracking-[.1em] uppercase px-3 py-1.5 rounded-full border-0 cursor-pointer ${
              STATUS_STYLE[booking.status] ?? ''
            }`}
          >
            <option value="new">New</option>
            <option value="confirmed">Confirmed{booking.email ? ' (emails guest)' : ''}</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            title="Delete booking"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (confirm(`Delete the booking for ${booking.name}?`)) {
                  await deleteBooking(booking.id);
                }
              })
            }
            className="text-body-darkSoft hover:text-diner-red px-1"
          >
            <svg
              width="16"
              height="16"
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
      </td>
    </tr>
  );
}
