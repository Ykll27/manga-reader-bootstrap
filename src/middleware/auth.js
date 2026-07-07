function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  if (!req.session.user.approved) {
    req.session.destroy(() => {});
    return res.status(403).render('error', { title: 'Conta pendente', message: 'Sua conta ainda aguarda aprovação do administrador.' });
  }
  next();
}

function requireApiAuth(req, res, next) {
  if (!req.session.user?.approved) return res.status(401).json({ error: 'Faça login para continuar.' });
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.user?.role !== 'admin') return res.status(403).render('error', { title: 'Acesso negado', message: 'Esta página é restrita ao administrador.' });
  next();
}

module.exports = { requireAuth, requireApiAuth, requireAdmin };
