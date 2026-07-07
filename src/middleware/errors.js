function notFound(req, res) {
  res.status(404).render('error', { title: 'Página não encontrada', message: 'O endereço informado não existe.' });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  const message = status === 500 ? 'Ocorreu um erro inesperado.' : err.message;
  if (req.originalUrl.startsWith('/api/')) return res.status(status).json({ error: message });
  res.status(status).render('error', { title: 'Erro', message });
}

module.exports = { notFound, errorHandler };
