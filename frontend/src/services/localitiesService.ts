import { api } from "./api";
import type { Locality } from "../types/locality";

export function suggestLocalities(query: string, limit = 10): Promise<Locality[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return api<Locality[]>(`/api/localities/suggest?${params}`);
}

export function getLocality(id: string): Promise<Locality> {
  return api<Locality>(`/api/localities/${encodeURIComponent(id)}`);
}

export async function findCity(name: string): Promise<Locality | null> {
  const rows = await suggestLocalities(name, 20);
  const normalized = name.toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
  return rows.find((row) => row.name.toLocaleLowerCase("ru-RU").replaceAll("ё", "е") === normalized
    && row.typeShort === "г.") ?? null;
}
