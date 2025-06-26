const jwt = require('jsonwebtoken');

function AuthMiddleware(req, res, next) {
  const methodsToProtect = ['POST', 'PUT', 'DELETE'];

  if (!methodsToProtect.includes(req.method)) {
    return next(); // Métodos GET estão liberados
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'Token ausente ou inválido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // opcional: pode acessar o ID do usuário depois
    return next();
  } catch (error) {
    return res.status(400).json({ error: 'Token inválido.' });
  }
}

module.exports = AuthMiddleware;
