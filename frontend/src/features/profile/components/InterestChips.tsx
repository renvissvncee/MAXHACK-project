import { Check } from "lucide-react";
import { INTERESTS } from "../../../data/interests";
import styles from "./InterestChips.module.css";

interface InterestChipsProps {
  selected: string[];
  onToggle: (id: string) => void;
}

export default function InterestChips({ selected, onToggle }: InterestChipsProps) {
  return (
    <div className={styles.grid}>
      {INTERESTS.map((interest) => {
        const active = selected.includes(interest.id);
        return (
          <button
            key={interest.id}
            type="button"
            className={styles.chip}
            data-active={active || undefined}
            onClick={() => onToggle(interest.id)}
            aria-pressed={active}
          >
            {active && <Check size={13} strokeWidth={3} />}
            {interest.label}
          </button>
        );
      })}
    </div>
  );
}
