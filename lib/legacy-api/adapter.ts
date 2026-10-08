// Runs the V1 serverless handlers (written for @vercel/node) as Next.js
// route handlers, unchanged: same paths, same request and response formats,
// same CORS headers. Only the surface they actually use is implemented.

export interface LegacyRequest {
  method: string;
  body: unknown;
  headers: Record<string, string>;
  query: Record<string, string>;
}

export interface LegacyResponse {
  setHeader(name: string, value: string): LegacyResponse;
  status(code: number): LegacyResponse;
  json(body: unknown): LegacyResponse;
  end(): LegacyResponse;
}

type LegacyHandler = (req: LegacyRequest, res: LegacyResponse) => unknown;

export function toRouteHandler(handler: LegacyHandler) {
  return async function route(request: Request): Promise<Response> {
    let body: unknown = undefined;
    const raw = request.method === "GET" || request.method === "HEAD" ? "" : await request.text();
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }

    const url = new URL(request.url);
    const req: LegacyRequest = {
      method: request.method,
      body,
      headers: Object.fromEntries(request.headers.entries()),
      query: Object.fromEntries(url.searchParams.entries()),
    };

    const headers = new Headers();
    let statusCode = 200;
    let payload: string | null = null;

    const res: LegacyResponse = {
      setHeader(name, value) {
        headers.set(name, value);
        return res;
      },
      status(code) {
        statusCode = code;
        return res;
      },
      json(data) {
        headers.set("Content-Type", "application/json; charset=utf-8");
        payload = JSON.stringify(data);
        return res;
      },
      end() {
        return res;
      },
    };

    await handler(req, res);
    return new Response(payload, { status: statusCode, headers });
  };
}
