const express = require('express');
const router = express.Router();

const userRoutes = require('../routes/UsersRoutes');
const categoryRoutes = require('../routes/CategoriesRoutes');
const productRoutes = require('../routes/ProductsRoutes');
const authRoutes = require('../routes/AuthRoutes');

const AuthMiddleware = require('../middlewares/AuthMiddleware');

// Teste de rota
router.get('/', (req, res) => {
  res.json({ status: 'API funcionando' });
});

router.use('/v1/user', authRoutes); // Rota de autenticação
router.use(AuthMiddleware); // Protege rotas abaixo com o middleware

router.use('/v1/user', userRoutes);
router.use('/v1/category', categoryRoutes);
router.use('/v1/product', productRoutes);

module.exports = router;
