import type { UserDraft, UserProfile } from "../types/user";
import { delay } from "./delay";

/**
 * Demo auth/profile layer backed by localStorage. Later this becomes a
 * thin wrapper around real API calls (e.g. POST /profile, GET /me) —
 * the function signatures are designed to stay the same.
 */

const STORAGE_KEY = "priut:user";

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

export async function getCurrentUser(): Promise<UserProfile | null> {
  await delay(150);
  return readStoredUser();
}

export async function createUser(draft: UserDraft): Promise<UserProfile> {
  await delay(700);
  const user: UserProfile = {
    ...draft,
    id: "demo-user",
    verified: true,
    createdAt: new Date().toISOString(),
  };
  writeStoredUser(user);
  return user;
}

export async function updateUser(patch: Partial<UserDraft>): Promise<UserProfile> {
  await delay(500);
  const current = readStoredUser();
  if (!current) {
    throw new Error("Нет активного профиля для обновления");
  }
  const updated: UserProfile = { ...current, ...patch };
  writeStoredUser(updated);
  return updated;
}

export async function clearUser(): Promise<void> {
  await delay(150);
  localStorage.removeItem(STORAGE_KEY);
}
