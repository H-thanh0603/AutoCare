import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Validates a post-login "return to" path. Only same-origin relative paths are
 * allowed, so a crafted `?tiep-tuc=` value cannot become an open redirect to an
 * external site or a protocol-relative URL.
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Must be an absolute path on this site, not "//host" or "/\host".
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}
