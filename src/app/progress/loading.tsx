// Skeleton instantáneo (streaming) mientras la analítica se calcula en el servidor.
export default function ProgressLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 animate-pulse" aria-hidden>
      <div className="space-y-2 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="h-7 w-56 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-80 max-w-full rounded bg-gray-100 dark:bg-gray-800/60" />
      </div>

      <div className="flex gap-1.5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-28 shrink-0 rounded-xl bg-gray-200 first:bg-gray-200 dark:bg-gray-800 dark:first:bg-gray-800" />
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40" />
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="h-44 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40" />
        ))}
      </div>
    </div>
  );
}
