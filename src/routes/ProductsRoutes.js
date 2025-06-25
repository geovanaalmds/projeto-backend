const express = require('express');
const ProductsController = require('../controllers/ProductsController');
const ProductRoutes = express.Router();

const productController = new ProductsController();


ProductRoutes.get('/search', (req, res) => productController.search(req, res));
ProductRoutes.get('/:id', (req, res) => productController.getProductById(req, res));
ProductRoutes.post('/', (req, res) => productController.create(req, res));
ProductRoutes.put('/:id', (req, res) => productController.update(req, res));
ProductRoutes.delete('/:id', (req, res) => productController.delete(req, res));

module.exports = ProductRoutes;

