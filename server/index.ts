import 'dotenv/config';
import express from 'express';
import productImporterRoutes from './product-importer/routes';

const app = express();
const port = Number(process.env.IMPORTER_PORT ?? 8787);

app.use(express.json({ limit: '2mb' }));
app.use('/api', productImporterRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'product-importer' });
});

app.listen(port, () => {
  console.log(`[product-importer] running on http://localhost:${port}`);
});
