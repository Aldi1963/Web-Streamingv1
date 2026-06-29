"use client";

import { useRef } from "react";

type Option = { value: string; label: string };

export function PopularFilters({
  provider,
  language,
  genre,
  status,
  duration,
  providers,
  languages,
  genres,
}: {
  provider: string;
  language: string;
  genre: string;
  status: string;
  duration: string;
  providers: Option[];
  languages: Option[];
  genres: Option[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const submit = () => form.current?.requestSubmit();

  return (
    <form className="filter-bar" action="/popular" ref={form}>
      <select name="provider" defaultValue={provider} onChange={submit} aria-label="Platform">
        <option value="">Semua platform</option>
        {providers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <select name="language" defaultValue={language} onChange={submit} aria-label="Negara atau bahasa">
        <option value="">Semua negara</option>
        {languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <select name="genre" defaultValue={genre} onChange={submit} aria-label="Genre">
        <option value="">Semua genre</option>
        {genres.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <select name="status" defaultValue={status} onChange={submit} aria-label="Status">
        <option value="">Semua status</option>
        <option value="completed">Tamat</option>
        <option value="ongoing">Berjalan</option>
      </select>
      <select name="duration" defaultValue={duration} onChange={submit} aria-label="Durasi">
        <option value="">Semua durasi</option>
        <option value="short">&lt; 10 menit</option>
        <option value="medium">10–30 menit</option>
        <option value="long">&gt; 30 menit</option>
      </select>
    </form>
  );
}
