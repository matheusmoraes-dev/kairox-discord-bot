// comandos/krifa.js
const { dbRun, dbGet, dbAll, getOrCreate, logTransaction } = require('../../database/database');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const KRONOS_POR_TICKET = 250;
const MAX_TICKETS_POR_USER = 250000;

// 🔢 Função para interpretar quantidade com abreviações (ex.: 10k = 10.000)
function parseQuantidade(input) {
  if (!input) return 1;
  let texto = input.toLowerCase().trim();
  let multiplicador = 1;

  if (texto.endsWith('k')) {
    multiplicador = 1000;
    texto = texto.slice(0, -1);
  }

  const num = parseFloat(texto.replace(',', '.'));
  if (isNaN(num) || num <= 0) return null;
  return Math.floor(num * multiplicador);
}

module.exports = {
  name: 'rifa',
  aliases: ['rifa'],
  async execute(message, args, client) {
    const subcomando = (args[0] || '').toLowerCase();

    // 📌 STATUS DA RIFA RELÂMPAGO
    if (!subcomando || subcomando === 'status') {
      const rifa = await dbGet(`SELECT * FROM rifas WHERE tipo = 'relampago' ORDER BY id DESC LIMIT 1`);
      if (!rifa) return message.reply('❌ Nenhuma Rifa Relâmpago ativa no momento.');

      const participantes = await dbAll(
        `SELECT COUNT(DISTINCT user_id) as total FROM rifa_participantes WHERE rifa_id = ?`,
        [rifa.id]
      );
      const totalParticipantes = participantes[0]?.total || 0;

      const texto = `
<:kairox:1386008482150355004> | **RELÂMPAGO**
<:kairoxnervoso:1386010152645300285> | Prêmio atual: **${rifa.premio.toLocaleString()}**
<:1000030791:1386043262451847380> | Tickets comprados: **${rifa.tickets_total.toLocaleString()}**
👥 | Pessoas participando: **${totalParticipantes}**
<:kairoxfeliz:1386008425913253938> | Último ganhador: **${rifa.ganhador_id ? `<@${rifa.ganhador_id}>` : 'Ainda não houve'}**
<a:fogo:1384656721032515700> | Resultado irá sair em: <t:${rifa.timestamp}:R>
<:kronos:1383480432233807942> | Compre um ticket por **${KRONOS_POR_TICKET.toLocaleString()} Kronos** usando \`Krifa relampago comprar\`
<:riquinho:1384300448361611305> | Máximo de **${MAX_TICKETS_POR_USER.toLocaleString()} tickets** por pessoa
      `;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rifa_notificar')
          .setLabel('🔔 Ser notificado quando acabar')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rifa_participantes')
          .setLabel('👥 Ver participantes')
          .setStyle(ButtonStyle.Secondary)
      );

      return message.reply({ content: texto, components: [row] });
    }

    // 📌 COMPRAR TICKETS
    if (subcomando === 'relampago' && args[1]?.toLowerCase() === 'comprar') {
      const quantidade = parseQuantidade(args[2]);
      if (!quantidade || quantidade <= 0) {
        return message.reply('❌ Quantidade inválida. Exemplo: `Krifa relampago comprar 1` ou `Krifa relampago comprar 10k`');
      }

      const user = await getOrCreate(message.author.id, message.author.username);

      const rifa = await dbGet(`SELECT * FROM rifas WHERE tipo = 'relampago' ORDER BY id DESC LIMIT 1`);
      if (!rifa) return message.reply('❌ Nenhuma Rifa Relâmpago ativa no momento.');

      // Verifica quantos tickets o usuário já possui
      const jaTem = await dbGet(
        `SELECT SUM(quantidade) as total FROM rifa_participantes WHERE rifa_id = ? AND user_id = ?`,
        [rifa.id, user.user_id]
      );
      const totalAtual = jaTem?.total || 0;

      // Verifica se ultrapassa o limite
      if (totalAtual + quantidade > MAX_TICKETS_POR_USER) {
        return message.reply(
          `❌ Você já possui **${totalAtual.toLocaleString()} tickets**. O limite é **${MAX_TICKETS_POR_USER.toLocaleString()}**. ` +
          `Você só pode comprar **${(MAX_TICKETS_POR_USER - totalAtual).toLocaleString()}** tickets a mais.`
        );
      }

      const custo = quantidade * KRONOS_POR_TICKET;
      if (user.money < custo) {
        return message.reply(`❌ Você não tem Kronos suficientes. Precisa de **${custo.toLocaleString()} Kronos**.`);
      }

      // Insere compra
      await dbRun(
        `INSERT INTO rifa_participantes (rifa_id, user_id, quantidade) VALUES (?, ?, ?)`,
        [rifa.id, user.user_id, quantidade]
      );

      // Atualiza rifa
      await dbRun(
        `UPDATE rifas SET tickets_total = tickets_total + ?, premio = premio + ? WHERE id = ?`,
        [quantidade, custo, rifa.id]
      );

      // Debita saldo do usuário
      user.money -= custo;
      await dbRun(`UPDATE users SET money = ? WHERE user_id = ?`, [user.money, user.user_id]);

      // ✅ REGISTRA TRANSAÇÃO
      await logTransaction(user.user_id, 'rifa', -custo, `Comprou ${quantidade} ticket(s) na Rifa Relâmpago`);

      return message.reply(
        `🎫 **|** Você comprou **${quantidade.toLocaleString()} ticket${quantidade > 1 ? 's' : ''}** por **${custo.toLocaleString()} Kronos** na **Rifa Relâmpago**!\n` +
        `🧾 Acompanhe com \`Krifa status\` ou compre mais tickets: \`Krifa relampago comprar (quantidade)\``
      );
    }

    return message.reply('❌ Comando inválido. Use `Krifa status` ou `Krifa relampago comprar (quantidade)`');
  },
};