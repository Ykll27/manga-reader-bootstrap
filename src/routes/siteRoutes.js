const router = require('express').Router();
const c = require('../controllers/siteController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', c.home);
router.get('/manga/:provider/:id', c.details);
router.get('/ler/:provider/:id/:chapterId', requireAuth, c.reader);

router.get('/animes', c.animeHome);
router.get('/anime/:id', c.animeDetails);
router.get('/anime/:id/assistir/:episodeId', requireAuth, c.animeWatch);

router.get('/biblioteca', requireAuth, c.library);
router.get('/admin', requireAuth, requireAdmin, c.admin);
router.post('/admin/users/:id/approve', requireAuth, requireAdmin, c.approve);

module.exports = router;
