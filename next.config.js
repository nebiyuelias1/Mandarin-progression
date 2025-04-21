const isProd = process.env.NODE_ENV === 'production';
const nextConfig = {
  reactStrictMode: true,
  'output': 'export',
  images: {
    unoptimized: true, // Disable default image optimization
  },
  assetPrefix: isProd ? '/Mandarin-progression/' : '',
  basePath: isProd ? '/Mandarin-progression' : ''
};

export default nextConfig;