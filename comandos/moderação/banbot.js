const { EmbedBuilder } = require('discord.js');
const { getOrCreate, update } = require('../../database/database');

const STAFF_ROLE_ID = '1392360963642232952';
const LOG_CHANNEL_ID = '1392237527850684567';

module.exports = {
  name: 'ban',
  aliases: ['banb', 'banirbot'],
  description: '🚫 Bane um usuário de usar o bot (staff)',

  async execute(message, args, client) {
    if (!message.member.roles.cache.has(STAFF_ROLE_ID)) {
      return message.reply('❌ **|** Você **não** tem **permissão** para usar este comando.');
    }

    const userMention = args[0];
    const tempoStr = args[1];
    const motivo = args.slice(2).join(' ') || 'Motivo não especificado';

    if (!userMention) {
      return message.reply('❌ **|** Use: `Kban @usuário [tempo] <motivo>`\nEx: `Kbanbot @User 3d alt`');
    }

    const userId = userMention.replace(/[<@!>]/g, '');
    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) return message.reply('❌ | Usuário inválido.');

    // Tempo de ban (em milissegundos)
    let tempo = null;
    if (tempoStr) {
      const match = tempoStr.match(/^(\d+)([dhm])$/i);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        if (unit === 'd') tempo = value * 86400000;
        else if (unit === 'h') tempo = value * 3600000;
        else if (unit === 'm') tempo = value * 60000;
      }
    }

    const usuario = await getOrCreate(userId, member.user.username);

    // Verifica se já está banido e ainda dentro do período (ou permanente)
    const agora = Date.now();
    if (usuario.banido && (!usuario.banExpira || usuario.banExpira > agora)) {
      return message.reply(`❌ **|** Este **usuário** já está **banido** do bot.\nMotivo: **${usuario.banMotivo || 'Não informado'}**\n${usuario.banExpira ? `Banimento expira em <t:${Math.floor(usuario.banExpira / 1000)}:R>` : 'Banimento permanente'}`);
    }

    usuario.banido = true;
    usuario.banMotivo = motivo;
    usuario.banExpira = tempo ? agora + tempo : null;

    await update(usuario);

    // Mensagem DM para o usuário
    try {
      await member.user.send({
        content: `<:sair_red:1393255706920222944> Você foi **banido de usar o bot Kairox**.\n\n<:c_prancheta:1393706408972914771> Motivo: **${motivo}**\n<:relogio:1383970376916140134> ${
          tempo ? `Banimento expira em <t:${Math.floor((agora + tempo) / 1000)}:R>` : 'Banimento permanente'
        }\n\nSe acha que isso foi um erro, entre em contato com a staff.`
      });
    } catch {
      // ignorar falha ao enviar DM
    }

    await message.reply(`✅ | ${member.user.tag} foi banido com sucesso.`);

    const embed = new EmbedBuilder()
      .setTitle('<:sair_red:1393255706920222944> Usuário Banido do Bot')
      .setColor('#ff3333')
      .addFields(
        { name: '<:sair_red:1393255706920222944> Usuário', value: `<@${userId}> \`${member.user.tag}\``, inline: true },
        { name: '<:c_prancheta:1393706408972914771> Motivo', value: motivo, inline: true },
        { name: '<:relogio:1383970376916140134> Expiração', value: tempo ? `<t:${Math.floor((agora + tempo) / 1000)}:R>` : 'Permanente', inline: true },
        { name: '<:6815turquoiseownerbadge:1391950857158922261> Staff', value: `<@${message.author.id}> \`${message.author.tag}\`` }
      )
      .setFooter({ text: 'Sistema de Banimento - Kairox' })
      .setTimestamp();

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) await logChannel.send({ embeds: [embed] });
  }
};