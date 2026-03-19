const { EmbedBuilder } = require('discord.js');
const { getOrCreate, update } = require('../../database/database');

const STAFF_ROLE_ID = '1392360963642232952';
const LOG_CHANNEL_ID = '1392237527850684567';

module.exports = {
  name: 'unban',
  aliases: ['desban', 'desbanbot'],
  description: '✅ Remove o banimento de um usuário do bot (staff)',

  async execute(message, args, client) {
    if (!message.member.roles.cache.has(STAFF_ROLE_ID)) {
      return message.reply('❌ | Você não tem permissão para usar este comando.');
    }

    const userMention = args[0];
    if (!userMention) {
      return message.reply('❌ | Use: `Kunban @usuário`');
    }

    const userId = userMention.replace(/[<@!>]/g, '');
    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) return message.reply('❌ **|** Usuário **inválido**.');

    const usuario = await getOrCreate(userId, member.user.username);

    if (!usuario.banido) {
      return message.reply('❌ **|** Este usuário **não** está **banido** do bot.');
    }

    usuario.banido = false;
    usuario.banMotivo = null;
    usuario.banExpira = null;

    await update(usuario);

    // Avisar staff que o ban foi removido
    await message.reply(`✅ | Banimento removido para ${member.user.tag} com sucesso.`);

    // Log do unban
    const embed = new EmbedBuilder()
      .setTitle('<:correto:1393304379129598045> Banimento Removido')
      .setColor('#33cc33')
      .addFields(
        { name: '<:useremoji:1395782549149843578> Usuário', value: `<@${userId}> \`${member.user.tag}\``, inline: true },
        { name: '<:6815turquoiseownerbadge:1391950857158922261> Staff', value: `<@${message.author.id}> \`${message.author.tag}\`` }
      )
      .setFooter({ text: 'Sistema de Banimento - Kairox' })
      .setTimestamp();

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) await logChannel.send({ embeds: [embed] });
  }
};