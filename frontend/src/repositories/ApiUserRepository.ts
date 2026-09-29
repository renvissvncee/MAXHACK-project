import { api, ApiError, setSessionToken } from "../services/api";
import type { UserProfile, UserProfileDraft } from "../types/user";
import type { UserRepository } from "./UserRepository";
interface ProfileResponse { id: string; name: string; city: string; bio: string; interests: string[]; photoUrl: string | null; profileCompleted: boolean; }
interface LoginResponse extends ProfileResponse { sessionToken: string; }
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
  const response = await api<LoginResponse>("/api/auth/max", { method: "POST", body: JSON.stringify({ initData }) });
  setSessionToken(response.sessionToken);
  return profile(response);
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
  async logout() {
    try { await api<void>("/api/auth/logout", { method: "POST" }); }
    finally { setSessionToken(null); }
  }
  async resetDemoProfile() { throw new Error("Сброс реального профиля не поддерживается."); }
}
export const userRepository = new ApiUserRepository();
