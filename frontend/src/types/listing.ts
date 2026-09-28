export type AccommodationType = "room" | "apartment" | "house" | "sofa";

export interface Host {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string;
  rating: number | null;
  reviewsCount: number;
  bio: string;
  interests: string[];
}

export interface Listing {
  id: string;
  city: string;
  host: Host;
  photos: string[];
  title: string;
  shortDescription: string;
  description: string;
  tags: string[];
  guests: number;
  accommodationType: AccommodationType;
  rating: number | null;
  reviewsCount: number;
  rules: string[];
  amenities: string[];
  availableFrom: string;
  availableTo: string;
  availableDates: string;
}

export const accommodationTypeLabels: Record<AccommodationType, string> = {
  room: "Отдельная комната",
  apartment: "Квартира целиком",
  house: "Дом",
  sofa: "Диван / спальное место",
};
