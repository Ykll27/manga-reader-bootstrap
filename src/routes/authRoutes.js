const router = require('express').Router();
const authController = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Telas
router.get('/login', authController.showLogin);
router.get('/cadastro', authController.showRegister);
router.get('/register', authController.showRegister);

// Ações de autenticação
router.post('/login', authController.login);
router.post('/cadastro', authController.register);
router.post('/register', authController.register);
router.post('/logout', authController.logout);

// Admin
router.post('/admin/users/:id/approve', requireAuth, requireAdmin, authController.approveUser);

module.exports = router;
