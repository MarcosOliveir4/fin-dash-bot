import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "❌ ERRO FATAL: A variável DATABASE_URL não foi encontrada no .env!",
  );
  process.exit(1);
}

export const pool = new Pool({
  connectionString: connectionString.replace("postgresql://", "postgres://"),
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function testConnection() {
  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS despesas (
                id SERIAL PRIMARY KEY,
                valor NUMERIC(10, 2) NOT NULL,
                descricao TEXT NOT NULL,
                data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    console.log('✅ Banco Neon conectado e tabela "despesas" pronta!');
  } catch (error) {
    console.error("❌ Erro ao conectar no PostgreSQL:", (error as any).message);
  }
}
