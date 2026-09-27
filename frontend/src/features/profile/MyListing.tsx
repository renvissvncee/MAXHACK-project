import { useEffect, useState } from "react";
import { getMyListing, saveMyListing, type ListingInput } from "../../services/listingsService";
import { accommodationTypeLabels, type AccommodationType } from "../../types/listing";
import Button from "../../components/Button/Button";
const initial: ListingInput = { city: "", title: "", shortDescription: "", description: "", guests: 1, accommodationType: "room", availableFrom: "", availableTo: "", tags: [], amenities: [], rules: [] };
export default function MyListing() {
  const [draft, setDraft] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  async function load() {
    setLoading(true); setError("");
    try { const row = await getMyListing(); if (row) {
      const { city, title, shortDescription, description, guests, accommodationType, availableFrom, availableTo, tags, amenities, rules } = row;
      setDraft({ city, title, shortDescription, description, guests, accommodationType, availableFrom, availableTo, tags, amenities, rules });
    } setLoaded(true); }
    catch (error) { setError(error instanceof Error ? error.message : "Ошибка загрузки"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  if (loading) return <p>Загружаем ваше предложение…</p>;
  if (!loaded) return <div><p role="alert">{error}</p><Button onClick={load}>Повторить</Button></div>;
  return <form style={{ display: "grid", gap: 12 }} onSubmit={async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try { await saveMyListing(draft); setSaved(true); }
    catch (error) { setError(error instanceof Error ? error.message : "Ошибка сохранения"); }
    finally { setSaving(false); }
  }}>
    <p>Одно предложение на аккаунт. Оно будет видно другим пользователям.</p>
    {([['city', 'Город', 120], ['title', 'Название', 120], ['shortDescription', 'Краткое описание', 240], ['description', 'Описание', 4000]] as const).map(([key, label, max]) => <label key={key}>{label}<input style={{ display: "block", width: "100%" }} required maxLength={max} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}
    <label>Гостей <input type="number" min={1} max={8} required value={draft.guests} onChange={e => setDraft({ ...draft, guests: Number(e.target.value) })} /></label>
    <label>Тип размещения <select value={draft.accommodationType} onChange={e => setDraft({ ...draft, accommodationType: e.target.value as AccommodationType })}>{Object.entries(accommodationTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label>Доступно с <input type="date" required value={draft.availableFrom} onChange={e => setDraft({ ...draft, availableFrom: e.target.value })} /></label>
    <label>Доступно по <input type="date" required min={draft.availableFrom} value={draft.availableTo} onChange={e => setDraft({ ...draft, availableTo: e.target.value })} /></label>
    {error && <p role="alert">{error}</p>}{saved && <p role="status">Предложение сохранено.</p>}
    <Button type="submit" loading={saving}>Сохранить предложение</Button>
  </form>;
}
