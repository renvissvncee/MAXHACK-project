import { Camera, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import Avatar from "../../../components/Avatar/Avatar";
import { useUser } from "../../../context/UserContext";
import styles from "./PhotoPicker.module.css";

interface PhotoPickerProps {
  photo: string | null;
  name: string;
  onChange: (photo: string | null) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function PhotoPicker({ photo, name, onChange }: PhotoPickerProps) {
  const { uploadProfilePhoto } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Выберите файл изображения");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Файл слишком большой (максимум 5 МБ)");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProfilePhoto(file);
      onChange(url);
    } catch {
      setError("Не удалось загрузить фото, попробуйте ещё раз");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.avatarBox}>
        <Avatar photo={photo} name={name || "?"} size={96} />
        {uploading && (
          <div className={styles.uploadingOverlay}>
            <Loader2 size={22} className={styles.spinner} />
          </div>
        )}
        <button
          type="button"
          className={styles.cameraBadge}
          onClick={() => inputRef.current?.click()}
          aria-label={photo ? "Изменить фото" : "Добавить фото"}
          disabled={uploading}
        >
          <Camera size={16} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) handleFile(file);
          }}
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.link} onClick={() => inputRef.current?.click()} disabled={uploading}>
          {photo ? "Изменить фото" : "Добавить фото"}
        </button>
        {photo && (
          <button type="button" className={styles.linkDanger} onClick={() => onChange(null)} disabled={uploading}>
            <X size={13} />
            Удалить
          </button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
