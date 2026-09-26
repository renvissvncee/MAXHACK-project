import { listings } from "../data/listings";
import type { AccommodationType, Listing } from "../types/listing";
import { delay } from "./delay";

/**
 * Data-access layer for listings. Every function is async and returns
 * plain data, so swapping the mock implementation below for real
 * `fetch(...)` calls to a backend API later won't require any change
 * in the components that call these functions.
 */

export interface SearchFilters {
  city?: string;
  guests?: number;
  accommodationType?: AccommodationType;
}

export async function getListings(): Promise<Listing[]> {
  await delay(500);
  return listings;
}

export async function getListingById(id: string): Promise<Listing | undefined> {
  await delay(350);
  return listings.find((listing) => listing.id === id);
}

export async function searchListings(filters: SearchFilters): Promise<Listing[]> {
  await delay(650);

  return listings.filter((listing) => {
    if (filters.city && listing.city.toLowerCase() !== filters.city.toLowerCase()) {
      return false;
    }
    if (filters.guests && listing.guests < filters.guests) {
      return false;
    }
    if (filters.accommodationType && listing.accommodationType !== filters.accommodationType) {
      return false;
    }
    return true;
  });
}
