const { getOrCreate, update } = require('../../database/database');

const LOG_CHANNEL_ID = '1392237355280236554';

const parseValor = require('../../utils/parseValor');

module.exports = {
  name: 'depositar',
  aliases: ['dep'],
  description: 'Depositar Kronos na sua conta bancária',

  async execute(message, args, client) {
    const userId = message.author.id;
    const username = message.author.username;
    const usuario = await getOrCreate(userId, username);

    if (!args[0]) return message.reply('❌ **|** Por favor, **informe** o **valor** para depositar.');

    const valor = parseValor(args[0]);

    if (!valor || isNaN(valor) || valor <= 0) {
      return message.reply('❌ **|** Valor **inválido** informado.');
    }

    if ((usuario.money || 0) < valor) {
      return message.reply('❌ **|** Você não tem Kronos **suficientes** para depositar esse **valor**.');
    }

    usuario.money -= valor;
    usuario.saldo_bancario = (usuario.saldo_bancario || 0) + valor;
    await update(usuario);

    // Enviar log
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
      logChannel.send(`📥 \`${message.author.tag} (${userId})\` depositou **${valor.toLocaleString()}** Kronos no banco.`);
    }

    return message.reply(`📥 Você depositou **${valor.toLocaleString()}** Kronos na sua conta bancária com sucesso!`);
  }
};