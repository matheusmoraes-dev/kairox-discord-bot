/**
 * Aplica bônus para usuários boosters:
 * - Dobra o XP
 * - Aumenta os ganhos em 25%
 *
 * @param {object} client - Cliente do Discord (para buscar cargos)
 * @param {string} userId - ID do usuário para verificar booster
 * @param {number} moedas - Valor base das moedas ganhas
 * @param {number} xp - Valor base do XP ganho
 * @returns {Promise<{moedas: number, xp: number, isBooster: boolean}>}
 */
async function aplicarBoosterBonus(client, userId, moedas, xp) {
  // Busca o membro no servidor (você pode adaptar para passar guilda como parâmetro)
  const guild = client.guilds.cache.first(); // Ou melhor: passe guild no parâmetro para garantir
  if (!guild) return { moedas, xp, isBooster: false };

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return { moedas, xp, isBooster: false };

  const isBooster = member.roles.cache.some(r => r.name.toLowerCase().includes('booster'));
  if (!isBooster) return { moedas, xp, isBooster: false };

  const moedasComBonus = Math.floor(moedas * 1.25);
  const xpComBonus = Math.floor(xp * 2);

  return { moedas: moedasComBonus, xp: xpComBonus, isBooster };
}

module.exports = aplicarBoosterBonus;