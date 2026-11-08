// The address of a visitor, as the platform gives it, and what stands for it
// in a limit (the assistant of the site, the limits of requests of L1-38).

/** The groups of an IPv6 address, in full (« :: » expanded), or null. */
function ipv6Groups(address: string): string[] | null {
  const halves = address.toLowerCase().split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  if (!groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map((group) => group.replace(/^0+(?=.)/, ""));
}

/**
 * What stands for an address in the limits: an IPv4 address itself, an IPv6
 * one by its /64 (a home or a phone gets a whole /64: changing its last 64
 * bits is changing nothing). An IPv4 address written as IPv6 is IPv4.
 */
export function addressScope(address: string): string {
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  if (mapped?.[1]) return mapped[1];
  if (!address.includes(":")) return address;
  const groups = ipv6Groups(address);
  if (!groups) return address;
  // No network of its own in its first 64 bits (« ::1 », IPv4 written in
  // hexadecimal): the address itself, never a range shared by all of them.
  if (groups.slice(0, 4).every((group) => group === "0")) return groups.join(":");
  return `${groups.slice(0, 4).join(":")}::/64`;
}

/**
 * The address of the visitor, as Vercel gives it (headers it sets itself,
 * never those of the request). Elsewhere (local, tests: Next.js sets
 * x-forwarded-for to its own address), none.
 */
export function clientAddress(headers: Headers): string | null {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || null;
}
