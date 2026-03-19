const { EmbedBuilder } = require('discord.js');

// ⏳ Cooldown de 30 minutos
const CRIME_COOLDOWN = 30 * 60 * 1000;

// 🏪 Locais possíveis para o crime
const LUGARES = [
  'uma farmácia', 'uma loja de roupas', 'um banco', 'um supermercado',
  'um posto de gasolina', 'uma joalheria', 'um mercado de bairro',
  'uma padaria', 'uma loja de eletrônicos', 'uma conveniência'
];

// Emoji
const EMOJI_KRONOS = '<:kronos:1383480432233807942>';

module.exports = {
  name: 'crime',
  description: ':man_detective: Cometa um crime para ganhar Kronos (com risco de ser pego pela polícia)',
  aliases: ['crime', 'roubar', 'assaltar'],

  async execute(message, args, client, helpers) {
    // ✅ Importa helpers do database (inclusive logTransaction)
    const { getOrCreate, update, logTransaction } = helpers;
    const userId = message.author.id;

    // 🔎 Carrega ou cria o usuário
    const user = await getOrCreate(userId, message.author.username);
    const agora = Date.now();

    // 🕒 Verifica cooldown
    if (user.lastCrime && agora - user.lastCrime < CRIME_COOLDOWN) {
      const restante = CRIME_COOLDOWN - (agora - user.lastCrime);
      const minutos = Math.floor(restante / 60000);
      const segundos = Math.floor((restante % 60000) / 1000);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ec5353')
            .setTitle('⏳ Espere um pouco!')
            .setDescription(
              `<:relogio:1383970376916140134> Você poderá **cometer** outro crime em **${minutos}m ${segundos}s**.\n` +
              '> Use `Kcooldowns` para verificar seus tempos.'
            )
        ]
      });
    }

    // 📍 Escolhe um local e define sucesso/fracasso
    const local = LUGARES[Math.floor(Math.random() * LUGARES.length)];
    const sucesso = Math.random() < 0.7; // 70% de chance
    let descricao = `🎯 <@${user.user_id}> tentou assaltar ${local}\n`;

    if (sucesso) {
      // 💰 Ganho
      const ganho = Math.floor(Math.random() * 3000) + 500; // 500~3500

      user.money += ganho;
      user.lastCrime = agora;

      // Atualiza banco
      await update(user);

      // 📒 Registra transação tipo bet (positivo)
      await logTransaction(userId, 'bet', ganho, 'Crime');

      descricao += `✅ Você assaltou ${local} e conseguiu roubar ${EMOJI_KRONOS} **${ganho.toLocaleString()} Kronos**!\n`;
    } else {
      // ❌ Perda
      const perda = 1000;
      user.money = Math.max(0, user.money - perda);
      user.lastCrime = agora;

      // Atualiza banco
      await update(user);

      // 📒 Registra transação tipo bet (negativo)
      await logTransaction(userId, 'bet', -perda, 'Crime');

      descricao += `🚨 Você foi pego pela **polícia** e perdeu ${EMOJI_KRONOS} **${perda.toLocaleString()} Kronos**!\n`;
    }

    // 📆 Próximo horário disponível
    const proximo = `<t:${Math.floor((agora + CRIME_COOLDOWN) / 1000)}:R> • <t:${Math.floor((agora + CRIME_COOLDOWN) / 1000)}:t>`;

    const embed = new EmbedBuilder()
      .setColor(sucesso ? '#109010' : '#ec5353')
      .setTitle('🔫 Crime Cometido')
      .setDescription(
        descricao +
        `\n\n<:relogio:1383970376916140134> **|** Retorne em **30 minutos** para cometer outro crime!\n` +
        `<:date:1393316384972341418> **|** Próximo: ${proximo}`
      );

    return message.reply({ embeds: [embed] });
  },
};