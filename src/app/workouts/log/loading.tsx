// Skeleton instantáneo (streaming) mientras el logger carga catálogo y estado inicial.
export default function WorkoutLogLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl lg:max-w-4xl space-y-6 pb-24 animate-pulse" aria-hidden>
      <div className="space-y-2">
        <div className="h-8 w-2/3 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-1/2 rounded bg-gray-100 dark:bg-gray-800/60" />
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
          <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
        </div>
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800/60" />
          </div>
          <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
          <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
        </div>
      ))}

      <div className="h-12 rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}
