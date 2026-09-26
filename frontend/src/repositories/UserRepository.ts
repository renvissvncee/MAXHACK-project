import type { UserProfile, UserProfileDraft } from "../types/user";

/**
 * Contract the rest of the app codes against. The mini-app never creates a
 * user from scratch — MAX/the bot already knows who's opening it — so
 * `getCurrentUser` always resolves to a profile (never null), just possibly
 * one where `onboardingCompleted` is still false and city/bio/interests are
 * empty. Swap `MockUserRepository` for a real `ApiUserRepository` later
 * without touching a single component.
 */
export interface UserRepository {
  getCurrentUser(): Promise<UserProfile>;
  updateProfile(patch: Partial<UserProfileDraft>): Promise<UserProfile>;
  /** Marks the profile-setup step done and persists the final draft. */
  completeOnboarding(draft: UserProfileDraft): Promise<UserProfile>;
  /** Uploads a photo and returns its URL; caller still has to save it via updateProfile. */
  uploadProfilePhoto(file: File): Promise<string>;
  /** Demo-only: wipes the local profile so the onboarding flow can be re-tested. */
  resetDemoProfile(): Promise<void>;
}
