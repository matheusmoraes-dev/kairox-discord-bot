const {
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
} = require('discord.js');
const ms = require('ms');

function parseValor(valor) {
  valor = valor.toLowerCase();
  if (valor.endsWith('kk')) return parseFloat(valor) * 1_000_000_000; // kk = bilhões
  if (valor.endsWith('m')) return parseFloat(valor) * 1_000_000;
  if (valor.endsWith('k')) return parseFloat(valor) * 1_000;
  return parseFloat(valor);
}

module.exports = {
  name: 'drop',
  aliases: ['drop'],
  async execute(message, args, client, ctx) {
    const cargoStaffId = '1391979793767207002';
    const servidorId = '1125069261929463808';

    if (
      message.guild.id !== servidorId ||
      !message.member.roles.cache.has(cargoStaffId)
    ) {
      return message.reply('❌ **|** Este comando é reservado apenas para administradores do servidor!');
    }

    const [valorRaw, tempoRaw, ganhadoresRaw] = args;

    if (!valorRaw || !tempoRaw || !ganhadoresRaw) {
      return message.reply('❌ **|** Uso correto: Kdrop 100k 5m 3 (valor, tempo, número de vencedores)');
    }

    const valor = parseValor(valorRaw);
    const tempoMs = ms(tempoRaw);
    const ganhadoresQtd = parseInt(ganhadoresRaw);

    if (isNaN(valor) || isNaN(tempoMs) || isNaN(ganhadoresQtd) || ganhadoresQtd < 1) {
      return message.reply('❌ **|** Certifique-se de fornecer valores válidos. Ex: 100k, 5m, 3');
    }

    const participantes = new Set();

    const botao = new ButtonBuilder()
      .setCustomId('participar_drop')
      .setLabel(`🔥 Participar! - 0`)
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);

    const startTimestamp = Date.now();
    const endTimestamp = startTimestamp + tempoMs;

    function formatTempoRestante(msLeft) {
      if (msLeft <= 0) return '0';
      return Math.ceil(msLeft / 1000); // segundos restantes arredondados para cima
    }

    const criarEmbed = (tempoRestanteSeg, ganhadoresTexto) => new EmbedBuilder()
      .setTitle(`🎁 ${valor.toLocaleString('pt-BR')} de KROOOONOSSS!`)
      .setDescription(
        `Drop iniciado por ${message.author}\n\n` +
        `<:kronos:1383480432233807942> Valor\n` +
        `${valor.toLocaleString('pt-BR')} Kronos\n\n` +
        `<a:emoji_33:1391212838214963311> Ganhadores\n` +
        `${ganhadoresQtd}\n\n` +
        `<:relogio:1383970376916140134> Tempo para finalizar:\n` +
        `Faltam ${tempoRestanteSeg} segundos\n\n` +
        `<a:a_spiral:1391951241940045874> Ganhadores:\n` +
        ganhadoresTexto
      )
      .setFooter({ text: `Drop iniciado por ${message.author.tag} • ${new Date().toLocaleString('pt-BR')}` })
      .setColor('#ecd453')
      .setThumbnail(client.user.displayAvatarURL())
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL({ format: 'png', size: 64 }),
      });

    const embedInicial = criarEmbed(formatTempoRestante(tempoMs), 'Ganhadores ainda **não** definidos.');
    const msg = await message.channel.send({ embeds: [embedInicial], components: [row] });

    const intervalo = setInterval(async () => {
      const tempoRestante = endTimestamp - Date.now();

      if (tempoRestante <= 0) {
        clearInterval(intervalo);
        return;
      }

      botao.setLabel(`🔥 Participar! - ${participantes.size}`);

      const embedAtualizado = criarEmbed(formatTempoRestante(tempoRestante), 'Ganhadores ainda **não** definidos.');

      try {
        await msg.edit({ embeds: [embedAtualizado], components: [new ActionRowBuilder().addComponents(botao)] });
      } catch (error) {
        console.error('[Drop] Erro ao editar mensagem:', error);
      }
    }, 1000);

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: tempoMs,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'participar_drop') {
        if (!participantes.has(interaction.user.id)) {
          participantes.add(interaction.user.id);
          botao.setLabel(`🔥 Participar! - ${participantes.size}`);

          try {
            await interaction.update({
              components: [new ActionRowBuilder().addComponents(botao)],
            });
          } catch (e) {
            console.error('[Drop] Erro ao atualizar interação:', e);
          }
        } else {
          await interaction.reply({ content: 'Você já está participando!', ephemeral: true });
        }
      }
    });

    collector.on('end', async () => {
      clearInterval(intervalo);

      const ganhadores = Array.from(participantes);
      const sorteados = [];

      while (sorteados.length < ganhadoresQtd && ganhadores.length > 0) {
        const index = Math.floor(Math.random() * ganhadores.length);
        const escolhido = ganhadores.splice(index, 1)[0];
        sorteados.push(escolhido);
      }

      const nomes = sorteados.length > 0 ? sorteados.map(id => `<@${id}>`).join(', ') : 'Nenhum ganhador definido.';

      const embedFinal = criarEmbed('0', nomes)
        .setColor('Green');

      try {
        await msg.edit({ embeds: [embedFinal], components: [] });
      } catch (error) {
        console.error('[Drop] Erro ao editar mensagem final:', error);
      }

      if (sorteados.length > 0) {
        await message.channel.send(nomes);
        await message.reply(`<:kairox:1386008482150355004> Parabéns para os ganhadores do drop de **${valor.toLocaleString('pt-BR')} Kronos**!`);
      }

      // Entrega Kronos para os ganhadores e envia DM
      for (const id of sorteados) {
        try {
          const user = await ctx.getOrCreate(id);
          user.money = (user.money || 0) + valor;
          await ctx.update(user);

          const rank = await ctx.getUserRank(id, 'money');
          const membro = await client.users.fetch(id);

          const dmEmbed = new EmbedBuilder()
            .setAuthor({ name: membro.username, iconURL: membro.displayAvatarURL() })
            .setTitle('🎉 Parabéns!')
            .setDescription(`Olá <@${id}>, você acaba de ganhar ${valor.toLocaleString('pt-BR')} Kronos no **Kairox**!\nTe espero no cassino!`)
            .addFields(
              { name: '📊 Posição no Ranking de Kronos', value: `Você está na posição #${rank.rank}`, inline: false },
              { name: '💰 Saldo Atual', value: `<:kronos:1383480432233807942> ${user.money.toLocaleString('pt-BR')} Kronos`, inline: false }
            )
            .setColor('#ecec53')
            .setFooter({ text: 'Kairox - O cassino mais confiável do Discord' });

          await membro.send({ embeds: [dmEmbed] }).catch(() => null);
        } catch (error) {
          console.error(`[Drop] Erro ao enviar DM para ${id}:`, error);
        }
      }
    });
  }
};