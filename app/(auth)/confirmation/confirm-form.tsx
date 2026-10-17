"use client";

import { useFormStatus } from "react-dom";
import { confirmEmailLink } from "@/leenkey/auth/actions";
import { Button } from "@/components/shared/button";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full">
      {label}
    </Button>
  );
}

/** The token is in an httpOnly cookie: the form only says « go ». */
export function ConfirmForm({ label }: { label: string }) {
  return (
    <form action={confirmEmailLink} className="flex flex-col gap-3.5">
      <Submit label={label} />
    </form>
  );
}
