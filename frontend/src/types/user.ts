/**
 * Domain model for the current user. Field names mirror what the MAX bot /
 * backend is expected to hand the mini-app (see project brief §9):
 * maxId, name, city, bio, interests, photo. Do not invent a separate
 * "frontend user" shape — this is the one type used end to end.
 */
export interface UserProfile {
  maxId: string;
  name: string;
  city: string;
  bio: string;
  /** Interest ids, see data/interests.ts for the catalog. */
  interests: string[];
  /** Photo URL (or data URL in the mock), null when no photo is set. */
  photo: string | null;
  /** True once the user has completed the profile-setup step at least once. */
  onboardingCompleted: boolean;
}

/** Editable subset of the profile — what the setup/edit forms operate on. */
export type UserProfileDraft = Pick<UserProfile, "name" | "city" | "bio" | "interests" | "photo">;

export interface Interest {
  id: string;
  label: string;
}
