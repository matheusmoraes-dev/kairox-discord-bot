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
  logTransaction
} = require('../../database/database');

module.exports = {
  name: 'blackjack',
  description: '🃏 Jogue uma partida de Blackjack contra o bot!',
  aliases: ['bj'],

  async execute(message, args) {
    const userId = message.author.id;
    const username = message.author.username;
    const valor = parseValor(args[0]);

    if (!valor || isNaN(valor) || valor <= 0) {
      return message.reply('❌ Você precisa **especificar** um valor válido. Ex: `Kblackjack 1k`');
    }

    const VALOR_MAXIMO = 1_500_000;
    if (valor > VALOR_MAXIMO) {
      return message.reply('❌ O valor máximo para apostar é **1.500.000 Kronos (1m500)**.');
    }

    let user = await getOrCreate(userId, username);
    if (user.money < valor) {
      return message.reply('❌ Você **não** tem Kronos suficientes para essa aposta.');
    }

    // 💸 Deduz aposta e registra transação tipo 'bet' com detalhes 'Blackjack'
    user.money -= valor;
    await update(user);
    await logTransaction(userId, 'bet', -valor, 'Blackjack');

    // Função para sortear carta
    const drawCard = () => {
      const cartas = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      return cartas[Math.floor(Math.random() * cartas.length)];
    };

    const calcularValor = cartas => {
      let total = 0, ases = 0;
      for (const c of cartas) {
        if (['J', 'Q', 'K'].includes(c)) total += 10;
        else if (c === 'A') { total += 11; ases++; }
        else total += parseInt(c);
      }
      while (total > 21 && ases > 0) {
        total -= 10;
        ases--;
      }
      return total;
    };

    const cartasJogador = [drawCard(), drawCard()];
    const cartasBot = [drawCard(), drawCard()];
    let fimDeJogo = false;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('comprar').setLabel('🃏 Comprar').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('parar').setLabel('🛑 Parar').setStyle(ButtonStyle.Danger)
    );

    const formatUltimoResultado = res => {
      if (res === 'Vitória') return '<:correto:1393304379129598045> Vitória';
      if (res === 'Derrota') return '<:errado:1393262652788183191> Derrota';
      if (res === 'Empate') return '🤝 Empate';
      return res || 'Nunca jogado.';
    };

    const atualizarEmbed = (final = false, resultadoTexto = '', cor = 0x1d831d, ultimoResultado = '') => {
      const valorJogador = calcularValor(cartasJogador);
      const botVisivel = final ? cartasBot.join(', ') : `${cartasBot[0]}, ❓`;
      const valorBot = final ? `(${calcularValor(cartasBot)})` : '';

      return new EmbedBuilder()
        .setTitle('<:blackjack:1393302493513125959> **BlackJack** - **Cassino**')
        .setColor(cor)
        .setDescription(
          `<:cartas:1393302861122633820> Suas **cartas**: ${cartasJogador.join(', ')} (${valorJogador})\n` +
          `<:kairox:1386008482150355004> Cartas do **Kairox**: ${botVisivel} ${valorBot}\n\n` +
          resultadoTexto
        )
        .addFields(
          { name: '<:dinheiro1:1392506009402081290> **Aposta**', value: `${valor.toLocaleString()} Kronos`, inline: true },
          { name: '<:Saldo:1393303738533544039> **Saldo Atual**', value: user.money.toLocaleString(), inline: true },
          { name: '<:_pushpin:1393304066435584050> **Último Resultado**', value: formatUltimoResultado(ultimoResultado), inline: true }
        )
        .setFooter({ text: 'Cassino Kairox • Jogue com responsabilidade!' })
        .setTimestamp();
    };

    const embedInicial = atualizarEmbed();
    const reply = await message.reply({ embeds: [embedInicial], components: [row] });

    const collector = reply.createMessageComponentCollector({
      filter: i => i.user.id === userId,
      time: 60000
    });

    collector.on('collect', async i => {
      await i.deferUpdate();

      if (i.customId === 'comprar') {
        cartasJogador.push(drawCard());
        const novoValor = calcularValor(cartasJogador);
        if (novoValor > 21) fimDeJogo = true;

        const embed = atualizarEmbed(fimDeJogo, fimDeJogo ? '<:errado:1393262652788183191> Você **perdeu**.' : '');
        await reply.edit({ embeds: [embed], components: fimDeJogo ? [] : [row] });

        if (fimDeJogo) collector.stop('fim');
      }

      if (i.customId === 'parar') {
        fimDeJogo = true;
        collector.stop('fim');
      }
    });

    collector.on('end', async () => {
      const valorJogador = calcularValor(cartasJogador);
      while (calcularValor(cartasBot) < 17) cartasBot.push(drawCard());
      const valorBot = calcularValor(cartasBot);

      let resultadoTexto = '';
      let cor = 0xec5353;
      let ganho = 0;
      let ultimoResultado = 'Derrota';

      if (valorJogador > 21) {
        resultadoTexto = '<:errado:1393262652788183191> Você **perdeu**.';
        user.ultimaJogada = '❌ Derrota';
        await logTransaction(userId, 'bet', 0, 'Blackjack'); // aposta já descontada
      } else if (valorBot > 21 || valorJogador > valorBot) {
        resultadoTexto = '<:correto:1393304379129598045> Você **ganhou**.';
        ganho = valor * 2;
        user.money += ganho;
        cor = 0x109010;
        user.ultimaJogada = '✅ Vitória';
        ultimoResultado = 'Vitória';
        await logTransaction(userId, 'bet', ganho, 'Blackjack');
      } else if (valorJogador === valorBot) {
        resultadoTexto = '🤝 Empate!';
        user.money += valor;
        cor = 0xecec53;
        user.ultimaJogada = '🤝 Empate';
        ultimoResultado = 'Empate';
        await logTransaction(userId, 'bet', 0, 'Blackjack');
      } else {
        resultadoTexto = '<:errado:1393262652788183191> Você **perdeu**.';
        user.ultimaJogada = '❌ Derrota';
        await logTransaction(userId, 'bet', 0, 'Blackjack');
      }

      user.jogadas = (user.jogadas || 0) + 1;
      await update(user);

      const embedFinal = atualizarEmbed(true, resultadoTexto, cor, ultimoResultado);
      await reply.edit({ embeds: [embedFinal], components: [] });
    });
  }
};