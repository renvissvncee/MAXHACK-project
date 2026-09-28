import { AlertTriangle, Home } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Button from "../../components/Button/Button";
import StateView from "../../components/StateView/StateView";
import { useToast } from "../../context/ToastContext";
import { getMyListing, saveMyListing, type ListingInput } from "../../services/listingsService";
import { accommodationTypeLabels, type AccommodationType } from "../../types/listing";
import ChipListInput from "./components/ChipListInput";
import styles from "./MyListing.module.css";

const empty: ListingInput = {
  city: "",
  title: "",
  shortDescription: "",
  description: "",
  guests: 1,
  accommodationType: "room",
  availableFrom: "",
  availableTo: "",
  tags: [],
  amenities: [],
  rules: [],
};

type Status = "loading" | "ready" | "error";

export default function MyListing() {
  const [status, setStatus] = useState<Status>("loading");
  const [draft, setDraft] = useState<ListingInput>(empty);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const row = await getMyListing();
      if (row) {
        const { city, title, shortDescription, description, guests, accommodationType,
          availableFrom, availableTo, tags, amenities, rules } = row;
        setDraft({ city, title, shortDescription, description, guests, accommodationType,
          availableFrom, availableTo, tags, amenities, rules });
      } else {
        setDraft(empty);
      }
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isValid =
    draft.city.trim().length > 0 &&
    draft.title.trim().length > 0 &&
    draft.shortDescription.trim().length > 0 &&
    draft.description.trim().length > 0 &&
    draft.availableFrom.length > 0 &&
    draft.availableTo.length > 0 &&
    draft.availableTo >= draft.availableFrom;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const saved = await saveMyListing(draft);
      const { city, title, shortDescription, description, guests, accommodationType,
        availableFrom, availableTo, tags, amenities, rules } = saved;
      setDraft({ city, title, shortDescription, description, guests, accommodationType,
        availableFrom, availableTo, tags, amenities, rules });
      showToast("Предложение сохранено.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось сохранить предложение.", "info");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return <p className={styles.loading}>Загружаем ваше предложение…</p>;
  }

  if (status === "error") {
    return (
      <StateView
        tone="danger"
        icon={<AlertTriangle size={26} strokeWidth={1.6} />}
        title="Не удалось загрузить предложение"
        description="Проверьте соединение и попробуйте ещё раз."
        actionLabel="Повторить"
        onAction={load}
      />
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.hint}>
        <Home size={15} /> Одно предложение на аккаунт. Оно будет видно другим пользователям в поиске.
      </p>

      <label className={styles.field}>
        <span className={styles.label}>Город, где вы принимаете гостей</span>
        <input
          className={styles.input}
          required
          maxLength={120}
          placeholder="Например, Казань"
          value={draft.city}
          onChange={(event) => setDraft({ ...draft, city: event.target.value })}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Название</span>
        <input
          className={styles.input}
          required
          maxLength={120}
          placeholder="Например, Уютная комната рядом с центром"
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Коротко</span>
        <input
          className={styles.input}
          required
          maxLength={240}
          placeholder="Например, отдельная комната, до центра 15 минут пешком"
          value={draft.shortDescription}
          onChange={(event) => setDraft({ ...draft, shortDescription: event.target.value })}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Описание</span>
        <textarea
          className={styles.textarea}
          required
          rows={4}
          maxLength={4000}
          placeholder="Расскажите про жильё и условия проживания"
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Гостей</span>
          <input
            className={styles.input}
            type="number"
            min={1}
            max={8}
            required
            value={draft.guests}
            onChange={(event) => setDraft({ ...draft, guests: Number(event.target.value) })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Тип размещения</span>
          <select
            className={styles.input}
            value={draft.accommodationType}
            onChange={(event) => setDraft({ ...draft, accommodationType: event.target.value as AccommodationType })}
          >
            {Object.entries(accommodationTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Доступно с</span>
          <input
            className={styles.input}
            type="date"
            required
            value={draft.availableFrom}
            onChange={(event) => setDraft({ ...draft, availableFrom: event.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Доступно по</span>
          <input
            className={styles.input}
            type="date"
            required
            min={draft.availableFrom || undefined}
            value={draft.availableTo}
            onChange={(event) => setDraft({ ...draft, availableTo: event.target.value })}
          />
        </label>
      </div>
      {draft.availableFrom && draft.availableTo && draft.availableTo < draft.availableFrom && (
        <p className={styles.error}>Дата «по» не может быть раньше даты «с».</p>
      )}

      <ChipListInput
        label="Теги"
        values={draft.tags}
        onChange={(tags) => setDraft({ ...draft, tags })}
        placeholder="Например, центр"
        maxItems={12}
      />
      <ChipListInput
        label="Удобства"
        values={draft.amenities}
        onChange={(amenities) => setDraft({ ...draft, amenities })}
        placeholder="Например, Wi-Fi"
        maxItems={20}
      />
      <ChipListInput
        label="Правила"
        values={draft.rules}
        onChange={(rules) => setDraft({ ...draft, rules })}
        placeholder="Например, не курить"
        maxItems={20}
      />

      <Button type="submit" size="lg" fullWidth loading={saving} disabled={!isValid}>
        Сохранить предложение
      </Button>
    </form>
  );
}
