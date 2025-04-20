// next.config.js
const isProd = process.env.NODE_ENV === 'production';
const repoName = 'Mandarin-progression'; // Replace with your actual repository name

module.exports = {
  basePath: isProd ? `/${repoName}` : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? `/${repoName}` : '',
  },
};