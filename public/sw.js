if (!self.define) {
  let a,
    e = {};
  const s = (s, t) => (
    (s = new URL(s + ".js", t).href),
    e[s] ||
      new Promise((e) => {
        if ("document" in self) {
          const a = document.createElement("script");
          ((a.src = s), (a.onload = e), document.head.appendChild(a));
        } else ((a = s), importScripts(s), e());
      }).then(() => {
        let a = e[s];
        if (!a) throw new Error(`Module ${s} didn’t register its module`);
        return a;
      })
  );
  self.define = (t, n) => {
    const i =
      a ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (e[i]) return;
    let c = {};
    const r = (a) => s(a, i),
      f = { module: { uri: i }, exports: c, require: r };
    e[i] = Promise.all(t.map((a) => f[a] || r(a))).then((a) => (n(...a), c));
  };
}
define(["./workbox-e9849328"], function (a) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    a.clientsClaim(),
    a.precacheAndRoute(
      [
        {
          url: "/_next/app-build-manifest.json",
          revision: "4d9b5737d8a194e8c3c54e9b161a50a5",
        },
        {
          url: "/_next/static/5tZEhjsny-kFIvgn1tLgG/_buildManifest.js",
          revision: "59e9123ed4ba2463b298159e14333e02",
        },
        {
          url: "/_next/static/5tZEhjsny-kFIvgn1tLgG/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/1212-7a591eb04453bf2b.js",
          revision: "7a591eb04453bf2b",
        },
        {
          url: "/_next/static/chunks/1973-fdc4c3989c521b7b.js",
          revision: "fdc4c3989c521b7b",
        },
        {
          url: "/_next/static/chunks/2075-e50bc74293293c75.js",
          revision: "e50bc74293293c75",
        },
        {
          url: "/_next/static/chunks/2256-4c779814b1fc99b0.js",
          revision: "4c779814b1fc99b0",
        },
        {
          url: "/_next/static/chunks/2502-79b1e14abe666a64.js",
          revision: "79b1e14abe666a64",
        },
        {
          url: "/_next/static/chunks/3662-0d75bb7135317057.js",
          revision: "0d75bb7135317057",
        },
        {
          url: "/_next/static/chunks/3791-1767dd030cb4795a.js",
          revision: "1767dd030cb4795a",
        },
        {
          url: "/_next/static/chunks/4174-af48d4e23282f8f4.js",
          revision: "af48d4e23282f8f4",
        },
        {
          url: "/_next/static/chunks/63554d53-e624437b75c321da.js",
          revision: "e624437b75c321da",
        },
        {
          url: "/_next/static/chunks/7151-97c769fc9cc3a74d.js",
          revision: "97c769fc9cc3a74d",
        },
        {
          url: "/_next/static/chunks/7ef0469b-2801de8165f427f6.js",
          revision: "2801de8165f427f6",
        },
        {
          url: "/_next/static/chunks/9429-2672510d7cf2dce8.js",
          revision: "2672510d7cf2dce8",
        },
        {
          url: "/_next/static/chunks/9594-3e94bae8e609828d.js",
          revision: "3e94bae8e609828d",
        },
        {
          url: "/_next/static/chunks/app/(app)/conflict-detector/page-73cac0a70deec0ca.js",
          revision: "73cac0a70deec0ca",
        },
        {
          url: "/_next/static/chunks/app/(app)/dashboard/page-b39fd007bee2535d.js",
          revision: "b39fd007bee2535d",
        },
        {
          url: "/_next/static/chunks/app/(app)/invites/page-97b58b34b451dfda.js",
          revision: "97b58b34b451dfda",
        },
        {
          url: "/_next/static/chunks/app/(app)/layout-ae4f42c36f808f0e.js",
          revision: "ae4f42c36f808f0e",
        },
        {
          url: "/_next/static/chunks/app/(app)/public-profile/page-adc0027b7e0350e7.js",
          revision: "adc0027b7e0350e7",
        },
        {
          url: "/_next/static/chunks/app/(app)/requests/page-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/(app)/settings/page-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/(auth)/layout-1324aa66cc4d7643.js",
          revision: "1324aa66cc4d7643",
        },
        {
          url: "/_next/static/chunks/app/(auth)/login/page-fbfbf1787a8139b6.js",
          revision: "fbfbf1787a8139b6",
        },
        {
          url: "/_next/static/chunks/app/(auth)/signup/page-e08e013a58715082.js",
          revision: "e08e013a58715082",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-71b7adaa9b1a74a8.js",
          revision: "71b7adaa9b1a74a8",
        },
        {
          url: "/_next/static/chunks/app/api/auth/csrf/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/auth/me/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/auth/session/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/auth/switch-org/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/discovery/search/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/invites/%5Bcode%5D/revoke/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/invites/bulk-create/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/invites/create/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/invites/list/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/orgs/%5BorgId%5D/members/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/orgs/create/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/orgs/join/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/orgs/public-profile/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/orgs/request-access/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/orgs/requests/approve/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/orgs/search/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/parent/ledger/export/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/shifts/%5BshiftId%5D/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/shifts/create/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/api/shifts/route-52aba5f7e0f4aa0f.js",
          revision: "52aba5f7e0f4aa0f",
        },
        {
          url: "/_next/static/chunks/app/discover/page-a5b1eefb453efe0e.js",
          revision: "a5b1eefb453efe0e",
        },
        {
          url: "/_next/static/chunks/app/join/page-c72700743091d383.js",
          revision: "c72700743091d383",
        },
        {
          url: "/_next/static/chunks/app/layout-acea3945f097c247.js",
          revision: "acea3945f097c247",
        },
        {
          url: "/_next/static/chunks/app/onboarding/page-146274460382b764.js",
          revision: "146274460382b764",
        },
        {
          url: "/_next/static/chunks/app/page-e8166c79fdb83254.js",
          revision: "e8166c79fdb83254",
        },
        {
          url: "/_next/static/chunks/caf8101b-9c3c05d3d38aa14c.js",
          revision: "9c3c05d3d38aa14c",
        },
        {
          url: "/_next/static/chunks/framework-4abb519a927dfe6a.js",
          revision: "4abb519a927dfe6a",
        },
        {
          url: "/_next/static/chunks/main-84bc445634c74f01.js",
          revision: "84bc445634c74f01",
        },
        {
          url: "/_next/static/chunks/main-app-feb0391490364919.js",
          revision: "feb0391490364919",
        },
        {
          url: "/_next/static/chunks/pages/_app-8eea09a0b5babeee.js",
          revision: "8eea09a0b5babeee",
        },
        {
          url: "/_next/static/chunks/pages/_error-eb2eb57025278678.js",
          revision: "eb2eb57025278678",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-35aa864ba81911de.js",
          revision: "35aa864ba81911de",
        },
        {
          url: "/_next/static/css/bb4bfdfa27cfa686.css",
          revision: "bb4bfdfa27cfa686",
        },
        { url: "/manifest.json", revision: "65a3af88ade26a89f823017b727bd552" },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    a.cleanupOutdatedCaches(),
    a.registerRoute(
      "/",
      new a.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: a,
              response: e,
              event: s,
              state: t,
            }) =>
              e && "opaqueredirect" === e.type
                ? new Response(e.body, {
                    status: 200,
                    statusText: "OK",
                    headers: e.headers,
                  })
                : e,
          },
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new a.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new a.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new a.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new a.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new a.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new a.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new a.RangeRequestsPlugin(),
          new a.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      /\.(?:mp4)$/i,
      new a.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new a.RangeRequestsPlugin(),
          new a.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      /\.(?:js)$/i,
      new a.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      /\.(?:css|less)$/i,
      new a.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new a.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new a.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      ({ url: a }) => {
        if (!(self.origin === a.origin)) return !1;
        const e = a.pathname;
        return !e.startsWith("/api/auth/") && !!e.startsWith("/api/");
      },
      new a.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      ({ url: a }) => {
        if (!(self.origin === a.origin)) return !1;
        return !a.pathname.startsWith("/api/");
      },
      new a.NetworkFirst({
        cacheName: "others",
        networkTimeoutSeconds: 10,
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      ({ url: a }) => !(self.origin === a.origin),
      new a.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      "GET",
    ));
});
