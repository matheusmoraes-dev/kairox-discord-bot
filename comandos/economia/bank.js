// comandos/economia/bank.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  ComponentType
} = require('discord.js');

const { getOrCreate, update } = require('../../database/database');
const { generateBankImage } = require('../../utils/bankImageGenerator');
const parseValor = require('../../utils/parseValor');

const LOG_CHANNEL_ID = '1392237355280236554';

module.exports = {
  name: 'bank',
  description: '🏦 Acesse o banco e gerencie seus Kronos!',

  async execute(message, args, client) {
    const userId = message.author.id;
    const username = message.author.username;
    const usuario = await getOrCreate(userId, username);

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('<:bankkairox:1392615439581843537> - Banco Kairox')
      .setDescription(
        `> Olá <@${userId}>, deseja guardar seus Kronos? <:kronos:1383480432233807942>\n\n` +
        '<a:atencao:1391950000992551076> **Use os botões abaixo ou comandos alternativos:**\n\n' +
        '`⬇️` **Depositar:** `Kdepositar`\n' +
        '`⬆️` **Sacar:** `Ksacar`\n' +
        '<:dinheiro1:1392506009402081290> **Saldo:** `Ksaldo`\n\n' +
        '✨ - **Taxas:**\n' +
        '<:setadupla:1391438085367005246> Banco cobra **1.5%** de taxa diária.\n' +
        '<:setadupla:1391438085367005246> Usuários Premium pagam apenas **0.4%!**'
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: 'Sistema bancário 🛡️' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('bank_deposit')
        .setEmoji('📥')
        .setLabel('Depositar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('bank_balance')
        .setEmoji('💰')
        .setLabel('Saldo')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('bank_withdraw')
        .setEmoji('📤')
        .setLabel('Sacar')
        .setStyle(ButtonStyle.Danger)
    );

    const sent = await message.reply({ embeds: [embed], components: [row] });

    // Collector para lidar com os botões
    const collector = sent.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 2 * 60 * 1000,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== userId) {
        return interaction.reply({ content: '❌ Apenas quem executou o comando pode usar esses botões.', ephemeral: true });
      }

      const customId = interaction.customId;

      // Atualiza os dados do usuário
      const usuarioAtualizado = await getOrCreate(userId, username);

      if (customId === 'bank_deposit' || customId === 'bank_withdraw') {
        // Abre o modal para depósito ou saque
        const modal = new ModalBuilder()
          .setTitle(customId === 'bank_deposit' ? 'Depositar Kronos' : 'Sacar Kronos')
          .setCustomId(`${customId}_modal`);

        const input = new TextInputBuilder()
          .setCustomId('valor')
          .setLabel('Informe o valor (ex: 10k, 1m, 500)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      if (customId === 'bank_balance') {
        // Gera imagem com saldo e envia
        const buffer = await generateBankImage({
          username: usuarioAtualizado.username,
          avatarURL: usuarioAtualizado.avatarURL || interaction.user.displayAvatarURL({ extension: 'png', size: 128 }),
          saldoCarteira: usuarioAtualizado.money || 0,
          saldoBanco: usuarioAtualizado.saldo_bancario || 0,
        });

        const attachment = new AttachmentBuilder(buffer, { name: 'saldo.png' });

        await interaction.reply({
          content: '💰 • Aqui está seu saldo:',
          files: [attachment],
          ephemeral: true,
        });
      }
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        row.components.map(b => ButtonBuilder.from(b).setDisabled(true))
      );
      sent.edit({ components: [disabledRow] }).catch(() => {});
    });
  },

  // Função que será chamada pelo index.js para tratar os modais (ModalSubmit)
  async modals(interaction) {
    const { customId, user, fields, client } = interaction;
    const userId = user.id;
    const username = user.username;
    const usuario = await getOrCreate(userId, username);

    let valorStr;
    try {
      valorStr = fields.getTextInputValue('valor');
    } catch {
      return interaction.reply({ content: '❌ Valor não informado.', ephemeral: true });
    }

    const valor = parseValor(valorStr);
    if (!valor || isNaN(valor) || valor <= 0) {
      return interaction.reply({ content: '❌ Valor inválido informado.', ephemeral: true });
    }

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

    if (customId === 'bank_deposit_modal') {
      if ((usuario.money || 0) < valor) {
        return interaction.reply({ content: '❌ Você não tem Kronos suficientes para depositar.', ephemeral: true });
      }

      usuario.money -= valor;
      usuario.saldo_bancario = (usuario.saldo_bancario || 0) + valor;
      await update(usuario);

      if (logChannel) {
        await logChannel.send(`📥 \`${user.tag} (${user.id})\` depositou **${valor.toLocaleString()}** Kronos no banco.`);
      }

      return interaction.reply({ content: `📥 • Você depositou **${valor.toLocaleString()}** Kronos com sucesso!`, ephemeral: true });
    }

    if (customId === 'bank_withdraw_modal') {
      if ((usuario.saldo_bancario || 0) < valor) {
        return interaction.reply({ content: '❌ Você não tem esse valor no banco.', ephemeral: true });
      }

      usuario.saldo_bancario -= valor;
      usuario.money += valor;
      await update(usuario);

      if (logChannel) {
        await logChannel.send(`📤 \`${user.tag} (${user.id})\` sacou **${valor.toLocaleString()}** Kronos do banco.`);
      }

      return interaction.reply({ content: `📤 • Você sacou **${valor.toLocaleString()}** Kronos com sucesso!`, ephemeral: true });
    }

    // Caso chegue modal com customId não esperado
    return interaction.reply({ content: '❌ Modal desconhecido.', ephemeral: true });
  }
};