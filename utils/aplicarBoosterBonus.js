// utils/aplicarBoosterBonus.js

/**
 * Aplica bônus para VIPs:
 * - +25% nas moedas ganhas
 * - XP dobrado
 *
 * @param {Discord.Client} client
 * @param {string} userId
 * @param {number} moedas Valor base de moedas
 * @param {number} xp Valor base de XP
 * @returns {Promise<{ moedas: number, xp: number, isBooster: boolean }>}
 */

const GUILD_ID = '1125069261929463808';
const DOADOR_ROLE_ID = '1379968674072363038';
const PREMIUM_ROLE_ID = '1383630603475488829';

async function aplicarBoosterBonus(client, userId, moedas, xp) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(userId);

    const temCargoBonus =
      member.roles.cache.has(DOADOR_ROLE_ID) ||
      member.roles.cache.has(PREMIUM_ROLE_ID) ||
      member.premiumSince !== null;

    if (!temCargoBonus) {
      return { moedas, xp, isBooster: false };
    }

    const moedasComBonus = Math.floor(moedas * 1.25);
    const xpComBonus = xp * 2;

    return {
      moedas: moedasComBonus,
      xp: xpComBonus,
      isBooster: true,
    };
  } catch {
    return { moedas, xp, isBooster: false };
  }
}

module.exports = aplicarBoosterBonus;