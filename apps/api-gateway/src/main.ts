import { startGateway } from './server.js';

startGateway().catch((err: unknown) => {
  console.error('gateway failed to start:', err);
  process.exit(1);
});
