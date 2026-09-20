import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reduce el JS de cliente empaquetando solo los iconos/primitivas usados
    optimizePackageImports: ["lucide-react", "@base-ui/react", "motion"],
    // Las páginas son dinámicas (auth + datos por usuario): sin esto cada
    // revisita refeachea al servidor y muestra el skeleton (flash). Con 30 s
    // el router cache sirve la visita anterior al instante y la transición
    // entre vistas anima contenido → contenido. Las mutaciones ya invalidan
    // vía revalidatePath, así que no se sirve nada obsoleto tras guardar.
    staleTimes: {
      dynamic: 30,
      static: 60,
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
