// comandos/moderação/addvip.js
const { EmbedBuilder } = require('discord.js');

const SERVER_ID = '1125069261929463808';
const VIP_ROLE_ID = '1383630603475488829';
const LOG_CHANNEL_ID = '1395789916839088239';
const ALLOWED_ROLES = [
  '1379968880059093122', // Cargo 1
  '1383567503342567434', // Cargo 2
  '1383567663980220496'  // Cargo 3
];

function parseDuration(input) {
  // Ex: "10d", "2h", "30m", "45s"
  const regex = /^(\d+)([smhd])$/i;
  const match = input.match(regex);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  let millis = 0;
  switch (unit) {
    case 's':
      millis = value * 1000;
      break;
    case 'm':
      millis = value * 60 * 1000;
      break;
    case 'h':
      millis = value * 60 * 60 * 1000;
      break;
    case 'd':
      millis = value * 24 * 60 * 60 * 1000;
      break;
    default:
      return null;
  }
  return millis;
}

module.exports = {
  name: 'addvip',
  description: 'Adiciona VIP para um usuário por um tempo definido. Uso: addvip @usuario 30d',
  aliases: ['darvip', 'vipadd'],
  async execute(message, args, client, { dbRun, dbGet }) {
    if (message.guild.id !== SERVER_ID) {
      return message.reply('❌ Este comando só pode ser usado no servidor oficial.');
    }

    const memberRoles = message.member.roles.cache;
    const hasAllowedRole = ALLOWED_ROLES.some(roleId => memberRoles.has(roleId));
    if (!hasAllowedRole) {
      return message.reply('❌ Você não possui permissão para usar este comando.');
    }

    if (args.length < 2) {
      return message.reply('❌ Uso correto: `addvip @usuário <tempo>` (ex: 2h, 30m, 10d)');
    }

    const userMention = args[0];
    const userId = userMention.replace(/[<@!>]/g, '');
    const durationArg = args[1].toLowerCase();

    let addMillis = 0;
    let durationLabel = '';

    // Tenta analisar com unidade
    const parsedMillis = parseDuration(durationArg);
    if (parsedMillis !== null) {
      addMillis = parsedMillis;
      const number = durationArg.match(/^\d+/)[0];
      const unit = durationArg.slice(-1);
      const unitLabel = {
        s: 'segundos',
        m: 'minutos',
        h: 'horas',
        d: 'dias'
      }[unit];
      durationLabel = `${number} ${unitLabel}`;
    } else {
      // Se não tiver unidade, tenta tratar como dias
      const days = parseInt(durationArg, 10);
      if (isNaN(days) || days <= 0) {
        return message.reply('❌ Informe uma duração válida, ex: `2h`, `30m`, `10d`.');
      }
      addMillis = days * 24 * 60 * 60 * 1000;
      durationLabel = `${days} dias`;
    }

    try {
      const member = await message.guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return message.reply('❌ Usuário não encontrado no servidor.');
      }

      const now = Date.now();
      const activePurchase = await dbGet(
        'SELECT * FROM premium_purchases WHERE user_id = ? AND status = "active" AND expires_at > ? ORDER BY expires_at DESC LIMIT 1',
        [userId, now]
      );

      let expiresAtFinal;

      if (activePurchase) {
        const newExpiresAt = activePurchase.expires_at + addMillis;
        await dbRun('UPDATE premium_purchases SET expires_at = ? WHERE id = ?', [newExpiresAt, activePurchase.id]);
        if (!member.roles.cache.has(VIP_ROLE_ID)) {
          await member.roles.add(VIP_ROLE_ID, 'VIP adicionado via comando addvip');
        }
        expiresAtFinal = newExpiresAt;

        const embed = new EmbedBuilder()
          .setTitle('<:correto:1393304379129598045> **Premium Atualizado**')
          .setDescription(`<@${userId}> teve seu Premium estendido em **${durationLabel}**!\nNova expiração: <t:${Math.floor(newExpiresAt / 1000)}:F>`)
          .setColor(0x109010)
          .setTimestamp();

        await message.reply({ embeds: [embed] });

      } else {
        const expiresAt = now + addMillis;
        await dbRun(
          'INSERT INTO premium_purchases (user_id, purchase_timestamp, expires_at, status) VALUES (?, ?, ?, ?)',
          [userId, now, expiresAt, 'active']
        );
        if (!member.roles.cache.has(VIP_ROLE_ID)) {
          await member.roles.add(VIP_ROLE_ID, 'VIP adicionado via comando addvip');
        }
        expiresAtFinal = expiresAt;

        const embed = new EmbedBuilder()
          .setTitle('<:correto:1393304379129598045> **Premium Adicionado**')
          .setDescription(`<@${userId}> recebeu Premium por **${durationLabel}**!\nExpira em: <t:${Math.floor(expiresAt / 1000)}:F>`)
          .setColor(0x109010)
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      }

      // Log
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle('<:correto:1393304379129598045> **Premium Adicionado/Estendido**')
          .addFields(
            { name: '<:ownerbad:1391950857158922261> Staff', value: `${message.author.tag} (<@${message.author.id}>)`, inline: false },
            { name: '<:useremoji:1395782549149843578> Usuário', value: `${member.user.tag} (<@${userId}>)`, inline: false },
            { name: '<:relogio:1383970376916140134> Duração', value: durationLabel, inline: true },
            { name: '<a:tnt_explosion:1395928295874236456> Expira em', value: `<t:${Math.floor(expiresAtFinal / 1000)}:F>`, inline: true }
          )
          .setColor(0x109010)
          .setTimestamp();
        logChannel.send({ embeds: [logEmbed] }).catch(console.error);
      }

    } catch (err) {
      console.error('Erro no comando addvip:', err);
      return message.reply('❌ Ocorreu um erro ao adicionar VIP.');
    }
  },
};