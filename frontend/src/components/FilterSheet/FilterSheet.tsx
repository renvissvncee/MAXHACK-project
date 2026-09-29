import { Minus, Plus } from "lucide-react";
import { accommodationTypeLabels, type AccommodationType } from "../../types/listing";
import type { SearchFormState } from "../../types/filters";
import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";
import Tag from "../Tag/Tag";
import styles from "./FilterSheet.module.css";

interface FilterSheetProps {
  open: boolean;
  value: SearchFormState;
  onChange: (next: SearchFormState) => void;
  onClose: () => void;
  onApply: () => void;
}

const accommodationOptions: Array<AccommodationType | "any"> = ["any", "room", "apartment", "house", "sofa"];
const today = () => new Date().toISOString().slice(0, 10);

export default function FilterSheet({ open, value, onChange, onClose, onApply }: FilterSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Фильтры"
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={
            Boolean(value.dateFrom) !== Boolean(value.dateTo)
            || Boolean(value.dateFrom && value.dateTo < value.dateFrom)
            || Boolean(value.dateFrom && value.dateFrom < today())
          }
          onClick={() => {
            onApply();
            onClose();
          }}
        >
          Показать варианты
        </Button>
      }
    >
      <div className={styles.section}>
        <span className={styles.label}>Гостей</span>
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => onChange({ ...value, guests: Math.max(1, value.guests - 1) })}
            aria-label="Меньше гостей"
          >
            <Minus size={16} />
          </button>
          <span className={styles.stepValue}>{value.guests}</span>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => onChange({ ...value, guests: Math.min(8, value.guests + 1) })}
            aria-label="Больше гостей"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Тип размещения</span>
        <div className={styles.chips}>
          {accommodationOptions.map((option) => (
            <Tag
              key={option}
              active={value.accommodationType === option}
              onClick={() => onChange({ ...value, accommodationType: option })}
            >
              {option === "any" ? "Любой" : accommodationTypeLabels[option]}
            </Tag>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Даты поездки</span>
        <div className={styles.dates}>
          <label>
            <span>Заезд</span>
            <input
              type="date"
              min={today()}
              value={value.dateFrom}
              onChange={(event) => onChange({ ...value, dateFrom: event.target.value })}
            />
          </label>
          <label>
            <span>Выезд</span>
            <input
              type="date"
              min={value.dateFrom || today()}
              value={value.dateTo}
              onChange={(event) => onChange({ ...value, dateTo: event.target.value })}
            />
          </label>
        </div>
        {value.dateFrom && value.dateFrom < today() && (
          <p className={styles.error}>Дата «заезд» не может быть в прошлом.</p>
        )}
        {value.dateFrom && value.dateTo && value.dateTo < value.dateFrom && (
          <p className={styles.error}>Дата «выезд» не может быть раньше даты «заезд».</p>
        )}
        <p className={styles.datesHint}>Укажите обе даты или оставьте обе пустыми.</p>
      </div>
    </BottomSheet>
  );
}
