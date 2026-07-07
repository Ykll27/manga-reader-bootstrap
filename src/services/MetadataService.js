const env = require('../config/env');

const cache = new Map();
const TTL = 30 * 60 * 1000;

function stripHtml(value = '') {
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

function cached(key) {
  const item = cache.get(key);
  if (!item || Date.now() - item.createdAt > TTL) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function saveCache(key, value) {
  cache.set(key, { value, createdAt: Date.now() });
  return value;
}

class MetadataService {
  async requestJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PrivateMangaReader/1.2',
        ...(options.headers || {})
      },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async searchAniList(title) {
    const key = `anilist:${title.toLowerCase()}`;
    const hit = cached(key);
    if (hit) return hit;

    const query = `
      query ($search: String) {
        Media(search: $search, type: MANGA) {
          id
          idMal
          title { romaji english native }
          description(asHtml: false)
          coverImage { extraLarge large color }
          bannerImage
          genres
          averageScore
          meanScore
          popularity
          favourites
          status
          format
          countryOfOrigin
          chapters
          volumes
          startDate { year month day }
          endDate { year month day }
          staff(perPage: 8) {
            edges {
              role
              node { id name { full native } }
            }
          }
          siteUrl
        }
      }
    `;

    const payload = await this.requestJson(env.anilist.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { search: title } })
    });

    if (payload.errors?.length) throw new Error(payload.errors[0].message || 'Erro AniList');
    const media = payload.data?.Media;
    if (!media) return null;

    return saveCache(key, {
      source: 'anilist',
      id: media.id,
      malId: media.idMal,
      title: media.title?.english || media.title?.romaji || media.title?.native || title,
      alternativeTitles: [media.title?.romaji, media.title?.english, media.title?.native].filter(Boolean),
      synopsis: stripHtml(media.description),
      coverUrl: media.coverImage?.extraLarge || media.coverImage?.large || '',
      bannerUrl: media.bannerImage || '',
      genres: media.genres || [],
      score: media.averageScore ?? media.meanScore ?? null,
      popularity: media.popularity ?? null,
      favourites: media.favourites ?? null,
      status: media.status || '',
      format: media.format || '',
      country: media.countryOfOrigin || '',
      chapters: media.chapters ?? null,
      volumes: media.volumes ?? null,
      year: media.startDate?.year ?? null,
      authors: (media.staff?.edges || [])
        .filter(edge => /story|art|original creator|creator/i.test(edge.role || ''))
        .map(edge => ({ name: edge.node?.name?.full || edge.node?.name?.native, role: edge.role }))
        .filter(item => item.name),
      siteUrl: media.siteUrl || ''
    });
  }

  async searchJikan(title) {
    const key = `jikan:${title.toLowerCase()}`;
    const hit = cached(key);
    if (hit) return hit;

    const url = new URL('/v4/manga', env.jikan.baseUrl);
    url.searchParams.set('q', title);
    url.searchParams.set('limit', '1');
    url.searchParams.set('sfw', 'true');
    url.searchParams.set('order_by', 'score');
    url.searchParams.set('sort', 'desc');

    const payload = await this.requestJson(url);
    const manga = payload.data?.[0];
    if (!manga) return null;

    return saveCache(key, {
      source: 'jikan',
      id: manga.mal_id,
      malId: manga.mal_id,
      title: manga.title_english || manga.title || title,
      alternativeTitles: [manga.title, manga.title_english, manga.title_japanese, ...(manga.title_synonyms || [])].filter(Boolean),
      synopsis: manga.synopsis || '',
      coverUrl: manga.images?.webp?.large_image_url || manga.images?.jpg?.large_image_url || '',
      bannerUrl: '',
      genres: [...(manga.genres || []), ...(manga.themes || []), ...(manga.demographics || [])].map(item => item.name),
      score: manga.score ? Math.round(manga.score * 10) : null,
      popularity: manga.popularity ?? null,
      favourites: manga.favorites ?? null,
      status: manga.status || '',
      format: manga.type || '',
      country: '',
      chapters: manga.chapters ?? null,
      volumes: manga.volumes ?? null,
      year: manga.published?.prop?.from?.year ?? null,
      authors: (manga.authors || []).map(author => ({ name: author.name, role: author.type || 'Autor' })),
      siteUrl: manga.url || ''
    });
  }

  async getBest(title) {
    if (!env.metadataEnabled || !title) return null;
    try {
      const ani = await this.searchAniList(title);
      if (ani) return ani;
    } catch (error) {
      console.warn('[metadata] AniList indisponível:', error.message);
    }
    try {
      return await this.searchJikan(title);
    } catch (error) {
      console.warn('[metadata] Jikan indisponível:', error.message);
      return null;
    }
  }
}

module.exports = new MetadataService();
