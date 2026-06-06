// SSRF-safe URL fetching.
// Blocks requests to private / reserved / loopback / link-local ranges (incl. the
// 169.254.169.254 cloud-metadata IP), enforces http(s) only, validates every
// redirect hop, and caps time + size. Use this anywhere we fetch a user-supplied URL.
import { lookup } from 'node:dns/promises';

function isBlockedIp(ip: string): boolean {
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127) return true;          // this-host, private, loopback
    if (a === 169 && b === 254) return true;                    // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;           // private
    if (a === 192 && b === 168) return true;                    // private
    if (a === 192 && b === 0) return true;                      // 192.0.0.0/24 (incl. 192.0.2.0/24 test)
    if (a === 100 && b >= 64 && b <= 127) return true;          // CGNAT 100.64/10
    if (a === 198 && (b === 18 || b === 19)) return true;       // benchmarking
    if (a >= 224) return true;                                  // multicast / reserved
    return false;
  }
  const ip6 = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (ip6 === '::1' || ip6 === '::') return true;               // loopback / unspecified
  if (/^fe[89ab]/.test(ip6)) return true;                       // link-local fe80::/10
  if (ip6.startsWith('fc') || ip6.startsWith('fd')) return true; // unique-local fc00::/7
  const mapped = ip6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);       // IPv4-mapped IPv6
  if (mapped) return isBlockedIp(mapped[1]);
  return false;
}

export async function assertSafeUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error('Invalid URL'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http(s) URLs are allowed');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i.test(host)) throw new Error('Blocked host');

  // Literal IP → check directly; hostname → resolve ALL records and check each.
  let addrs: string[];
  if (/^[0-9.]+$/.test(host) || host.includes(':')) {
    addrs = [host];
  } else {
    try { addrs = (await lookup(host, { all: true })).map(a => a.address); }
    catch { throw new Error('Could not resolve host'); }
  }
  if (!addrs.length) throw new Error('Could not resolve host');
  for (const a of addrs) if (isBlockedIp(a)) throw new Error('Blocked address (private/reserved range)');
  return u;
}

export interface SafeFetchOpts { timeoutMs?: number; maxRedirects?: number; maxChars?: number; }

/** Fetch a user-supplied URL safely and return the raw response text (capped). Throws on SSRF / unsafe targets. */
export async function safeFetchText(raw: string, opts: SafeFetchOpts = {}): Promise<string> {
  const { timeoutMs = 8000, maxRedirects = 3, maxChars = 600_000 } = opts;
  let target = raw.trim();
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

  for (let i = 0; i <= maxRedirects; i++) {
    await assertSafeUrl(target);                                 // re-validate every hop (anti DNS-rebinding / redirect SSRF)
    const res = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TredditBot/1.0)', Accept: 'text/html,application/xhtml+xml,text/plain' },
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error('Redirect without location');
      target = new URL(loc, target).toString();
      continue;
    }
    if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (ct && !/text|html|xml|json|plain/i.test(ct)) throw new Error('Unsupported content type');
    const txt = await res.text();
    return txt.slice(0, maxChars);
  }
  throw new Error('Too many redirects');
}

/** True if the error came from the SSRF guard (vs. an ordinary network failure). */
export function isBlockedUrlError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : '';
  return /Only http|Blocked host|Blocked address|Invalid URL|Could not resolve|Unsupported content|Too many redirects/.test(msg);
}
