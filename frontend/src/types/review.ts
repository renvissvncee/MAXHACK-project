import type { RequestParty } from "./request";

export interface Review {
  id: string;
  subjectId: string;
  rating: number;
  text: string;
  author: RequestParty;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewPage {
  rating: number | null;
  reviewsCount: number;
  items: Review[];
}
