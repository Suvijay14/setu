/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_BOLNA_AGENT_ID_B2C: process.env.NEXT_PUBLIC_BOLNA_AGENT_ID_B2C,
    NEXT_PUBLIC_BOLNA_AGENT_ID_B2B: process.env.NEXT_PUBLIC_BOLNA_AGENT_ID_B2B,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
