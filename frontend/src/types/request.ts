/**
 * Forward-looking domain type for the "Request" entity described in the
 * backend model (guest, listing, dates, guests count, message, status,
 * decidedAt). Not wired to a real API yet — the demo request flow on the
 * listing detail page only simulates sending one. Kept here so the shape
 * is agreed on ahead of time and the future implementation has a type to
 * fill in rather than inventing one under time pressure.
 */
export type RequestStatus = "pending" | "accepted" | "declined";

export interface BookingRequest {
  id: string;
  listingId: string;
  guestMaxId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  message: string;
  status: RequestStatus;
  decidedAt: string | null;
}
