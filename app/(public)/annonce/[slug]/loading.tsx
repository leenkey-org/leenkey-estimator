import { FacadeRoot } from "@/components/shared/facade-root";
import { Skeleton } from "@/components/shared/skeleton";

// Listing being read (docs/DESIGN.md 10.8): its shape in stone blocks.
export default function Loading() {
  return (
    <FacadeRoot className="min-h-screen bg-lk-surface" aria-busy="true">
      <div className="mx-auto max-w-lk-page lg:px-10">
        <Skeleton className="hidden h-5 w-80 lg:mt-5 lg:block" />
        <Skeleton className="h-70 rounded-none lg:mt-4 lg:h-77.5 lg:rounded-lk-md" />
        <div className="flex flex-col gap-3.5 px-5 pt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:px-0 lg:pt-6">
          <div className="flex flex-col gap-3.5">
            <Skeleton className="h-7 w-44 lg:hidden" />
            <Skeleton className="h-5 w-3/4 lg:h-8" />
            <Skeleton className="h-4 w-1/2" />
            <div className="grid grid-cols-4 gap-2 lg:grid-cols-6 lg:gap-2.5">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton
                  key={index}
                  className={index >= 4 ? "hidden h-16 lg:block" : "h-14 lg:h-16"}
                />
              ))}
            </div>
            <Skeleton className="h-36" />
          </div>
          <Skeleton className="hidden h-80 rounded-lk-md lg:block" />
        </div>
      </div>
    </FacadeRoot>
  );
}
