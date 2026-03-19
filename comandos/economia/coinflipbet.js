const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder
} = require('discord.js');
const parseValor = require('../../utils/parseValor');

module.exports = {
  name: 'coinflipbet',
  aliases: ['flipbet', 'apostacoinflip'],
  description: '🎲 Aposte contra outro jogador no Coinflip (cara ou coroa)!',

  async execute(message, args, client, helpers) {
    const { getOrCreate, update, logTransaction } = helpers;

    const oponente = message.mentions.users.first();
    if (!oponente)
      return message.reply('❌ **|** Mencione um usuário para apostar contra. Ex: `Kcoinflipbet @Fulano 1k`');
    if (oponente.id === message.author.id)
      return message.reply('❌ **|** Você não pode apostar contra si mesmo.');
    if (oponente.bot)
      return message.reply('❌ **|** Você não pode apostar contra um bot.');

    const apostador = await getOrCreate(message.author.id, message.author.username);
    const desafiado = await getOrCreate(oponente.id, oponente.username);

    let valorInput = args[1]?.toLowerCase();
    if (!valorInput)
      return message.reply('❌ **|** Informe o valor para apostar. Ex: `Kcoinflipbet @Fulano 1k`, `half` ou `all`.');

    const VALOR_MAXIMO = 1_500_000;
    let valor;

    // half / all
    if (valorInput === 'half') {
      valor = Math.floor(apostador.money / 2);
      if (valor <= 0) return message.reply('❌ **|** Você não tem Kronos suficientes para apostar metade.');
    } else if (valorInput === 'all') {
      valor = apostador.money;
      if (valor <= 0) return message.reply('❌ **|** Você não tem Kronos suficientes para apostar tudo.');
    } else {
      valor = parseValor(valorInput);
      if (!valor || isNaN(valor) || valor <= 0)
        return message.reply('❌ **|** Valor inválido. Use algo como `Kcoinflipbet @Fulano 1k`, `half` ou `all`.');
    }

    if (valor > VALOR_MAXIMO)
      return message.reply(`❌ **|** O valor máximo para apostar é **${VALOR_MAXIMO.toLocaleString()} Kronos**.`);

    // saldo mínimo dos dois
    const saldoMinimo = Math.min(apostador.money, desafiado.money);
    if (saldoMinimo < valor) {
      return message.reply(
        `❌ **|** Saldo insuficiente para essa aposta. O máximo permitido considerando ambos é ${saldoMinimo.toLocaleString()} Kronos.`
      );
    }

    const apostadorId = message.author.id;
    const desafiadoId = oponente.id;
    const confirmados = new Set();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('aceitar_aposta')
        .setLabel('✅ Aceitar (0/2)')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('recusar_aposta')
        .setLabel('❌ Recusar')
        .setStyle(ButtonStyle.Danger)
    );

    const embedInicial = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('<:dados:1393309414290751820> **Coinflip Bet** - **Cassino**')
      .setDescription(
        `💥 <@${apostadorId}> desafiou <@${desafiadoId}> para uma aposta de **${valor.toLocaleString()} Kronos**!\n\n` +
        `<:cadeado:1393314932753174581> Ambos devem clicar em **Aceitar** para confirmar.\n` +
        `<:relogio:1383970376916140134> Tempo para aceitar: 45 segundos`
      )
      .setTimestamp();

    const mensagem = await message.reply({ embeds: [embedInicial], components: [row] });

    const collector = mensagem.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 45000
    });

    collector.on('collect', async interaction => {
      if (![apostadorId, desafiadoId].includes(interaction.user.id)) {
        return interaction.reply({ content: '❌ **|** Apenas os participantes podem interagir.', ephemeral: true });
      }

      if (interaction.customId === 'recusar_aposta') {
        collector.stop('recusado');
        return mensagem.edit({ content: `🚫 **|** Aposta recusada por <@${interaction.user.id}>.`, components: [] });
      }

      if (confirmados.has(interaction.user.id)) {
        return interaction.reply({ content: '✅ Você já confirmou a aposta.', ephemeral: true });
      }

      confirmados.add(interaction.user.id);
      await interaction.deferUpdate();

      const novaRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('aceitar_aposta')
          .setLabel(`✅ Aceitar (${confirmados.size}/2)`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(confirmados.size >= 2),
        new ButtonBuilder()
          .setCustomId('recusar_aposta')
          .setLabel('❌ Recusar')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(confirmados.size >= 2)
      );

      await mensagem.edit({ components: [novaRow] });

      if (confirmados.size === 2) {
        const apostadorAtual = await getOrCreate(apostadorId, message.author.username);
        const desafiadoAtual = await getOrCreate(desafiadoId, oponente.username);

        if (apostadorAtual.money < valor || desafiadoAtual.money < valor) {
          collector.stop('saldo_insuficiente');
          return mensagem.edit({ content: '❌ **|** Saldo insuficiente no momento da confirmação.', components: [] });
        }

        // debita valores
        apostadorAtual.money -= valor;
        await update(apostadorAtual);
        await logTransaction(apostadorAtual.user_id, 'bet', -valor, `Coinflip Bet contra ${desafiadoAtual.username}`);

        desafiadoAtual.money -= valor;
        await update(desafiadoAtual);
        await logTransaction(desafiadoAtual.user_id, 'bet', -valor, `Coinflip Bet contra ${apostadorAtual.username}`);

        const suspenseEmbed = new EmbedBuilder()
          .setColor('#f5c542')
          .setTitle('<:dados:1393309414290751820> **Coinflip Bet** - **Cassino**')
          .setDescription(`<a:Coinflip:1393308934499995698> Girando a moeda entre <@${apostadorId}> e <@${desafiadoId}>...`);

        await mensagem.edit({ embeds: [suspenseEmbed], components: [] });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const vencedor = Math.random() < 0.5 ? apostadorAtual : desafiadoAtual;
        const perdedor = vencedor.user_id === apostadorAtual.user_id ? desafiadoAtual : apostadorAtual;

        vencedor.money += valor * 2;
        vencedor.jogadas = (vencedor.jogadas || 0) + 1;
        perdedor.jogadas = (perdedor.jogadas || 0) + 1;
        vencedor.ultimaJogada = '<:correto:1393304379129598045> Vitória';
        perdedor.ultimaJogada = '<:errado:1393262652788183191> Derrota';

        await logTransaction(vencedor.user_id, 'bet', valor * 2, `Ganhou ${(valor * 2).toLocaleString()} Kronos no Coinflip Bet contra ${perdedor.username}`);

        await update(vencedor);
        await update(perdedor);

        const resultadoEmbed = new EmbedBuilder()
          .setColor('#00FF88')
          .setTitle('<:dados:1393309414290751820> **Coinflip Bet** - **Resultado**')
          .setDescription(
            `<a:Coinflip:1393308934499995698> **Desafiantes:**\n<@${apostadorId}> vs <@${desafiadoId}>\n\n` +
            `<:correto:1393304379129598045> Vencedor: <@${vencedor.user_id}>`
          )
          .addFields(
            {
              name: '<:dinheiro1:1392506009402081290> **Valor Aposta**',
              value: `${valor.toLocaleString()} Kronos`,
              inline: true
            },
            {
              name: '<:Saldo:1393303738533544039> **Saldo Atual**',
              value: `${vencedor.money.toLocaleString()} Kronos`,
              inline: true
            },
            {
              name: '<:_pushpin:1393304066435584050> **Último Resultado**',
              value: '<:correto:1393304379129598045> Vitória',
              inline: true
            }
          )
          .setFooter({ text: 'Cassino Kairox • Coinflip entre jogadores!' })
          .setTimestamp();

        collector.stop('finalizado');
        return mensagem.edit({ embeds: [resultadoEmbed], components: [] });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        mensagem.edit({
          content: '⌛ | A aposta foi cancelada por falta de resposta dos jogadores.',
          components: []
        });
      }
    });
  }
};