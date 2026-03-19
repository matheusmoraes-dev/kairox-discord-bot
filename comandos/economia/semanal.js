const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const { getOrCreate, update, logTransaction } = require('../../database/database'); // ✅ inclui logTransaction

module.exports = {
  name: 'semanal',
  description: 'Coleta sua recompensa semanal (exclusivo Premium/Booster/Doadores)',

  async execute(message) {
    const userId = message.author.id;
    const client = message.client;

    // Servidor oficial e cargos válidos
    const GUILD_ID = '1125069261929463808';
    const CARGOS_VALIDOS = [
      '1391196028644102205', // Booster
      '1383630603475488829', // Premium
      '1383630603475488829', // Doadores (mesmo ID informado)
    ];

    // 🔎 Busca o membro no servidor específico
    let membroServidorOficial;
    try {
      const guildOficial = client.guilds.cache.get(GUILD_ID);
      if (!guildOficial) {
        return message.reply('⚠️ Não consegui acessar o servidor oficial para validar seu cargo.');
      }
      membroServidorOficial = await guildOficial.members.fetch(userId);
    } catch {
      membroServidorOficial = null;
    }

    if (
      !membroServidorOficial ||
      !CARGOS_VALIDOS.some(cargoId => membroServidorOficial.roles.cache.has(cargoId))
    ) {
      const embedErro = new EmbedBuilder()
        .setTitle('⛔ Acesso Negado')
        .setDescription(
          'Esse comando é apenas para quem for:\n' +
          '- <:booster:1383487819338485770> Booster\n' +
          '- <:premium:1391947903303553155> Premium\n' +
          '- <:dinheiro1:1392506009402081290> Doadores'
        )
        .setColor('#ec5353')
        .setFooter({ text: 'Adquira Premium ou apoie o servidor para usar este comando.' });

      return message.reply({ embeds: [embedErro] });
    }

    let user = await getOrCreate(userId, message.author.username);
    if (!user.lastWeekly) user.lastWeekly = 0;

    const now = Date.now();
    const cooldown = 7 * 24 * 60 * 60 * 1000; // 7 dias

    if (now - Number(user.lastWeekly) < cooldown) {
      const timeLeft = cooldown - (now - user.lastWeekly);
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      const cooldownRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('semanal_cooldown')
          .setLabel('🔁 Aguardando')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      const embedCooldown = new EmbedBuilder()
        .setTitle('<a:ampulheta2:1393321714729091255> Recompensa semanal já **coletada**!')
        .setDescription(`Você já **coletou** sua recompensa **semanal**.\n\nTente novamente em **${days}d ${hours}h ${minutes}m ${seconds}s**.`)
        .setColor('#ec5353')
        .setFooter({ text: 'Kairox • Comando: Ksemanal', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [embedCooldown], components: [cooldownRow] });
    }

    // 💰 Recompensa base
    const recompensaFinal = 30000;

    user.money += recompensaFinal;
    user.lastWeekly = now;
    await update(user);

    // ✅ REGISTRA A TRANSAÇÃO
    await logTransaction(userId, 'weekly', recompensaFinal, 'Recompensa semanal');

    const embedFinal = new EmbedBuilder()
      .setAuthor({ name: `${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTitle('🎁 Recompensa semanal **coletada**!')
      .setDescription(
        `Você recebeu **<:kronos:1383480432233807942> ${recompensaFinal.toLocaleString()} Kronos**!\n\n` +
        `<:Saldo:1393303738533544039> Saldo atual: **${user.money.toLocaleString()} Kronos**`
      )
      .setColor('#109010')
      .setFooter({ text: 'Kairox • Recompensa Semanal', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    return message.reply({ embeds: [embedFinal] });
  }
};