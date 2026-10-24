import { notificationData, type NotificationData } from "./types";

// Grouping of the notification emails (L1-22, SPEC-V2 section 10), pure: from
// the queue of the emails due (public.notification_email_queue), what leaves
// now, in one email per group, what waits for the end of the throttle of its
// group, and what never leaves. Generic: the policy of each type comes from
// the application (leenkey/notifications/email-catalog.ts).

/** A row of the queue, as the cron reads it. */
export type QueuedNotification = {
  id: string;
  profileId: string;
  type: string;
  data: NotificationData;
  link: string | null;
  groupKey: string | null;
  createdAt: Date;
  emailAfter: Date;
  readAt: Date | null;
  email: string | null;
  firstName: string | null;
  prefs: Record<string, unknown>;
  active: boolean;
  groupLastSentAt: Date | null;
};

export type EmailPolicy = {
  /** recipient: to the account; team: one email to the team (ADMIN_NOTIFICATION_EMAIL). */
  audience: "recipient" | "team";
  /** Key of profiles.notification_prefs that can turn it off; none: always sent. */
  preference?: string;
  /** At most one email per group in this time; the rows that come meanwhile wait and go together. */
  throttleMinutes: number;
};

export type SkipReason = "no_email" | "inactive" | "no_address" | "read" | "disabled" | "stale";

export type PlannedEmail = {
  audience: EmailPolicy["audience"];
  type: string;
  groupKey: string | null;
  /** The recipient (audience recipient); null for the team. */
  profileId: string | null;
  email: string | null;
  firstName: string | null;
  /** What the email speaks of, the oldest first (one per event for the team). */
  items: QueuedNotification[];
  /** Every row it covers (for the team, the rows of each of its members). */
  ids: string[];
};

export type EmailPlan = {
  emails: PlannedEmail[];
  skipped: { id: string; reason: SkipReason }[];
  postponed: { ids: string[]; until: Date }[];
};

/** The email of an event older than a day (the cron stopped, Resend refused) never leaves. */
export const MAX_AGE_HOURS = 24;

const MINUTE = 60_000;

function skipReason(
  row: QueuedNotification,
  policy: EmailPolicy | null,
  now: Date,
): SkipReason | null {
  if (!policy) return "no_email";
  if (now.getTime() - row.createdAt.getTime() > MAX_AGE_HOURS * 60 * MINUTE) return "stale";
  if (row.readAt) return "read";
  if (policy.audience === "recipient") {
    if (!row.active) return "inactive";
    if (policy.preference && row.prefs[policy.preference] === false) return "disabled";
    if (!row.email) return "no_address";
  }
  return null;
}

/** The event a team row speaks of: each member of the team has a row for it. */
function entityOf(row: QueuedNotification): string {
  const entity = row.data.entity_id;
  return typeof entity === "string" && entity ? entity : row.id;
}

export function planEmails(
  rows: readonly QueuedNotification[],
  policyOf: (type: string) => EmailPolicy | null,
  now: Date,
): EmailPlan {
  const plan: EmailPlan = { emails: [], skipped: [], postponed: [] };
  const groups = new Map<string, { policy: EmailPolicy; rows: QueuedNotification[] }>();

  // A team event read by one of its members is dealt with: none of its rows leave.
  const readTeamEvents = new Set(
    rows
      .filter((row) => row.readAt && policyOf(row.type)?.audience === "team")
      .map((row) => `${row.type}|${entityOf(row)}`),
  );

  for (const row of rows) {
    const policy = policyOf(row.type);
    const reason =
      skipReason(row, policy, now) ??
      (policy?.audience === "team" && readTeamEvents.has(`${row.type}|${entityOf(row)}`)
        ? "read"
        : null);
    if (reason || !policy) {
      plan.skipped.push({ id: row.id, reason: reason ?? "no_email" });
      continue;
    }
    const group = row.groupKey ?? row.id;
    const key =
      policy.audience === "team" ? `team|${row.type}|${group}` : `${row.profileId}|${group}`;
    const entry = groups.get(key) ?? { policy, rows: [] };
    entry.rows.push(row);
    groups.set(key, entry);
  }

  for (const { policy, rows: groupRows } of groups.values()) {
    const ids = groupRows.map((row) => row.id);
    const lastSent = groupRows.reduce<number | null>((latest, row) => {
      const sent = row.groupLastSentAt?.getTime() ?? null;
      return sent !== null && (latest === null || sent > latest) ? sent : latest;
    }, null);
    if (lastSent !== null && now.getTime() < lastSent + policy.throttleMinutes * MINUTE) {
      plan.postponed.push({ ids, until: new Date(lastSent + policy.throttleMinutes * MINUTE) });
      continue;
    }
    const sorted = [...groupRows].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
    );
    const first = sorted[0];
    if (policy.audience === "team") {
      const seen = new Set<string>();
      const items = sorted.filter((row) => {
        const entity = entityOf(row);
        if (seen.has(entity)) return false;
        seen.add(entity);
        return true;
      });
      plan.emails.push({
        audience: "team",
        type: first.type,
        groupKey: first.groupKey,
        profileId: null,
        email: null,
        firstName: null,
        items,
        ids,
      });
    } else {
      plan.emails.push({
        audience: "recipient",
        type: first.type,
        groupKey: first.groupKey,
        profileId: first.profileId,
        email: first.email,
        firstName: first.firstName,
        items: sorted,
        ids,
      });
    }
  }
  return plan;
}

/** A row of public.notification_email_queue, as PostgREST gives it. */
export type QueueRow = {
  id: string;
  profile_id: string;
  type: string;
  data: unknown;
  link: string | null;
  group_key: string | null;
  created_at: string;
  email_after: string;
  read_at: string | null;
  email: string | null;
  first_name: string | null;
  prefs: unknown;
  active: boolean;
  group_last_sent_at: string | null;
};

export function toQueuedNotification(row: QueueRow): QueuedNotification {
  return {
    id: row.id,
    profileId: row.profile_id,
    type: row.type,
    data: notificationData(row.data),
    link: row.link,
    groupKey: row.group_key,
    createdAt: new Date(row.created_at),
    emailAfter: new Date(row.email_after),
    readAt: row.read_at ? new Date(row.read_at) : null,
    email: row.email,
    firstName: row.first_name,
    prefs: notificationData(row.prefs),
    active: row.active,
    groupLastSentAt: row.group_last_sent_at ? new Date(row.group_last_sent_at) : null,
  };
}
