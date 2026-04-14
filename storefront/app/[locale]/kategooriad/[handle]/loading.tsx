export default function Loading() {
  return (
    <div className="bg-white">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-7 sm:py-10 animate-pulse">
        <div className="h-4 bg-[#F1F5F9] rounded w-48 mb-4" />
        <div className="h-9 bg-[#F1F5F9] rounded w-64 mb-6" />
        <div className="flex gap-8">
          <div className="hidden md:block w-[240px] shrink-0">
            <div className="h-48 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]" />
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <div className="aspect-square bg-[#F1F5F9]" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-[#F1F5F9] rounded w-full" />
                  <div className="h-3 bg-[#F1F5F9] rounded w-3/4" />
                  <div className="h-4 bg-[#F1F5F9] rounded w-1/3 mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
