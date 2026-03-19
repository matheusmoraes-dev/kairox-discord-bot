const { EmbedBuilder } = require('discord.js');
const { getActivePurchase } = require('../../database/database');

module.exports = {
  name: 'vip',
  aliases: ['premium', 'assinatura'],
  description: 'Verifica o status da sua assinatura Premium.',
  async execute(message, args, client) {
    try {
      const purchase = await getActivePurchase(message.author.id);

      if (!purchase) {
        const embed = new EmbedBuilder()
          .setTitle('<:offlinestatus:1395921900034719814> **Status Plano Premium**')
          .setDescription(
            '<:premium:1391947903303553155>  Nenhum plano **ativo** encontrado.\n\n' +
            '> Você ainda **não** possui um plano **Premium.**\n\n' +
            '<a:estrela:1383495071558537277>  Desbloqueie** recursos** exclusivos e** benefícios** especiais ativando agora mesmo seu **Premium**!\n\n' +
            '<:setadupla:1391438085367005246> Acesse <#1384688112415936532> e clique em **Comprar Premium** para garantir o seu!'
          )
          .setColor(0xec5353)
          .setFooter({ text: 'Kairox - Loja Premium' })
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      const expiraEmTimestamp = Number(purchase.expires_at);
      if (isNaN(expiraEmTimestamp)) {
        throw new Error('Timestamp de expiração inválido');
      }

      const expiraEm = new Date(expiraEmTimestamp);

      const embed = new EmbedBuilder()
        .setTitle('<:onlinestatus:1395921926005985280> **Status Plano Premium**')
        .setDescription(
          `<:premium:1391947903303553155> Plano **Premium**\n\n` +
          `<:orbs:1392165465765449778> **Status**: Você **possui** o plano **Premium** ativo!\n\n` +
          `<:relogio:1383970376916140134> **Expira**: ${expiraEm.toLocaleDateString('pt-BR')} às ${expiraEm.toLocaleTimeString('pt-BR')}`
        )
        .setColor(0x109010)
        .setFooter({ text: 'Kairox - Status do Premium' })
        .setTimestamp();

      return message.reply({ embeds: [embed] });

    } catch (err) {
      console.error('Erro ao executar comando vip:', err);
      return message.reply('❌ Ocorreu um erro ao verificar o status do Premium.');
    }
  }
};