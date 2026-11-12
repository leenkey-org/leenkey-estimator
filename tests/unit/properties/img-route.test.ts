import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// L1-12, P-06: the route /img, with the two Supabase clients simulated: the
// visitor's (public photos) and the session's (owner, admin). It serves the
// file itself (no redirect to another origin).

type Download = { data: Blob | null; error: { message: string } | null };

const file404: Download = { data: null, error: { message: "Object not found" } };
const webp = (text: string): Download => ({ data: new Blob([text]), error: null });

const visitorRead = vi.fn<(name: string) => Promise<Download>>();
const sessionRead = vi.fn<(name: string) => Promise<Download>>();

vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => ({ storage: { from: () => ({ download: visitorRead }) } }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ storage: { from: () => ({ download: sessionRead }) } }),
}));

const { GET } = await import("@/app/img/[...path]/route");

const property = "623efc8b-97d4-4902-ac43-406417498893";
const photo = "0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c27";
const file = `${property}/${photo}-800.webp`;

function get(name: string, cookie?: string) {
  const request = new NextRequest(`http://localhost/img/${name}`, {
    headers: cookie ? { cookie } : {},
  });
  return GET(request, { params: Promise.resolve({ path: name.split("/") }) });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54331");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  visitorRead.mockReset();
  sessionRead.mockReset();
});

describe("route /img", () => {
  it("knows only the three files of a photo", async () => {
    for (const name of [`${property}/${photo}.webp`, `${property}/../${photo}-800.webp`, "x"]) {
      const response = await get(name);
      expect(response.status, name).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(visitorRead).not.toHaveBeenCalled();
  });

  it("answers 404 without a database", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect((await get(file)).status).toBe(404);
  });

  it("serves a photo of a published listing, a WebP cached 50 minutes by the CDN", async () => {
    visitorRead.mockResolvedValue(webp("public photo"));
    const response = await get(file, "sb-test-auth-token=session");
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("content-length")).toBe("12");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=3000");
    expect(await response.text()).toBe("public photo");
    expect(visitorRead).toHaveBeenCalledWith(file);
    expect(sessionRead).not.toHaveBeenCalled();
  });

  it("answers 404 to a visitor for a photo that is not public", async () => {
    visitorRead.mockResolvedValue(file404);
    const response = await get(file);
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(sessionRead).not.toHaveBeenCalled();
  });

  it("serves the photo of a draft to its owner, never in a shared cache", async () => {
    visitorRead.mockResolvedValue(file404);
    sessionRead.mockResolvedValue(webp("draft photo"));
    const response = await get(file, "sb-test-auth-token=session");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, max-age=60");
    expect(await response.text()).toBe("draft photo");
  });

  it("answers 404 to someone else, signed in", async () => {
    visitorRead.mockResolvedValue(file404);
    sessionRead.mockResolvedValue(file404);
    expect((await get(file, "sb-test-auth-token=session")).status).toBe(404);
  });
});
