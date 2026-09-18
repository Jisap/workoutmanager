// Skeleton instantáneo (streaming) mientras tipos, plantillas y recientes cargan.
export default function NewWorkoutLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl lg:max-w-4xl xl:max-w-5xl space-y-6 pb-24 animate-pulse" aria-hidden>
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-64 rounded bg-gray-100 dark:bg-gray-800/60" />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 space-y-3">
        <div className="h-5 w-64 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-80 max-w-full rounded bg-gray-100 dark:bg-gray-800/60" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 space-y-3">
        <div className="h-4 w-56 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
