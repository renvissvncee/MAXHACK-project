import type { Interest } from "../types/user";

/** Stable interest catalog — ids are the source of truth, labels are display-only. */
export const INTERESTS: Interest[] = [
  { id: "travel", label: "Путешествия" },
  { id: "coffee", label: "Кофе" },
  { id: "music", label: "Музыка" },
  { id: "sport", label: "Спорт" },
  { id: "cinema", label: "Кино" },
  { id: "cooking", label: "Кулинария" },
  { id: "nature", label: "Природа" },
  { id: "art", label: "Искусство" },
  { id: "history", label: "История" },
  { id: "photography", label: "Фотография" },
  { id: "languages", label: "Языки" },
  { id: "boardgames", label: "Настолки" },
];

export function getInterestLabel(id: string): string {
  return INTERESTS.find((interest) => interest.id === id)?.label ?? id;
}
