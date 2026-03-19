// comandos/afk.js
const afkMap = new Map(); // userId => { since: Date.now(), reason: string }

module.exports = {
  name: 'afk',
  aliases: [''],
  description: 'Ativa o modo AFK (com motivo ou sem)',
  async execute(message, args, client) {
    const motivo = args.join(' ').trim();
    afkMap.set(message.author.id, {
      since: Date.now(),
      reason: motivo || null
    });

    return message.reply(
      `💤 **|** Modo **AFK** ativado${
        motivo ? ` com motivo: \`${motivo}\`` : ''
      }. Você sairá do modo AFK assim que disser algo no chat.`
    );
  }
};

module.exports.afkMap = afkMap;