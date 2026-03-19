const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder
} = require('discord.js');

const { getTransactions } = require('../../database/database'); // função especializada

function formatarData(ms) {
  const d = new Date(ms);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `[${dia}/${mes}/${ano} ${hora}:${min}]`;
}

module.exports = {
  name: 'transações',
  aliases: ['tr'],
  async execute(message) {
    const userId = message.author.id;
    const username = message.author.username;

    const categorias = [
      { id: 'daily', label: 'Daily', emoji: '📦' },
      { id: 'weekly', label: 'Semanal', emoji: '🗓️' },
      { id: 'work', label: 'Work', emoji: '💼' },
      { id: 'crime', label: 'Crime', emoji: '🕵️' },
      { id: 'transfer', label: 'Transferências', emoji: '💰' },
      { id: 'bet', label: 'Apostas', emoji: '🎲' },
      { id: 'rifa', label: 'Rifa', emoji: '🎟️' },
      { id: 'emojifight', label: 'Emoji Fight', emoji: '⚔️' }
    ];

    const menu = new StringSelectMenuBuilder()
      .setCustomId('selecionar_categoria')
      .setPlaceholder('Selecione a categoria de transações')
      .addOptions(categorias.map(c => ({
        label: c.label,
        value: c.id,
        emoji: c.emoji
      })));

    const rowMenu = new ActionRowBuilder().addComponents(menu);

    const embedInicial = new EmbedBuilder()
      .setTitle('📑 Seleção de transações')
      .setDescription('Selecione abaixo a **categoria de transações** que deseja ver:')
      .setColor('#5353ec')
      .setFooter({ text: `Kairox • Histórico de transações` });

    const msgMenu = await message.reply({ embeds: [embedInicial], components: [rowMenu] });

    const coletorMenu = msgMenu.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000,
      filter: i => i.user.id === userId
    });

    let pagina = 0;
    let rows = [];
    let totalPaginas = 1;

    coletorMenu.on('collect', async interaction => {
      const categoriaAtual = interaction.values[0];
      await interaction.deferUpdate();

      rows = await getTransactions(userId, categoriaAtual, 100);

      if (!rows || rows.length === 0) {
        const semEmbed = new EmbedBuilder()
          .setColor('Red')
          .setDescription(`⚠️ Nenhuma transação encontrada para **${categoriaAtual}**.`)
          .setFooter({ text: 'Kairox • Histórico de transações' });
        return msgMenu.edit({ embeds: [semEmbed], components: [rowMenu] });
      }

      pagina = 0;
      totalPaginas = Math.ceil(rows.length / 10);

      const gerarEmbed = () => {
        const inicio = pagina * 10;
        const fim = inicio + 10;
        const lista = rows.slice(inicio, fim);

        const linhas = lista.map(r => {
          let emojiTipo = '💸';
          let descricao = '';

          switch (r.tipo) {
            case 'daily':
              emojiTipo = '📦';
              descricao = `Recebeu **${r.valor.toLocaleString()} Kronos** por Daily`;
              break;
            case 'weekly':
              emojiTipo = '🗓️';
              descricao = `Recebeu **${r.valor.toLocaleString()} Kronos** por Semanal`;
              break;
            case 'work':
              emojiTipo = '💼';
              descricao = `Recebeu **${r.valor.toLocaleString()} Kronos** por Trabalho`;
              break;
            case 'crime':
              emojiTipo = '🕵️';
              descricao = `Ganhou/perdeu **${r.valor.toLocaleString()} Kronos** em Crime`;
              break;
            case 'transfer':
              if (r.detalhes && r.detalhes.startsWith('para')) {
                emojiTipo = '💰';
                descricao = `Enviou **${r.valor.toLocaleString()} Kronos** ${r.detalhes}`;
              } else {
                emojiTipo = '💸';
                descricao = `Recebeu **${r.valor.toLocaleString()} Kronos** ${r.detalhes || ''}`.trim();
              }
              break;
            case 'bet':
              emojiTipo = '🎲';
              // Exemplo de r.detalhes: "Aviator", "Blackjack", etc.
              const apostaNome = r.detalhes || 'Aposta';
              // Mostrar valor com sinal positivo ou negativo
              const sinal = r.valor >= 0 ? '+' : '-';
              const valorAbs = Math.abs(r.valor).toLocaleString();
              descricao = `Participou do ${apostaNome}: ${sinal}${valorAbs} Kronos`;
              break;
            case 'rifa':
              emojiTipo = '🎟️';
              descricao = `Entrou na Rifa: **${r.valor.toLocaleString()} Kronos**`;
              break;
            case 'emojifight':
              emojiTipo = '⚔️';
              descricao = `Jogou Emoji Fight: **${r.valor.toLocaleString()} Kronos**`;
              break;
            default:
              emojiTipo = '❔';
              descricao = 'Transação desconhecida';
          }

          return `${formatarData(r.timestamp)} ${emojiTipo} ${descricao}`;
        }).join('\n');

        return new EmbedBuilder()
          .setTitle(`📜 Transações de ${username} - (${pagina + 1}/${totalPaginas})`)
          .setDescription(linhas)
          .setColor('#84fa84')
          .setFooter({ text: `Total de ${rows.length} transações • Kairox` });
      };

      const rowButtons = () => new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('⬅️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pagina === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pagina === totalPaginas - 1)
      );

      await msgMenu.edit({ embeds: [gerarEmbed()], components: [rowMenu, rowButtons()] });

      const coletorBotoes = msgMenu.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
        filter: i => i.user.id === userId
      });

      coletorBotoes.on('collect', async btn => {
        await btn.deferUpdate();
        if (btn.customId === 'prev' && pagina > 0) pagina--;
        if (btn.customId === 'next' && pagina < totalPaginas - 1) pagina++;
        await msgMenu.edit({ embeds: [gerarEmbed()], components: [rowMenu, rowButtons()] });
      });

      coletorBotoes.on('end', async () => {
        // Remove os botões para evitar interação após o tempo
        await msgMenu.edit({ components: [rowMenu] }).catch(() => {});
      });
    });

    coletorMenu.on('end', async collected => {
      if (collected.size === 0) {
        await msgMenu.edit({ content: '⏰ Tempo esgotado para selecionar categoria.', components: [] }).catch(() => {});
      } else {
        await msgMenu.edit({ components: [] }).catch(() => {});
      }
    });
  }
};