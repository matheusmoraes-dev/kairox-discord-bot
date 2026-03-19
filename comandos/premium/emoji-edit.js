const { EmbedBuilder } = require('discord.js');
const { getOrCreate, dbRun } = require('../../database/database'); // ajuste caminho

// IDs fixos do servidor e cargo premium
const guildPremiumId = '1125069261929463808';
const cargoPremiumId = '1383630603475488829';

module.exports = {
  name: 'emoji',
  aliases: ['emoji', 'emoji'],
  description: '🎨 Personalize seu emoji nas rinhas (apenas para Premium).',

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const userId = message.author.id;
    const username = message.author.username;

    // Tenta buscar o guild e membro do servidor premium
    let guildPremium;
    try {
      guildPremium = await client.guilds.fetch(guildPremiumId);
    } catch {
      return message.reply('❌ Não foi possível acessar o servidor Premium. Tente novamente mais tarde.');
    }

    let membro;
    try {
      membro = await guildPremium.members.fetch(userId);
    } catch {
      // Usuário não encontrado no servidor Premium
      return message.reply(
        '🚫 **|** Esse comando é exclusivo para usuários **Premium**.\n' +
        'Adquira o plano para poder personalizar seu emoji: `Kemoji 😈`!'
      );
    }

    if (!membro.roles.cache.has(cargoPremiumId)) {
      return message.reply(
        '🚫 **|** Esse comando é exclusivo para usuários **Premium**.\n' +
        'Adquira o plano para poder personalizar seu emoji: `Kemoji 😈`!'
      );
    }

    const input = args.join(' ').trim();
    if (!input) {
      return message.reply('❌ **|** Você precisa **informar** um **emoji**. Exemplo: `Kemoji 😈`');
    }

    // Regex para emoji customizado do Discord
    const customEmojiRegex = /^<(a?):\w+:(\d+)>$/;

    // Regex para emoji unicode
    const unicodeEmojiRegex = /\p{Extended_Pictographic}/u;

    let emojiFinal = null;

    if (customEmojiRegex.test(input)) {
      emojiFinal = input;
    } else if (unicodeEmojiRegex.test(input)) {
      const match = input.match(unicodeEmojiRegex);
      emojiFinal = match ? match[0] : null;
    }

    if (!emojiFinal) {
      return message.reply('❌ **|** Emoji inválido. Envie um emoji Unicode (😈) ou um customizado do Discord.');
    }

    const user = await getOrCreate(userId, username);
    await dbRun(`UPDATE users SET emoji = ? WHERE user_id = ?`, [emojiFinal, user.user_id]);

    const embed = new EmbedBuilder()
      .setColor('#ecec53')
      .setTitle('`🎭` | Emoji Personalizado Atualizado!')
      .setDescription(
        `<@${userId}> **Seu emoji foi alterado com sucesso!**\n` +
        `-# seu emoji: ${emojiFinal}\n` +
        `Agora, seu emoji estará em suas apostas em \`Krace\` e \`Kbet\`.\n\n` +
        `-# \`📚\` | **OBSERVAÇÃO:**\n` +
        'Certifique-se de que o emoji escolhido esteja no servidor, caso contrário não será possível adicioná-lo.'
      );

    return message.reply({ embeds: [embed] });
  },
};