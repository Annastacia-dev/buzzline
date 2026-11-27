import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Share images used to be generated at these URLs; they are static JPEGs now. Search engines and chat apps that
  // remembered the old addresses get the new images instead of a 404.
  async redirects() {
    return [
      { source: '/opengraph-image', destination: '/share/home.jpg', permanent: true },
      { source: '/host/opengraph-image', destination: '/share/host.jpg', permanent: true },
      { source: '/join/opengraph-image', destination: '/share/join.jpg', permanent: true },
    ];
  },
};

export default nextConfig;
