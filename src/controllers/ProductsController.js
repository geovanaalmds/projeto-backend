/*const ProductModel = require('../models');

class ProductsController {
    async search(request, response) {
        try {

        }catch(error) {

        }
    }

    async getProductById(request, response) {
        try{

        }catch(error) {

        }
    }

    async create(request, response) {
        try {

        }catch(error) {

        }
    }

    async update(request, response) {
        try{

        }catch(error) {

        }
    }

    async delete(request, response) {
        try{

        }catch(error) {

        }
    }
}

module.exports = ProductsController;*/

const ProductModel = require('../models/ProductsModel');
const ProductImageModel = require('../models/ProductImageModel');
const ProductOptionModel = require('../models/ProductOptionsModel');
const ProductandCategoryModel = require('../models/ProductsandCategoriesModel');
const CategoryModel = require('../models/CategoriesModel');

class ProductsController {
  // GET /v1/product/search?filter=...&limit=...&page=...
  async search(request, response) {
    try {
      let { filter = '', limit = 10, page = 1 } = request.query;

      limit = parseInt(limit);
      page = parseInt(page);

      if (isNaN(limit) || isNaN(page) || limit <= 0 || page < 1) {
        return response.status(400).json({ error: 'Parâmetros inválidos.' });
      }

      const where = {};
      if (filter) {
        where.name = { [require('sequelize').Op.like]: `%${filter}%` };
      }

      const { rows, count } = await ProductModel.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        attributes: [
          'id',
          'name',
          'slug',
          'price',
          ['price_with_discount', 'priceDiscount'],
        ],
        include: [
          {
            model: ProductImageModel,
            as: 'images',
            where: { enabled: true },
            required: false,
            limit: 1,
          },
        ],
      });

      const data = rows.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        priceDiscount: product.priceDiscount,
        image: product.images?.[0]?.path || null,
      }));

      return response.status(200).json({
        data,
        total: count,
        limit,
        page,
      });
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return response.status(500).json({ error: 'Erro ao buscar produtos.' });
    }
  }

  // GET /v1/product/:id
  async getProductById(request, response) {
    try {
      const { id } = request.params;

      const product = await ProductModel.findByPk(id, {
        include: [
          { model: ProductImageModel, as: 'images' },
          { model: ProductOptionModel, as: 'options' },
          {
            model: ProductandCategoryModel,
            as: 'product_category_links',
            include: {
              model: CategoryModel,
              as: 'category',
              attributes: ['id', 'name'],
            },
          },
        ],
      });

      if (!product) {
        return response.status(404).json({ error: 'Produto não encontrado.' });
      }

      const sizes = [];
      const colors = [];

      product.options.forEach((opt) => {
        const values = opt.values.split(',').map((v) => v.trim());
        if (opt.type === 'text') sizes.push(...values);
        if (opt.type === 'color') colors.push(...values);
      });

      return response.status(200).json({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        priceDiscount: product.price_with_discount,
        description: product.description,
        images: product.images.map((img) => ({ src: img.path })),
        sizes,
        colors,
        categories: product.product_category_links.map((link) => ({
          id: link.category.id,
          name: link.category.name,
        })),
      });
    } catch (error) {
      console.error('Erro ao buscar produto por ID:', error);
      return response.status(500).json({ error: 'Erro ao buscar produto.' });
    }
  }

  // POST /v1/product
  async create(request, response) {
    try {
      const {
        name,
        slug,
        price,
        priceDiscount,
        description,
        images = [],
        options = [],
        categories = [],
      } = request.body;

      if (!name || !slug || !price || !priceDiscount) {
        return response.status(400).json({ error: 'Dados obrigatórios ausentes.' });
      }

      const product = await ProductModel.create({
        name,
        slug,
        price,
        price_with_discount: priceDiscount,
        description,
      });

      // Cadastra imagens
      for (const img of images) {
        await ProductImageModel.create({
          product_id: product.id,
          path: img,
          enabled: true,
        });
      }

      // Cadastra opções
      for (const opt of options) {
        await ProductOptionModel.create({
          product_id: product.id,
          title: opt.title,
          shape: opt.shape || 'square',
          radius: opt.radius || 0,
          type: opt.type,
          values: opt.values.join(','),
        });
      }

      // Relacionar com categorias
      for (const catId of categories) {
        await ProductandCategoryModel.create({
          product_id: product.id,
          category_id: catId,
        });
      }

      return response.status(201).json({ message: 'Produto criado com sucesso.' });
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      return response.status(500).json({ error: 'Erro ao criar produto.' });
    }
  }

  // PUT /v1/product/:id
  async update(request, response) {
    try {
      const { id } = request.params;
      const {
        name,
        slug,
        price,
        priceDiscount,
        description,
        images = [],
        options = [],
        categories = [],
      } = request.body;

      const product = await ProductModel.findByPk(id);

      if (!product) {
        return response.status(404).json({ error: 'Produto não encontrado.' });
      }

      await product.update({
        name,
        slug,
        price,
        price_with_discount: priceDiscount,
        description,
      });

      await ProductImageModel.destroy({ where: { product_id: id } });
      for (const img of images) {
        await ProductImageModel.create({
          product_id: id,
          path: img,
          enabled: true,
        });
      }

      await ProductOptionModel.destroy({ where: { product_id: id } });
      for (const opt of options) {
        await ProductOptionModel.create({
          product_id: id,
          title: opt.title,
          shape: opt.shape || 'square',
          radius: opt.radius || 0,
          type: opt.type,
          values: opt.values.join(','),
        });
      }

      await ProductandCategoryModel.destroy({ where: { product_id: id } });
      for (const catId of categories) {
        await ProductandCategoryModel.create({
          product_id: id,
          category_id: catId,
        });
      }

      return response.status(204).send();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      return response.status(500).json({ error: 'Erro ao atualizar produto.' });
    }
  }

  // DELETE /v1/product/:id
  async delete(request, response) {
    try {
      const { id } = request.params;
      const product = await ProductModel.findByPk(id);

      if (!product) {
        return response.status(404).json({ error: 'Produto não encontrado.' });
      }

      await product.destroy();
      return response.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      return response.status(500).json({ error: 'Erro ao deletar produto.' });
    }
  }
}

module.exports = ProductsController;
