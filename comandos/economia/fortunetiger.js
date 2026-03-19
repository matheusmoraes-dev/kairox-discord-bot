const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

// ✅ importa igual ao aviator
const {
  getOrCreate,
  get,
  update,
  parseValor,
  logTransaction
} = require('../../database/database');

module.exports = {
  name: 'fortunetiger',
  description: '🐯 Jogue na máquina do tigre da sorte e tente a sorte grande!',
  aliases: ['tiger', 'tigrinho', 'slot'],

  async execute(message, args) {
    const userId = message.author.id;
    const username = message.author.username;
    const aposta = parseValor(args[0]);

    if (!aposta || isNaN(aposta) || aposta <= 0) {
      return message.reply('❌ Você precisa informar um **valor** de aposta **válido**. Ex: `Kfortunetiger 500`');
    }

    const LIMITE_APOSTA = 1_500_000;
    if (aposta > LIMITE_APOSTA) {
      return message.reply('❌ O valor máximo para apostar é **1.500.000 Kronos (1m500)**.');
    }

    let user = await getOrCreate(userId, username);

    if (!user || user.money < aposta) {
      return message.reply('❌ Você não tem **saldo suficiente** para essa aposta.');
    }

    const jogar = async (user, aposta) => {
      const emojis = ['🍒', '🍋', '🍊', '⭐', '🔔', '💎', '🐯'];

      // cria uma grade 3x3
      const grid = [];
      for (let i = 0; i < 3; i++) {
        const row = [];
        for (let j = 0; j < 3; j++) {
          row.push(emojis[Math.floor(Math.random() * emojis.length)]);
        }
        grid.push(row);
      }

      // verifica ganhos em cada linha
      let ganhoTotal = 0;
      for (let i = 0; i < 3; i++) {
        const linha = grid[i];
        if (linha.every(e => e === '🐯')) {
          ganhoTotal += aposta * 10;
        } else if (linha.every(e => e === linha[0])) {
          ganhoTotal += aposta * 4;
        }
      }

      // monta a visualização da grade
      const linhasFormatadas = grid.map(row => row.join(' | ')).join('\n');
      let descricao = `🎰 **Grade:**\n${linhasFormatadas}\n\n`;
      let cor;

      if (ganhoTotal > 0) {
        user.money += ganhoTotal;
        user.ultimaJogada = '<:correto:1393304379129598045> Vitória';
        descricao += `🎉 Você ganhou **${ganhoTotal.toLocaleString()} Kronos**!\n`;
        cor = 0x109010;

        await logTransaction(userId, 'bet', ganhoTotal, `Fortune Tiger 3x3: Ganhou ${ganhoTotal.toLocaleString()} Kronos`);
      } else {
        user.money -= aposta;
        user.ultimaJogada = '<:errado:1393262652788183191> Derrota';
        descricao += `😢 Nenhuma combinação vencedora. Tente novamente!\n`;
        cor = 0xec5353;

        await logTransaction(userId, 'bet', -aposta, `Fortune Tiger 3x3: Perdeu ${aposta.toLocaleString()} Kronos`);
      }

      await update(user);

      const embed = new EmbedBuilder()
        .setTitle('🐯 **Fortune Tiger**')
        .setColor(cor)
        .setDescription(descricao)
        .addFields(
          { name: '<:dinheiro1:1392506009402081290> Aposta', value: `${aposta.toLocaleString()} Kronos`, inline: true },
          { name: '<:Saldo:1393303738533544039> Saldo Atual', value: `${user.money.toLocaleString()} Kronos`, inline: true },
          { name: '<:_pushpin:1393304066435584050> Último Resultado', value: user.ultimaJogada, inline: true }
        )
        .setFooter({ text: 'Cassino Kairox • Fortune Tiger' })
        .setTimestamp();

      return { embed, podeJogar: user.money >= aposta };
    };

    const { embed: primeiroEmbed, podeJogar } = await jogar(user, aposta);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`girar_novamente_${message.id}`)
        .setLabel('🎰 Girar Novamente')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!podeJogar)
    );

    const resposta = await message.reply({ embeds: [primeiroEmbed], components: [row] });

    const collector = resposta.createMessageComponentCollector({
      filter: i => i.user.id === userId && i.customId === `girar_novamente_${message.id}`,
      time: 60000
    });

    collector.on('collect', async i => {
      await i.deferUpdate();

      user = await get(userId);
      if (!user || user.money < aposta) {
        return resposta.edit({
          content: '💸 Você não tem saldo suficiente para girar novamente!',
          embeds: [],
          components: []
        });
      }

      const { embed: novoEmbed, podeJogar } = await jogar(user, aposta);

      const novaRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`girar_novamente_${message.id}`)
          .setLabel('🎰 Girar Novamente')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!podeJogar)
      );

      await resposta.edit({ embeds: [novoEmbed], components: [novaRow], content: '' });
    });
  }
};