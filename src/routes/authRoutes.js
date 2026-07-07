const router=require('express').Router(); const c=require('../controllers/authController');
router.get('/login',c.loginPage); router.post('/login',c.login); router.get('/cadastro',c.registerPage); router.post('/cadastro',c.register); router.post('/logout',c.logout); module.exports=router;
