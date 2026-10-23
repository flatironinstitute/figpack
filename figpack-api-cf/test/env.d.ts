declare module 'cloudflare:test' {
	interface ProvidedEnv extends Env {
		figpack_db: D1Database;
		OPENROUTER_API_KEY: string;
		TEST_MIGRATIONS: D1Migration[];
	}
}
