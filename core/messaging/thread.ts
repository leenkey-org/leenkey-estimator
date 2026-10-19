import { capitalize, formatDate } from "@/lib/format";
import type { ThreadMessage } from "./types";

export type ThreadItem =
  | { kind: "date"; key: string; label: string }
  | { kind: "message"; key: string; message: ThreadMessage };

/**
 * The messages of a thread with the day before the first message of each day,
 * in Paris (« Mardi 22 septembre », the year when it is not the current one).
 */
export function threadItems(messages: readonly ThreadMessage[], now: Date | string): ThreadItem[] {
  const items: ThreadItem[] = [];
  let day: string | null = null;
  for (const message of messages) {
    const label = capitalize(formatDate(message.createdAt, now));
    if (label !== day) {
      day = label;
      items.push({ kind: "date", key: `date-${message.id}`, label });
    }
    items.push({ kind: "message", key: message.id, message });
  }
  return items;
}
