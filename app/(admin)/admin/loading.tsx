import { Skeleton } from "@/components/shared/skeleton";
import { fr } from "@/lib/i18n/fr";

// While a page of the back office loads (DESIGN.md 13.2, rule 5): its title,
// a row of tiles and a list, in Skeleton, under the shell that stays (sidebar,
// mobile header). Announced once to screen readers; never a spinner.
export default function AdminLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        {fr.spaces.admin.loading}
      </p>
      <Skeleton className="hidden h-9 w-64 rounded-lk-md md:block" />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-lk-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lk-md" />
    </div>
  );
}
