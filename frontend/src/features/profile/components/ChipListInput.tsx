import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import styles from "./ChipListInput.module.css";

interface ChipListInputProps {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  maxLength?: number;
}

export default function ChipListInput({
  label,
  values,
  onChange,
  placeholder,
  maxItems = 20,
  maxLength = 80,
}: ChipListInputProps) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const value = draft.trim();
    setDraft("");
    if (!value || values.includes(value) || values.length >= maxItems) return;
    onChange([...values, value]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const remove = (value: string) => onChange(values.filter((item) => item !== value));

  return (
    <div className={styles.field}>
      <span className={styles.label}>
        {label} {values.length > 0 && <span className={styles.count}>{values.length}/{maxItems}</span>}
      </span>
      <div className={styles.box}>
        {values.map((value) => (
          <span key={value} className={styles.chip}>
            {value}
            <button type="button" onClick={() => remove(value)} aria-label={`Убрать «${value}»`}>
              <X size={12} />
            </button>
          </span>
        ))}
        {values.length < maxItems && (
          <input
            className={styles.input}
            value={draft}
            maxLength={maxLength}
            placeholder={values.length === 0 ? placeholder : ""}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
          />
        )}
      </div>
    </div>
  );
}
