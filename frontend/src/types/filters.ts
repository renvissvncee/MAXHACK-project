import type { AccommodationType } from "./listing";

export interface SearchFormState {
  city: string;
  guests: number;
  verifiedOnly: boolean;
  accommodationType: AccommodationType | "any";
}

export const defaultSearchState: SearchFormState = {
  city: "",
  guests: 1,
  verifiedOnly: true,
  accommodationType: "any",
};
