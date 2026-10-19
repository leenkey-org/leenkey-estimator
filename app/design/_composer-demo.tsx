"use client";

import { useState } from "react";
import { Composer } from "@/components/shared/composer";
import { fr } from "@/lib/i18n/fr";
import { MESSAGE_MAX } from "@/lib/validations/messaging";

/** The message field of a conversation (L1-21), in the /design catalogue: it sends nowhere. */
export function ComposerDemo() {
  const [value, setValue] = useState("");
  return (
    <Composer
      value={value}
      onValueChange={setValue}
      onSend={() => setValue("")}
      sending={false}
      label={fr.messaging.composer.label}
      sendLabel={fr.messaging.composer.send}
      maxLength={MESSAGE_MAX}
      className="pb-2.5"
    />
  );
}
