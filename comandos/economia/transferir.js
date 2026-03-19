const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { getOrCreate, update, logTransaction } = require('../../database/database');

function parseAmount(str, saldoAtual) {
  if (!str) return NaN;
  str = str.toLowerCase().replace(/,/g, '');

  // 🔥 Novo: aceitar "all" e "half"
  if (str === 'all' || str === 'tudo' || str === 'todo') {
    return saldoAtual;
  }
  if (str === 'half' || str === 'metade' || str === 'meio') {
    return saldoAtual / 2;
  }

  const match = str.match(/^([\d.]+)([kmbt]?)$/i);
  if (!match) return NaN;

  const num = parseFloat(match[1]);
  const suffix = match[2];

  const multipliers = {
    '': 1,
    k: 1e3,
    m: 1e6,
    b: 1e9,
    t: 1e12
  };

  return num * (multipliers[suffix] || 1);
}

module.exports = {
  name: 'transferir',
  aliases: ['pix', 'pay', 'transferir'],
  description: '💸 Transfira Kronos para outro jogador com segurança.',

  async execute(message, args) {
    if (args.length < 1) {
      return message.reply('❌ Uso correto: `Ktransferir @usuário quantia`');
    }

    let destinatario = message.mentions.users.first();
    if (!destinatario) {
      try {
        destinatario = await message.client.users.fetch(args[0]);
      } catch {
        return message.reply('❌ Destinatário **inválido**.');
      }
    }

    if (message.author.id === destinatario.id) {
      return message.reply('❌ Você **não** pode transferir para si mesmo.');
    }

    if (args.length < 2) {
      return message.reply('❌ Falta adicionar o **valor**! Exemplo: `Ktransferir @usuário 1k`');
    }

    const remetenteData = await getOrCreate(message.author.id, message.author.username);
    const destinatarioData = await getOrCreate(destinatario.id, destinatario.username);

    // aqui já sabemos o saldo do remetente, então podemos interpretar "all" ou "half"
    const quantia = parseAmount(args[1], remetenteData.money);

    if (isNaN(quantia) || quantia <= 0) {
      return message.reply('❌ A quantia deve ser um número válido. Use `1k`, `2.5m`, `all`, `half`, etc.');
    }

    if (remetenteData.money < quantia) {
      return message.reply('❌ Você não tem Kronos suficientes para transferir.');
    }

    // 🔥 Mensagem exatamente como você pediu
    const mensagem = `
<:kairox:1386008482150355004> <@${destinatario.id}>, <@${message.author.id}> deseja lhe enviar <:kronos:1383480432233807942> **${Math.floor(quantia).toLocaleString('pt-BR')} Kronos**!
<a:fire_animation:1396647618423034037> Para aceitar o pagamento <@${message.author.id}> e <@${destinatario.id}> precisam clicar em "✅".
⭐ **IMPORTANTE**: É proibido trocar Kronos por **produtos** que possuem **valores reais** (**Discord nitro**, **dinheiro**, **conteúdo ilegal**/**NSFW**, **etc**) por vendas de Kronos por dinheiro real, Você será banido de usar todos os comandos do Kariox, caso faça!
**<:Warn_Red:1395928923216416768> ATENÇÃO**: Você não conseguirá pedir seus Kronos de volta , o Kairox não irá te ajudar a recuperar os Kronos, então apenas envie Kronos para pessoas confiáveis!
**⏳**(Este pagamento expira em **3 minutos**).`;

    let aceitarLabel = '✅ Aceitar (0/2)';
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('aceitar_transferencia')
        .setLabel(aceitarLabel)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('recusar_transferencia')
        .setLabel('❌ Recusar')
        .setStyle(ButtonStyle.Danger)
    );

    await message.reply('✅ Solicitação de transferência iniciada. Aguardando confirmações...');

    const msg = await message.channel.send({
      content: mensagem,
      components: [row]
    });

    const confirmantes = new Set();

    const updateAceitarLabel = () => {
      const aceitou = confirmantes.size;
      row.components[0].setLabel(`✅ Aceitar (${aceitou}/2)`);
      msg.edit({ components: [row] }).catch(() => {});
    };

    const collector = msg.createMessageComponentCollector({
      time: 180000
    });

    collector.on('collect', async i => {
      if (![message.author.id, destinatario.id].includes(i.user.id)) {
        return i.reply({ content: '❌ Apenas o remetente e o destinatário podem interagir com esta transferência.', ephemeral: true });
      }

      if (i.customId === 'aceitar_transferencia') {
        if (confirmantes.has(i.user.id)) {
          return i.reply({ content: '✅ Você já aceitou a transferência.', ephemeral: true });
        }

        confirmantes.add(i.user.id);
        await i.reply({ content: '✅ Você aceitou a transferência.', ephemeral: true });
        updateAceitarLabel();

        if (confirmantes.size === 2) {
          remetenteData.money -= quantia;
          destinatarioData.money += quantia;

          await update(remetenteData);
          await update(destinatarioData);

          await logTransaction(message.author.id, 'transfer', -Math.floor(quantia), `para ${destinatario.username} (${destinatario.id})`);
          await logTransaction(destinatario.id, 'transfer', Math.floor(quantia), `de ${message.author.username} (${message.author.id})`);

          collector.stop();

          await msg.edit({
            components: []
          });

          await message.reply(
            `<:kairoxfeliz:1386008425913253938> <@${message.author.id}> pagamento efetuado com sucesso! <@${destinatario.id}> recebeu <:kronos:1383480432233807942> **${Math.floor(quantia).toLocaleString('pt-BR')} Kronos**.`
          );
        }
      }

      if (i.customId === 'recusar_transferencia') {
        collector.stop();

        await i.reply({ content: '❌ Você recusou a transferência.', ephemeral: true });

        await msg.edit({
          content: '❌ A transferência foi **recusada**. Operação cancelada.',
          components: []
        });
      }
    });

    collector.on('end', async () => {
      if (confirmantes.size < 2) {
        await msg.edit({
          content: '❌ A transferência **expirou**. Nem todos confirmaram a tempo.',
          components: []
        });
      }
    });
  }
};