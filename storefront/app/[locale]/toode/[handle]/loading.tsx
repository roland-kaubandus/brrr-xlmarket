export default function Loading() {
  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-pulse">
      <div className="h-4 bg-[#F1F5F9] rounded w-48 mb-5" />
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 lg:gap-10">
        <div className="aspect-square bg-[#F1F5F9] rounded-xl" />
        <div className="space-y-4">
          <div className="h-6 bg-[#F1F5F9] rounded w-full" />
          <div className="h-6 bg-[#F1F5F9] rounded w-3/4" />
          <div className="h-4 bg-[#F1F5F9] rounded w-24 mt-2" />
          <div className="h-10 bg-[#F1F5F9] rounded w-32 mt-4" />
          <div className="h-12 bg-[#F1F5F9] rounded-xl w-full mt-6" />
        </div>
      </div>
    </div>
  )
}
