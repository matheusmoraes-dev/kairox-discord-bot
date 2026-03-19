const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');
const { getOrCreate, update, logTransaction } = require('../../database/database'); // ✅ inclui logTransaction

module.exports = {
  name: 'daily',
  description: 'Escolha uma caixa para coletar sua recompensa diária',

  async execute(message) {
    const userId = message.author.id;
    const user = await getOrCreate(userId, message.author.username);
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    // Cooldown
    if (user.lastDaily && now - user.lastDaily < cooldown) {
      const timeLeft = cooldown - (now - user.lastDaily);
      const hours = Math.floor(timeLeft / 3600000);
      const minutes = Math.floor((timeLeft % 3600000) / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      const cooldownEmbed = new EmbedBuilder()
        .setTitle('<a:ampulheta2:1393321714729091255> Recompensa **Diária** já **coletada**!')
        .setDescription(`Você poderá escolher uma nova caixa em **${hours}h ${minutes}m ${seconds}s**.`)
        .setColor('Red')
        .setFooter({ text: 'Kairox • Recompensa Diária', iconURL: message.client.user.displayAvatarURL() })
        .setTimestamp();
      return message.reply({ embeds: [cooldownEmbed] });
    }

    const emojiCaixa = '<:sorteio:1392165191453511700>';

    const caixas = [
      { id: 'caixa1', label: 'Caixa 1', emoji: emojiCaixa },
      { id: 'caixa2', label: 'Caixa 2', emoji: emojiCaixa },
      { id: 'caixa3', label: 'Caixa 3', emoji: emojiCaixa }
    ];

    const row = new ActionRowBuilder().addComponents(
      caixas.map(c =>
        new ButtonBuilder()
          .setCustomId(c.id)
          .setLabel(c.label)
          .setEmoji(c.emoji)
          .setStyle(ButtonStyle.Success)
      )
    );

    const embed = new EmbedBuilder()
      .setTitle('<:lampada:1393322390762553375> Escolha uma caixa misteriosa!')
      .setDescription(
        'Você tem direito a **1 caixa por dia**.\nEscolha sabiamente — algumas caixas podem conter uma **recompensa especial!**'
      )
      .setColor('#05e62a')
      .setFooter({ text: 'Kairox • Recompensa Diária', iconURL: message.client.user.displayAvatarURL() })
      .setTimestamp();

    const msg = await message.reply({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000,
      max: 1,
      filter: i => i.user.id === userId
    });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();

      // Verifica se o usuário tem bônus
      let bonusPercentual = 0;
      const guild = await message.client.guilds.fetch('1125069261929463808').catch(() => null);
      if (guild) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          const temBooster = member.roles.cache.has('1391196028644102205');
          const temPremium = member.roles.cache.has('1383630603475488829');
          const temDoador = member.roles.cache.has('1379968674072363038');
          if (temBooster || temPremium || temDoador) {
            bonusPercentual = 0.2;
          }
        }
      }

      const recompensas = [
        Math.floor(Math.random() * 3000) + 2000,
        Math.floor(Math.random() * 7000) + 5000,
        Math.floor(Math.random() * 15000) + 10000
      ];

      const embaralhado = caixas.map((c, i) => ({
        id: c.id,
        recompensa: recompensas[i],
        label: c.label,
        emoji: c.emoji
      })).sort(() => Math.random() - 0.5);

      const selecionada = embaralhado.find(c => c.id === interaction.customId);
      let recompensa = selecionada.recompensa;
      const bonus = Math.floor(recompensa * bonusPercentual);
      recompensa += bonus;

      user.money += recompensa;
      user.lastDaily = now;
      await update(user);

      // ✅ REGISTRA A TRANSAÇÃO
      await logTransaction(userId, 'daily', recompensa, 'Recompensa diária');

      const embedFinal = new EmbedBuilder()
        .setColor('#00FF88')
        .setTitle(`${selecionada.emoji} **Caixa Aberta** - **Resultado**`)
        .setDescription(
          `Você escolheu a **${selecionada.label}**!\n\n` +
          `<:dinheiro1:1392506009402081290> Recompensa: **${recompensa.toLocaleString()} Kronos**` +
          (bonus > 0 ? ` *(+${bonus.toLocaleString()} bônus VIP)*` : '') +
          `\n\n<:Saldo:1393303738533544039> Saldo atual: **${user.money.toLocaleString()} Kronos**`
        )
        .setFooter({ text: 'Kairox • Recompensa diária coletada com sucesso!' })
        .setTimestamp();

      await msg.edit({ embeds: [embedFinal], components: [] });
    });

    collector.on('end', async collected => {
      if (collected.size === 0) {
        await msg.delete().catch(() => {});
        await message.channel.send({
          content: `<:relogio:1383970376916140134> ${message.author}, o tempo para escolher uma caixa **esgotou**! Tente novamente.`,
          allowedMentions: { users: [message.author.id] }
        });
      }
    });
  }
};