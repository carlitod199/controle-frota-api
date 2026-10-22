import { createApp } from './app.js';
import { seedDemoData } from './demoData.js';

const port = Number(process.env.PORT) || 3000;

if (process.argv.includes('--demo')) {
  seedDemoData();
}

createApp().listen(port, () => {
  console.log(`API disponível em http://localhost:${port}`);
});
