import "dotenv/config";
import http from "http";
import { Telegraf } from "telegraf";
import { pool, testConnection } from "../database.js";

const port = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.write("Bot do FinDash rodando!");
    res.end();
  })
  .listen(port, () => {
    console.log(
      `🌐 Servidor "fantasma" escutando na porta ${port} para a Render.`,
    );
  });

const bot = new Telegraf(process.env.BOT_TOKEN || "");

await testConnection();

bot.command("start", (ctx) => {
  ctx.reply(
    "🤖 Olá! Eu sou o seu bot de controle de gastos.\n\nUse os comandos:\n/gasto [valor] [descrição] - para registrar um gasto\n/ultimos - para ver os últimos 3 gastos\n/resumo - para ver o resumo do mês\n/desfazer - para apagar o último gasto registrado",
  );
});

bot.command("gasto", async (ctx) => {
  const argsText = ctx.message.text.replace("/gasto", "").trim();
  const args = argsText.split(" ");

  if (args.length < 2) {
    return ctx.reply(
      "⚠️ Opa, formato incorreto.\nExemplo: /gasto 35.50 Gasolina",
    );
  }

  if (args[0] !== null && typeof args[0] !== "string") {
    ctx.reply("⚠️ O valor informado não é um número válido.");
    return;
  }
  const valorNum = parseFloat(args[0].replace(",", "."));

  if (isNaN(valorNum)) {
    return ctx.reply("⚠️ O valor informado não é um número válido.");
  }

  const descricao = args.slice(1).join(" ");

  try {
    await pool.query(
      "INSERT INTO despesas (valor, descricao) VALUES ($1, $2)",
      [valorNum, descricao],
    );

    ctx.reply(
      `✅ Registrado!\n💸 Valor: R$ ${valorNum.toFixed(2)}\n📝 Ref: ${descricao}`,
    );
  } catch (error) {
    console.error("Erro ao salvar:", error);
    ctx.reply("❌ Putz, ocorreu um erro ao salvar no banco.");
  }
});

bot.command("ultimos", async (ctx) => {
  try {
    const result = await pool.query(
      "SELECT valor, descricao FROM despesas ORDER BY id DESC LIMIT 3",
    );

    if (result.rows.length === 0) {
      return ctx.reply("📭 Nenhum gasto registrado ainda.");
    }

    let mensagem = "🕒 *Últimos 3 gastos:*\n\n";

    result.rows.forEach((linha, index) => {
      const valor = parseFloat(linha.valor).toFixed(2);
      mensagem += `${index + 1}️⃣ R$ ${valor} - ${linha.descricao}\n`;
    });

    // Envia a mensagem pro Telegram, ativando o Markdown para deixar o título em negrito
    ctx.reply(mensagem, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Erro ao buscar últimos gastos:", error);
    ctx.reply("❌ Putz, ocorreu um erro ao buscar o histórico.");
  }
});

bot.command("resumo", async (ctx) => {
  try {
    const query = `
            SELECT COALESCE(SUM(valor), 0) AS total
            FROM despesas
            WHERE date_trunc('month', data_registro) = date_trunc('month', CURRENT_DATE)
        `;

    const result = await pool.query(query);
    const total = parseFloat(result.rows[0].total);

    const nomeMes = new Date().toLocaleString("pt-BR", { month: "long" });

    const mesFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

    ctx.reply(
      `📊 *Resumo de ${mesFormatado}*\n\n💰 Total gasto: R$ ${total.toFixed(2)}`,
      { parse_mode: "Markdown" },
    );
  } catch (error) {
    console.error("Erro ao somar mês:", error);
    ctx.reply("❌ Erro ao buscar os dados do mês.");
  }
});

bot.command("desfazer", async (ctx) => {
  try {
    const query = `
            DELETE FROM despesas
            WHERE id = (SELECT MAX(id) FROM despesas)
            RETURNING valor, descricao
        `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return ctx.reply("🤷‍♂️ Não há nenhum registro para desfazer.");
    }

    const gastoApagado = result.rows[0];
    const valorFormatado = parseFloat(gastoApagado.valor).toFixed(2);

    ctx.reply(
      `🗑️ *Último gasto removido com sucesso!*\n\nFoi apagado: R$ ${valorFormatado} - ${gastoApagado.descricao}`,
      { parse_mode: "Markdown" },
    );
  } catch (error) {
    console.error("Erro ao desfazer:", error);
    ctx.reply("❌ Erro ao tentar apagar o último registro.");
  }
});

bot.launch();
console.log("🤖 Bot inicializado. Aguardando mensagens...");

process.once("SIGINT", () => {
  bot.stop("SIGINT");
  pool.end();
});
process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
  pool.end();
});
