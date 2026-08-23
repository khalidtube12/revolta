import type { ShowOverallReview, Show, Match } from '../../types';

const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: number) {
  const sc = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  const path = new Path2D(STAR_PATH);
  ctx.fillStyle = '#1e1e1e';
  ctx.fill(path);
  if (fill > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 24 * fill, 24);
    ctx.clip();
    ctx.fillStyle = '#c9a84c';
    ctx.fill(path);
    ctx.restore();
  }
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) { lines.push(''); continue; }
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW) { if (line) lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(res => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

export async function ShowOverallReviewExport({ review, show, matches }: {
  review: ShowOverallReview & { authorName: string; authorPhoto: string | null; authorTwitter: string | null };
  show: Show;
  matches: Match[];
}): Promise<void> {
  await document.fonts.ready;

  const W = 720;
  const SCALE = 2;
  const PAD = 22;
  const IMG_H = 340;
  const BOTTOM_H = 68;
  const LINE_H_PT = 17 * 1.75;
  const LINE_H_DESC = 16 * 1.9;

  // Load all images in parallel
  const matchUrls = matches.map(m => m.imageUrl).filter(Boolean) as string[];
  const [logoImg, avatarImg, ...matchImgs] = await Promise.all([
    loadImg(`${window.location.origin}/assets/RevoltaLogoWithoutBack.png`),
    review.authorPhoto ? loadImg(review.authorPhoto) : Promise.resolve(null),
    ...matchUrls.map(url => loadImg(url)),
  ]);

  const validImgs = matchImgs.filter(Boolean) as HTMLImageElement[];

  const pos = (review.points ?? []).filter(p => p.positive);
  const neg = (review.points ?? []).filter(p => !p.positive);
  const allPoints = [...pos, ...neg];

  // measure body height
  const mc = document.createElement('canvas');
  const mctx = mc.getContext('2d')!;
  let bodyH = 0;
  if (allPoints.length > 0) bodyH += allPoints.length * LINE_H_PT + 16;
  if (review.description) {
    mctx.font = '400 16px Cairo, sans-serif';
    mctx.direction = 'rtl';
    const dl = wrapText(mctx, review.description, W - PAD * 2 - 28);
    bodyH += dl.length * LINE_H_DESC + 28 + 16;
  }

  const totalH = IMG_H + 2 + PAD + bodyH + BOTTOM_H;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = totalH * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, totalH);

  // ── Collage of match images ───────────────────────────────────────
  if (validImgs.length > 0) {
    const sliceW = W / validImgs.length;
    for (let i = 0; i < validImgs.length; i++) {
      const img = validImgs[i];
      const x = i * sliceW;
      const ratio = Math.max(sliceW / img.width, IMG_H / img.height);
      const pw = img.width * ratio;
      const ph = img.height * ratio;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, 0, sliceW + 1, IMG_H); // +1 to avoid thin gaps
      ctx.clip();
      ctx.globalAlpha = 0.72;
      ctx.drawImage(img, x + (sliceW - pw) / 2, (IMG_H - ph) / 2, pw, ph);
      ctx.globalAlpha = 1;
      ctx.restore();

      // thin dark divider between slices
      if (i > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, 0, 1, IMG_H);
      }
    }
  } else if (show.posterUrl) {
    // fallback: show poster
    const posterImg = await loadImg(show.posterUrl);
    if (posterImg) {
      const ratio = Math.max(W / posterImg.width, IMG_H / posterImg.height);
      const pw = posterImg.width * ratio, ph = posterImg.height * ratio;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, IMG_H); ctx.clip();
      ctx.globalAlpha = 0.72;
      ctx.drawImage(posterImg, (W - pw) / 2, (IMG_H - ph) / 2, pw, ph);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // gradient overlay (top transparent → bottom near-opaque)
  const grad = ctx.createLinearGradient(0, 0, 0, IMG_H);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.3, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0.97)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, IMG_H);

  // Stars row (bottom-left of image area)
  const starSz = 18;
  const starTop = IMG_H - PAD - starSz;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, PAD + i * (starSz + 5), starTop, starSz, Math.min(1, Math.max(0, review.rating - i)));
  }
  ctx.direction = 'ltr'; ctx.textAlign = 'left';
  ctx.font = '400 13px Cairo, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${review.rating} / 5`, PAD + 5 * (starSz + 5) + 8, starTop + starSz / 2);

  // Show name — right side, vertically centered with stars row
  const starsMid = starTop + starSz / 2;
  ctx.direction = 'rtl'; ctx.textAlign = 'start';
  ctx.font = '700 24px Cairo, sans-serif'; ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 18;
  ctx.fillText(show.name, W - PAD, starsMid);
  ctx.shadowBlur = 0;

  // "تقييم العرض كامل" label — just above show name
  ctx.direction = 'rtl'; ctx.textAlign = 'start';
  ctx.font = '400 12px Cairo, sans-serif'; ctx.fillStyle = 'rgba(201,168,76,0.75)';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 10;
  ctx.fillText('تقييم العرض كامل', W - PAD, starTop - 8);
  ctx.shadowBlur = 0;

  // Verdict — left side, above stars
  if (review.verdict) {
    ctx.direction = 'ltr'; ctx.textAlign = 'left';
    ctx.font = '900 18px Cairo, sans-serif'; ctx.fillStyle = '#c9a84c';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(201,168,76,0.5)'; ctx.shadowBlur = 16;
    ctx.fillText(review.verdict, PAD, starTop - 8);
    ctx.shadowBlur = 0;
  }

  // Gold bar separator
  let y = IMG_H;
  const barGrad = ctx.createLinearGradient(0, 0, W, 0);
  barGrad.addColorStop(0, 'transparent');
  barGrad.addColorStop(0.4, '#c9a84c');
  barGrad.addColorStop(1, '#c9a84c');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, y, W, 2);
  y += 2 + PAD;

  // Points
  ctx.direction = 'rtl'; ctx.textBaseline = 'top'; ctx.textAlign = 'start';
  for (const p of allPoints) {
    ctx.font = '400 14px Cairo, sans-serif';
    ctx.fillStyle = p.positive ? '#3a9e65' : '#8b0000';
    ctx.fillText('◆', W - PAD, y + 4);
    ctx.font = '400 17px Cairo, sans-serif'; ctx.fillStyle = '#ccc';
    const dw = ctx.measureText('◆ ').width;
    ctx.fillText(p.text, W - PAD - dw, y);
    y += LINE_H_PT;
  }
  if (allPoints.length > 0) y += 16;

  // Description
  if (review.description) {
    ctx.font = '400 16px Cairo, sans-serif'; ctx.direction = 'rtl';
    const dl = wrapText(ctx, review.description, W - PAD * 2 - 28);
    const dh = dl.length * LINE_H_DESC + 28;
    ctx.fillStyle = '#090909'; ctx.fillRect(PAD, y, W - PAD * 2, dh);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(W - PAD - 2, y, 2, dh);
    ctx.fillStyle = '#ccc'; ctx.textBaseline = 'top';
    dl.forEach((line, i) => { if (line) ctx.fillText(line, W - PAD - 14, y + 14 + i * LINE_H_DESC); });
    y += dh + 16;
  }

  // Bottom bar
  const bY = totalH - BOTTOM_H;
  ctx.fillStyle = '#060606'; ctx.fillRect(0, bY, W, BOTTOM_H);
  ctx.fillStyle = '#141414'; ctx.fillRect(0, bY, W, 1);

  // Avatar
  const avSz = 40, avX = W - PAD - avSz, avY = bY + (BOTTOM_H - avSz) / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(avX + avSz / 2, avY + avSz / 2, avSz / 2, 0, Math.PI * 2); ctx.clip();
  if (avatarImg) {
    ctx.drawImage(avatarImg, avX, avY, avSz, avSz);
  } else {
    const ag = ctx.createLinearGradient(avX, avY, avX + avSz, avY + avSz);
    ag.addColorStop(0, '#8b0000'); ag.addColorStop(1, '#c9a84c');
    ctx.fillStyle = ag; ctx.fillRect(avX, avY, avSz, avSz);
    ctx.direction = 'rtl'; ctx.font = '700 18px Cairo, sans-serif';
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(review.authorName.charAt(0), avX + avSz / 2, avY + avSz / 2);
    ctx.textAlign = 'start';
  }
  ctx.restore();
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(avX + avSz / 2, avY + avSz / 2, avSz / 2, 0, Math.PI * 2); ctx.stroke();

  // Author name + twitter
  const txX = avX - 12;
  const hasTwitter = !!review.authorTwitter;
  ctx.direction = 'rtl'; ctx.textAlign = 'start';
  ctx.font = '700 14px Cairo, sans-serif'; ctx.fillStyle = '#ddd'; ctx.textBaseline = 'middle';
  ctx.fillText(review.authorName, txX, hasTwitter ? bY + BOTTOM_H / 2 - 8 : bY + BOTTOM_H / 2);
  if (hasTwitter) {
    ctx.direction = 'ltr'; ctx.textAlign = 'right';
    ctx.font = '400 11px Cairo, sans-serif'; ctx.fillStyle = '#c9a84c';
    ctx.fillText(`𝕏 @${review.authorTwitter}`, txX, bY + BOTTOM_H / 2 + 8);
    ctx.textAlign = 'start';
  }

  // Logo
  if (logoImg) {
    const lh = 52, lw = (logoImg.width / logoImg.height) * lh;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(logoImg, PAD, bY + (BOTTOM_H - lh) / 2, lw, lh);
    ctx.globalAlpha = 1;
  }

  const link = document.createElement('a');
  link.download = `revolta-show-${show.name.replace(/\s+/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
