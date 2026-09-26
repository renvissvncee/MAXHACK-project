import { SlidersHorizontal, Search as SearchIcon, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../../components/Avatar/Avatar";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import ListingCard from "../../components/ListingCard/ListingCard";
import SkeletonCard from "../../components/SkeletonCard/SkeletonCard";
import FilterSheet from "../../components/FilterSheet/FilterSheet";
import Tag from "../../components/Tag/Tag";
import { quickCities } from "../../data/cities";
import { useUser } from "../../context/UserContext";
import { getListings } from "../../services/listingsService";
import { defaultSearchState, type SearchFormState } from "../../types/filters";
import type { Listing } from "../../types/listing";
import styles from "./Home.module.css";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFormState>(defaultSearchState);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [cityInput, setCityInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    getListings().then((data) => {
      if (!cancelled) {
        setListings(data);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const goSearch = (city: string) => {
    const params = new URLSearchParams();
    params.set("city", city);
    if (filters.guests > 1) params.set("guests", String(filters.guests));
    if (filters.verifiedOnly) params.set("verifiedOnly", "1");
    if (filters.accommodationType !== "any") params.set("type", filters.accommodationType);
    navigate(`/search?${params.toString()}`);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const city = cityInput.trim();
    if (city) goSearch(city);
  };

  const activeFilterCount =
    (filters.guests > 1 ? 1 : 0) + (filters.verifiedOnly ? 1 : 0) + (filters.accommodationType !== "any" ? 1 : 0);

  if (!user) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.profileLink} onClick={() => navigate("/profile")}>
          <Avatar photo={user.photo} name={user.name} size={42} />
          <div>
            <p className={styles.greeting}>Привет, {user.name.split(" ")[0] || "путешественник"} 👋</p>
            <p className={styles.location}>Ваш город: {user.city}</p>
          </div>
        </button>
        <ThemeToggle />
      </header>

      <section className={styles.searchSection}>
        <form className={styles.searchBar} onSubmit={handleSubmit}>
          <SearchIcon size={18} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="В какой город едете?"
            value={cityInput}
            onChange={(event) => setCityInput(event.target.value)}
          />
          <button type="submit" className={styles.searchSubmit} aria-label="Искать">
            Найти
          </button>
        </form>

        <div className={styles.quickCities}>
          {quickCities.map((city) => (
            <Tag key={city} onClick={() => goSearch(city)}>
              {city}
            </Tag>
          ))}
        </div>

        <button type="button" className={styles.filtersButton} onClick={() => setFilterSheetOpen(true)}>
          <SlidersHorizontal size={16} />
          Фильтры
          {activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
        </button>
      </section>

      <div className={styles.trustBanner}>
        <ShieldCheck size={16} />
        <span>Все варианты проверены и доступны только верифицированным пользователям</span>
      </div>

      <section className={styles.listSection}>
        <h2 className={styles.sectionTitle}>Варианты рядом</h2>
        <div className={styles.cardsGrid}>
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
            : listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      </section>

      <FilterSheet
        open={filterSheetOpen}
        value={filters}
        onChange={setFilters}
        onClose={() => setFilterSheetOpen(false)}
        onApply={() => {
          if (cityInput.trim()) goSearch(cityInput.trim());
        }}
      />
    </div>
  );
}
