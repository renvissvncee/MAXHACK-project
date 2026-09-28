import { api } from "./api.ts";
import type {
  CreateStayRequestInput,
  MatchContact,
  RequestDirection,
  RequestStatus,
  StayRequest,
} from "../types/request.ts";

export function createStayRequest(data: CreateStayRequestInput) {
  return api<StayRequest>("/api/requests", { method: "POST", body: JSON.stringify(data) });
}

export function getStayRequests(direction: RequestDirection) {
  return api<StayRequest[]>(`/api/requests?direction=${direction}&limit=100`);
}

export function decideStayRequest(id: string, status: Extract<RequestStatus, "accepted" | "declined">) {
  return api<StayRequest>(`/api/requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getMatchContact(id: string) {
  return api<MatchContact>(`/api/requests/${encodeURIComponent(id)}/contact`);
}
