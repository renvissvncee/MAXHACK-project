import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import StateView from "../components/StateView/StateView";
import SplashLoader from "../components/SplashLoader/SplashLoader";
import { userService } from "../services/userService";
import type { UserProfile, UserProfileDraft } from "../types/user";

type UserStatus = "loading" | "ready" | "error";

interface UserContextValue {
  user: UserProfile | null;
  status: UserStatus;
  isSaving: boolean;
  reload: () => Promise<void>;
  completeOnboarding: (draft: UserProfileDraft) => Promise<UserProfile>;
  updateProfile: (patch: Partial<UserProfileDraft>) => Promise<UserProfile>;
  uploadProfilePhoto: (file: File) => Promise<string>;
  logout: () => Promise<void>;
  resetDemoProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<UserStatus>("loading");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const current = await userService.getCurrentUser();
      setUser(current);
      setStatus("ready");
    } catch (error) {
      setUser(null);
      setError(error instanceof Error ? error.message : "Не удалось войти");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completeOnboarding = useCallback(async (draft: UserProfileDraft) => {
    setIsSaving(true);
    try {
      const updated = await userService.completeOnboarding(draft);
      setUser(updated);
      return updated;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserProfileDraft>) => {
    setIsSaving(true);
    try {
      const updated = await userService.updateProfile(patch);
      setUser(updated);
      return updated;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const uploadProfilePhoto = useCallback((file: File) => userService.uploadProfilePhoto(file), []);

  const logout = useCallback(async () => {
    await userService.logout(); setUser(null); setError("Вы вышли. Нажмите «Повторить», чтобы войти через MAX."); setStatus("error");
  }, []);

  const resetDemoProfile = useCallback(async () => {
    await userService.resetDemoProfile();
    await load();
  }, [load]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      status,
      isSaving,
      reload: load,
      completeOnboarding,
      updateProfile,
      uploadProfilePhoto,
      logout,
      resetDemoProfile,
    }),
    [
      user,
      status,
      isSaving,
      load,
      completeOnboarding,
      updateProfile,
      uploadProfilePhoto,
      logout,
      resetDemoProfile,
    ],
  );

  if (status === "loading") return <SplashLoader />;
  if (status === "error") return <StateView icon={<span>MAX</span>} title="Вход в Приют" description={error} actionLabel="Повторить" onAction={load} />;
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
