import { userRepository } from "../repositories/ApiUserRepository";
import type { UserProfileDraft } from "../types/user";

// UI facade backed by the authenticated HTTP repository.
export const userService = {
  getCurrentUser: () => userRepository.getCurrentUser(),
  updateProfile: (patch: Partial<UserProfileDraft>) => userRepository.updateProfile(patch),
  completeOnboarding: (draft: UserProfileDraft) => userRepository.completeOnboarding(draft),
  uploadProfilePhoto: (file: File) => userRepository.uploadProfilePhoto(file),
  logout: () => userRepository.logout(),
  resetDemoProfile: () => userRepository.resetDemoProfile(),
};
