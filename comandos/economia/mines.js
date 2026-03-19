const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
  getOrCreate,
  updateBalance,
  logTransaction,
  registerPlay
} = require('../../database/database');

// Função para parsear valores tipo "1k", "1m", etc
function parseValor(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor !== 'string') return NaN;

  const cleaned = valor.toLowerCase().split(' ')[0].split('(')[0].trim();
  const multipliers = { k: 1e3, m: 1e6, b: 1e9 };
  const regex = /^(\d+(\.\d+)?)([kmb])?$/;

  const match = cleaned.match(regex);
  if (!match) return NaN;

  const num = parseFloat(match[1]);
  const mult = match[3] ? multipliers[match[3]] : 1;
  return Math.floor(num * mult);
}

const multiplicadores = {
  3: [1.35, 1.70, 2.25, 3.00, 4.00, 5.50, 7.50, 10.00, 15.00],
  4: [1.45, 1.90, 2.50, 3.40, 4.70, 6.50, 9.00, 12.00, 18.00],
  5: [1.55, 2.10, 2.75, 3.80, 5.30, 7.50, 10.50, 14.00, 21.00],
  6: [1.70, 2.30, 3.10, 4.30, 6.00, 8.50, 12.00, 16.00, 24.00],
  7: [1.90, 2.50, 3.50, 4.80, 7.00, 10.00, 14.00, 18.00, 27.00],
};

module.exports = {
  name: 'mines',
  description: '💣 Jogue Mines com bombas personalizadas (1 a 19 minas).',

  async execute(message, args) {
    const userId = message.author.id;
    const username = message.author.username;

    const user = await getOrCreate(userId, username);
    if (!user) return message.reply('❌ Usuário não **encontrado**.');

    if (args.length < 1) {
      return message.reply('❌ **|** Use o comando correto: `Kmines (valor)`');
    }

    const aposta = parseValor(args[0]);
    if (isNaN(aposta) || aposta <= 0)
      return message.reply('❌ **|** Informe um **valor válido** para aposta. Ex: `Kmines 1k`');

    if (user.money < aposta) {
      return message.reply('❌ **|** Você **não** tem **saldo suficiente** para essa aposta.');
    }

    // 🔥 Pergunta ao usuário quantas bombas
    const embedPergunta = new EmbedBuilder()
      .setTitle('💣 **Mines** - Escolha de Bombas')
      .setColor('#2f3136')
      .setDescription(
        `✅ Valor da aposta: **${aposta.toLocaleString()} Kronos**\n\n` +
        `Por favor, digite aqui no chat a **quantidade de bombas** que deseja jogar (entre **1** e **19**).`
      )
      .setFooter({ text: 'Cassino Kairox • Mines' })
      .setTimestamp();

    await message.reply({ embeds: [embedPergunta] });

    // Aguarda a resposta do mesmo usuário
    let minas;
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === userId,
        max: 1,
        time: 30000,
        errors: ['time']
      });

      const resposta = collected.first().content.trim();
      minas = parseInt(resposta);

      if (isNaN(minas) || minas < 1 || minas > 19) {
        return message.reply('❌ **|** A quantidade de bombas deve ser um número entre **1** e **19**.');
      }
    } catch (err) {
      return message.reply('⏰ **|** Tempo esgotado! Você não escolheu a quantidade de bombas a tempo.');
    }

    const areaSize = 20; // 20 blocos (4 linhas de 5 botões)
    if (minas >= areaSize) {
      return message.reply(`❌ **|** O **número** de **minas** deve ser **menor** que a área (${areaSize}).`);
    }

    // 💾 Deduz aposta inicial e registra transação
    await updateBalance(userId, -aposta, username);
    await logTransaction(userId, 'bet', -aposta, 'Mines: Aposta inicial de ' + aposta.toLocaleString() + ' Kronos');

    // Gera as posições de minas
    const minasPos = new Set();
    while (minasPos.size < minas) {
      minasPos.add(Math.floor(Math.random() * areaSize));
    }

    let botoesClicados = [];
    let gameOver = false;

    const criarBotoes = (revelar = false) => {
      const rows = [];
      const rowSize = 5;
      for (let i = 0; i < areaSize / rowSize; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < rowSize; j++) {
          const index = i * rowSize + j;
          const isClicked = botoesClicados.includes(index);
          const isMine = minasPos.has(index);

          let label = '❓';
          let style = ButtonStyle.Secondary;
          let disabled = false;

          if (revelar) {
            label = isMine ? '💣' : isClicked ? '✅' : '❌';
            style = isMine ? ButtonStyle.Danger : (isClicked ? ButtonStyle.Success : ButtonStyle.Secondary);
            disabled = true;
          } else {
            label = isClicked ? '✅' : '❓';
            style = isClicked ? ButtonStyle.Success : ButtonStyle.Secondary;
            disabled = isClicked;
          }

          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`btn_${index}`)
              .setLabel(label)
              .setStyle(style)
              .setDisabled(disabled)
          );
        }
        rows.push(row);
      }

      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('coletar')
          .setLabel('👜 Coletar')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(gameOver)
      ));

      return rows;
    };

    const embed = new EmbedBuilder()
      .setTitle('💣 **Mines**')
      .setDescription(`Clique nos blocos e evite as minas!\nMinas: **${minas}** | Aposta: **${aposta.toLocaleString()} Kronos**`)
      .setColor('#2f3136')
      .setFooter({ text: 'Cassino Kairox • Mines' })
      .setTimestamp();

    const msg = await message.channel.send({ embeds: [embed], components: criarBotoes() });

    const filter = i => i.user.id === userId;
    const collector = msg.createMessageComponentCollector({ filter, time: 2 * 60 * 1000 });

    collector.on('collect', async btn => {
      if (btn.user.id !== userId) {
        return btn.reply({ content: '❌ **|** Você **não** está jogando esta **partida**.', ephemeral: true });
      }

      const id = btn.customId;

      if (id === 'coletar') {
        const acertos = botoesClicados.length;
        const multi = multiplicadores[minas]?.[acertos - 1] || 1.0;
        const ganhoFinal = Math.floor(aposta * multi);

        await updateBalance(userId, ganhoFinal, username);
        await logTransaction(userId, 'bet', ganhoFinal, `Mines: Coletou ${ganhoFinal.toLocaleString()} Kronos`);
        await registerPlay(userId, 'mines', username);

        gameOver = true;
        collector.stop();

        const finalEmbed = new EmbedBuilder(embed)
          .setColor('#109010')
          .setDescription(
            `👜 Você coletou **${ganhoFinal.toLocaleString()} Kronos** com **${acertos} acertos**!\n` +
            `📈 Multiplicador: **x${multi.toFixed(2)}**`
          );

        return btn.update({ embeds: [finalEmbed], components: criarBotoes(true) });
      }

      const index = parseInt(id.split('_')[1]);
      if (minasPos.has(index)) {
        gameOver = true;
        await registerPlay(userId, 'mines', username);
        collector.stop();

        const perdeuEmbed = new EmbedBuilder(embed)
          .setColor('#ec5353')
          .setDescription(`💥 Você clicou em uma mina e perdeu a aposta de **${aposta.toLocaleString()} Kronos**.`);

        return btn.update({ embeds: [perdeuEmbed], components: criarBotoes(true) });
      } else {
        botoesClicados.push(index);
        return btn.update({ components: criarBotoes() });
      }
    });

    collector.on('end', async () => {
      if (!gameOver && botoesClicados.length > 0) {
        const timeoutEmbed = new EmbedBuilder(embed)
          .setColor('#ecec53')
          .setDescription(`⏰ Tempo esgotado! Você perdeu a chance de coletar.\n💸 Nenhum ganho registrado.`);
        await msg.edit({ embeds: [timeoutEmbed], components: criarBotoes(true) });
      }
    });
  }
};