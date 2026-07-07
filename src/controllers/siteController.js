const { getProvider } = require('../providers');
const db = require('../config/database');
const metadataService = require('../services/MetadataService');
const animeService = require('../services/AnimeService');

// A MangaDex bloqueia hotlink direto (ver src/controllers/apiController.js#proxyImage).
// Para essa fonte, reescrevemos as URLs de imagem para passarem pelo nosso proxy /api/image.
const proxied = (provider, url) => (provider.name === 'mangadex' && url) ? `/api/image?url=${encodeURIComponent(url)}` : url;

exports.home = async (req, res, next) => {
  try {
    const provider = getProvider();
    const data = req.query.q
      ? await provider.search(req.query.q, { page: req.query.page || 1 })
      : await provider.latest({ page: req.query.page || 1 });
    const items = data.items.map(item => ({ ...item, coverUrl: proxied(provider, item.coverUrl) }));
    res.render('home', { title: req.query.q ? `Busca: ${req.query.q}` : 'Início', items, query: req.query.q || '', provider: provider.name });
  } catch (error) {
    next(error);
  }
};

exports.details = async (req, res, next) => {
  try {
    const provider = getProvider(req.params.provider);
    const rawManga = await provider.details(req.params.id);
    const manga = { ...rawManga, coverUrl: proxied(provider, rawManga.coverUrl) };
    let metadata = null;
    try { metadata = await metadataService.getBest(manga.title); } catch (error) { console.warn('[metadata] indisponível:', error.message); }
    let favorite = false;
    if (req.session.user) favorite = Boolean(db.prepare('SELECT 1 FROM favorites WHERE user_id=? AND provider=? AND manga_id=?').get(req.session.user.id, provider.name, manga.id));
    res.render('details', { title: manga.title, manga, metadata, provider: provider.name, favorite });
  } catch (error) {
    next(error);
  }
};

exports.reader = async (req, res, next) => {
  try {
    const provider = getProvider(req.params.provider);
    const raw = await provider.chapter(req.params.id, req.params.chapterId);
    const data = { ...raw, manga: { ...raw.manga, coverUrl: proxied(provider, raw.manga.coverUrl) }, pages: raw.pages.map(url => proxied(provider, url)) };
    res.render('reader', { title: `${data.manga.title} — ${data.chapter.title}`, data, provider: provider.name });
  } catch (error) {
    next(error);
  }
};

exports.animeHome = async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim();
    const page = Number(req.query.page || 1);
    const data = query ? await animeService.search(query, page) : await animeService.latest(page);
    res.render('anime/home', {
      title: query ? `Animes: ${query}` : 'Animes',
      items: data.items,
      query,
      page: data.page,
      hasNextPage: data.hasNextPage
    });
  } catch (error) {
    next(error);
  }
};

exports.animeDetails = async (req, res, next) => {
  try {
    const anime = await animeService.details(req.params.id, req.query.epPage || 1);
    const configuredEpisodes = animeService.getConfiguredEpisodeIds(req.params.id);
    anime.episodesList = anime.episodesList.map(ep => ({
      ...ep,
      hasConfiguredVideo: configuredEpisodes.has(String(ep.id)) || configuredEpisodes.has(String(ep.number))
    }));

    let favorite = false;
    if (req.session.user) {
      favorite = Boolean(db.prepare('SELECT 1 FROM favorites WHERE user_id=? AND provider=? AND manga_id=?').get(req.session.user.id, 'jikan-anime', String(anime.id)));
    }
    res.render('anime/details', { title: anime.title, anime, favorite });
  } catch (error) {
    next(error);
  }
};

exports.animeWatch = async (req, res, next) => {
  try {
    const anime = await animeService.details(req.params.id);
    const source = animeService.getLocalEpisodeSource(req.params.id, req.params.episodeId);
    const episode = source || anime.episodesList.find(ep => String(ep.id) === String(req.params.episodeId) || String(ep.number) === String(req.params.episodeId)) || {
      id: req.params.episodeId,
      number: req.params.episodeId,
      title: `Episódio ${req.params.episodeId}`
    };

    let progressSeconds = 0;
    if (req.session.user) {
      const saved = db.prepare('SELECT scroll_position FROM reading_progress WHERE user_id=? AND provider=? AND manga_id=? AND chapter_id=?')
        .get(req.session.user.id, 'jikan-anime', String(anime.id), String(episode.id || episode.number));
      progressSeconds = saved?.scroll_position || 0;
    }

    res.render('anime/watch', {
      title: `${anime.title} — Episódio ${episode.number || episode.id}`,
      anime,
      episode,
      source,
      progressSeconds
    });
  } catch (error) {
    next(error);
  }
};

exports.library = (req, res) => {
  const favorites = db.prepare('SELECT * FROM favorites WHERE user_id=? ORDER BY created_at DESC').all(req.session.user.id);
  const history = db.prepare('SELECT * FROM reading_progress WHERE user_id=? ORDER BY updated_at DESC').all(req.session.user.id);
  res.render('user/library', { title: 'Minha biblioteca', favorites, history });
};

exports.admin = (req, res) => {
  const users = db.prepare('SELECT id,name,email,role,approved,created_at FROM users ORDER BY created_at DESC').all();
  res.render('user/admin', { title: 'Administração', users });
};

exports.approve = (req, res) => {
  db.prepare('UPDATE users SET approved=1 WHERE id=?').run(req.params.id);
  res.redirect('/admin');
};
