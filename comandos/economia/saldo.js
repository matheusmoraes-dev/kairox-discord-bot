const db = require('../../database/database');

module.exports = {
  name: 'saldo',
  description: '💰 Veja seu saldo ou o de outro jogador.',
  aliases: ['bal', 'atm', 'saldo'],
  async execute(message, args) {
    try {
      // Identifica o usuário alvo
      let targetUser = message.mentions.users.first();

      if (!targetUser && args[0]) {
        targetUser = await message.client.users.fetch(args[0]).catch(() => null);
      }

      if (!targetUser) targetUser = message.author;

      const targetUserId = targetUser.id;
      const targetUsername = targetUser.username || '';

      // Busca ou cria o usuário no banco
      const user = await db.getOrCreate(targetUserId, targetUsername);
      const ranked = await db.getUserRank(targetUserId, 'money');

      const kronosFormatado = user.money.toLocaleString('pt-BR');
      const kronosCompacto =
        user.money >= 1_000_000
          ? `${(user.money / 1_000_000).toFixed(1).replace('.', ',')}M`
          : user.money >= 1_000
            ? `${(user.money / 1_000).toFixed(1).replace('.', ',')}K`
            : user.money.toString();

      const rank = ranked.rank;
      const nextDiff = ranked.nextDiff;

      // Linha principal com reply bonito
      let linhaPrincipal = `<@${targetUserId}> | possui <:kronos:1383480432233807942> **${kronosFormatado} Kronos** \`(${kronosCompacto})\` !\n<a:trofeu:1384300328874283080> | Está em **#${rank}** no ranking de mais ricos.`;

      // Linha secundária condicional
      let linhaSecundaria = '';
      if (user.money === 0 && user.xp === 0 && user.jogadas === 0) {
        linhaPrincipal = `💰 <@${targetUserId}> | ainda não possui Kronos, nem entrou no ranking.`;
      } else if (rank === 1) {
        linhaSecundaria = `👑 | Você é o mais **rico** de todos! **Parabéns**!`;
      } else if (nextDiff !== null && rank > 1) {
        linhaSecundaria = `-# 📈 - Faltam **${nextDiff.toLocaleString('pt-BR')} Kronos** para alcançar o #${rank - 1}!`;
      }

      const resposta = `${linhaPrincipal}\n${linhaSecundaria}`;
      await message.reply(resposta);

    } catch (err) {
      console.error('Erro no comando saldo:', err);
      await message.reply(`❌ | Ocorreu um erro ao buscar o saldo de <@${message.author.id}>. Tente novamente mais tarde.`);
    }
  }
};