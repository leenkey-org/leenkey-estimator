import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// L1-12: the route /img, with the two Supabase clients simulated: the
// visitor's (public photos) and the session's (owner, admin).

type Signed = { data: { signedUrl: string } | null; error: { message: string } | null };

const signed = (url: string): Signed => ({ data: { signedUrl: url }, error: null });
const refused: Signed = { data: null, error: { message: "Object not found" } };

const visitorSign = vi.fn<(name: string, seconds: number) => Promise<Signed>>();
const sessionSign = vi.fn<(name: string, seconds: number) => Promise<Signed>>();

vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => ({ storage: { from: () => ({ createSignedUrl: visitorSign }) } }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ storage: { from: () => ({ createSignedUrl: sessionSign }) } }),
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
  visitorSign.mockReset();
  sessionSign.mockReset();
});

describe("route /img", () => {
  it("knows only the three files of a photo", async () => {
    for (const name of [`${property}/${photo}.webp`, `${property}/../${photo}-800.webp`, "x"]) {
      const response = await get(name);
      expect(response.status, name).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(visitorSign).not.toHaveBeenCalled();
  });

  it("answers 404 without a database", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect((await get(file)).status).toBe(404);
  });

  it("signs a photo of a published listing for an hour, cached 50 minutes by the CDN", async () => {
    visitorSign.mockResolvedValue(signed("https://storage.test/sign/photo?token=public"));
    const response = await get(file, "sb-test-auth-token=session");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://storage.test/sign/photo?token=public");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=3000");
    expect(visitorSign).toHaveBeenCalledWith(file, 3600);
    expect(sessionSign).not.toHaveBeenCalled();
  });

  it("answers 404 to a visitor for a photo that is not public", async () => {
    visitorSign.mockResolvedValue(refused);
    const response = await get(file);
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(sessionSign).not.toHaveBeenCalled();
  });

  it("signs the photo of a draft for its owner, never cached", async () => {
    visitorSign.mockResolvedValue(refused);
    sessionSign.mockResolvedValue(signed("https://storage.test/sign/photo?token=private"));
    const response = await get(file, "sb-test-auth-token=session");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://storage.test/sign/photo?token=private");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("answers 404 to someone else, signed in", async () => {
    visitorSign.mockResolvedValue(refused);
    sessionSign.mockResolvedValue(refused);
    expect((await get(file, "sb-test-auth-token=session")).status).toBe(404);
  });
});
