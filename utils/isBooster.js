module.exports = async function isNitroBooster(client, userId) {
  const HYBOT_GUILD_ID = '1125069261929463808'; // ← coloque o ID do seu servidor oficial aqui

  try {
    const guild = await client.guilds.fetch(HYBOT_GUILD_ID);
    const member = await guild.members.fetch(userId);
    return member.premiumSince !== null;
  } catch (err) {
    return false;
  }
}