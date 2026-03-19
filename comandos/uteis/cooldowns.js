const { EmbedBuilder } = require('discord.js');

const formatarTempo = (msRestante) => {
  const totalSeg = Math.floor(msRestante / 1000);
  const horas = Math.floor(totalSeg / 3600);
  const minutos = Math.floor((totalSeg % 3600) / 60);
  const segundos = totalSeg % 60;

  return `${horas > 0 ? `${horas}h ` : ''}${minutos}m ${segundos}s`;
};

module.exports = {
  name: 'cooldowns',
  aliases: ['cooldowns', 'cd'],
  description: '⏰ Veja seus tempos de espera dos comandos com cooldown.',

  async execute(message, args, client, helpers) {
    const { getOrCreate } = helpers;
    const user = await getOrCreate(message.author.id, message.author.username);

    const agora = Date.now();

    const cooldowns = [
      { nome: '📅 Daily', campo: 'lastDaily', tempo: 24 * 60 * 60 * 1000 },
      { nome: '📦 Semanal', campo: 'lastWeekly', tempo: 7 * 24 * 60 * 60 * 1000 },
      { nome: '🛠️ Work', campo: 'lastWork', tempo: 60 * 60 * 1000 },
      { nome: '🕵️ Crime', campo: 'lastCrime', tempo: 30 * 60 * 1000 }
    ];

    const linhas = cooldowns.map(cd => {
      const ultimoUso = user[cd.campo] || 0;
      const tempoRestante = cd.tempo - (agora - ultimoUso);
      if (tempoRestante > 0) {
        return `**${cd.nome}:** ⏳ disponível em \`${formatarTempo(tempoRestante)}\``;
      } else {
        return `**${cd.nome}:** ✅ disponível agora`;
      }
    });

    const botAvatar = client.user.displayAvatarURL({ dynamic: true, size: 1024 });
    const userAvatar = message.author.displayAvatarURL({ dynamic: true, size: 1024 });

    const embed = new EmbedBuilder()
      .setColor('#79b6c9')
      .setAuthor({ name: 'Seus Cooldowns', iconURL: botAvatar })
      .setTitle(`⏰ Cooldowns de ${message.author.username}`)
      .setDescription(linhas.join('\n'))
      .setThumbnail(userAvatar)
      .setFooter({ text: 'Use seus comandos assim que estiverem disponíveis!' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};