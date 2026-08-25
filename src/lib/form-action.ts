import { redirect } from "next/navigation";

import type { ActionResult } from "@/lib/errors";

/**
 * Adapter for server-rendered <form action={...}> flows.
 *
 * runAction() converts failures into an ActionResult return value, but plain
 * form wrappers used to discard that result — staff saw nothing happen when a
 * transition/validation failed. This helper redirects back to the originating
 * page with ?error=<message> so the page can render the failure as a flash.
 * redirect() must run OUTSIDE runAction's try/catch, hence this shape.
 */
export async function runStaffFormAction(
  errorPath: string,
  fn: () => Promise<ActionResult<unknown>>,
): Promise<void> {
  const result = await fn();
  if (!result.ok) {
    const sep = errorPath.includes("?") ? "&" : "?";
    redirect(`${errorPath}${sep}error=${encodeURIComponent(result.message)}`);
  }
}
