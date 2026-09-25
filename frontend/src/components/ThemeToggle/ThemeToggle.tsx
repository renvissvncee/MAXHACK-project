import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import IconButton from "../IconButton/IconButton";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <IconButton onClick={toggleTheme} aria-label="Переключить тему">
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </IconButton>
  );
}
