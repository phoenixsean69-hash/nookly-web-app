import type { NextConfig } from "next";

const remotePatterns: NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> = [
  {
    protocol: "https",
    hostname: "cloud.appwrite.io",
    pathname: "/v1/storage/buckets/**",
  },
  {
    protocol: "https",
    hostname: "fra.cloud.appwrite.io",
    pathname: "/v1/storage/buckets/**",
  },
  {
    protocol: "https",
    hostname: "ui-avatars.com",
    pathname: "/api/**",
  },
];

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;

if (endpoint) {
  try {
    const endpointUrl = new URL(endpoint);

    if (
      !remotePatterns.some(
        (pattern) =>
          typeof pattern !== "string" &&
          pattern.hostname === endpointUrl.hostname,
      )
    ) {
      remotePatterns.push({
        protocol: endpointUrl.protocol.replace(":", "") as "http" | "https",
        hostname: endpointUrl.hostname,
        port: endpointUrl.port,
        pathname: "/v1/storage/buckets/**",
      });
    }
  } catch {
    console.warn("NEXT_PUBLIC_APPWRITE_ENDPOINT is not a valid URL.");
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  images: {
    remotePatterns,
  },
};

export default nextConfig;
