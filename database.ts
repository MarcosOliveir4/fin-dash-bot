import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
