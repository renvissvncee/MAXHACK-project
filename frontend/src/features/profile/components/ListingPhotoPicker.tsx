import { Camera, ImageOff, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import PhotoPlaceholder from "../../../components/PhotoPlaceholder/PhotoPlaceholder";
import { compressImageToDataUrl } from "../../../utils/image";
import styles from "./ListingPhotoPicker.module.css";

interface ListingPhotoPickerProps {
  photo: string | null;
  onChange: (photo: string | null) => void;
}

export default function ListingPhotoPicker({ photo, onChange }: ListingPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Выберите файл изображения.");
      return;
    }
    setProcessing(true);
    try {
      onChange(await compressImageToDataUrl(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось обработать фото.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={styles.field}>
      <span className={styles.label}>Фото (покажется в поиске)</span>
      <div className={styles.previewBox}>
        {photo ? (
          <PhotoPlaceholder variant={photo} className={styles.preview} />
        ) : (
          <div className={`${styles.preview} ${styles.empty}`}>
            {processing ? <Loader2 size={22} className={styles.spinner} /> : <ImageOff size={22} strokeWidth={1.6} />}
          </div>
        )}
        <button
          type="button"
          className={styles.cameraBadge}
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          aria-label={photo ? "Заменить фото" : "Добавить фото"}
        >
          <Camera size={15} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.link} onClick={() => inputRef.current?.click()} disabled={processing}>
          {photo ? "Изменить фото" : "Добавить фото"}
        </button>
        {photo && (
          <button type="button" className={styles.linkDanger} onClick={() => onChange(null)} disabled={processing}>
            <X size={13} />
            Убрать
          </button>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
