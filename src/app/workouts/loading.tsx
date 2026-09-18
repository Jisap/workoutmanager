// Skeleton instantáneo (streaming) mientras el historial y las plantillas cargan.
export default function WorkoutsLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-pulse" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-48 rounded bg-gray-100 dark:bg-gray-800/60" />
        </div>
        <div className="h-9 w-24 rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>

      <div className="flex gap-2">
        <div className="h-9 w-28 rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-9 w-32 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-5 w-16 rounded bg-gray-100 dark:bg-gray-800/60" />
            </div>
            <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-800/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
