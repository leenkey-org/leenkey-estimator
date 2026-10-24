// Notifications (L1-22, SPEC-V2 section 10), generic: a recipient, a type, the
// facts of the event and where it leads. Their wording is the business of
// the application (leenkey/notifications/catalog.ts).

export type NotificationData = Record<string, unknown>;

export type NotificationView = {
  id: string;
  type: string;
  /** Wording written when the row was created; null: written from type and data. */
  title: string | null;
  body: string | null;
  data: NotificationData;
  link: string | null;
  createdAt: string;
  readAt: string | null;
};

/** A row of public.notifications, as PostgREST and Realtime give it. */
export type NotificationRow = {
  id: string;
  profile_id: string;
  type: string;
  title: string | null;
  body: string | null;
  data: unknown;
  link: string | null;
  created_at: string;
  read_at: string | null;
};

/** The columns read for the bell and its panel. */
export const NOTIFICATION_COLUMNS =
  "id, profile_id, type, title, body, data, link, created_at, read_at";

/** Facts of an event: an object, whatever came from the database. */
export function notificationData(value: unknown): NotificationData {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as NotificationData)
    : {};
}

export function toNotificationView(row: NotificationRow): NotificationView {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: notificationData(row.data),
    link: row.link,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

/** What the bell of an account shows: its unread count and its last notifications. */
export type NotificationsSnapshot = {
  profileId: string;
  unread: number;
  items: NotificationView[];
};
