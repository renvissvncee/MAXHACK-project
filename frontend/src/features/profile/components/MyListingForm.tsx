import type { ListingInput } from "../../../services/listingsService";
import { accommodationTypeLabels, type AccommodationType } from "../../../types/listing";
import ChipListInput from "./ChipListInput";
import ListingPhotoPicker from "./ListingPhotoPicker";
import styles from "../MyListing.module.css";

interface MyListingFormProps {
  draft: ListingInput;
  onChange: (draft: ListingInput) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function MyListingForm({ draft, onChange }: MyListingFormProps) {
  return (
    <div className={styles.form}>
      <ListingPhotoPicker photo={draft.photoUrl} onChange={(photoUrl) => onChange({ ...draft, photoUrl })} />

      <label className={styles.field}>
        <span className={styles.label}>Город, где вы принимаете гостей</span>
        <input
          className={styles.input}
          required
          maxLength={120}
          placeholder="Например, Казань"
          value={draft.city}
          onChange={(event) => onChange({ ...draft, city: event.target.value })}
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
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
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
          onChange={(event) => onChange({ ...draft, shortDescription: event.target.value })}
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
          onChange={(event) => onChange({ ...draft, description: event.target.value })}
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
            onChange={(event) => onChange({ ...draft, guests: Number(event.target.value) })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Тип размещения</span>
          <select
            className={styles.input}
            value={draft.accommodationType}
            onChange={(event) => onChange({ ...draft, accommodationType: event.target.value as AccommodationType })}
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
            min={today()}
            value={draft.availableFrom}
            onChange={(event) => onChange({ ...draft, availableFrom: event.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Доступно по</span>
          <input
            className={styles.input}
            type="date"
            required
            min={draft.availableFrom || today()}
            value={draft.availableTo}
            onChange={(event) => onChange({ ...draft, availableTo: event.target.value })}
          />
        </label>
      </div>
      {draft.availableFrom && draft.availableFrom < today() && (
        <p className={styles.error}>Дата «с» не может быть в прошлом.</p>
      )}
      {draft.availableFrom && draft.availableTo && draft.availableTo < draft.availableFrom && (
        <p className={styles.error}>Дата «по» не может быть раньше даты «с».</p>
      )}

      <ChipListInput
        label="Теги"
        values={draft.tags}
        onChange={(tags) => onChange({ ...draft, tags })}
        placeholder="Например, центр"
        maxItems={12}
      />
      <ChipListInput
        label="Удобства"
        values={draft.amenities}
        onChange={(amenities) => onChange({ ...draft, amenities })}
        placeholder="Например, Wi-Fi"
        maxItems={20}
      />
      <ChipListInput
        label="Правила"
        values={draft.rules}
        onChange={(rules) => onChange({ ...draft, rules })}
        placeholder="Например, не курить"
        maxItems={20}
      />
    </div>
  );
}
