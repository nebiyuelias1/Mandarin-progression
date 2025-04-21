// next.config.js
const isProd = process.env.NODE_ENV === 'production';
const repoName = 'Mandarin-progression';
const basePath = isProd ? `/${repoName}` : '';

module.exports = {
  trailingSlash: true,
  output: 'export',
  basePath: basePath,
  assetPrefix: basePath,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};