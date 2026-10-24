import { z } from "zod";

// L1-22 (SPEC-V2 section 10): a notification marked read, and the email
// preferences of an account (profiles.notification_prefs, SPEC 4: messages,
// offers, alerts).

export const notificationIdSchema = z.string().uuid();

export const NOTIFICATION_PREFERENCES = ["email_messages", "email_offers", "email_alerts"] as const;
export type NotificationPreference = (typeof NOTIFICATION_PREFERENCES)[number];

export const notificationPreferencesSchema = z.object({
  email_messages: z.boolean(),
  email_offers: z.boolean(),
  email_alerts: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

/** What a form changes: one preference or more, the others kept. */
export const notificationPreferencesUpdateSchema = notificationPreferencesSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

/** The preferences of an account as stored, missing keys on (the default of SPEC 4). */
export function readNotificationPreferences(value: unknown): NotificationPreferences {
  const stored =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    email_messages: stored.email_messages !== false,
    email_offers: stored.email_offers !== false,
    email_alerts: stored.email_alerts !== false,
  };
}
