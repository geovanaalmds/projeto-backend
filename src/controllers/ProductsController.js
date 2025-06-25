const ProductsModel = require('../models/ProductsModel');
const ProductImageModel = require('../models/ProductImageModel');
const ProductOptionModel = require('../models/ProductOptionModel');
const ProductandCategoryModel = require('../models/ProductandCategoryModel');
const { Op } = require('sequelize');

class ProductsController {
  async search(request, response) {
    try {
      const {
        limit = 12,
        page = 1,
        fields,
        match,
        category_ids,
        'price-range': priceRange,
        ...options
      } = request.query;

      const where = {};
      const include = [
        { model: ProductImageModel, as: 'images' },
        { model: ProductOptionModel, as: 'options' },
        { model: ProductandCategoryModel, as: 'product_category_links' }
      ];

      // Busca por nome ou descrição
      if (match) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${match}%` } },
          { description: { [Op.iLike]: `%${match}%` } }
        ];
      }

      // Faixa de preço
      if (priceRange) {
        const [min, max] = priceRange.split('-').map(Number);
        where.price = { [Op.between]: [min, max] };
      }

      // Categoria
      if (category_ids) {
        const ids = category_ids.split(',').map(Number);
        include.push({
          model: ProductandCategoryModel,
          as: 'product_category_links',
          where: { category_id: { [Op.in]: ids } }
        });
      }

      // Paginação
      const offset = limit == -1 ? undefined : (page - 1) * limit;
      const finalLimit = limit == -1 ? undefined : parseInt(limit);

      const { rows, count } = await ProductsModel.findAndCountAll({
        where,
        include,
        limit: finalLimit,
        offset
      });

      let result = rows.map(row => row.toJSON());

      // Filtro por opções
      for (const key of Object.keys(options)) {
        const match = key.match(/^option\[(\d+)\]$/);
        if (match) {
          const values = options[key].split(',');
          result = result.filter(product =>
            product.options.some(opt =>
              Array.isArray(opt.value) &&
              opt.value.some(val => values.includes(val))
            )
          );
        }
      }

      // Filtro de campos
      if (fields) {
        const selected = fields.split(',');
        result = result.map(product => {
          const filtered = {};
          selected.forEach(f => filtered[f] = product[f]);
          return filtered;
        });
      }

      return response.status(200).json({
        data: result,
        total: count,
        limit: limit == -1 ? count : parseInt(limit),
        page: parseInt(page)
      });

    } catch (error) {
      console.error(error);
      return response.status(400).json({ error: 'Erro ao buscar produtos.' });
    }
  }

  async getProductById(request, response) {
    try {
      const { id } = request.params;

      const product = await ProductsModel.findByPk(id, {
        include: [
          { model: ProductImageModel, as: 'images' },
          { model: ProductOptionModel, as: 'options' },
          { model: ProductandCategoryModel, as: 'product_category_links' }
        ]
      });

      if (!product) return response.status(404).send();
      return response.status(200).json(product);

    } catch (error) {
      console.error(error);
      return response.status(400).json({ error: 'Erro ao buscar produto.' });
    }
  }

  async create(request, response) {
    try {
      const {
        images = [],
        options = [],
        category_ids = [],
        ...productData
      } = request.body;

      const newProduct = await ProductsModel.create(productData);

      // Imagens
      for (const img of images) {
        await ProductImageModel.create({
          product_id: newProduct.id,
          ...img
        });
      }

      // Opções
      for (const opt of options) {
        await ProductOptionModel.create({
          product_id: newProduct.id,
          ...opt
        });
      }

      // Categorias
      for (const category_id of category_ids) {
        await ProductandCategoryModel.create({
          product_id: newProduct.id,
          category_id
        });
      }

      return response.status(201).json(newProduct);
    } catch (error) {
      console.error(error);
      return response.status(400).json({ error: 'Erro ao criar produto.' });
    }
  }

  async update(request, response) {
    try {
      const { id } = request.params;
      const {
        images = [],
        options = [],
        category_ids = [],
        ...productData
      } = request.body;

      const product = await ProductsModel.findByPk(id);
      if (!product) return response.status(404).send();

      await product.update(productData);

      // Atualizar imagens
      for (const img of images) {
        if (img.deleted) {
          await ProductImageModel.destroy({ where: { id: img.id } });
        } else if (img.id) {
          await ProductImageModel.update(img, { where: { id: img.id } });
        } else {
          await ProductImageModel.create({ product_id: id, ...img });
        }
      }

      // Atualizar opções
      for (const opt of options) {
        if (opt.deleted) {
          await ProductOptionModel.destroy({ where: { id: opt.id } });
        } else if (opt.id) {
          await ProductOptionModel.update(opt, { where: { id: opt.id } });
        } else {
          await ProductOptionModel.create({ product_id: id, ...opt });
        }
      }

      // Atualizar categorias (simples: remove todas e recria)
      await ProductandCategoryModel.destroy({ where: { product_id: id } });
      for (const category_id of category_ids) {
        await ProductandCategoryModel.create({ product_id: id, category_id });
      }

      return response.status(204).send();
    } catch (error) {
      console.error(error);
      return response.status(400).json({ error: 'Erro ao atualizar produto.' });
    }
  }

  async delete(request, response) {
    try {
      const { id } = request.params;

      const product = await ProductsModel.findByPk(id);
      if (!product) return response.status(404).send();

      await product.destroy();

      return response.status(204).send();
    } catch (error) {
      console.error(error);
      return response.status(400).json({ error: 'Erro ao excluir produto.' });
    }
  }
}

module.exports = ProductsController;
