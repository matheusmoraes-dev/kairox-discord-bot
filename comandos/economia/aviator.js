const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const {
  getOrCreate,
  update,
  parseValor,
  logTransaction // importado para registrar transações
} = require('../../database/database');

module.exports = {
  name: 'aviator',
  description: '🛩️ Jogue Aviator! Aposte e pare o avião antes que ele caia.',
  aliases: ['crash'],

  async execute(message, args) {
    const userId = message.author.id;
    const username = message.author.username;
    const valor = parseValor(args[0]);

    if (!valor || isNaN(valor) || valor <= 0) {
      return message.reply('❌ **|** Forneça um **valor válido**. Ex: `Kaviator 1k` ou `Kaviator 1m`.');
    }

    const VALOR_MAXIMO = 1_500_000;
    if (valor > VALOR_MAXIMO) {
      return message.reply('❌ **|** O valor máximo para apostar é **1.500.000 Kronos (1m500)**.');
    }

    const user = await getOrCreate(userId, username);
    if (user.money < valor) {
      return message.reply('❌ **|** Você **não** tem Kronos suficientes para essa aposta.');
    }

    // 💸 Deduz a aposta e registra com tipo 'bet' e detalhes 'Aviator'
    user.money -= valor;
    await update(user);
    await logTransaction(userId, 'bet', -valor, 'Aviator');

    // 🎲 Define a chance de perder: 60% perde, 40% continua
    const perdeu = Math.random() < 0.6;
    if (perdeu) {
      user.jogadas = (user.jogadas || 0) + 1;
      user.ultimaJogada = '❌ Derrota';
      await update(user);

      await logTransaction(userId, 'bet', -valor, 'Aviator');

      const embedPerdeu = new EmbedBuilder()
        .setTitle('🛩️ Aviator - Você perdeu!')
        .setColor('#ff4040')
        .setDescription(`💥 O avião caiu antes de você parar!\nVocê perdeu sua aposta de **${valor.toLocaleString()} Kronos**.`)
        .setFooter({ text: 'Cassino Kairox • Crash Game' });

      return message.reply({ embeds: [embedPerdeu], components: [] });
    }

    // Caso não perdeu direto, o jogo começa
    let multiplier = 1.0;
    const maxMultiplier = +(Math.random() * 4.5 + 1.5).toFixed(1);
    const increment = 0.2;

    let stopped = false;
    let caiu = false;

    const pararButton = new ButtonBuilder()
      .setCustomId('parar_aviator')
      .setLabel('Parar')
      .setEmoji('✋')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(pararButton);

    const embedStatus = () => new EmbedBuilder()
      .setTitle('🛩️ Aviator - Em andamento...')
      .setColor('#ecb653')
      .setDescription(
        `📈 Multiplicador atual: **x${multiplier.toFixed(1)}**\n` +
        `💰 Aposta: **${valor.toLocaleString()} Kronos**\n` +
        `💼 Saldo Atual: **${user.money.toLocaleString()} Kronos**\n\n` +
        `Clique em **Parar** antes que o avião caia!`
      )
      .setFooter({ text: 'Cassino Kairox • Crash Game' });

    const disabledButton = new ButtonBuilder()
      .setCustomId('parar_aviator_disabled')
      .setLabel('Parado')
      .setEmoji('✋')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const disabledRow = new ActionRowBuilder().addComponents(disabledButton);

    const msg = await message.reply({ embeds: [embedStatus()], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === userId && i.customId === 'parar_aviator',
      time: 120000
    });

    collector.on('collect', async i => {
      stopped = true;
      clearInterval(intervalo);
      collector.stop();

      const ganho = Math.floor(valor * multiplier);
      user.money += ganho;
      user.jogadas = (user.jogadas || 0) + 1;
      user.ultimaJogada = '✅ Vitória';
      await update(user);

      await logTransaction(userId, 'bet', ganho, 'Aviator');

      const embedFinal = new EmbedBuilder()
        .setTitle('🛩️ Aviator - Você parou a tempo!')
        .setColor('#109010')
        .setDescription(
          `📈 Você parou no multiplicador **x${multiplier.toFixed(1)}** e ganhou **${ganho.toLocaleString()} Kronos!**`
        )
        .setFooter({ text: 'Cassino Kairox • Crash Game' });

      await i.update({ embeds: [embedFinal], components: [disabledRow] });
    });

    collector.on('end', async () => {
      if (!stopped && !caiu) {
        caiu = true;
        clearInterval(intervalo);

        user.jogadas = (user.jogadas || 0) + 1;
        user.ultimaJogada = '❌ Derrota';
        await update(user);

        await logTransaction(userId, 'bet', -valor, 'Aviator');

        const embedFinal = new EmbedBuilder()
          .setTitle('🛩️ Aviator - O avião caiu!')
          .setColor('#ff4040')
          .setDescription(
            `💥 Você perdeu sua aposta de **${valor.toLocaleString()} Kronos**.\n` +
            `Multiplicador final: **x${maxMultiplier.toFixed(1)}**`
          )
          .setFooter({ text: 'Cassino Kairox • Crash Game' });

        await msg.edit({ embeds: [embedFinal], components: [] });
      }
    });

    const intervalo = setInterval(async () => {
      if (stopped || caiu) return;

      multiplier = +(multiplier + increment).toFixed(1);

      if (multiplier >= maxMultiplier) {
        caiu = true;
        clearInterval(intervalo);
        collector.stop();

        user.jogadas = (user.jogadas || 0) + 1;
        user.ultimaJogada = '❌ Derrota';
        await update(user);

        await logTransaction(userId, 'bet', -valor, 'Aviator');

        const embedFinal = new EmbedBuilder()
          .setTitle('🛩️ Aviator - O avião caiu!')
          .setColor('#ff4040')
          .setDescription(
            `💥 Você perdeu sua aposta de **${valor.toLocaleString()} Kronos**.\n` +
            `Multiplicador final: **x${maxMultiplier.toFixed(1)}**`
          )
          .setFooter({ text: 'Cassino Kairox • Crash Game' });

        await msg.edit({ embeds: [embedFinal], components: [] });
      } else {
        try {
          await msg.edit({ embeds: [embedStatus()], components: [row] });
        } catch (err) {
          console.error('Erro ao atualizar status do Aviator:', err);
        }
      }
    }, 3000);
  }
};