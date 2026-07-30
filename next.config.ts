import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

// Pin the workspace root so Next does not walk up to an unrelated parent
// lockfile (e.g. D:\pnpm-lock.yaml) when inferring the Turbopack root.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
