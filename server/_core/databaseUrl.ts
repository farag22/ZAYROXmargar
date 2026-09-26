export function isDirectSupabaseHost(raw: string): boolean {
  return /@db\.[a-z0-9]+\.supabase\.co(?::\d+)?\//i.test(raw.trim());
}

export function normalizeDatabaseUrl(raw: string): string {
  const url = raw.trim().replace(/^["']|["']$/g, "");
  if (!url) return url;

  const protocolMatch = url.match(/^(postgres(?:ql)?:\/\/)/i);
  if (!protocolMatch) return url;

  const rest = url.slice(protocolMatch[1].length);
  const at = rest.lastIndexOf("@");
  if (at <= 0) return url;

  const userinfo = rest.slice(0, at);
  let hostAndPath = rest.slice(at + 1);
  const colon = userinfo.indexOf(":");
  if (colon < 0) return url;

  const username = userinfo.slice(0, colon);
  const password = encodePostgresPassword(userinfo.slice(colon + 1));
  hostAndPath = preferSupabaseTransactionPooler(hostAndPath);

  if (!/[?&]sslmode=/.test(hostAndPath) && /supabase\.com|supabase\.co/i.test(hostAndPath)) {
    hostAndPath += hostAndPath.includes("?") ? "&sslmode=require" : "?sslmode=require";
  }

  return `${protocolMatch[1]}${username}:${password}@${hostAndPath}`;
}

function preferSupabaseTransactionPooler(hostAndPath: string): string {
  return hostAndPath.replace(
    /(pooler\.supabase\.com):5432(\/|$)/i,
    "$1:6543$2",
  );
}

function encodePostgresPassword(password: string): string {
  if (!password) return password;
  try {
    const decoded = decodeURIComponent(password);
    if (decoded !== password || /[^A-Za-z0-9._~-]/.test(password)) {
      return encodeURIComponent(decoded);
    }
    return password;
  } catch {
    return encodeURIComponent(password);
  }
}
