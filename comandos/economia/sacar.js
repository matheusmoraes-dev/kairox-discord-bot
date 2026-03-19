const { getOrCreate, update } = require('../../database/database');

const LOG_CHANNEL_ID = '1392237355280236554';

const parseValor = require('../../utils/parseValor');

module.exports = {
  name: 'sacar',
  description: 'Sacar Kronos da sua conta bancária',

  async execute(message, args, client) {
    const userId = message.author.id;
    const username = message.author.username;
    const usuario = await getOrCreate(userId, username);

    if (!args[0]) return message.reply('❌ **|** Por favor, informe o **valor** para **sacar**.');

    const valor = parseValor(args[0]);

    if (!valor || isNaN(valor) || valor <= 0) {
      return message.reply('❌ **|** Valor **inválido** informado.');
    }

    if ((usuario.saldo_bancario || 0) < valor) {
      return message.reply('❌ **|** Você **não** tem esse valor **disponível** no **banco**.');
    }

    usuario.saldo_bancario -= valor;
    usuario.money += valor;
    await update(usuario);

    // Enviar log
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
      logChannel.send(`📤 \`${message.author.tag} (${userId})\` sacou **${valor.toLocaleString()}** Kronos do banco.`);
    }

    return message.reply(`📤 Você sacou **${valor.toLocaleString()}** Kronos da sua conta bancária com sucesso!`);
  }
};