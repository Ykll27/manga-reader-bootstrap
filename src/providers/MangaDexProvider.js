const BaseProvider = require('./BaseProvider');

class MangaDexProvider extends BaseProvider {
  constructor(config = {}) {
    super('mangadex');
    this.baseUrl = (config.baseUrl || 'https://api.mangadex.org').replace(/\/$/, '');
    this.uploadsUrl = (config.uploadsUrl || 'https://uploads.mangadex.org').replace(/\/$/, '');
    this.languages = Array.isArray(config.languages) && config.languages.length
      ? config.languages
      : ['pt-br'];
  }

  async request(path, params = {}) {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) value.forEach(item => url.searchParams.append(key, item));
      else if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PrivateMangaReader/1.1'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw Object.assign(new Error(`MangaDex respondeu ${response.status}: ${body.slice(0, 180)}`), {
        status: response.status >= 500 ? 502 : response.status
      });
    }
    return response.json();
  }

  localizedText(object = {}) {
    for (const language of this.languages) {
      if (object[language]) return object[language];
    }
    // Títulos oficiais muitas vezes só existem em inglês/japonês; por isso existe fallback visual.
    // Capítulos e páginas seguem filtrados apenas pelo idioma definido em MANGADEX_LANGUAGES.
    return object['pt-br'] || object.pt_br || object.en || Object.values(object)[0] || '';
  }

  statusPt(status = '') {
    const map = { ongoing: 'Em lançamento', completed: 'Completo', hiatus: 'Em pausa', cancelled: 'Cancelado' };
    return map[status] || status || '';
  }

  coverFromRelationships(manga) {
    const cover = manga.relationships?.find(rel => rel.type === 'cover_art');
    const filename = cover?.attributes?.fileName;
    return filename
      ? `${this.uploadsUrl}/covers/${manga.id}/${filename}.512.jpg`
      : 'https://placehold.co/512x768?text=Sem+capa';
  }

  normalizeManga(manga) {
    const attr = manga.attributes || {};
    return {
      id: manga.id,
      title: this.localizedText(attr.title),
      synopsis: this.localizedText(attr.description),
      status: this.statusPt(attr.status),
      year: attr.year || null,
      genres: (attr.tags || []).map(tag => this.localizedText(tag.attributes?.name || {})).filter(Boolean),
      coverUrl: this.coverFromRelationships(manga),
      latestChapter: attr.lastChapter ? `Capítulo ${attr.lastChapter}` : '',
      originalLanguage: attr.originalLanguage || ''
    };
  }

  baseMangaParams(limit = 24, offset = 0) {
    return {
      limit,
      offset,
      'includes[]': ['cover_art'],
      'contentRating[]': ['safe'],
      'availableTranslatedLanguage[]': this.languages,
      'hasAvailableChapters': 'true'
    };
  }

  async latest({ page = 1 } = {}) {
    const limit = 24;
    const payload = await this.request('/manga', {
      ...this.baseMangaParams(limit, (Number(page) - 1) * limit),
      'order[latestUploadedChapter]': 'desc'
    });
    return { items: (payload.data || []).map(item => this.normalizeManga(item)), total: payload.total || 0 };
  }

  async search(query, { page = 1 } = {}) {
    const limit = 24;
    const payload = await this.request('/manga', {
      ...this.baseMangaParams(limit, (Number(page) - 1) * limit),
      title: query,
      'order[relevance]': 'desc'
    });
    return { items: (payload.data || []).map(item => this.normalizeManga(item)), total: payload.total || 0 };
  }

  async details(id) {
    const [mangaPayload, feedPayload] = await Promise.all([
      this.request(`/manga/${encodeURIComponent(id)}`, { 'includes[]': ['cover_art', 'author', 'artist'] }),
      this.request(`/manga/${encodeURIComponent(id)}/feed`, {
        limit: 100,
        'translatedLanguage[]': this.languages,
        'contentRating[]': ['safe'],
        'order[volume]': 'desc',
        'order[chapter]': 'desc'
      })
    ]);

    const manga = this.normalizeManga(mangaPayload.data);
    const seen = new Set();
    manga.chapters = (feedPayload.data || [])
      .filter(chapter => {
        const key = `${chapter.attributes?.volume || ''}:${chapter.attributes?.chapter || chapter.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(chapter => ({
        id: chapter.id,
        title: chapter.attributes?.title
          ? `Cap. ${chapter.attributes.chapter || '?'} — ${chapter.attributes.title}`
          : `Capítulo ${chapter.attributes?.chapter || '?'}`,
        number: chapter.attributes?.chapter || '',
        volume: chapter.attributes?.volume || '',
        language: chapter.attributes?.translatedLanguage || '',
        publishedAt: chapter.attributes?.publishAt || chapter.attributes?.readableAt || ''
      }));

    return manga;
  }

  async chapter(mangaId, chapterId) {
    const [manga, chapterPayload, atHomePayload, feedPayload] = await Promise.all([
      this.detailsWithoutFeed(mangaId),
      this.request(`/chapter/${encodeURIComponent(chapterId)}`),
      this.request(`/at-home/server/${encodeURIComponent(chapterId)}`),
      this.request(`/manga/${encodeURIComponent(mangaId)}/feed`, {
        limit: 100,
        'translatedLanguage[]': this.languages,
        'contentRating[]': ['safe'],
        'order[volume]': 'asc',
        'order[chapter]': 'asc'
      })
    ]);

    const chapter = chapterPayload.data;
    const hash = atHomePayload.chapter?.hash;
    const files = atHomePayload.chapter?.dataSaver?.length
      ? atHomePayload.chapter.dataSaver
      : atHomePayload.chapter?.data || [];
    const folder = atHomePayload.chapter?.dataSaver?.length ? 'data-saver' : 'data';
    const pages = files.map(file => `${atHomePayload.baseUrl}/${folder}/${hash}/${file}`);

    const ordered = (feedPayload.data || []).map(item => item.id);
    const index = ordered.indexOf(chapterId);

    return {
      manga,
      chapter: {
        id: chapter.id,
        title: chapter.attributes?.title
          ? `Cap. ${chapter.attributes.chapter || '?'} — ${chapter.attributes.title}`
          : `Capítulo ${chapter.attributes?.chapter || '?'}`
      },
      pages,
      previousId: index > 0 ? ordered[index - 1] : null,
      nextId: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null
    };
  }

  async detailsWithoutFeed(id) {
    const payload = await this.request(`/manga/${encodeURIComponent(id)}`, { 'includes[]': ['cover_art'] });
    return this.normalizeManga(payload.data);
  }
}

module.exports = MangaDexProvider;
