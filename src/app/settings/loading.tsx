// Skeleton instantáneo (streaming) mientras perfil y catálogos cargan.
export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="space-y-2">
        <div className="h-7 w-44 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-72 max-w-full rounded bg-gray-100 dark:bg-gray-800/60" />
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800/60" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="h-5 w-52 rounded bg-gray-200 dark:bg-gray-800" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-11 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
        ))}
      </div>
    </div>
  );
}
