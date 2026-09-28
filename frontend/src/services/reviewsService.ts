import { api } from "./api.ts";
import type { Review, ReviewPage } from "../types/review.ts";

export function getReviews(userId: string) {
  return api<ReviewPage>(`/api/users/${encodeURIComponent(userId)}/reviews?limit=100`);
}

export function getOwnReview(userId: string) {
  return api<Review | null>(`/api/users/${encodeURIComponent(userId)}/review`);
}

export function saveReview(userId: string, rating: number, text: string) {
  return api<Review>(`/api/users/${encodeURIComponent(userId)}/review`, {
    method: "PUT",
    body: JSON.stringify({ rating, text }),
  });
}
