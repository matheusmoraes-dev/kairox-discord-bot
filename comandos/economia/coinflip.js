const { EmbedBuilder } = require('discord.js');
const {
  getOrCreate,
  update,
  logTransaction // ✅ importa direto do banco
} = require('../../database/database');
const parseValor = require('../../utils/parseValor');

module.exports = {
  name: 'coinflip',
  description: '🪙 Jogue cara ou coroa contra o Kairox apostando Kronos!',
  aliases: ['caraoucoroa', 'coroa', 'cara'],

  async execute(message, args) {
    const userId = message.author.id;
    const username = message.author.username;

    const aposta = parseValor(args[0]);
    if (!aposta || isNaN(aposta) || aposta <= 0) {
      return message.reply('❌ **|** Informe um **valor válido** para apostar. Exemplo: `Kcoinflip 1k cara`');
    }

    const VALOR_MAXIMO = 1_500_000;
    if (aposta > VALOR_MAXIMO) {
      return message.reply('❌ **|** O valor máximo para apostar é **1.500.000 Kronos (1m500)**.');
    }

    const escolha = (args[1] || '').toLowerCase();
    if (!['cara', 'coroa'].includes(escolha)) {
      return message.reply('❌ **|** Escolha entre **cara** ou **coroa**. Exemplo: `Kcoinflip 500 cara`');
    }

    const user = await getOrCreate(userId, username);
    if (user.money < aposta) {
      return message.reply(`❌ **|** Você precisa de pelo menos **${aposta.toLocaleString()} Kronos** para apostar.`);
    }

    // 💸 Deduz aposta e registra transação tipo 'bet' com detalhes 'Coinflip'
    user.money -= aposta;
    await update(user);
    await logTransaction(userId, 'bet', -aposta, 'Coinflip');

    // Kairox escolhe o lado oposto
    const kairoxEscolha = escolha === 'cara' ? 'coroa' : 'cara';

    const suspenseEmbed = new EmbedBuilder()
      .setColor('#f5c542')
      .setTitle('<:dados:1393309414290751820> **Coinflip** - **Cassino**')
      .setDescription(`<a:Coinflip:1393308934499995698> Girando a moeda...`);

    const suspenseMsg = await message.reply({ embeds: [suspenseEmbed] });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Probabilidade: 35% ganhar, 65% perder (ajuste se quiser)
    const venceu = Math.random() < 0.35;

    let cor, ganho;
    if (venceu) {
      ganho = aposta * 2;
      user.money += ganho;
      user.ultimaJogada = '<:correto:1393304379129598045> Vitória';
      cor = '#00ff88';
      await logTransaction(userId, 'bet', ganho, 'Coinflip');
    } else {
      ganho = 0;
      user.ultimaJogada = '<:errado:1393262652788183191> Derrota';
      cor = '#ff4444';
      await logTransaction(userId, 'bet', 0, 'Coinflip'); // perdeu, registra 0
    }

    user.jogadas = (user.jogadas || 0) + 1;
    await update(user);

    const resultadoEmbed = new EmbedBuilder()
      .setColor(cor)
      .setTitle('<:dados:1393309414290751820>  **Coinflip** - **Resultado**')
      .setDescription(
        `<a:Coinflip:1393308934499995698> **Você** escolheu: **${escolha.toUpperCase()}**\n` +
        `<:kairox:1386008482150355004> **Kairox** escolheu: **${kairoxEscolha.toUpperCase()}**\n\n` +
        (venceu
          ? `<:correto:1393304379129598045> Você **ganhou**.`
          : `<:errado:1393262652788183191> Você **perdeu**.`)
      )
      .addFields(
        {
          name: '<:dinheiro1:1392506009402081290> **Aposta**',
          value: `${aposta.toLocaleString()} Kronos`,
          inline: true
        },
        {
          name: '<:Saldo:1393303738533544039> **Saldo Atual**',
          value: `${user.money.toLocaleString()} Kronos`,
          inline: true
        },
        {
          name: '<:_pushpin:1393304066435584050> **Último Resultado**',
          value: `${user.ultimaJogada}`,
          inline: true
        }
      )
      .setFooter({ text: 'Cassino Kairox • Jogue com responsabilidade!' })
      .setTimestamp();

    await suspenseMsg.edit({ embeds: [resultadoEmbed] });
  }
};