const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} = require('discord.js');

const DEFAULT_EMOJIS = [
  '😎','🤓','😤','👻','💀','🤖','😈','🐵','🦁','🐍',
  '🐶','🐱','🦊','🐸','🐰','🦄','🐝','🐞','🦋','🐢',
  '🐬','🐳','🦀','🐙','🦉','🦇','🐲','🦖','🦕','🦔',
  '🐘','🐪','🦌','🐎','🦢','🐧','🦜','🦥','🐿️','🦦',
  '🐉','🦩','🦚','🦃','🐓','🐣','🐥','🦅','🦆','🐗',
  '🐺','🦝','🐴','🦓','🦍','🦧','🐛','🐌','🦗','🕷️'
];
const MAX_PARTICIPANTES = 50;

function parseValorComSaldo(valorStr, saldoFixo) {
  if (!valorStr) return NaN;
  const lower = valorStr.toLowerCase();
  if (lower === 'all') return saldoFixo;
  if (lower === 'half') return Math.floor(saldoFixo / 2);
  valorStr = valorStr.replace(/[,]/g, '');
  const match = valorStr.match(/^([\d.]+)([kmbt]{1,2})?$/);
  if (!match) return parseInt(valorStr);
  const num = parseFloat(match[1]);
  const sufixo = match[2];
  const mult = { k: 1e3, kk: 1e6, m: 1e6, mm: 1e9, b: 1e9, bb: 1e12, t: 1e12 };
  return Math.floor(num * (mult[sufixo] || 1));
}

module.exports = {
  name: 'emojifightrace',
  aliases: ['rinharace','race'],
  description: '👥 Rinha de emojis pública valendo Kronos. Com até 50 jogadores!',

  async execute(message, args, client, helpers) {
    const { getOrCreate, update, logTransaction, dbRun, dbGet } = helpers;

    const criador = await getOrCreate(message.author.id, message.author.username);

    const valorArg = args[0];
    let qtdMax = parseInt(args[1]);
    if (!valorArg) return message.reply('❌ **|** Formato inválido. Use: `Krace (valor) (QtdParticipantes)`');
    if (isNaN(qtdMax) || qtdMax < 2) qtdMax = 2;
    if (qtdMax > MAX_PARTICIPANTES)
      return message.reply(`❌ **|** Número máximo de participantes é ${MAX_PARTICIPANTES}.`);

    const valor = parseValorComSaldo(valorArg, criador.money);
    if (isNaN(valor) || valor <= 0)
      return message.reply('❌ **|** Valor inválido. Use: `Krace (valor) (QtdParticipantes)`');

    if (criador.money < valor)
      return message.reply(`❌ **|** Você não tem **${valor.toLocaleString()} Kronos** para iniciar.`);

    // 🔻 DEBITA do criador imediatamente
    criador.money -= valor;
    await update(criador);
    await logTransaction(criador.user_id, 'emojifight', -valor, 'Emoji Fight Race');

    const participantes = new Map();
    participantes.set(criador.user_id, {
      user_id: criador.user_id,
      username: criador.username,
      emoji: criador.emoji || DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)],
      apostaValor: valor
    });

    const gerarEmbed = (extra='')=>{
      const lista = Array.from(participantes.values()).map(p=>`${p.emoji} | <@${p.user_id}>`).join('\n');
      const premiacao = Array.from(participantes.values()).reduce((acc,p)=>acc+p.apostaValor,0);
      return new EmbedBuilder()
        .setColor('#6262dd')
        .setDescription(
          `<@${criador.user_id}> iniciou uma batalha de emojis!\n`+
          `Preço: <:kronos:1383480432233807942> **${valor.toLocaleString()}**\n`+
          `Premiação atual: <:kronos:1383480432233807942> **${premiacao.toLocaleString()}**\n`+
          `Haverá um ganhador. Clique para entrar!\n\n`+
          (extra?`${extra}\n\n`:'')+
          `Participantes (${participantes.size}/${qtdMax}):\n${lista}`
        );
    };

    const gerarBotoes = (bloquear=false)=>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('participar')
          .setLabel(`Entrar ${participantes.size}/${qtdMax}`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('1391952895414632499')
          .setDisabled(bloquear),
        new ButtonBuilder()
          .setCustomId('iniciar')
          .setLabel('Iniciar')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('1391210151687491604')
      );

    const msg = await message.reply({embeds:[gerarEmbed()],components:[gerarBotoes()]});

    const iniciarRinha = async ()=>{
      collector.stop('iniciado');
      const jogadores = Array.from(participantes.values());
      if(jogadores.length<2){
        await msg.edit({embeds:[gerarEmbed('⚠️ Apenas um participante, cancelado.')],components:[]});
        // devolve a aposta do criador
        criador.money += valor;
        await update(criador);
        await logTransaction(criador.user_id,'emojifight',valor,'Emoji Fight Race (Cancelado)');
        return;
      }

      const premio = jogadores.reduce((acc,p)=>acc+p.apostaValor,0);
      const vencedor = jogadores[Math.floor(Math.random()*jogadores.length)];

      const vData = await getOrCreate(vencedor.user_id);
      vData.money += premio;
      await update(vData);
      await logTransaction(vencedor.user_id,'emojifight',premio,'Emoji Fight Race');

      await msg.edit({
        embeds:[gerarEmbed(`${vencedor.emoji} <@${vencedor.user_id}> venceu e ganhou **${premio.toLocaleString()} Kronos**!`)],
        components:[]
      });
      await message.channel.send(`🎉 ${vencedor.emoji} <@${vencedor.user_id}> ganhou **${premio.toLocaleString()} Kronos**!`);
    };

    const collector = msg.createMessageComponentCollector({
      componentType:ComponentType.Button,
      time:60000
    });

    collector.on('collect', async i=>{
      if(i.user.bot)return;
      if(i.customId==='participar'){
        const user = await getOrCreate(i.user.id,i.user.username);
        if(participantes.has(user.user_id))
          return i.reply({content:'❌ Já está na rinha!',ephemeral:true});
        if(participantes.size>=qtdMax)
          return i.reply({content:`❌ Já tem ${qtdMax} jogadores!`,ephemeral:true});

        // checar saldo no momento da entrada
        const valorEntrada = parseValorComSaldo(valorArg,user.money);
        if(user.money<valorEntrada)
          return i.reply({content:`❌ Você não tem **${valorEntrada.toLocaleString()} Kronos** para entrar.`,ephemeral:true});

        // debita imediatamente
        user.money -= valorEntrada;
        await update(user);
        await logTransaction(user.user_id,'emojifight',-valorEntrada,'Emoji Fight Race');

        participantes.set(user.user_id,{
          user_id:user.user_id,
          username:user.username,
          emoji:user.emoji || DEFAULT_EMOJIS[Math.floor(Math.random()*DEFAULT_EMOJIS.length)],
          apostaValor:valorEntrada
        });

        await i.update({embeds:[gerarEmbed()],components:[gerarBotoes(participantes.size>=qtdMax)]});
        if(participantes.size===qtdMax) await iniciarRinha();
      }

      if(i.customId==='iniciar'){
        if(i.user.id!==criador.user_id)
          return i.reply({content:'❌ Apenas o criador pode iniciar!',ephemeral:true});
        await i.deferUpdate();
        await msg.edit({components:[gerarBotoes(true)]});
        await iniciarRinha();
      }
    });

    collector.on('end',async(_,reason)=>{
      if(reason!=='iniciado' && participantes.size<2){
        await msg.edit({components:[]});
        await message.reply(`<:errado:1393262652788183191> <@${criador.user_id}> não havia jogadores suficientes.`);
        // devolve aposta do criador
        criador.money += valor;
        await update(criador);
        await logTransaction(criador.user_id,'emojifight',valor,'Emoji Fight Race (Cancelado)');
      }
    });
  }
};