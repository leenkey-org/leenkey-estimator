// Gateway of scripts/local-stack.sh: serves /auth/v1 (Supabase Auth),
// /rest/v1 (PostgREST), /storage/v1 (Supabase Storage), /functions/v1 (the
// Edge Functions runtime, L1-27) and the WebSocket of
// /realtime/v1 (Supabase Realtime) under one origin, like a Supabase
// project, and the email templates of supabase/templates/ to Supabase Auth.
import { createReadStream, existsSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { basename, join } from "node:path";

const [port, authPort, restPort, templatesDir, hostIp, storagePort, realtimePort, functionsPort] =
  process.argv.slice(2);
const routes = [
  ["/auth/v1", Number(authPort)],
  ["/rest/v1", Number(restPort)],
  ["/storage/v1", Number(storagePort)],
  ["/functions/v1", Number(functionsPort)],
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

// /realtime/v1/websocket → the socket of Realtime. Its self-hosted tenant is
// named by the first label of the host: « realtime-dev ».
function upgrade(req, socket, head) {
  if (!realtimePort || !req.url.startsWith("/realtime/v1/")) return socket.destroy();
  const upstream = net.connect(Number(realtimePort), "127.0.0.1", () => {
    const lines = [`${req.method} /socket${req.url.slice("/realtime/v1".length)} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const name = req.rawHeaders[i];
      if (name.toLowerCase() === "host") continue;
      lines.push(`${name}: ${req.rawHeaders[i + 1]}`);
    }
    lines.push(`Host: realtime-dev.localhost:${realtimePort}`);
    upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
}

// Local machine (browser, app) and docker host address (Supabase Auth fetches
// the templates): never every interface.
for (const host of ["127.0.0.1", hostIp].filter(Boolean)) {
  http.createServer(handle).on("upgrade", upgrade).listen(Number(port), host);
}
