import { Minus, Plus, ShieldCheck } from "lucide-react";
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

      <button
        type="button"
        className={styles.verifiedToggle}
        data-active={value.verifiedOnly || undefined}
        onClick={() => onChange({ ...value, verifiedOnly: !value.verifiedOnly })}
      >
        <span className={styles.verifiedLabel}>
          <ShieldCheck size={18} />
          Только верифицированные хозяева
        </span>
        <span className={styles.switch} data-on={value.verifiedOnly || undefined} />
      </button>

      <p className={styles.hint}>Даты и дополнительные фильтры — демо-заглушка для MVP.</p>
    </BottomSheet>
  );
}
