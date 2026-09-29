import type { Locality } from "./locality";

// UI model; ApiUserRepository maps the backend contract into this shape.
export interface UserProfile {
  id: string;
  name: string;
  city: string;
  locality: Locality | null;
  bio: string;
  /** Interest ids, see data/interests.ts for the catalog. */
  interests: string[];
  /** Photo URL (or data URL in the mock), null when no photo is set. */
  photo: string | null;
  /** True once the user has completed the profile-setup step at least once. */
  onboardingCompleted: boolean;
}

/** Editable subset of the profile — what the setup/edit forms operate on. */
export type UserProfileDraft = Pick<UserProfile, "name" | "locality" | "bio" | "interests" | "photo">;

export interface Interest {
  id: string;
  label: string;
}
