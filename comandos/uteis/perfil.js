const { AttachmentBuilder } = require('discord.js');
const { generateProfileImage } = require('../../utils/generateProfileImage');
const {
  getOrCreate,
  getUserRank,
  isPremium
} = require('../../database/database');

module.exports = {
  name: 'perfil',
  aliases: ['profile'],
  description: 'Exibe o perfil seu ou de outro usuário mencionado.',

  async execute(message, args) {
    // Verifica se há menção
    const targetMember = message.mentions.members.first() || message.member;
    const targetUser = targetMember.user;

    const userId = targetMember.id;
    const username = targetUser.username;
    const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 128 });

    // Dados do banco
    const userData = await getOrCreate(userId, username);
    const rankKronos = await getUserRank(userId, 'money').then(r => r.rank);

    // Flags
    const isBooster = targetMember.roles.cache.has('1391196028644102205');
    const isDoador = targetMember.roles.cache.has('1379968674072363038');
    const isPremiumStatus = await isPremium(userId);  // <-- Ajustado aqui

    // Gera imagem (não envia mais xp ou level)
    const imageBuffer = await generateProfileImage({
      username,
      avatarURL,
      kronos: userData.money,
      rankKronos,
      lastDaily: userData.lastDaily,
      isBooster,
      isPremium: isPremiumStatus,
      isDoador
    });

    const attachment = new AttachmentBuilder(imageBuffer, { name: 'perfil.png' });

    await message.reply({ files: [attachment] });
  }
};