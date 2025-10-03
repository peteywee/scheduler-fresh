declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    sw?: string;
      runtimeCaching?: RuntimeCachingEntry[] | RuntimeCachingEntry;
    fallbacks?: {
      document?: string;
      image?: string;
      audio?: string;
      video?: string;
      font?: string;
    };
        cache?: 'force-cache' | 'no-cache' | string;
    reloadOnOnline?: boolean;
    dynamicStartUrlRedirect?: string;
    cacheStartUrl?: boolean;
    buildExcludes?: RegExp[];
    scope?: string;
    workboxOptions?: Record<string, unknown>;
  }

  function withPWA(pwaConfig: PWAConfig): (nextConfig?: NextConfig) => NextConfig;
  export default withPWA;
}