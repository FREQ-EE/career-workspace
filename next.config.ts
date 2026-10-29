import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  logging: { incomingRequests: false },
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingExcludes: {
    "/*": [
      "./artifacts/**/*",
      "./.desktop-app/**/*",
      "./releases/**/*",
      "./dist/**/*",
      "./tests/**/*",
      "./.env*",
      "./.git/**/*",
    ],
  },
  outputFileTracingIncludes: {
    "/*": ["./node_modules/next/dist/compiled/next-server/*runtime.prod.js"],
    "/api/import": [
      "./node_modules/pdfjs-dist/legacy/build/*",
      "./node_modules/@napi-rs/canvas/**/*",
    ],
  },
};
export default config;
