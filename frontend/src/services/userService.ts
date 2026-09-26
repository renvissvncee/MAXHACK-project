import { userRepository } from "../repositories/MockUserRepository";
import type { UserProfileDraft } from "../types/user";

/**
 * Thin facade the UI layer talks to. Nothing here knows it's backed by
 * localStorage — swapping `userRepository`'s import for an `ApiUserRepository`
 * (real HTTP calls to the backend once it's ready) is the only change needed.
 */
export const userService = {
  getCurrentUser: () => userRepository.getCurrentUser(),
  updateProfile: (patch: Partial<UserProfileDraft>) => userRepository.updateProfile(patch),
  completeOnboarding: (draft: UserProfileDraft) => userRepository.completeOnboarding(draft),
  uploadProfilePhoto: (file: File) => userRepository.uploadProfilePhoto(file),
  logout: () => userRepository.logout(),
  resetDemoProfile: () => userRepository.resetDemoProfile(),
};
