async function processarPagamento(userIdDiscord) {
  try {
    const guild = client.guilds.cache.first(); // ou busca por guilda específica
    const membro = await guild.members.fetch(userIdDiscord);
    if (!membro.roles.cache.has(cargoPremiumId)) {
      await membro.roles.add(cargoPremiumId, 'Pagamento confirmado via Pluggy');
      global.premiumUsers.set(userIdDiscord, Date.now());
      console.log(`Cargo Premium adicionado para ${membro.user.tag}`);
    }
  } catch (err) {
    console.error(`Erro ao adicionar cargo premium para usuário ${userIdDiscord}`, err);
  }
}