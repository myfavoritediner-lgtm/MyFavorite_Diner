/**
 * Shared constants.
 *
 * These live outside the server-action files because a `'use server'` module
 * may only export async functions.
 */

/** Tables accepted per day before the website says a date is full. */
export const DEFAULT_DAILY_LIMIT = 5;
