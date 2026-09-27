import { api, ApiError } from "../services/api";
import type { UserProfile, UserProfileDraft } from "../types/user";
import type { UserRepository } from "./UserRepository";
declare global { interface Window { WebApp?: { initData?: string }; } }
interface ProfileResponse { id: string; name: string; city: string; bio: string; interests: string[]; photoUrl: string | null; profileCompleted: boolean; }
function profile(data: ProfileResponse): UserProfile {
  return { id: data.id, name: data.name, city: data.city, bio: data.bio, interests: data.interests,
    photo: data.photoUrl, onboardingCompleted: data.profileCompleted };
}
let pending: Promise<UserProfile> | undefined;
async function login(): Promise<UserProfile> {
  try { return profile(await api<ProfileResponse>("/api/me")); }
  catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
  const initData = window.WebApp?.initData;
  if (!initData) throw new Error("Откройте приложение кнопкой в боте MAX. В обычном браузере нет данных для входа.");
  return profile(await api<ProfileResponse>("/api/auth/max", { method: "POST", body: JSON.stringify({ initData }) }));
}
export class ApiUserRepository implements UserRepository {
  getCurrentUser(): Promise<UserProfile> {
    // React StrictMode may mount twice: share one authentication request.
    pending ??= login().finally(() => { pending = undefined; });
    return pending;
  }
  async updateProfile(patch: Partial<UserProfileDraft>): Promise<UserProfile> {
    const { photo: _photo, ...editable } = patch;
    return profile(await api<ProfileResponse>("/api/me", { method: "PATCH", body: JSON.stringify(editable) }));
  }
  completeOnboarding(draft: UserProfileDraft) { return this.updateProfile(draft); }
  async uploadProfilePhoto(_file: File): Promise<string> { throw new Error("Загрузка фото пока недоступна. Используется фото MAX."); }
  async logout() { await api<void>("/api/auth/logout", { method: "POST" }); }
  async resetDemoProfile() { throw new Error("Сброс реального профиля не поддерживается."); }
}
export const userRepository = new ApiUserRepository();
