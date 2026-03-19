const { EmbedBuilder } = require('discord.js');

const SERVER_ID = '1125069261929463808';
const VIP_ROLE_ID = '1383630603475488829';
const LOG_CHANNEL_ID = '1395789916839088239';
const ALLOWED_ROLES = [
  '1379968880059093122', // Cargo 1
  '1383567503342567434', // Cargo 2
  '1383567663980220496'  // Cargo 3
];

module.exports = {
  name: 'removevip',
  description: 'Remove VIP de um usuário, cancelando a assinatura e retirando o cargo VIP.',
  aliases: ['remvip', 'vipremove', 'tirarvip'],
  async execute(message, args, client, { dbRun, dbGet }) {
    if (message.guild.id !== SERVER_ID) {
      return message.reply('❌ Este comando só pode ser usado no servidor oficial.');
    }

    const memberRoles = message.member.roles.cache;
    const hasAllowedRole = ALLOWED_ROLES.some(roleId => memberRoles.has(roleId));
    if (!hasAllowedRole) {
      return message.reply('❌ Você não possui permissão para usar este comando.');
    }

    if (args.length < 1) {
      return message.reply('❌ Uso correto: `removevip @usuário`');
    }

    const userMention = args[0];
    const userId = userMention.replace(/[<@!>]/g, '');

    try {
      const member = await message.guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return message.reply('❌ Usuário não encontrado no servidor.');
      }

      // Marca todas as assinaturas ativas como expiradas
      await dbRun(
        `UPDATE premium_purchases SET status = 'expired' WHERE user_id = ? AND status = 'active'`,
        [userId]
      );

      // Remove o cargo VIP se tiver
      if (member.roles.cache.has(VIP_ROLE_ID)) {
        await member.roles.remove(VIP_ROLE_ID, 'VIP removido via comando removevip');
      }

      const embed = new EmbedBuilder()
        .setTitle('<:_pushpin:1393304066435584050> **Premium Removido**')
        .setDescription(`<@${userId}> teve seu VIP removido e a assinatura cancelada.`)
        .setColor(0xec5353)
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      // Envia log no canal de logs
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle('<:Warn_Red:1395928923216416768> **Premium Removido/Cancelado**')
          .addFields(
            { name: '<:ownerbad:1391950857158922261> Staff', value: `${message.author.tag} (<@${message.author.id}>)`, inline: false },
            { name: '<:useremoji:1395782549149843578> Usuário', value: `${member.user.tag} (<@${userId}>)`, inline: false }
          )
          .setColor(0xec5353)
          .setTimestamp();

        logChannel.send({ embeds: [logEmbed] }).catch(console.error);
      }

    } catch (err) {
      console.error('Erro no comando removevip:', err);
      return message.reply('❌ Ocorreu um erro ao remover VIP.');
    }
  }
};