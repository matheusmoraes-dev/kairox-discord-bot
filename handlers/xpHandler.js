const { getUser, setUser } = require('../database/database');
const cooldowns = new Map();

const XP_COOLDOWN = 30 * 1000; // 30 segundos
const XP_MIN = 5;
const XP_MAX = 15;

// Sistema automático de XP por mensagem
async function handleXP(message) {
  if (!message.guild || message.author.bot) return;

  const userId = message.author.id;
  const cooldownKey = `${message.guild.id}-${userId}`;
  const now = Date.now();

  if (cooldowns.has(cooldownKey) && now - cooldowns.get(cooldownKey) < XP_COOLDOWN) return;
  cooldowns.set(cooldownKey, now);

  const user = getUser(userId);
  if (!user) return;

  const xpGanho = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
  const novoXP = user.xp + xpGanho;
  const novoLevel = Math.floor(0.3 * Math.sqrt(novoXP));
  const subiuDeNivel = novoLevel > user.level;

  // Atualiza o usuário com os novos valores, mantendo os dados antigos
  setUser({
    ...user,
    xp: novoXP,
    level: novoLevel,
    last_xp: now,
  });

  if (subiuDeNivel) {
    message.channel.send(`🎉 ${message.author} subiu para o nível **${novoLevel}**!`);
  }
}

// Função que você pode usar nos comandos como /mines, /blackjack etc.
async function addUserXP(userId, xpGanho) {
  const user = getUser(userId);
  if (!user) return;

  const novoXP = user.xp + xpGanho;
  const novoLevel = Math.floor(0.3 * Math.sqrt(novoXP));
  const subiuDeNivel = novoLevel > user.level;

  setUser({
    ...user,
    xp: novoXP,
    level: novoLevel,
    last_xp: Date.now(),
  });

  return subiuDeNivel;
}

module.exports = {
  handleXP,
  addUserXP
};