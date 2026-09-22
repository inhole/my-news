export function HomeLoading() {
  return (
    <div className="home-overview-stack">
      <div className="home-hero-skeleton animate-pulse" />
      <div className="home-brief-grid">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="home-brief-card animate-pulse">
            <div className="h-3 w-16 rounded-full bg-[var(--primary-weak)]" />
            <div className="mt-4 h-6 w-24 rounded-full bg-[var(--primary-weak)]" />
            <div className="mt-3 h-4 w-full rounded-full bg-[var(--surface-strong)]" />
            <div className="mt-2 h-4 w-3/4 rounded-full bg-[var(--surface-strong)]" />
          </div>
        ))}
      </div>
      <div className="home-section-surface animate-pulse">
        {[...Array(4)].map((_, index) => (
          <div key={index} className={`editorial-list-row ${index < 3 ? 'border-b border-[var(--line)]' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="h-3 w-20 rounded-full bg-[var(--primary-weak)]" />
              <div className="mt-3 h-5 w-full rounded-full bg-[var(--surface-strong)]" />
              <div className="mt-2 h-5 w-4/5 rounded-full bg-[var(--surface-strong)]" />
            </div>
            <div className="h-24 w-24 rounded-[24px] bg-[var(--surface-strong)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
