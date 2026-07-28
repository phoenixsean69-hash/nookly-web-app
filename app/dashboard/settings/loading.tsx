export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="ml-0 min-h-screen transition-all duration-300 md:ml-64">
        <main className="p-3 pb-12 sm:p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6">
              <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>

            <div className="flex flex-col gap-6 md:flex-row">
              <div className="h-64 w-full animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800 md:w-64" />

              <div className="min-h-[420px] flex-1 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}