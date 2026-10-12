import 'dotenv/config';
import { app } from './app.js';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Servidor API iniciado en http://localhost:${PORT}`);
  console.log(`Endpoints base disponibles en http://localhost:${PORT}/api/v1`);
});
