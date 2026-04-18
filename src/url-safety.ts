const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

const isPrivateIpv4 = (hostname: string): boolean => {
  const parts = hostname.split(".").map((part) => Number(part));
  const hasInvalidOctet = parts.some(
    (part) => !Number.isInteger(part) || part < 0 || part > 255,
  );

  if (parts.length !== 4 || hasInvalidOctet) {
    return false;
  }

  const [a, b] = parts as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
};

const isBlockedHostname = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/\.$/, "");

  if (
    host === "localhost" ||
    host === "metadata.google.internal" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return true;
  }

  if (isPrivateIpv4(host)) return true;

  const ipv6 = host.replace(/^\[/, "").replace(/\]$/, "");
  if (!ipv6.includes(":")) return false;

  return (
    ipv6 === "::1" ||
    ipv6 === "::" ||
    ipv6.startsWith("fc") ||
    ipv6.startsWith("fd") ||
    ipv6.startsWith("fe80:")
  );
};

/**
 * Accept only public http(s) URLs from external feeds before storing, fetching
 * or rendering them. This blocks javascript:, data:, file:, localhost and
 * obvious private-network targets.
 */
export const normalizePublicHttpUrl = (
  value: string | undefined | null,
  base?: string,
): string => {
  const trimmed = value?.trim();
  if (!trimmed || /[\u0000-\u001f\u007f]/.test(trimmed)) return "";

  const candidate = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;

  try {
    const url = new URL(candidate, base);
    if (!HTTP_PROTOCOLS.has(url.protocol)) return "";
    if (!url.hostname || isBlockedHostname(url.hostname)) return "";
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return "";
  }
};
