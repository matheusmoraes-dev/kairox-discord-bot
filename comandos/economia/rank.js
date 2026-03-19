const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');
const { generateKrankImage: generateRankImage } = require('../../utils/generateRankImage');
const { getTopUsers } = require('../../database/database');
const { getDiscordUserSafe } = require('../../utils/discordUtils');

const USERS_PER_PAGE = 5;
const CACHE_TIME = 300000;

const rankCache = {
  data: {},
  lastUpdate: {}
};

module.exports = {
  name: 'rank',
  description: 'Mostra o ranking de usuários com mais Kronos 💰',
  category: 'info',
  aliases: ['lb', 'top', 'ranking', 'kronosrank'],
  cooldown: 10,

  async execute(message, args, client) {
    try {
      const field = 'money';
      const limit = 50;
      const now = Date.now();
      const cacheKey = `${field}_${limit}`;
      const useCache = rankCache.data[cacheKey] && (now - rankCache.lastUpdate[cacheKey] < CACHE_TIME);

      let usersAll;
      if (useCache) {
        usersAll = rankCache.data[cacheKey];
      } else {
        usersAll = await getTopUsers(field, limit);
        rankCache.data[cacheKey] = usersAll;
        rankCache.lastUpdate[cacheKey] = now;
        console.log(`[RANK] Dados atualizados (${field}) - ${usersAll?.length || 0} usuários`);
      }

      if (!usersAll || !Array.isArray(usersAll) || usersAll.length === 0) {
        return message.reply('📭 O ranking está vazio. Use comandos para ganhar Kronos e aparecer aqui!');
      }

      const formattedUsers = await Promise.all(
        usersAll.map(async (user, index) => {
          const userId = String(user.user_id || user.id || '0');
          const discordUser = await getDiscordUserSafe(client, userId);

          return {
            id: userId,
            username: discordUser ? discordUser.username : `Desconhecido#${userId.slice(-4)}`,
            money: user.money || 0,
            position: index + 1,
            avatar_url: discordUser
              ? discordUser.displayAvatarURL({ extension: 'png', size: 256 })
              : `https://cdn.discordapp.com/embed/avatars/${index % 5}.png`
          };
        })
      );

      const totalPages = Math.ceil(formattedUsers.length / USERS_PER_PAGE);
      let currentPage = 1;

      const sendRankPage = async (page, interactionToUpdate = null) => {
        const startIdx = (page - 1) * USERS_PER_PAGE;
        const pageUsers = formattedUsers.slice(startIdx, startIdx + USERS_PER_PAGE);

        const buffer = await generateRankImage({
          users: pageUsers,
          currentPage: page,
          totalPages
        });

        const attachment = new AttachmentBuilder(buffer, { name: `rank_kronos_page_${page}.png` });

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('rank_prev').setLabel('◀️ Anterior').setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
          new ButtonBuilder().setCustomId('rank_ids').setLabel('📖').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('rank_next').setLabel('▶️ Próximo').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages)
        );

        const content = `**${message.author}** (Página ${page}/${totalPages})`;

        if (interactionToUpdate) {
          return interactionToUpdate.update({ content, files: [attachment], components: [buttons] });
        } else {
          return { content, files: [attachment], components: [buttons] };
        }
      };

      const rankMsg = await message.reply(await sendRankPage(currentPage));

      const collector = rankMsg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id && i.customId.startsWith('rank_'),
        componentType: ComponentType.Button,
        time: 300000
      });

      collector.on('collect', async interaction => {
        try {
          const startIdx = (currentPage - 1) * USERS_PER_PAGE;
          const pageUsers = formattedUsers.slice(startIdx, startIdx + USERS_PER_PAGE);

          switch (interaction.customId) {
            case 'rank_prev':
              currentPage = Math.max(1, currentPage - 1);
              await sendRankPage(currentPage, interaction);
              break;

            case 'rank_next':
              currentPage = Math.min(totalPages, currentPage + 1);
              await sendRankPage(currentPage, interaction);
              break;

            case 'rank_ids':
              const idList = pageUsers
                .map((user, i) => `${i + 1 + startIdx}. <@${user.id}> — \`${user.id}\``)
                .join('\n');

              await interaction.reply({
                content: `📋 **IDs desta página:**\n\n${idList}`,
                ephemeral: true
              });
              break;
          }
        } catch (err) {
          console.error('[RANK] Erro ao processar interação:', err);
          if (!interaction.replied) {
            await interaction.reply({ content: '❌ Falha ao atualizar o ranking.', ephemeral: true });
          }
        }
      });

      collector.on('end', () => {
        rankMsg.edit({ components: [] }).catch(() => {});
      });

    } catch (err) {
      console.error('[RANK] Erro geral:', err);
      message.reply('❌ Não foi possível executar o comando.').catch(() => {});
    }
  }
};