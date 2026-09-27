import type { UserProfile, UserProfileDraft } from "../types/user";

// getCurrentUser rejects when authentication or the backend is unavailable.
export interface UserRepository {
  getCurrentUser(): Promise<UserProfile>;
  updateProfile(patch: Partial<UserProfileDraft>): Promise<UserProfile>;
  /** Marks the profile-setup step done and persists the final draft. */
  completeOnboarding(draft: UserProfileDraft): Promise<UserProfile>;
  /** Uploads a photo and returns its URL; caller still has to save it via updateProfile. */
  uploadProfilePhoto(file: File): Promise<string>;
  /**
   * Ends the session (maps to real `POST /api/auth/logout`, which just clears
   * the session cookie). Does NOT touch profile data — the backend keeps it
   * keyed by the MAX account, and reopening the mini-app re-authenticates
   * silently since MAX still knows who you are.
   */
  logout(): Promise<void>;
  /** Demo-only: wipes the local profile so the onboarding flow can be re-tested. */
  resetDemoProfile(): Promise<void>;
}
