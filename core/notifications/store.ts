"use client";

import { useEffect, useSyncExternalStore } from "react";
import { loadNotifications, markAllNotificationsRead, markNotificationRead } from "./actions";
import {
  applyNotificationChange,
  EMPTY_NOTIFICATIONS,
  withAllRead,
  withRead,
  type NotificationChange,
  type NotificationsState,
} from "./state";

// The notifications of the signed-in account, for every bell of the page
// (L1-22): one list in the browser, kept across client navigations, read
// when the first bell shows, then followed through Realtime (loaded then, not
// before). A bell names the account it was rendered for: the list of another
// account (signed out, then in again in this tab) is never shown.

/** The last bell gone, the subscription waits this long for the one of the next page. */
const LINGER_MS = 10_000;
/** Changes close together: one reading. */
const RELOAD_MS = 400;

let state = EMPTY_NOTIFICATIONS;
const listeners = new Set<() => void>();
let holders = 0;
let linger: number | null = null;
let reload: number | null = null;
let watching: { profileId: string; end: () => void } | null = null;
let ticket = 0;

function set(next: NotificationsState) {
  if (next === state) return;
  state = next;
  for (const listener of listeners) listener();
}

function listen(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function load(profileId: string) {
  const mine = ++ticket;
  if (state.profileId !== profileId) {
    set({ ...EMPTY_NOTIFICATIONS, profileId, status: "loading" });
  } else if (state.status !== "ready") {
    set({ ...state, status: "loading" });
  }
  const result = await loadNotifications().catch(() => null);
  if (mine !== ticket || state.profileId !== profileId) return;
  if (result?.ok && result.data?.profileId === profileId) {
    set({ profileId, status: "ready", unread: result.data.unread, items: result.data.items });
  } else if (state.status !== "ready") {
    // Signed out meanwhile, another account in this browser, or the server unreachable.
    set({ ...state, status: "error" });
  }
}

function reloadSoon() {
  if (reload !== null) window.clearTimeout(reload);
  reload = window.setTimeout(() => {
    reload = null;
    if (state.profileId) void load(state.profileId);
  }, RELOAD_MS);
}

function onChange(change: NotificationChange) {
  // Before the first reading, the reading to come has it.
  if (state.status === "loading") return reloadSoon();
  const next = applyNotificationChange(state, change);
  if (next) set(next);
  else reloadSoon();
}

function watch(profileId: string) {
  if (watching?.profileId === profileId) return;
  watching?.end();
  let ended = false;
  let end: (() => void) | null = null;
  watching = {
    profileId,
    end: () => {
      ended = true;
      end?.();
    },
  };
  void import("./realtime")
    .then(({ watchNotifications }) => {
      if (!ended) end = watchNotifications(profileId, onChange, reloadSoon);
    })
    .catch(() => {});
}

function hold(profileId: string): () => void {
  holders += 1;
  if (linger !== null) {
    window.clearTimeout(linger);
    linger = null;
  }
  watch(profileId);
  if (state.profileId !== profileId || state.status === "idle" || state.status === "error") {
    void load(profileId);
  }
  return () => {
    holders -= 1;
    if (holders > 0) return;
    linger = window.setTimeout(() => {
      linger = null;
      watching?.end();
      watching = null;
      // Nothing followed from now on: read again by the next bell, the list shown meanwhile.
      if (state.status === "ready") set({ ...state, status: "idle" });
    }, LINGER_MS);
  };
}

async function markRead(id: string) {
  const next = withRead(state, id, new Date().toISOString());
  if (next === state) return;
  set(next);
  const result = await markNotificationRead(id).catch(() => null);
  if (!result?.ok && state.profileId) void load(state.profileId);
}

async function markAllRead() {
  set(withAllRead(state, new Date().toISOString()));
  const result = await markAllNotificationsRead().catch(() => null);
  if (!result?.ok && state.profileId) void load(state.profileId);
}

export type Notifications = NotificationsState & {
  markRead: (id: string) => void;
  markAllRead: () => void;
  retry: () => void;
};

/** The notifications of the account the bell was rendered for; nothing for another one. */
export function useNotifications(profileId: string | null): Notifications {
  const current = useSyncExternalStore(
    listen,
    () => state,
    () => EMPTY_NOTIFICATIONS,
  );
  useEffect(() => (profileId ? hold(profileId) : undefined), [profileId]);
  const own = profileId !== null && current.profileId === profileId ? current : EMPTY_NOTIFICATIONS;
  return {
    ...own,
    markRead: (id) => void markRead(id),
    markAllRead: () => void markAllRead(),
    retry: () => {
      if (profileId) void load(profileId);
    },
  };
}
