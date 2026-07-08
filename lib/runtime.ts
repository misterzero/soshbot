/**
 * Runtime detection: are we executing inside the Cloudflare Workers runtime
 * (workerd) or a local Node process? workerd sets a well-known userAgent.
 */
export function isCloudflareWorkers(): boolean {
  return (
    typeof globalThis.navigator !== "undefined" &&
    globalThis.navigator?.userAgent === "Cloudflare-Workers"
  );
}
