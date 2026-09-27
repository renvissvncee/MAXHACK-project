import type { AccommodationType } from "./listing";

export interface SearchFormState {
  city: string;
  dateFrom: string;
  dateTo: string;
  guests: number;
  accommodationType: AccommodationType | "any";
}

export const defaultSearchState: SearchFormState = {
  city: "",
  dateFrom: "",
  dateTo: "",
  guests: 1,
  accommodationType: "any",
};
