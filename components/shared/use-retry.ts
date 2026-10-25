"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * « Réessayer » of an error page: the page read again from the server
 * (router.refresh) with the boundary reset, together. reset() alone shows the
 * error kept in the payload of a Server Component again, without any request.
 */
export function useRetry(reset: () => void) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return {
    pending,
    retry: () =>
      startTransition(() => {
        router.refresh();
        reset();
      }),
  };
}
