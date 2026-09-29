import type { AccommodationType } from "./listing";

export interface SearchFormState {
  dateFrom: string;
  dateTo: string;
  guests: number;
  accommodationType: AccommodationType | "any";
}

export const defaultSearchState: SearchFormState = {
  dateFrom: "",
  dateTo: "",
  guests: 1,
  accommodationType: "any",
};
