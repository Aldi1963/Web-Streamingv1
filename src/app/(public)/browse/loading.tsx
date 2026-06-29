export default function BrowseLoading() {
  return (
    <div className="shell">
      <div className="skeleton" style={{height:32,width:180,marginBottom:28}} />
      <div className="grid">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton skeleton-poster" />
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-meta" />
          </div>
        ))}
      </div>
    </div>
  );
}
