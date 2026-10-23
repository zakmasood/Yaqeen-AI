export const LOCAL_SESSION_COOKIE = "yaqeen-session";

export function readLocalSession(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )yaqeen-session=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function writeLocalSession(token: string) {
  document.cookie = `${LOCAL_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
}

export function clearLocalSession() {
  document.cookie = `${LOCAL_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
