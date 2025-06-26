const UserModel = require('../models/UsersModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class AuthController {
  async login(request, response) {
    try {
      const { email, password } = request.body;

      if (!email || !password) {
        return response.status(400).json({ error: 'Email e senha obrigatórios.' });
      }

      const user = await UserModel.findOne({ where: { email } });

      if (!user) {
        return response.status(400).json({ error: 'Usuário não encontrado.' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return response.status(400).json({ error: 'Senha inválida.' });
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: '1d',
      });

      return response.status(200).json({ token });
    } catch (error) {
      console.error('Erro no login:', error);
      return response.status(500).json({ error: 'Erro interno no servidor.' });
    }
  }
}

module.exports = AuthController;
