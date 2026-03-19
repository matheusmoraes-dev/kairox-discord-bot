const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'say',
  description: '📢 Faz o bot falar (só para administradores)',
  async execute(message, args) {
    // Checa permissão de administrador
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Você precisa ser administrador para usar este comando.');
    }

    // Junta os args em uma string (mensagem)
    const mensagem = args.join(' ');
    if (!mensagem && message.attachments.size === 0) {
      return message.reply('❌ Por favor, forneça a mensagem ou uma imagem que o bot deve enviar.');
    }

    const embed = new EmbedBuilder()
      .setColor('#b3d5e0')
      // .setFooter({ 
      //   text: `Mensagem enviada por ${message.author.username}`, 
      //   iconURL: message.author.displayAvatarURL({ dynamic: true }) 
      // })
      // .setTimestamp();

    // Se tiver mensagem, adiciona no embed
    if (mensagem) {
      embed.setDescription(mensagem);
    }

    // Verifica se há algum anexo de imagem
    if (message.attachments.size > 0) {
      const firstAttachment = message.attachments.first();
      if (firstAttachment && firstAttachment.contentType && firstAttachment.contentType.startsWith('image/')) {
        embed.setImage(firstAttachment.url);
      }
    }

    // Resposta de confirmação
    await message.reply('✅ Mensagem enviada com sucesso!');

    // Envia embed no canal
    await message.channel.send({ embeds: [embed] });
  }
};