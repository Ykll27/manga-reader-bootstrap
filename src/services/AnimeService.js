const fs = require('fs');
const path = require('path');
const env = require('../config/env');

class AnimeService {
  constructor() {
    this.baseUrl = (env.jikan.baseUrl || 'https://api.jikan.moe').replace(/\/$/, '');
    this.sourcesPath = path.join(process.cwd(), 'data', 'anime-sources.json');
  }

  async request(pathname, params = {}) {
    const url = new URL(`${this.baseUrl}${pathname}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PrivateMangaReader/1.2' },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw Object.assign(new Error(`Jikan respondeu ${response.status}: ${body.slice(0, 180)}`), {
        status: response.status >= 500 ? 502 : response.status
      });
    }
    return response.json();
  }

  stripHtml(value = '') {
    return String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  normalizeAnime(item = {}) {
    return {
      id: item.mal_id,
      provider: 'jikan-anime',
      title: item.title_english || item.title || item.title_japanese || 'Sem título',
      originalTitle: item.title_japanese || '',
      url: item.url || '',
      coverUrl: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
      synopsis: this.stripHtml(item.synopsis || 'Sem sinopse disponível.'),
      type: item.type || '',
      status: item.status || '',
      episodes: item.episodes || null,
      score: item.score || null,
      rank: item.rank || null,
      year: item.year || item.aired?.prop?.from?.year || null,
      rating: item.rating || '',
      genres: [...(item.genres || []), ...(item.themes || []), ...(item.demographics || [])].map(g => g.name).filter(Boolean),
      studios: (item.studios || []).map(s => s.name).filter(Boolean),
      trailer: {
        youtubeId: item.trailer?.youtube_id || null,
        url: item.trailer?.url || null,
        embedUrl: item.trailer?.embed_url || null,
        imageUrl: item.trailer?.images?.large_image_url || item.trailer?.images?.maximum_image_url || null
      }
    };
  }

  async latest(page = 1) {
    const payload = await this.request('/v4/top/anime', { page, limit: 24, filter: 'airing', sfw: true });
    return {
      items: (payload.data || []).map(item => this.normalizeAnime(item)),
      page: Number(page),
      total: payload.pagination?.items?.total || 0,
      hasNextPage: Boolean(payload.pagination?.has_next_page)
    };
  }

  async search(query, page = 1) {
    const payload = await this.request('/v4/anime', { q: query, page, limit: 24, sfw: true, order_by: 'score', sort: 'desc' });
    return {
      items: (payload.data || []).map(item => this.normalizeAnime(item)),
      page: Number(page),
      total: payload.pagination?.items?.total || 0,
      hasNextPage: Boolean(payload.pagination?.has_next_page)
    };
  }

  async details(id, episodesPage = 1) {
    const [animePayload, episodesPayload] = await Promise.all([
      this.request(`/v4/anime/${id}/full`),
      this.request(`/v4/anime/${id}/episodes`, { page: episodesPage }).catch(() => ({ data: [], pagination: {} }))
    ]);

    const anime = this.normalizeAnime(animePayload.data || {});
    const episodes = (episodesPayload.data || []).map(ep => ({
      id: ep.mal_id || ep.episode_id || ep.number,
      number: ep.mal_id || ep.number || ep.episode_id,
      title: ep.title || ep.title_japanese || `Episódio ${ep.mal_id || ep.number || '?'}`,
      titleJapanese: ep.title_japanese || '',
      titleRomanji: ep.title_romanji || '',
      aired: ep.aired || null,
      score: ep.score || null,
      filler: Boolean(ep.filler),
      recap: Boolean(ep.recap),
      hasConfiguredVideo: Boolean(this.getLocalEpisodeSource(id, ep.mal_id || ep.episode_id || ep.number))
    }));

    return {
      ...anime,
      episodesList: episodes,
      episodesPage: Number(episodesPage),
      episodesHasNextPage: Boolean(episodesPayload.pagination?.has_next_page)
    };
  }

  readLocalSources() {
    try {
      if (!fs.existsSync(this.sourcesPath)) return {};
      return JSON.parse(fs.readFileSync(this.sourcesPath, 'utf8'));
    } catch (error) {
      console.warn('[anime sources] JSON inválido:', error.message);
      return {};
    }
  }

  getLocalEpisodeSource(animeId, episodeId) {
    const data = this.readLocalSources();
    const anime = data[String(animeId)];
    if (!anime) return null;

    let episode = null;
    if (Array.isArray(anime.episodes)) {
      episode = anime.episodes.find(ep => String(ep.id) === String(episodeId) || String(ep.number) === String(episodeId));
    } else if (anime.episodes && typeof anime.episodes === 'object') {
      episode = anime.episodes[String(episodeId)] || null;
    }

    if (!episode) return null;

    const type = episode.type || (episode.embedUrl ? 'embed' : episode.hlsUrl ? 'hls' : 'mp4');
    const url = episode.url || episode.videoUrl || episode.hlsUrl || episode.embedUrl || '';
    if (!url) return null;

    return {
      ...episode,
      type,
      url,
      title: episode.title || `Episódio ${episode.number || episode.id || episodeId}`
    };
  }

  getConfiguredEpisodeIds(animeId) {
    const data = this.readLocalSources();
    const anime = data[String(animeId)];
    if (!anime) return new Set();
    if (Array.isArray(anime.episodes)) {
      return new Set(anime.episodes.flatMap(ep => [String(ep.id), String(ep.number)].filter(Boolean)));
    }
    if (anime.episodes && typeof anime.episodes === 'object') return new Set(Object.keys(anime.episodes));
    return new Set();
  }
}

module.exports = new AnimeService();
