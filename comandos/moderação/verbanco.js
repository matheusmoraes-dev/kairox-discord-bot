const { getOrCreate } = require('../../database/database');

const ROLE_ID_EQUIPE = '1392360963642232952';

module.exports = {
  name: 'verbanco',
  description: 'Ver saldo bancário e carteira de outro jogador (só equipe)',

  async execute(message, args) {
    // Verifica se quem executa tem o cargo da equipe
    if (!message.member.roles.cache.has(ROLE_ID_EQUIPE)) {
      return message.reply('❌ **|** Você **não** tem **permissão** para usar este **comando**.');
    }

    // Pega o usuário mencionado ou pelo ID passado
    let user = null;
    if (message.mentions.users.size > 0) {
      user = message.mentions.users.first();
    } else if (args[0]) {
      try {
        user = await message.client.users.fetch(args[0]);
      } catch {
        return message.reply('❌ **|** Usuário **inválido**.');
      }
    } else {
      return message.reply('❌ **|** Você precisa **mencionar** um **usuário** ou passar o **ID** dele.');
    }

    const usuario = await getOrCreate(user.id, user.username);

    const saldoCarteira = usuario.money || 0;
    const saldoBanco = usuario.saldo_bancario || 0;

    return message.reply(
      `💰 Saldo do usuário **${user.tag}**:\n` +
      `- Carteira: ${saldoCarteira.toLocaleString()}\n Kronos` +
      `- Banco: ${saldoBanco.toLocaleString()} Kronos`
    );
  }
};