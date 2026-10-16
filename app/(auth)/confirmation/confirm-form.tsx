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

export function ConfirmForm({
  tokenHash,
  type,
  label,
}: {
  tokenHash: string;
  type: string;
  label: string;
}) {
  return (
    <form action={confirmEmailLink} className="flex flex-col gap-3.5">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <Submit label={label} />
    </form>
  );
}
