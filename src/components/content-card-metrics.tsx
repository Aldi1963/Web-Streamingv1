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
  return <div className="card-stats" aria-label="Statistik konten">
    <span title={`${views ?? 0} kali ditonton`}><Eye size={12} />{compact(views ?? 0)}</span>
    <span title={`Rating ${rating ?? 0}`}><Star size={12} />{rating ? rating.toFixed(1).replace(".0", "") : "—"}</span>
    <span title={`${episodes ?? 0} episode`}><ListVideo size={12} />{episodes ?? 0}</span>
  </div>;
}
