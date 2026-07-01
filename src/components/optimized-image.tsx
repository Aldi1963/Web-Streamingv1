type OptimizedImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
  quality?: number;
};

const DEFAULT_WIDTHS = [240, 360, 480, 720, 960];

function cdnUrl(src: string, width: number, quality: number, output: "avif" | "webp") {
  if (!/^https?:\/\//i.test(src)) return src;
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality),
    output,
    fit: "cover",
  });
  return `https://wsrv.nl/?${params}`;
}

export function OptimizedImage({
  src,
  alt,
  width = 480,
  height = 720,
  sizes = "(max-width: 480px) 33vw, (max-width: 900px) 25vw, 220px",
  className,
  priority = false,
  quality = 74,
}: OptimizedImageProps) {
  const widths = DEFAULT_WIDTHS.filter(value => value <= Math.max(width * 2, 480));
  if (!widths.includes(width)) widths.push(width);
  widths.sort((a, b) => a - b);
  const srcSet = (output: "avif" | "webp") =>
    widths.map(value => `${cdnUrl(src, value, quality, output)} ${value}w`).join(", ");

  return <picture className="optimized-picture">
    {/^https?:\/\//i.test(src) && <source type="image/webp" srcSet={srcSet("webp")} sizes={sizes} />}
    <img
      src={cdnUrl(src, width, quality, "webp")}
      srcSet={/^https?:\/\//i.test(src) ? srcSet("webp") : undefined}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
      decoding="async"
      className={className}
    />
  </picture>;
}
