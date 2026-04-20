import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  // Hide the Next.js dev build-activity indicator (bottom-left circle).
  // In local dev it overlapped the "forecast calibration" link in the
  // sidebar, clipping its leading character. Production deploys don't
  // show the indicator regardless; this just makes local dev match prod.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "yt3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
