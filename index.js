// index.js
const path = require('path');
const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  Collection,
  ActivityType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder
} = require('discord.js');
require('dotenv').config();

require('./database/updateDB');

const {
  getOrCreate,
  update,
  addXP,
  parseValor,
  dbRun,
  dbGet,
  dbAll,
  getActivePurchase,
  logTransaction
} = require('./database/database');

const { afkMap } = require('./comandos/uteis/afk.js');

const PREFIX = 'K';
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  presence: {
    status: 'online',
    activities: [{ name: 'Me adicione!', type: ActivityType.Watching }],
  },
});

// ========================= CONFIG =========================
const servidorId = '1125069261929463808';
const cargoPremiumId = '1383630603475488829';
const canalLojaId = '1384688112415936532';

// categoria onde tickets ficam ABERTOS (onde o canal será criado inicialmente)
const categoriaTicketsAbertosId = '1384963111701839904';

// categoria onde tickets são ARQUIVADOS ao fechar (usuário não vê mais)
const categoriaArquivadaId = '1403804038683820173';

const cargoPagamentosId = '1384972409471369286';
const canalLogsTicketsId = '1384958250461696150';
const canalLogsBanId = '1392237527850684567';
const PIX_CHAVE = '00020126360014BR.GOV.BCB.PIX0114+558199901354552040000530398654046.005802BR5923Matheus Rocha de Moraes6009SAO PAULO621405108jOndkUwqo63042536';
const PRECO_PREMIUM = 5.99;

// cargo da equipe do kairox (sem cooldown)
const cargoEquipeId = '1392360963642232952';

// ====== SISTEMA DE COOLDOWN GLOBAL + BAN AUTOMÁTICO ======
const cooldowns = new Map();
const infractions = new Map();

client.commands = new Collection();
global.atendimentoCount = 0;
global.atendimentosAtivos = new Map(); // map canalId -> { userId, openedAt }
global.notificacoesRifa = new Set();

// Carrega comandos recursivamente
function readCommandsRecursively(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      readCommandsRecursively(fullPath);
    } else if (file.isFile() && file.name.endsWith('.js')) {
      const command = require(fullPath);
      if (command && command.name) {
        client.commands.set(command.name, command);
      }
    }
  }
}
readCommandsRecursively(path.join(__dirname, 'comandos'));

// ========================= SISTEMA DE RIFAS =================
async function criarRifaRelampago() {
  const timestampFim = Math.floor(Date.now() / 1000) + (30 * 60);
  await dbRun(`INSERT INTO rifas (tipo, premio, tickets_total, timestamp) VALUES (?, ?, ?, ?)`, [
    'relampago',
    0,
    0,
    timestampFim,
  ]);
  console.log('✅ Nova rifa relâmpago criada!');
}

async function sortearRifaRelampago() {
  const rifa = await dbGet(`SELECT * FROM rifas WHERE tipo = 'relampago' ORDER BY id DESC LIMIT 1`);
  if (!rifa) return;
  const participantes = await dbAll(`SELECT * FROM rifa_participantes WHERE rifa_id = ?`, [rifa.id]);
  if (!participantes || participantes.length === 0) {
    console.log('⚠️ Nenhum participante na rifa.');
    return;
  }
  const tickets = [];
  for (const p of participantes) {
    for (let i = 0; i < p.quantidade; i++) tickets.push(p.user_id);
  }
  const vencedor = tickets[Math.floor(Math.random() * tickets.length)];
  await dbRun(`UPDATE rifas SET ganhador_id = ? WHERE id = ?`, [vencedor, rifa.id]);
  const premio = rifa.premio || 0;
  await dbRun(`UPDATE users SET money = money + ? WHERE user_id = ?`, [premio, vencedor]);
  console.log(`🎉 Rifa sorteada! Ganhador: ${vencedor}, Prêmio: ${premio}`);
  for (const userId of global.notificacoesRifa) {
    try {
      const user = await client.users.fetch(userId);
      await user.send(`🏆 A **Rifa Relâmpago** acabou! Parabéns <@${vencedor}> ganhou **${premio.toLocaleString()} Kronos**!`);
    } catch (err) {
      console.error(`Erro ao notificar ${userId}:`, err);
    }
  }
  global.notificacoesRifa.clear();
}

async function iniciarSistemaRifas() {
  await criarRifaRelampago();
  setInterval(async () => {
    const rifaAtual = await dbGet(`SELECT * FROM rifas WHERE tipo = 'relampago' ORDER BY id DESC LIMIT 1`);
    if (rifaAtual && Math.floor(Date.now() / 1000) >= rifaAtual.timestamp) {
      await sortearRifaRelampago();
      await criarRifaRelampago();
    }
  }, 30000);
}

// ========================= READY =========================
client.once('ready', async () => {
  console.log(`${client.user.tag} está online!`);
  client.user.setPresence({
    status: 'online',
    activities: [{ name: 'Me adicione!', type: ActivityType.Watching }],
  });

  try {
    const canalLoja = await client.channels.fetch(canalLojaId).catch(() => null);
    if (canalLoja) {
      const fetchedMessages = await canalLoja.messages.fetch({ limit: 20 }).catch(() => null) || [];
      for (const msg of fetchedMessages.values ? fetchedMessages.values() : []) {
        if (msg.author.id === client.user.id) await msg.delete().catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setTitle('<a:fire_animation:1396647618423034037> **Plano Premium Kairox** ')
        .setDescription(`Por apenas **R$${PRECO_PREMIUM.toFixed(2)}** você terá acesso a benefícios exclusivos!`)
        .setColor(0x79b6c9)
        .addFields(
          {
            name: 'Benefícios Exclusivos',
            value: `💹・Taxa zerada\n😡・Emojis animados\n💎・Sorteios VIPs\n🔊・Canal de voz exclusivo\n🥷・Cargo personalizado\n💸・30 dias por apenas R$5,99`
          },
          { name: 'Como Comprar', value: 'Clique no botão abaixo para iniciar a compra.' }
        )
        .setFooter({ text: 'Kairox - Seu cassino confiável no Discord' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('comprar_premium')
          .setLabel('Comprar Premium - R$5,99')
          .setStyle(ButtonStyle.Primary),
      );

      await canalLoja.send({ embeds: [embed], components: [row] }).catch(() => {});
      console.log('Mensagem da loja enviada.');
    }
  } catch (e) {
    console.error('Erro ao enviar mensagem da loja:', e);
  }

  // Remove VIP expirado
  setInterval(async () => {
    try {
      const expirados = await dbAll(
        'SELECT user_id FROM premium_purchases WHERE status = "active" AND expires_at <= ?',
        [Date.now()]
      );
      if (!expirados.length) return;
      const guild = client.guilds.cache.get(servidorId);
      if (!guild) return;
      for (const row of expirados) {
        const membro = await guild.members.fetch(row.user_id).catch(() => null);
        if (membro && membro.roles.cache.has(cargoPremiumId)) {
          await membro.roles.remove(cargoPremiumId, 'VIP expirado automaticamente').catch(() => {});
          console.log(`⛔ VIP removido automaticamente de ${membro.user.tag}`);
        }
        await dbRun('UPDATE premium_purchases SET status = "expired" WHERE user_id = ? AND status = "active"', [row.user_id]);
      }
    } catch (err) {
      console.error('Erro ao verificar/remover VIP expirados:', err);
    }
  }, 60 * 1000);

  iniciarSistemaRifas();
});

// ✅ NOVO LISTENER para boosts => adiciona premium por 14 dias
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    if (newMember.guild.id !== servidorId) return;
    // se passou de não-boost para boost
    if (!oldMember.premiumSince && newMember.premiumSince) {
      // dá o cargo premium
      await newMember.roles.add(cargoPremiumId, 'Recebeu premium por impulsionar servidor').catch(() => {});
      console.log(`🌟 ${newMember.user.tag} impulsionou o servidor e recebeu premium!`);

      // registra na tabela premium_purchases com expiração +14 dias
      const expiresAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
      await dbRun(
        'INSERT OR REPLACE INTO premium_purchases (user_id, status, expires_at) VALUES (?, "active", ?)',
        [newMember.id, expiresAt]
      );
    }
  } catch (err) {
    console.error('Erro ao processar guildMemberUpdate (boost):', err);
  }
});

// ========================= MENSAGENS PREFIXO =========================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (afkMap.has(message.author.id)) {
    const data = afkMap.get(message.author.id);
    afkMap.delete(message.author.id);
    const diff = Date.now() - data.since;
    const segundos = Math.floor(diff / 1000);
    const ms = diff % 1000;
    await message.reply(`💤 **|** Bem-vindo(a) de volta <@${message.author.id}>, você ficou **AFK** por \`${segundos}s e ${ms}ms\`!`);
  }

  if (message.mentions.users.size > 0) {
    message.mentions.users.forEach(user => {
      if (afkMap.has(user.id)) {
        const data = afkMap.get(user.id);
        let aviso = `💤 **|** <@${user.id}> está AFK.`;
        if (data.reason) aviso += ` Motivo: \`${data.reason}\``;
        message.reply(aviso);
      }
    });
  }

  if (!message.content.startsWith(PREFIX)) return;

  const userId = message.author.id;
  const now = Date.now();

  // 🔥 ignora cooldown se tiver o cargo da equipe
  let isEquipe = false;
  try {
    const guild = client.guilds.cache.get(servidorId);
    if (guild) {
      const membro = await guild.members.fetch(userId).catch(() => null);
      if (membro && membro.roles.cache.has(cargoEquipeId)) {
        isEquipe = true;
      }
    }
  } catch {}

  const lastCmd = cooldowns.get(userId) || 0;
  const diff = now - lastCmd;

  const usuario = await getOrCreate(userId, message.author.username);

  if (usuario.banido) {
    if (usuario.banExpira && usuario.banExpira <= now) {
      usuario.banido = 0;
      usuario.banMotivo = null;
      usuario.banExpira = null;
      usuario.banStaff = null;
      await update(usuario);
      try {
        const logChannel = await client.channels.fetch(canalLogsBanId).catch(() => null);
        if (logChannel) {
          const embedDesban = new EmbedBuilder()
            .setTitle('✅ Usuário Desbanido Automaticamente')
            .setColor('#33ff77')
            .addFields(
              { name: 'Usuário', value: `<@${userId}> \`${message.author.tag}\``, inline: true },
              { name: 'Motivo', value: 'Banimento expirado automaticamente após 24 horas', inline: true },
            )
            .setFooter({ text: 'Sistema de Banimento - Kairox' })
            .setTimestamp();
          await logChannel.send({ embeds: [embedDesban] }).catch(() => {});
        }
      } catch (err) {
        console.error('Erro ao enviar log de desbanimento automático:', err);
      }
    } else {
      let tempoRestante = 'permanente';
      if (usuario.banExpira) {
        const ms = usuario.banExpira - now;
        const seg = Math.floor(ms / 1000) % 60;
        const min = Math.floor(ms / 60000) % 60;
        const h = Math.floor(ms / 3600000);
        tempoRestante = `${h}h ${min}m ${seg}s`;
      }
      const motivo = usuario.banMotivo || 'Motivo não especificado';
      return message.reply(`⛔ Você está banido.\nMotivo: **${motivo}**\nTempo: **${tempoRestante}**`);
    }
  }

  if (!isEquipe) {
    if (diff < 3000) {
      let tries = (infractions.get(userId) || 0) + 1;
      infractions.set(userId, tries);
      await message.reply(`❌ <@${userId}>, aguarde **3 segundos** antes de usar outro comando. \`(${tries}/10)\``);

      if (tries >= 10) {
        usuario.banido = 1;
        usuario.banMotivo = 'Banido por enviar comandos rápido demais em um curto período de tempo. (Você pode pedir para retirar a punição em até 24 horas após o banimento.)';
        usuario.banExpira = now + (24 * 60 * 60 * 1000);
        usuario.banStaff = 'Sistema Automático';
        await update(usuario);
        await message.reply(`⛔ <@${userId}> foi **banido por 1 dia** por spam de comandos.`);
        infractions.set(userId, 0);
        try {
          const logChannel = await client.channels.fetch(canalLogsBanId).catch(() => null);
          if (logChannel) {
            const embedBan = new EmbedBuilder()
              .setTitle('<:sair_red:1393255706920222944> Usuário Banido do Bot')
              .setColor('#ff3333')
              .addFields(
                { name: '<:sair_red:1393255706920222944> Usuário', value: `<@${userId}> \`${message.author.tag}\``, inline: true },
                { name: '<:c_prancheta:1393706408972914771> Motivo', value: usuario.banMotivo, inline: true },
                { name: '<:relogio:1383970376916140134> Expiração', value: `<t:${Math.floor(usuario.banExpira / 1000)}:R>`, inline: true },
                { name: '<:6815turquoiseownerbadge:1391950857158922261> Staff', value: usuario.banStaff }
              )
              .setFooter({ text: 'Sistema de Banimento - Kairox' })
              .setTimestamp();
            await logChannel.send({ embeds: [embedBan] }).catch(() => {});
          }
        } catch (err) {
          console.error('Erro ao enviar log de banimento automático:', err);
        }
      }
      return;
    } else {
      cooldowns.set(userId, now);
    }
  }

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) ||
    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
  if (!command) return;

  try {
    await command.execute(message, args, client, {
      getOrCreate,
      update,
      addXP,
      parseValor,
      dbRun,
      dbGet,
      dbAll,
      getActivePurchase,
      logTransaction
    });
  } catch (error) {
    console.error(error);
    message.reply('❌ Ocorreu um erro ao executar esse comando.');
  }
});

// ========================= INTERAÇÕES =========================
client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (customId === 'comprar_premium') return await handleComprarPremium(interaction);
      if (customId === 'avisar_staff') return await handleAvisarStaff(interaction);
      if (customId === 'fechar_ticket') return await handleFecharTicket(interaction);
      if (customId === 'rifa_notificar') {
        global.notificacoesRifa.add(interaction.user.id);
        return interaction.reply({ content: '🔔 Você será notificado quando a rifa acabar!', ephemeral: true });
      }
    } else if (interaction.isModalSubmit()) {
      const customId = interaction.customId;
      const bankCommand = client.commands.get('bank');
      if ((customId === 'bank_deposit_modal' || customId === 'bank_withdraw_modal') && bankCommand && typeof bankCommand.modals === 'function') {
        await bankCommand.modals(interaction);
      } else if (customId === 'bank_deposit_modal' || customId === 'bank_withdraw_modal') {
        await interaction.reply({ content: '❌ Comando bancário não encontrado.', ephemeral: true });
      }
    }
  } catch (err) {
    console.error('Erro interação:', err);
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ content: '❌ Ocorreu um erro na interação.', ephemeral: true });
      } catch {}
    }
  }
});

// ========================= TICKETS =========================
/**
 * Quando o usuário clica em Comprar Premium -> cria um canal de ticket na categoria de
 * tickets abertos (categoriaTicketsAbertosId). No embed colocamos o QR Code do PIX (usando api.qrserver).
 * Ao fechar (botão 'fechar_ticket'), o canal é movido para categoriaArquivadaId e a permissão do usuário
 * que abriu é negada (ele não consegue mais ver o canal). A staff ainda vê.
 */
async function handleComprarPremium(interaction) {
  const { guild, user } = interaction;
  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  global.atendimentoCount++;
  // nome do canal
  const nomeCanal = `✉️・buy-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${global.atendimentoCount}`;

  // gera URL do QR Code (API pública)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(PIX_CHAVE)}`;

  // cria o canal NA categoria de tickets abertos (categoriaTicketsAbertosId)
  const canal = await guild.channels.create({
    name: nomeCanal,
    type: ChannelType.GuildText,
    parent: categoriaTicketsAbertosId || null,
    permissionOverwrites: [
      // todos não veem
      { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      // proprietário vê
      { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      // staff pagamentos vê
      { id: cargoPagamentosId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      // bot permissões
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
    ]
  }).catch(err => {
    console.error('Erro ao criar canal de ticket:', err);
    return null;
  });

  if (!canal) {
    return interaction.editReply({ content: '❌ Não foi possível criar o ticket. Contate a staff.' , ephemeral: true });
  }

  // registra que esse canal pertence a esse atendimento
  global.atendimentosAtivos.set(canal.id, { userId: user.id, openedAt: Date.now() });

  // Embed do ticket com QR no topo (imagem)
  const embedTicket = new EmbedBuilder()
    .setTitle('🛒 Atendimento - Compra Premium')
    .setDescription(`Olá <@${user.id}>, obrigado pelo interesse!\n\nPara finalizar a compra do **Plano Premium** por R$${PRECO_PREMIUM.toFixed(2)}, envie o PIX para a chave abaixo e anexe o comprovante aqui.\n\n**Chave PIX:**\n\`${PIX_CHAVE}\``)
    .setImage(qrUrl)
    .setColor(0x00AE86)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('avisar_staff').setLabel('Avisar Staff').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
  );

  await canal.send({ content: `<@&${cargoPagamentosId}> Novo atendimento iniciado por <@${user.id}>`, embeds: [embedTicket], components: [row] }).catch(() => {});

  await interaction.editReply({ content: `✅ Ticket criado com sucesso! Acesse: ${canal}`, ephemeral: true }).catch(() => {});
}

/**
 * Avisar staff (apenas envia uma mensagem no canal para sinalizar)
 */
async function handleAvisarStaff(interaction) {
  await interaction.deferReply({ ephemeral: true }).catch(() => {});
  const canal = interaction.channel;
  const dados = global.atendimentosAtivos.get(canal.id);
  if (!dados || interaction.user.id !== dados.userId) {
    // permitir que qualquer pessoa clique, mas responder se não for proprietário
    await interaction.editReply({ content: '✅ Staff avisada (seu pedido foi enviado).' , ephemeral: true }).catch(() => {});
    await canal.send(`<@&${cargoPagamentosId}> Usuário <@${interaction.user.id}> solicitou atendimento.`).catch(() => {});
    return;
  }
  await interaction.editReply({ content: '📢 Staff foi avisada! Aguarde atendimento.', ephemeral: true }).catch(() => {});
  const staffPing = `<@&${cargoPagamentosId}>`;
  await canal.send(`${staffPing} Cliente está solicitando atendimento!`).catch(() => {});
}

/**
 * Fecha o ticket: move para categoriaArquivadaId e remove permissão do usuário que abriu (arquivo).
 * Apenas membros com cargoPagamentosId podem fechar.
 */
async function handleFecharTicket(interaction) {
  await interaction.deferReply({ ephemeral: true }).catch(() => {});
  const member = interaction.member;
  const canal = interaction.channel;

  // valida permissão de fechar (cargoPagamentosId)
  const temPerm = member.roles.cache.has(cargoPagamentosId);
  if (!temPerm) {
    return interaction.editReply({ content: '❌ Apenas membros responsáveis pelos pagamentos podem fechar tickets.', ephemeral: true }).catch(() => {});
  }

  const dados = global.atendimentosAtivos.get(canal.id);
  if (!dados) {
    // se não temos registro, apenas arquiva e remove visualização do autor (se possível)
    try {
      // 1) mover para categoria de arquivamento
      await canal.setParent(categoriaArquivadaId).catch(() => {});
      // 2) caso haja userId nos overwrites, negar view
      // não sabemos o user, então apenas limpa autoria
      await canal.permissionOverwrites.set([
        { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
        { id: cargoPagamentosId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
      ]).catch(() => {});
      await interaction.editReply({ content: '✅ Ticket arquivado com sucesso.' , ephemeral: true }).catch(() => {});
      return;
    } catch (err) {
      console.error('Erro ao arquivar ticket sem dados:', err);
      return interaction.editReply({ content: '❌ Erro ao arquivar o ticket.', ephemeral: true }).catch(() => {});
    }
  }

  // pega o usuário que abriu
  const ownerId = dados.userId;

  // responde que vai arquivar
  await interaction.editReply({ content: '✅ Ticket será arquivado e o usuário não terá mais acesso em alguns segundos.', ephemeral: true }).catch(() => {});

  // espera 1s pra dar tempo de visualização
  setTimeout(async () => {
    try {
      // mover para categoria de arquivamento
      await canal.setParent(categoriaArquivadaId).catch(() => {});

      // negar VIEW_CHANNEL ao proprietário (arquivo)
      try {
        await canal.permissionOverwrites.edit(ownerId, { ViewChannel: false }).catch(() => {});
      } catch (err) {
        // fallback: redefinir overwrites mantendo staff and bot
        await canal.permissionOverwrites.set([
          { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
          { id: cargoPagamentosId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: ownerId, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]).catch(() => {});
      }

      // remove do map de atendimentos ativos
      global.atendimentosAtivos.delete(canal.id);

      // envia log no canal de logs de tickets (se existir)
      const canalLogs = await client.channels.fetch(canalLogsTicketsId).catch(() => null);
      if (canalLogs && canalLogs.isTextBased && canalLogs.send) {
        const embedLog = new EmbedBuilder()
          .setTitle('📩 Ticket Arquivado')
          .setDescription(`Ticket ${canal.name} arquivado por <@${interaction.user.id}>`)
          .addFields(
            { name: 'Usuário', value: `<@${ownerId}> (ID: ${ownerId})`, inline: true },
            { name: 'Fechado por', value: `<@${interaction.user.id}> (ID: ${interaction.user.id})`, inline: true }
          )
          .setTimestamp();
        await canalLogs.send({ embeds: [embedLog] }).catch(() => {});
      }
    } catch (err) {
      console.error('Erro ao arquivar ticket:', err);
    }
  }, 1000);
}

client.login(process.env.TOKEN);