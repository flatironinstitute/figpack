import { applyD1Migrations, env } from 'cloudflare:test';

await applyD1Migrations(env.figpack_db, env.TEST_MIGRATIONS);
