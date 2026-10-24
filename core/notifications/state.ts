import { toNotificationView, type NotificationRow, type NotificationView } from "./types";

// The list of the bell and its unread count (L1-22), pure: what a change of
// the table, a notification read or « Tout marquer comme lu » make of them
// (core/notifications/store.ts).

export type NotificationsStatus = "idle" | "loading" | "ready" | "error";

export type NotificationsState = {
  profileId: string | null;
  status: NotificationsStatus;
  unread: number;
  /** The latest first. */
  items: NotificationView[];
};

export type NotificationChange = { event: "INSERT" | "UPDATE"; row: NotificationRow };

/** What the panel keeps (PANEL_LIMIT of core/notifications/queries.ts). */
export const LIST_LIMIT = 50;

export const EMPTY_NOTIFICATIONS: NotificationsState = {
  profileId: null,
  status: "idle",
  unread: 0,
  items: [],
};

function newestFirst(a: NotificationView, b: NotificationView) {
  return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
}

/**
 * A row created or changed for the account. null: the list cannot tell (a
 * change of a notification older than the list): it is read again.
 */
export function applyNotificationChange(
  state: NotificationsState,
  { event, row }: NotificationChange,
): NotificationsState | null {
  if (row.profile_id !== state.profileId) return state;
  const view = toNotificationView(row);
  const index = state.items.findIndex((item) => item.id === view.id);
  if (event === "INSERT") {
    if (index >= 0) return state;
    return {
      ...state,
      items: [view, ...state.items].sort(newestFirst).slice(0, LIST_LIMIT),
      unread: state.unread + (view.readAt ? 0 : 1),
    };
  }
  if (index < 0) return null;
  const before = state.items[index];
  const items = state.items.slice();
  items[index] = view;
  const change = (before.readAt && !view.readAt ? 1 : 0) - (!before.readAt && view.readAt ? 1 : 0);
  return { ...state, items, unread: Math.max(0, state.unread + change) };
}

/** One notification read; the same state when it already was. */
export function withRead(state: NotificationsState, id: string, at: string): NotificationsState {
  const index = state.items.findIndex((item) => item.id === id);
  if (index < 0 || state.items[index].readAt) return state;
  const items = state.items.slice();
  items[index] = { ...items[index], readAt: at };
  return { ...state, items, unread: Math.max(0, state.unread - 1) };
}

/** « Tout marquer comme lu ». */
export function withAllRead(state: NotificationsState, at: string): NotificationsState {
  return {
    ...state,
    unread: 0,
    items: state.items.map((item) => (item.readAt ? item : { ...item, readAt: at })),
  };
}
