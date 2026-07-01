/** Скелетоны-заглушки на время загрузки — премиальнее и «быстрее» спиннера. */

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 pt-1">
      <div className="card p-5">
        <div className="skel h-3 w-28 mb-3" />
        <div className="skel h-10 w-48 mb-4" />
        <div className="skel h-3 w-24 mb-2" />
        <div className="skel h-6 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="skel h-3 w-20 mb-3" />
            <div className="skel h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-3">
            <div className="skel h-4 w-4 mb-2" />
            <div className="skel h-3 w-12 mb-2" />
            <div className="skel h-5 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 pt-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-3">
          <div className="skel w-14 h-14 shrink-0" style={{ borderRadius: 14 }} />
          <div className="flex-1">
            <div className="skel h-3 w-24 mb-2" />
            <div className="skel h-5 w-40 mb-3" />
            <div className="skel h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
