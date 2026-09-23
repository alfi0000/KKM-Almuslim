import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/mahasiswa/dokumen-verifikasi": [
      "./node_modules/@fontsource/noto-serif/files/noto-serif-latin-400-normal.woff",
      "./node_modules/@fontsource/noto-serif/files/noto-serif-latin-700-normal.woff",
    ],
  },
  experimental: {
    // Use the compiler API so builds also work in restricted/container runtimes
    // where detached TypeScript CLI output cannot be captured reliably.
    useTypeScriptCli: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
