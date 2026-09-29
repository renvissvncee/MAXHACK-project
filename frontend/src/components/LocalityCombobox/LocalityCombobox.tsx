import { Check, LoaderCircle, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { suggestLocalities } from "../../services/localitiesService";
import type { Locality } from "../../types/locality";
import styles from "./LocalityCombobox.module.css";

interface LocalityComboboxProps {
  value: Locality | null;
  onChange: (value: Locality | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  bare?: boolean;
  ariaLabel?: string;
}

export default function LocalityCombobox({
  value,
  onChange,
  label,
  placeholder = "Начните вводить название",
  required = false,
  autoFocus = false,
  bare = false,
  ariaLabel,
}: LocalityComboboxProps) {
  const id = useId();
  const requestId = useRef(0);
  const [text, setText] = useState(value?.fullLabel ?? "");
  const [items, setItems] = useState<Locality[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // The selected object may be restored asynchronously from a URL or API.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setText(value?.fullLabel ?? "");
  }, [value?.id, value?.fullLabel]);

  useEffect(() => {
    const query = text.trim();
    if (value || query.length < 2) {
      ++requestId.current;
      // oxlint-disable-next-line react/set-state-in-effect
      setItems([]);
      setLoading(false);
      return;
    }
    const current = ++requestId.current;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      suggestLocalities(query)
        .then((rows) => {
          if (requestId.current !== current) return;
          setItems(rows);
          setActiveIndex(rows.length ? 0 : -1);
          setOpen(true);
        })
        .catch(() => {
          if (requestId.current === current) setItems([]);
        })
        .finally(() => {
          if (requestId.current === current) setLoading(false);
        });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [text, value]);

  const select = (item: Locality) => {
    onChange(item);
    setText(item.fullLabel);
    setItems([]);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && items.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(items.length - 1, index + 1));
    } else if (event.key === "ArrowUp" && items.length) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      select(items[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const contextLabel = (item: Locality) => {
    const prefix = `${item.shortLabel}, `;
    if (item.fullLabel.startsWith(prefix)) return item.fullLabel.slice(prefix.length);
    return item.fullLabel === item.shortLabel ? item.type : item.fullLabel;
  };

  const input = (
    <div className={styles.control} data-bare={bare || undefined}>
      <MapPin size={17} className={styles.icon} aria-hidden="true" />
      <input
        id={id}
        className={styles.input}
        role="combobox"
        aria-autocomplete="list"
        aria-label={!label ? ariaLabel ?? placeholder : undefined}
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        value={text}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        autoComplete="off"
        onFocus={() => { if (!value && text.trim().length >= 2) setOpen(true); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          setText(event.target.value);
          if (value) onChange(null);
          setOpen(event.target.value.trim().length >= 2);
        }}
      />
      {loading && <LoaderCircle size={17} className={styles.spinner} aria-label="Ищем" />}
      {value && <Check size={17} className={styles.check} aria-label="Населённый пункт выбран" />}
      {open && !value && (
        <div id={`${id}-listbox`} className={styles.options} role="listbox">
          {!loading && items.length === 0 && <p className={styles.empty}>Ничего не найдено</p>}
          {items.map((item, index) => (
            <button
              id={`${id}-option-${index}`}
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={styles.option}
              data-active={index === activeIndex || undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(item)}
            >
              <span className={styles.optionName}>{item.shortLabel}</span>
              <span className={styles.optionContext}>{contextLabel(item)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (!label) return input;
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      {input}
      {!value && text.trim().length > 0 && (
        <span className={styles.hint}>Выберите конкретный пункт из подсказок</span>
      )}
    </label>
  );
}
