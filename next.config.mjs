/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.pixhost.to",
      },
    ],
  },
};

export default nextConfig;
