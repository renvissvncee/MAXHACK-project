export interface UserProfile {
  id: string;
  name: string;
  city: string;
  bio: string;
  avatarEmoji: string;
  avatarColor: string;
  interests: string[];
  verified: boolean;
  createdAt: string;
}

export type UserDraft = Pick<UserProfile, "name" | "city" | "bio" | "interests" | "avatarEmoji" | "avatarColor">;
