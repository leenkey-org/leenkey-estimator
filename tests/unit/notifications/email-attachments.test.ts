import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// L3-02: an email leaves with its files (the calendar file of a visit), as
// Resend takes them: a name and a content in base64.

vi.mock("server-only", () => ({}));

const env = { ...process.env };
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal("fetch", fetchMock);
  process.env.RESEND_API_KEY = "re_test";
  process.env.NEXT_PUBLIC_ENV = "staging";
  process.env.EMAIL_TEST_INBOX = "boite@exemple.test";
});
afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...env };
});

const email = {
  to: "buyer_c@exemple.test",
  subject: "Visite confirmée",
  html: "<p>…</p>",
  text: "…",
};

function body(): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
  return JSON.parse(init.body) as Record<string, unknown>;
}

describe("sendEmail with attachments", () => {
  it("hands the files to Resend, name and base64 content only", async () => {
    const { sendEmail } = await import("@/core/notifications/email");
    const content = Buffer.from("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n", "utf8").toString("base64");
    const attachment = { filename: "visite-leenkey.ics", content, path: "/etc/passwd" };
    await expect(sendEmail({ ...email, attachments: [attachment] })).resolves.toBe("test");
    expect(body()).toMatchObject({
      to: ["boite@exemple.test"],
      subject: "[PREPROD] Visite confirmée",
      attachments: [{ filename: "visite-leenkey.ics", content }],
    });
    expect(JSON.stringify(body())).not.toContain("passwd");
  });

  it("an email without a file says nothing of files", async () => {
    const { sendEmail } = await import("@/core/notifications/email");
    await sendEmail(email);
    expect(body()).not.toHaveProperty("attachments");
    fetchMock.mockClear();
    await sendEmail({ ...email, attachments: [] });
    expect(body()).not.toHaveProperty("attachments");
  });
});
