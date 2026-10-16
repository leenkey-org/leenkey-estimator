import { FacadeRoot } from "@/components/shared/facade-root";
import { Skeleton } from "@/components/shared/skeleton";
import { fr } from "@/lib/i18n/fr";

// First display of /acheter (docs/DESIGN.md 10.8): the shape of the page in
// stone blocks, never a spinner. Later changes keep the results, dimmed.
export default function Loading() {
  return (
    <FacadeRoot className="min-h-screen bg-lk-surface" aria-busy="true">
      <div className="border-b border-lk-line px-5 pb-3 pt-4.5 lg:px-10 lg:py-4">
        <div className="flex gap-2.5 lg:gap-3">
          <Skeleton className="h-12 flex-1 lg:h-11 lg:w-75 lg:flex-none" />
          <Skeleton className="size-12 lg:hidden" />
          <Skeleton className="hidden h-11 w-130 lg:block" />
        </div>
        <div className="mt-3 flex gap-2 lg:hidden">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <main className="mx-auto max-w-lk-page px-5 pt-3.5 md:px-10 lg:pt-5">
        <h1 className="sr-only">{fr.search.pageTitle}</h1>
        <Skeleton className="mb-3 h-5 w-40" />
        <div className="grid gap-3 md:grid-cols-2 lg:gap-3.5">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-29 rounded-lk-md lg:h-41" />
          ))}
        </div>
      </main>
    </FacadeRoot>
  );
}
