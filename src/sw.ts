/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import {
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * PWA service worker (§9): precache the shell, runtime-cache GET APIs
 * stale-while-revalidate so previously viewed properties stay readable
 * offline. No offline writes in v1 — mutations fail visibly when offline
 * (the app shows a queued-toast explaining that).
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith("/api/v1/") && request.method === "GET",
      handler: new StaleWhileRevalidate({
        cacheName: "rehawi-api",
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
