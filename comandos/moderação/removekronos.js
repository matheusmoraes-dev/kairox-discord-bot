const parse = require('../../utils/parseValor');
const { getOrCreate, update } = require('../../database/database');
const { EmbedBuilder } = require('discord.js');

const STAFF_ROLE_ID = '1392360963642232952';
const LOG_CHANNEL_ID = '1392237451967463444';

module.exports = {
  name: 'removerkronos',
  aliases: ['remk', 'tirargrana', 'tirark'],
  description: '🛑 Remove Kronos de um usuário (somente para a Staff)',

  async execute(message, args, client) {
    if (!message.member.roles.cache.has(STAFF_ROLE_ID)) {
      return message.reply('❌ | Você não tem permissão para usar este comando.');
    }

    const userMention = args[0];
    const valorStr = args[1];

    if (!userMention || !valorStr) {
      return message.reply('❌ | Use: `Kremoverkronos @usuário 10k` ou `Kremoverkronos @usuário all`');
    }

    const userId = userMention.replace(/[<@!>]/g, '');
    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) return message.reply('❌ | Usuário inválido ou não encontrado.');

    const usuario = await getOrCreate(userId, member.user.username);
    const saldoAtual = usuario.money || 0;

    let valor;
    if (valorStr.toLowerCase() === 'all') {
      // 👇 pega todo o saldo do usuário
      valor = saldoAtual;
    } else {
      valor = parse(valorStr);
    }

    if (!valor || isNaN(valor) || valor <= 0) {
      return message.reply('❌ | Valor inválido informado.');
    }

    if (saldoAtual < valor) {
      return message.reply('❌ | O usuário não possui Kronos suficientes para essa remoção.');
    }

    usuario.money = saldoAtual - valor;
    await update(usuario);

    await message.reply(
      `🛑 | Você removeu **${valor.toLocaleString('pt-BR')}** Kronos de ${member.user.tag} (<@${userId}>).`
    );

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('📤 Kronos Removido')
        .setColor('#ff4d4d')
        .addFields(
          { name: '👤 Usuário', value: `<@${userId}> \`${member.user.tag}\``, inline: true },
          { name: '💸 Valor Removido', value: `${valor.toLocaleString('pt-BR')} Kronos`, inline: true },
          { name: '👮 Staff', value: `<@${message.author.id}> \`${message.author.tag}\`` }
        )
        .setFooter({ text: 'Banco Kairox • Controle de Reduções' })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    }
  }
};