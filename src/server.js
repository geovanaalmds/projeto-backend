require('dotenv').config();
const app = require('./app');

const port = process.env.port || 3000;

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
