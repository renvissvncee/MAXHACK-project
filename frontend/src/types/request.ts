export type RequestStatus = "pending" | "accepted" | "declined";
export type RequestDirection = "incoming" | "outgoing";

export interface RequestParty {
  id: string;
  name: string;
  city: string;
  bio: string;
  interests: string[];
  avatarEmoji: string;
  avatarColor: string;
  photoUrl: string | null;
}

export interface StayRequest {
  id: string;
  clientRequestId: string;
  listingId: string;
  dateFrom: string;
  dateTo: string;
  guests: number;
  message: string;
  status: RequestStatus;
  createdAt: string;
  decidedAt: string | null;
  guest: RequestParty;
  host: RequestParty;
}

export interface CreateStayRequestInput {
  clientRequestId: string;
  listingId: string;
  dateFrom: string;
  dateTo: string;
  guests: number;
  message: string;
}

export interface MatchContact {
  userId: string;
  maxUserId: string;
  username: string | null;
}
