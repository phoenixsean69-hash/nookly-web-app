import path from "node:path";

type RemoteImagePattern = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname: string;
};

const remotePatterns: RemoteImagePattern[] = [
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
        (pattern) => pattern.hostname === endpointUrl.hostname,
      )
    ) {
      const protocol = endpointUrl.protocol.replace(":", "");

      if (protocol === "http" || protocol === "https") {
        remotePatterns.push({
          protocol,
          hostname: endpointUrl.hostname,
          port: endpointUrl.port,
          pathname: "/v1/storage/buckets/**",
        });
      }
    }
  } catch {
    console.warn(
      "NEXT_PUBLIC_APPWRITE_ENDPOINT is not a valid URL.",
    );
  }
}

const nextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],

  turbopack: {
    root: path.resolve(__dirname),
  },

  images: {
    remotePatterns,
  },
};

export default nextConfig;
