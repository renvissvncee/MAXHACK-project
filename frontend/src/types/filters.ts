import type { AccommodationType } from "./listing";

export interface SearchFormState {
  city: string;
  guests: number;
  accommodationType: AccommodationType | "any";
}

export const defaultSearchState: SearchFormState = {
  city: "",
  guests: 1,
  accommodationType: "any",
};
