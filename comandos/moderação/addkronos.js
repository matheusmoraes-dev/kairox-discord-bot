const parse = require('../../utils/parseValor');
const { getOrCreate, update } = require('../../database/database');
const { EmbedBuilder } = require('discord.js');

const STAFF_ROLE_ID = '1392360963642232952';
const LOG_CHANNEL_ID = '1392237451967463444';

module.exports = {
  name: 'addkronos',
  aliases: ['addk', 'give'],
  description: '💸 Adiciona Kronos a um usuário (somente para a Staff)',

  async execute(message, args, client) {
    if (!message.member.roles.cache.has(STAFF_ROLE_ID)) {
      return message.reply('❌ | Você não tem permissão para usar este comando.');
    }

    const userMention = args[0];
    const valorStr = args[1];

    if (!userMention || !valorStr) {
      return message.reply('❌ | Use: `Kaddkronos @usuário 10k`');
    }

    const userId = userMention.replace(/[<@!>]/g, '');
    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) return message.reply('❌ | Usuário inválido ou não encontrado.');

    const valor = parse(valorStr);
    if (!valor || isNaN(valor) || valor <= 0) {
      return message.reply('❌ | Valor inválido informado.');
    }

    const usuario = await getOrCreate(userId, member.user.username);
    usuario.money = (usuario.money || 0) + valor;
    await update(usuario);

    await message.reply(
      `✅ | Você adicionou **${valor.toLocaleString('pt-BR')}** Kronos para ${member.user.tag} (<@${userId}>) com sucesso!`
    );

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('📥 Kronos Adicionado')
        .setColor('#109010')
        .addFields(
          { name: '👤 Usuário', value: `<@${userId}> \`${member.user.tag}\``, inline: true },
          { name: '💰 Valor Adicionado', value: `${valor.toLocaleString('pt-BR')} Kronos`, inline: true },
          { name: '👮 Staff', value: `<@${message.author.id}> \`${message.author.tag}\`` }
        )
        .setFooter({ text: 'Banco Kairox • Sistema de Gerência' })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    }
  }
};