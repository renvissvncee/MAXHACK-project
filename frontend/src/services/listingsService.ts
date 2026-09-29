import { api } from "./api";
import type { AccommodationType, Listing } from "../types/listing";
export interface SearchFilters { city?: string; guests?: number; accommodationType?: AccommodationType; dateFrom?: string; dateTo?: string; }
export interface ListingInput { city: string; title: string; shortDescription: string; description: string; guests: number; accommodationType: AccommodationType; availableFrom: string; availableTo: string; tags: string[]; amenities: string[]; rules: string[]; photoUrl: string | null; }
type ResponseListing = Omit<Listing, "availableDates" | "host"> & ListingInput & { host: Omit<Listing["host"], "rating" | "reviewsCount"> };
function listing(data: ResponseListing): Listing { return { ...data, host: { ...data.host, rating: null, reviewsCount: 0 }, availableDates: `${data.availableFrom} — ${data.availableTo}` }; }
export async function searchListings(filters: SearchFilters): Promise<Listing[]> {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.guests) params.set("guests", String(filters.guests));
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  const rows: Listing[] = [];
  // Fetch all pages before applying the UI's accommodation filter, unsupported by API.
  for (let offset = 0; ; offset += 100) {
    params.set("limit", "100"); params.set("offset", String(offset));
    const page = await api<ResponseListing[]>(`/api/listings?${params}`);
    rows.push(...page.map(listing));
    if (page.length < 100) break;
  }
  return filters.accommodationType ? rows.filter(row => row.accommodationType === filters.accommodationType) : rows;
}
export const getListings = () => searchListings({});
export async function getListingById(id: string) { return listing(await api<ResponseListing>(`/api/listings/${encodeURIComponent(id)}`)); }
export async function getMyListing(): Promise<Listing | null> {
  const { listing: row } = await api<{ listing: ResponseListing | null }>("/api/me/listing");
  return row ? listing(row) : null;
}
export async function saveMyListing(data: ListingInput) { return listing(await api<ResponseListing>("/api/me/listing", { method: "PUT", body: JSON.stringify(data) })); }
export async function deleteMyListing() { await api<void>("/api/me/listing", { method: "DELETE" }); }
