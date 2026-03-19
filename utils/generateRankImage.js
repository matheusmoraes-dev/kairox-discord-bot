const { createCanvas, loadImage } = require('canvas');
const path = require('path');

async function generateKrankImage({ users, currentPage = 1, totalPages = 1, type = 'money' }) {
  const width = 500;
  const height = 600;
  const headerHeight = 140;
  const footerHeight = 30;
  const USERS_PER_PAGE = 5;
  const itemHeight = (height - headerHeight - footerHeight) / USERS_PER_PAGE;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const themes = {
    money: {
      gradientTop: '#fff9db',
      gradientBottom: '#f59f00',
      title: 'KRONOS',
      icon: '../assets/kronos.png',
      valueField: 'money',
      valueColor: '#FFD93B'
    },
    xp: {
      gradientTop: '#dbeafe',
      gradientBottom: '#0D47A1',
      title: 'NÍVEL',
      icon: '../assets/level.png',
      valueField: 'level',
      valueColor: '#000'
    }
  };

  const theme = themes[type] || themes.money;

  // Fundo com gradiente
  const gradientBg = ctx.createLinearGradient(0, 0, 0, height);
  gradientBg.addColorStop(0, theme.gradientTop);
  gradientBg.addColorStop(1, theme.gradientBottom);
  ctx.fillStyle = gradientBg;
  ctx.fillRect(0, 0, width, height);

  // Título
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText('TOP', width / 2, 50);

  ctx.font = 'bold 40px Segoe UI';
  const titleText = theme.title;
  const iconSize = 36;
  const textWidth = ctx.measureText(titleText).width;
  const totalWidth = textWidth + iconSize + 10;
  const startX = (width - totalWidth) / 2;

  ctx.fillStyle = type === 'money' ? '#FFD93B' : '#42A5F5';
  ctx.textAlign = 'left';
  ctx.fillText(titleText, startX, 100);

  let iconImage;
  try {
    iconImage = await loadImage(path.join(__dirname, theme.icon));
  } catch (e) {
    console.error('[RANK_IMAGE] Erro ao carregar ícone:', e);
  }
  if (iconImage) {
    ctx.drawImage(iconImage, startX + textWidth + 10, 68, iconSize, iconSize);
  }

  let crownImage;
  try {
    crownImage = await loadImage(path.join(__dirname, '../assets/coroa.png'));
  } catch (e) {
    console.error('[RANK_IMAGE] Erro ao carregar coroa:', e);
  }

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const y = headerHeight + i * itemHeight;
    const rowPadding = 10;

    // Caixa branca
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(40, y, width - 80, itemHeight - rowPadding, 20);
    ctx.fill();

    // Avatar
    const avatarSize = 60;
    const avatarX = 55;
    const avatarY = y + ((itemHeight - rowPadding) - avatarSize) / 2;

    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, (avatarSize / 2) + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();

    try {
      const avatarImg = await loadImage(user.avatar_url);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch (err) {
      console.error('[RANK_IMAGE] Avatar inválido:', err);
    }

    // 👑 Coroa RETA em cima do top 1
    if (user.position === 1 && crownImage) {
      const crownWidth = 50;
      const crownHeight = 30;
      const crownX = avatarX + (avatarSize - crownWidth) / 2;
      const crownY = avatarY - crownHeight + 8;
      ctx.drawImage(crownImage, crownX, crownY, crownWidth, crownHeight);
    }

    // Nome e ID
    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px Segoe UI';
    ctx.fillText(user.username, avatarX + avatarSize + 15, y + 35);

    ctx.fillStyle = '#666';
    ctx.font = '12px Segoe UI';
    ctx.fillText(`ID: ${user.id}`, avatarX + avatarSize + 15, y + 52);

    // Valor
    const valueText = type === 'xp'
      ? `Nível (${user[theme.valueField]?.toLocaleString() ?? 0})`
      : `${user[theme.valueField]?.toLocaleString() ?? 0}`;

    ctx.font = 'bold 18px Segoe UI';
    ctx.fillStyle = theme.valueColor;
    ctx.textAlign = 'right';
    const valueX = width - 100;
    const valueY = y + 45;
    ctx.fillText(valueText, valueX, valueY);

    // Ícone ao lado do valor
    if (iconImage) {
      const iconSize = 22;
      ctx.drawImage(iconImage, valueX + 10, valueY - iconSize + 6, iconSize, iconSize);
    }

    // Posição no canto da caixa branca
    const posX = width - 60;
    const posY = y + ((itemHeight - rowPadding) / 2) + 6;

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(posX + 10, posY - 15);
    ctx.lineTo(posX + 30, posY - 15);
    ctx.lineTo(posX + 40, posY);
    ctx.lineTo(posX + 30, posY + 15);
    ctx.lineTo(posX + 10, posY + 15);
    ctx.lineTo(posX, posY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Segoe UI';
    ctx.fillText(user.position, posX + 20, posY + 2);
  }

  // Rodapé
  ctx.font = '14px Segoe UI';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'right';
  ctx.fillText(`Página ${currentPage} de ${totalPages}`, width - 20, height - 10);

  return canvas.toBuffer();
}

module.exports = { generateKrankImage };