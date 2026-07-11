import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Film, Home, ListFilter, Search, Star, Tv } from "lucide-react";
import {
  cleanAnimeSlug,
  getAnimeHome,
  getAnimeList,
  getAnimeOngoing,
  getAnimeSchedule,
  searchAnime,
  type AnimeItem,
  type AnimeListMap,
  type AnimeScheduleDay,
} from "@/lib/anime-api";
import { OptimizedImage } from "@/components/optimized-image";

export const dynamic = "force-dynamic";

type AnimeParams = { page?: string; q?: string; tab?: string; letter?: string; day?: string };
type AnimeTabKey = "latest" | "ongoing" | "schedule" | "list";

const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
const tabs: Array<{ key: AnimeTabKey; label: string }> = [
  { key: "latest", label: "Terbaru" },
  { key: "ongoing", label: "Ongoing" },
  { key: "schedule", label: "Jadwal" },
  { key: "list", label: "A-Z" },
];

export default async function AnimePage({ searchParams }: { searchParams: Promise<AnimeParams> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const query = (params.q ?? "").trim();
  const requestedTab = tabs.find((tab) => tab.key === params.tab)?.key;
  const activeTab: AnimeTabKey = query ? "latest" : requestedTab ?? "latest";
  const activeLetter = LETTERS.includes((params.letter || "A").toUpperCase()) ? (params.letter || "A").toUpperCase() : "A";
  const activeDay = params.day || "";
  const shouldLoadList = activeTab === "list";

  const [latest, ongoing, schedule, searchResults, animeList] = await Promise.all([
    getAnimeHome(page),
    getAnimeOngoing(),
    getAnimeSchedule(),
    query ? searchAnime(query, page) : Promise.resolve([]),
    shouldLoadList ? getAnimeList() : Promise.resolve({} as AnimeListMap),
  ]);

  const visibleSchedule = schedule.filter((day) => (day.animeList?.length ?? 0) > 0).slice(0, 7);
  const selectedSchedule = activeDay ? visibleSchedule.filter((day) => day.day === activeDay) : [];
  const listItems = animeList[activeLetter] ?? animeList[activeLetter.toLowerCase()] ?? [];
  const activeLabel = query ? "Hasil cari" : tabs.find((tab) => tab.key === activeTab)?.label ?? "Terbaru";
  const gridItems = query ? searchResults : activeTab === "ongoing" ? ongoing : activeTab === "list" ? listItems : latest;

  return (
    <main className="movies-page anime-clean-page">
      <div className="movies-topbar">
        <Link href="/" prefetch={false} aria-label="Kembali" className="movies-icon-btn">
          <ArrowLeft size={22} />
        </Link>
        <div className="movies-title-block">
          <div className="movies-kicker">AnimeBox</div>
          <h1>Anime</h1>
        </div>
        <Link href="/anime?tab=list" prefetch={false} aria-label="Daftar A-Z" className="movies-icon-btn">
          <ListFilter size={22} />
        </Link>
      </div>

      <nav className="movies-nav" aria-label="Navigasi koleksi">
        <Link href="/" prefetch={false} className="movies-nav-item">
          <Home size={17} /> <span>Home</span>
        </Link>
        <Link href="/movies" prefetch={false} className="movies-nav-item">
          <Film size={17} /> <span>Movies</span>
        </Link>
        <Link href="/anime" prefetch={false} aria-current="page" className="movies-nav-item active">
          <Tv size={17} /> <span>Anime</span>
        </Link>
      </nav>

      <form className="anime-clean-search" action="/anime">
        <Search size={18} />
        <input name="q" defaultValue={query} placeholder="Cari judul anime..." aria-label="Cari anime" />
        <button type="submit">Cari</button>
      </form>

      {!query ? (
        <div className="movies-chips" aria-label="Kategori anime">
          {tabs.map((tab) => {
            const href = tab.key === "latest" ? "/anime" : `/anime?tab=${tab.key}`;
            const isActive = tab.key === activeTab;
            return (
              <Link key={tab.key} href={href} prefetch={false} aria-current={isActive ? "page" : undefined} className={`movies-chip${isActive ? " active" : ""}`}>
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : null}

      {activeTab === "list" && !query ? (
        <div className="anime-clean-letterbar" aria-label="Filter huruf anime">
          {LETTERS.map((letter) => (
            <Link
              key={letter}
              href={`/anime?tab=list&letter=${encodeURIComponent(letter)}`}
              prefetch={false}
              className={`anime-clean-letter${activeLetter === letter ? " active" : ""}`}
            >
              {letter}
            </Link>
          ))}
        </div>
      ) : null}

      {activeTab === "schedule" && !query ? (
        <AnimeSchedule schedule={selectedSchedule} allDays={visibleSchedule} activeDay={activeDay} />
      ) : (
        <section className="movies-section" aria-labelledby="anime-heading">
          <div className="movies-section-head">
            <div>
              <p className="movies-eyebrow">Anime</p>
              <h2 id="anime-heading">{activeTab === "list" ? `Huruf ${activeLetter}` : activeLabel}</h2>
            </div>
            <span className="anime-clean-count">{gridItems.length} judul</span>
          </div>

          {gridItems.length ? (
            <div className="movies-grid">
              {gridItems.map((item, index) => <AnimeMovieCard key={`${item.id}-${item.url}-${index}`} item={item} priority={index < 6} />)}
            </div>
          ) : (
            <div className="movies-empty">
              <p>{query ? "Tidak ada hasil untuk kata kunci ini." : "Belum ada judul untuk filter ini."}</p>
              <Link href="/anime" prefetch={false} className="btn btn-sm">Kembali ke anime</Link>
            </div>
          )}

          {activeTab === "latest" ? (
            <div className="anime-clean-pagination">
              {page > 1 ? <Link href={`/anime?page=${page - 1}`} prefetch={false}><ChevronLeft size={16} /> Sebelumnya</Link> : <span />}
              <strong>Halaman {page}</strong>
              <Link href={`/anime?page=${page + 1}`} prefetch={false}>Berikutnya <ChevronRight size={16} /></Link>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}

function AnimeSchedule({ schedule, allDays, activeDay }: { schedule: AnimeScheduleDay[]; allDays: AnimeScheduleDay[]; activeDay: string }) {
  return (
    <section className="movies-section anime-clean-schedule" aria-labelledby="anime-schedule-heading">
      <div className="movies-section-head">
        <div>
          <p className="movies-eyebrow">Jadwal</p>
          <h2 id="anime-schedule-heading">Jadwal rilis</h2>
        </div>
      </div>

      <form className="anime-clean-dayselect" action="/anime">
        <input type="hidden" name="tab" value="schedule" />
        <CalendarDays size={18} />
        <select name="day" defaultValue={activeDay} aria-label="Pilih hari tayang">
          <option value="">Pilih hari</option>
          {allDays.map((day) => <option key={`${day.day}-${day.date}`} value={day.day}>{day.day} {day.date ? `(${day.date})` : ""}</option>)}
        </select>
        <button type="submit">Lihat</button>
      </form>

      {schedule.length ? (
        <div className="anime-clean-schedule-grid">
          {schedule.map((day) => (
            <article className="anime-clean-day" key={`${day.day}-${day.date}`}>
              <h3>{day.day} <span>{day.date}</span></h3>
              <div className="anime-clean-day-list">
                {(day.animeList ?? []).slice(0, 8).map((item) => (
                  <Link href={item.link ? `/anime/${cleanAnimeSlug(item.link)}` : "/anime"} className="anime-clean-day-item" key={`${item.id}-${item.link}`} prefetch={false}>
                    {item.cover ? <OptimizedImage src={item.cover} alt={item.anime_name || "Anime"} width={92} height={120} sizes="46px" quality={58} /> : <span><Tv size={16} /></span>}
                    <strong>{item.anime_name}</strong>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="movies-empty anime-clean-schedule-empty"><p>{activeDay ? "Jadwal belum tersedia untuk hari ini." : "Pilih hari dulu untuk menampilkan jadwal anime."}</p></div>
      )}
    </section>
  );
}

function AnimeMovieCard({ item, priority = false }: { item: AnimeItem; priority?: boolean }) {
  const slug = cleanAnimeSlug(item.url);
  const meta = item.status || item.lastch || item.lastup || item.type || "Anime";

  return (
    <Link href={slug ? `/anime/${slug}` : "/anime"} prefetch={false} className="movies-card anime-clean-card">
      <div className="anime-clean-poster">
        {item.cover ? (
          <img
            src={item.cover}
            alt={item.judul || "Anime"}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="movies-placeholder"><Tv size={24} /></div>
        )}
      </div>
      <div className="movies-overlay" />
      <span className="movies-badge movies-badge-type">{item.type || "Anime"}</span>
      {item.score ? (
        <span className="movies-badge movies-badge-rating">
          <Star size={12} fill="currentColor" />
          {item.score}
        </span>
      ) : null}
      <div className="movies-copy">
        <h3>{item.judul}</h3>
        <p>{meta}{item.total_episode ? ` - ${item.total_episode} eps` : ""}</p>
      </div>
    </Link>
  );
}
