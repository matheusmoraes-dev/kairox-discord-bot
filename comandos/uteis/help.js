const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ComponentType,
} = require('discord.js');

const MOD_ROLE_ID = '1392360963642232952';
const GUILD_ID = '1125069261929463808';

module.exports = {
  name: 'help',
  aliases: ['ajuda'],
  description: '📌 Mostra a lista de comandos por categoria.',

  async execute(message, args, client) {
    let podeVerModeracao = false;
    try {
      if (message.guild && message.guild.id === GUILD_ID) {
        const membro = await message.guild.members.fetch(message.author.id).catch(() => null);
        if (membro && membro.roles.cache.has(MOD_ROLE_ID)) {
          podeVerModeracao = true;
        }
      }
    } catch (e) {
      console.error('Erro ao verificar cargo de moderação:', e);
    }

    const options = [
      { label: '💰 Economia', value: 'economia', description: 'Comandos de economia e cassino.', emoji: '💰' },
      { label: '💎 Premium', value: 'premium', description: 'Comandos exclusivos Premium.', emoji: '💎' },
      { label: '🛠️ Úteis', value: 'uteis', description: 'Comandos gerais e utilidades.', emoji: '🛠️' },
    ];
    if (podeVerModeracao) {
      options.splice(1, 0, { label: '🛡️ Moderação', value: 'moderacao', description: 'Comandos de moderação.', emoji: '🛡️' });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_menu')
      .setPlaceholder('Selecione uma categoria')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    // Embed inicial com markdown #
    const embedInicial = new EmbedBuilder()
      .setColor('#add8e6')
      .setAuthor({
        name: client.user.username,
        iconURL: client.user.displayAvatarURL({ dynamic: true })
      })
      .setDescription(
`# 📘 Quem sou eu?
Olá, <@${message.author.id}>! Eu sou o **Kairox**<:kairox:1386008482150355004>, um simples garoto **bonitão** aqui para **ajudar** e te **divertir** (Às vezes me chamam de um tal de **bot**, mas ainda não entendi o porquê <:kairox_trist:1396659803727597690>). Tenho apenas **18 anos** e acabei de chegar no Discord, mas espero ser **útil** para **você** (Quem sabe não nos tornamos amigos?).

# 💻 Minhas funções
Possuo uma variedade de **funções**, como **economia**, **diversão**, **moderação** *(apenas para meus criadores por enquanto..)* e muito mais!

Se quiser ver mais detalhes sobre meus **comandos**, escolha a categoria que você deseja ver no menu abaixo.
Meu prefixo no servidor é **K**.`
      )
      .setFooter({ text: 'Selecione uma categoria no menu abaixo 👇' });

    const helpMsg = await message.reply({ embeds: [embedInicial], components: [row] });

    const collector = helpMsg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: '❌ Este menu não é para você.', ephemeral: true });
      }

      const escolha = interaction.values[0];
      let embed = new EmbedBuilder()
        .setColor('#add8e6')
        .setAuthor({
          name: client.user.username,
          iconURL: client.user.displayAvatarURL({ dynamic: true })
        })
        .setFooter({ text: 'Use novamente Khelp para abrir o menu a qualquer momento.' });

      if (escolha === 'economia') {
        embed.setTitle('💰 Categoria: Economia').setDescription(
`\`\`\`
Kaviator (crash)
Kbank
Kblackjack (bj)
Kcoinflip (caraoucoroa)
Kcoinflipbet (flipbet)
Kcrime (roubar, assaltar)
Kdaily
Kdepositar (dep)
Kemojifightbet (bet, rinhabet)
Kemojifightrace (race, rinharace)
Kfortunetiger (slot, tigrinho, tiger)
Kmines
Krank (lb, top, kronosrank)
Krifa
Ksacar
Ksaldo (bal, atm)
Ksemanal
Ktransações (tr)
Ktransferir (pix, pay)
Kwork
\`\`\``);
      }

      if (escolha === 'moderacao') {
        embed.setTitle('🛡️ Categoria: Moderação').setDescription(
`\`\`\`
Kaddkronos (addk, give)
Kaddvip (darvip, vipadd)
Kban (banb, banirbot)
Kdrop
Kremoverkronos (remk, tirargrana, tirark)
Kremovevip (remvip, vipremove, tirarvip)
Ksay
Kunban (desban, desbanbot)
Kverbanco
\`\`\``);
      }

      if (escolha === 'premium') {
        embed.setTitle('💎 Categoria: Premium').setDescription(
`\`\`\`
Kemoji
\`\`\``);
      }

      if (escolha === 'uteis') {
        embed.setTitle('🛠️ Categoria: Úteis').setDescription(
`\`\`\`
Kafk
Kcooldowns (cd)
Khelp
Kperfil (profile)
Kvip (premium, assinatura)
\`\`\``);
      }

      await interaction.update({ embeds: [embed], components: [row] });
    });

    collector.on('end', async () => {
      const expiredEmbed = new EmbedBuilder()
        .setColor('#a0a0a0')
        .setAuthor({
          name: client.user.username,
          iconURL: client.user.displayAvatarURL({ dynamic: true })
        })
        .setTitle('⏳ Menu de Ajuda expirado')
        .setDescription('O menu de ajuda expirou. Use novamente `Khelp` para reabrir.');
      await helpMsg.edit({ embeds: [expiredEmbed], components: [] }).catch(() => {});
    });
  },
};