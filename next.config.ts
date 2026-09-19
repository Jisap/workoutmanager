import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reduce el JS de cliente empaquetando solo los iconos/primitivas usados
    optimizePackageImports: ["lucide-react", "@base-ui/react", "motion"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
