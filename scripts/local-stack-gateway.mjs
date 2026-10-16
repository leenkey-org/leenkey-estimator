// Gateway of scripts/local-stack.sh: serves /auth/v1 (Supabase Auth) and
// /rest/v1 (PostgREST) under one origin, like a Supabase project, and the
// email templates of supabase/templates/ to Supabase Auth.
import { createReadStream, existsSync } from "node:fs";
import http from "node:http";
import { basename, join } from "node:path";

const [port, authPort, restPort, templatesDir, hostIp] = process.argv.slice(2);
const routes = [
  ["/auth/v1", Number(authPort)],
  ["/rest/v1", Number(restPort)],
];

function handle(req, res) {
  if (req.url.startsWith("/templates/")) {
    const file = join(templatesDir, basename(req.url));
    if (!existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return createReadStream(file).pipe(res);
  }
  const route = routes.find(([prefix]) => req.url.startsWith(prefix));
  if (!route) return res.writeHead(404).end();
  const [prefix, target] = route;
  const upstream = http.request(
    {
      host: "127.0.0.1",
      port: target,
      path: req.url.slice(prefix.length) || "/",
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${target}` },
    },
    (response) => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    },
  );
  upstream.on("error", (error) => res.writeHead(502).end(String(error)));
  req.pipe(upstream);
}

// Local machine (browser, app) and docker host address (Supabase Auth fetches
// the templates): never every interface.
for (const host of ["127.0.0.1", hostIp].filter(Boolean)) {
  http.createServer(handle).listen(Number(port), host);
}
