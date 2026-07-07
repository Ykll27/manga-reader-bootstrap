const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  inviteCode: process.env.INVITE_CODE || '',
  requireAdminApproval: process.env.REQUIRE_ADMIN_APPROVAL === 'true',
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  mangaProvider: process.env.MANGA_PROVIDER || 'mangadex',
  metadataEnabled: process.env.METADATA_ENABLED !== 'false',
  anilist: {
    url: process.env.ANILIST_API_URL || 'https://graphql.anilist.co'
  },
  jikan: {
    baseUrl: process.env.JIKAN_API_BASE_URL || 'https://api.jikan.moe'
  },
  mangadex: {
    baseUrl: process.env.MANGADEX_API_BASE_URL || 'https://api.mangadex.org',
    uploadsUrl: process.env.MANGADEX_UPLOADS_BASE_URL || 'https://uploads.mangadex.org',
    languages: (process.env.MANGADEX_LANGUAGES || 'pt-br').split(',').map(v => v.trim()).filter(Boolean)
  },
  nexus: {
    baseUrl: process.env.NEXUS_API_BASE_URL || 'https://nexustoons.com',
    token: process.env.NEXUS_API_TOKEN || '',
    latestPath: process.env.NEXUS_LATEST_PATH || '',
    searchPath: process.env.NEXUS_SEARCH_PATH || '',
    detailsPath: process.env.NEXUS_DETAILS_PATH || '',
    chapterPath: process.env.NEXUS_CHAPTER_PATH || ''
  }
};
