import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as userService from "../services/userService";
import type { UserDraft, UserProfile } from "../types/user";

interface UserContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  createProfile: (draft: UserDraft) => Promise<UserProfile>;
  updateProfile: (patch: Partial<UserDraft>) => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    userService.getCurrentUser().then((current) => {
      setUser(current);
      setIsLoading(false);
    });
  }, []);

  const createProfile = useCallback(async (draft: UserDraft) => {
    const created = await userService.createUser(draft);
    setUser(created);
    return created;
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserDraft>) => {
    const updated = await userService.updateUser(patch);
    setUser(updated);
    return updated;
  }, []);

  const logout = useCallback(async () => {
    await userService.clearUser();
    setUser(null);
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({ user, isLoading, createProfile, updateProfile, logout }),
    [user, isLoading, createProfile, updateProfile, logout],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
