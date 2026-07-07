const router=require('express').Router(); const c=require('../controllers/apiController'); const {requireApiAuth}=require('../middleware/auth');
router.get('/metadata/search',c.searchMetadata); router.get('/image',c.proxyImage); router.post('/favorites/toggle',requireApiAuth,c.toggleFavorite); router.put('/progress',requireApiAuth,c.saveProgress); module.exports=router;
