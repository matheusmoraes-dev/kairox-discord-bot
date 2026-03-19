async function getDiscordUserSafe(client, userId) {
  try {
    if (!client || !userId) return null;
    // busca o usuário no cache ou faz fetch
    const user = await client.users.fetch(userId);
    return user || null;
  } catch (error) {
    console.log(`[DiscordUtils] Falha ao buscar usuário ${userId}:`, error.message);
    return null;
  }
}

module.exports = { getDiscordUserSafe };