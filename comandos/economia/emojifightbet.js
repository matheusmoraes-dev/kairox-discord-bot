const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');

// taxa aplicada apenas se o vencedor NÃO tiver um dos cargos isentos
const TAXA = 0.05;

const DEFAULT_EMOJIS = ['😎','🤓','😤','👻','💀','🤖','😈','🐵','🦁','🐍'];
const PREMIUM_GUILD_ID = '1125069261929463808';
const CARGOS_ISENTOS = [
  '1391196028644102205', // Booster
  '1379968674072363038', // Doador
  '1383630603475488829', // Premium
];

function parseValor(valorStr, saldo) {
  if (!valorStr) return NaN;
  const lower = valorStr.toLowerCase();
  if (lower === 'all') return saldo;
  if (lower === 'half') return Math.floor(saldo / 2);
  valorStr = valorStr.replace(/[,]/g, '');
  const match = valorStr.match(/^([\d.]+)([kmbt]{1,2})?$/);
  if (!match) return parseInt(valorStr);
  const num = parseFloat(match[1]);
  const suf = match[2];
  const mult = { k:1e3, kk:1e6, m:1e6, mm:1e9, b:1e9, bb:1e12, t:1e12 };
  return Math.floor(num * (mult[suf] || 1));
}

async function isVip(client, userId) {
  const guild = await client.guilds.fetch(PREMIUM_GUILD_ID).catch(() => null);
  if (!guild) return false;
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return false;
  return CARGOS_ISENTOS.some(r => member.roles.cache.has(r));
}

module.exports = {
  name: 'emojifightbet',
  aliases: ['bet','rinhabet'],
  description: '⚔️ Desafie alguém para uma rinha de emojis valendo Kronos (1x1)',

  async execute(message, args, client, helpers) {
    const { getOrCreate, update, logTransaction } = helpers;

    const mentionedUser = message.mentions.users.first();
    const desafiante = await getOrCreate(message.author.id, message.author.username);

    const valorArg = args[1];
    const valorAposta = parseValor(valorArg, desafiante.money);

    if (!mentionedUser || isNaN(valorAposta) || valorAposta <= 0) {
      return message.reply('❌ Formato inválido. Use: `Kbet @usuário (Kronos)`');
    }
    if (mentionedUser.id === message.author.id) {
      return message.reply('❌ Você não pode apostar contra você mesmo!');
    }

    if (desafiante.money < valorAposta) {
      return message.reply(`❌ Você não tem **${valorAposta.toLocaleString()} Kronos** disponíveis para puxar esta aposta.`);
    }

    const desafiado = await getOrCreate(mentionedUser.id, mentionedUser.username);
    if (desafiado.money < valorAposta) {
      return message.reply(`❌ <@${desafiado.user_id}> não tem saldo suficiente para essa aposta.`);
    }

    const desafianteEmoji = desafiante.emoji || DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)];
    const desafiadoEmoji = desafiado.emoji || DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)];

    const id1 = desafiante.user_id;
    const id2 = desafiado.user_id;
    const confirmados = new Set();

    const vip1 = await isVip(client, id1);
    const vip2 = await isVip(client, id2);

    let taxaTexto = '';
    if (vip1 || vip2) {
      taxaTexto = '✨ Como um dos participantes é VIP, **não haverá taxa!**';
    } else {
      taxaTexto = '💸 Uma taxa de **5%** será aplicada para jogadores não **VIP**';
    }

    const msgText =
      `<:kairox_money:1396655235983740989> <@${id2}>, <@${id1}> quer fazer uma aposta com você valendo **${valorAposta.toLocaleString()} Kronos**!\n` +
      `<:pushpin_kairox:1393304066435584050> Para confirmar a aposta, os dois devem clicar em ✅\n` +
      `Se ${desafianteEmoji} vencer, <@${id1}> ganha **${valorAposta.toLocaleString()} Kronos**\n` +
      `Se ${desafiadoEmoji} vencer, <@${id2}> ganha **${valorAposta.toLocaleString()} Kronos**\n` +
      `${taxaTexto}`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('aceitar')
        .setLabel('✅ Aceitar 0/2')
        .setStyle(ButtonStyle.Success)
    );

    const msg = await message.reply({ content: msgText, components: [row] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on('collect', async (interaction) => {
      if (![id1, id2].includes(interaction.user.id)) {
        return interaction.reply({ content: '❌ Este botão não é para você.', ephemeral: true });
      }
      if (confirmados.has(interaction.user.id)) {
        return interaction.reply({ content: '✅ Você já confirmou esta aposta.', ephemeral: true });
      }

      const player = await getOrCreate(interaction.user.id);
      if (player.money < valorAposta) {
        return interaction.reply({
          content: `❌ Você não tem **${valorAposta.toLocaleString()} Kronos** para confirmar.`,
          ephemeral: true,
        });
      }

      player.money -= valorAposta;
      if (player.money < 0) player.money = 0;
      await update(player);
      await logTransaction(player.user_id, 'emojifight', -valorAposta, 'Emoji Fight Bet (entrada)');

      confirmados.add(interaction.user.id);
      await interaction.deferUpdate();

      const qtd = confirmados.size;
      const novaRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('aceitar')
          .setLabel(`✅ Aceitar ${qtd}/2`)
          .setStyle(ButtonStyle.Success)
      );
      await msg.edit({ components: [novaRow] });

      if (qtd === 2) {
        collector.stop('confirmado');
        await msg.edit({ components: [] });

        const vencedor = Math.random() < 0.5 ? id1 : id2;
        const perdedor = vencedor === id1 ? id2 : id1;
        const emojiVencedor = vencedor === id1 ? desafianteEmoji : desafiadoEmoji;

        setTimeout(async () => {
          const userVencedor = await getOrCreate(vencedor);
          const vipVencedor = await isVip(client, vencedor);

          let taxa = 0;
          if (!vipVencedor) {
            taxa = Math.floor(valorAposta * TAXA);
          }

          userVencedor.money += (valorAposta - taxa);
          await update(userVencedor);
          await logTransaction(vencedor, 'emojifight', valorAposta - taxa, 'Emoji Fight Bet (prêmio)');

          // Mensagem de vencedor com o formato solicitado
          await msg.reply(
            `${emojiVencedor} **Venceu o combate!**\n` +
            `👏 Parabéns <@${vencedor}>, você ganhou **${(valorAposta - taxa).toLocaleString()} Kronos** (**${taxa.toLocaleString()} de taxa**), financiados por <@${perdedor}>.`
          );
        }, 1000);
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason !== 'confirmado') {
        await msg.edit({ components: [] }).catch(() => {});
        for (const userId of confirmados) {
          const u = await getOrCreate(userId);
          u.money += valorAposta;
          await update(u);
          await logTransaction(userId, 'emojifight', valorAposta, 'Emoji Fight Bet (devolução)');
        }
        if (confirmados.size > 0) {
          await msg.reply('⏳ A aposta **expirou** e os **valores** foram devolvidos.');
        }
      }
    });
  },
};