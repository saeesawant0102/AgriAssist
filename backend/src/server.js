import { createApp } from './app.js';
import { env } from './config/env.js';
import { createContainer } from './container.js';
import { migrate } from './db/migrate.js';

async function bootstrap() {
  try {
    console.log('[Server] Initializing AgriAssist backend...');
    const deps = await createContainer();

    console.log('[Server] Running database migrations...');
    const applied = await migrate(deps.db);
    if (applied.length > 0) {
      console.log(`[Server] Applied ${applied.length} new migration(s):`, applied);
    } else {
      console.log('[Server] Database is up to date.');
    }

    const app = createApp(deps);

    const server = app.listen(env.PORT, () => {
      console.log(`[Server] AgriAssist backend listening on port ${env.PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`[Server] Received ${signal}, closing server...`);
      server.close(async () => {
        try {
          await deps.db.close();
          console.log('[Server] Database connection closed.');
          process.exit(0);
        } catch (err) {
          console.error('[Server] Error during database shutdown:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[Server] Fatal bootstrap error:', err);
    process.exit(1);
  }
}

bootstrap();
