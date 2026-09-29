import { delay } from "../services/delay";
import type { UserProfile, UserProfileDraft } from "../types/user";
import type { UserRepository } from "./UserRepository";

const STORAGE_KEY = "priut:user";

/**
 * Stands in for what the MAX bot would already know about the person before
 * the mini-app ever opens: a maxId and a display name, nothing else yet.
 * This is what makes the profile-setup screen a "finish setting up" step
 * instead of a from-scratch registration form.
 */
const MAX_IDENTITY_SEED: UserProfile = {
  id: "max-demo-482913",
  name: "Алексей Смирнов",
  city: "",
  locality: null,
  bio: "",
  interests: [],
  photo: null,
  onboardingCompleted: false,
};

function readStoredUser(): UserProfile | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function writeStoredUser(user: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export class MockUserRepository implements UserRepository {
  async getCurrentUser(): Promise<UserProfile> {
    await delay(300);
    const stored = readStoredUser();
    if (stored) return stored;
    writeStoredUser(MAX_IDENTITY_SEED);
    return MAX_IDENTITY_SEED;
  }

  async updateProfile(patch: Partial<UserProfileDraft>): Promise<UserProfile> {
    await delay(500);
    const current = readStoredUser() ?? MAX_IDENTITY_SEED;
    const updated: UserProfile = { ...current, ...patch };
    writeStoredUser(updated);
    return updated;
  }

  async completeOnboarding(draft: UserProfileDraft): Promise<UserProfile> {
    await delay(600);
    const current = readStoredUser() ?? MAX_IDENTITY_SEED;
    const updated: UserProfile = { ...current, ...draft, onboardingCompleted: true };
    writeStoredUser(updated);
    return updated;
  }

  async uploadProfilePhoto(file: File): Promise<string> {
    await delay(700);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать файл"));
      reader.readAsDataURL(file);
    });
  }

  async logout(): Promise<void> {
    // Real backend: POST /api/auth/logout clears the session cookie only.
    // Nothing to invalidate locally in the mock — profile data is untouched.
    await delay(300);
  }

  async resetDemoProfile(): Promise<void> {
    await delay(200);
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const userRepository: UserRepository = new MockUserRepository();
