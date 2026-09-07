const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Ably's ESM bundle gets mangled by SWC's class downleveling
    // ("super keyword outside a method"). Point the client build at the
    // prebuilt static file instead. Server keeps the normal entry so
    // lib/ably/server.ts still resolves ably-node.
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        ably: path.resolve(__dirname, "node_modules/ably/build/ably.js"),
      };
    }
    return config;
  },
};

module.exports = nextConfig;
