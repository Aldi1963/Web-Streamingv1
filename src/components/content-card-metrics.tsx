import { Eye, ListVideo, Star } from "lucide-react";

function compact(value: number) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.max(0, value));
}

export function ContentCardMetrics({
  views,
  rating,
  episodes,
}: {
  views?: number | null;
  rating?: number | null;
  episodes?: number | null;
}) {
  const normalizedRating = typeof rating === "number" && Number.isFinite(rating) ? rating : 0;
  return <div className="card-stats" aria-label="Statistik konten">
    <span title={`${views ?? 0} kali ditonton`}><Eye size={12} />{compact(views ?? 0)}</span>
    <span title={`Rating ${normalizedRating}`}><Star size={12} />{normalizedRating ? normalizedRating.toFixed(1).replace(".0", "") : "0"}</span>
    <span title={`${episodes ?? 0} episode`}><ListVideo size={12} />{episodes ?? 0}</span>
  </div>;
}
