// Skeleton instantáneo (streaming) mientras el dashboard carga en el servidor.
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-64 rounded bg-gray-100 dark:bg-gray-800/60" />
        </div>
        <div className="h-9 w-44 rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-7 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800/60" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-800" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
        ))}
      </div>
    </div>
  );
}
