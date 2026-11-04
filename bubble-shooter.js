// ======================================
// BEAUTIFUL 3D FLOWER GARDEN BUBBLES
// ======================================

function drawBubble(ctx, x, y, r, color) {
  ctx.save();

  // Bubble shadow
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;

  // Main glossy bubble
  const gradient = ctx.createRadialGradient(
    x - r * 0.35,
    y - r * 0.4,
    r * 0.08,
    x,
    y,
    r
  );

  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.18, color);
  gradient.addColorStop(0.72, color);
  gradient.addColorStop(1, "#24152f");

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Outer shining border
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.stroke();

  // Large shine
  ctx.beginPath();
  ctx.ellipse(
    x - r * 0.32,
    y - r * 0.38,
    r * 0.27,
    r * 0.14,
    -0.65,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();

  // Small shine
  ctx.beginPath();
  ctx.arc(x + r * 0.38, y + r * 0.35, r * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fill();

  // Tiny flower decoration
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i) / 5;
    const px = x + Math.cos(angle) * r * 0.24;
    const py = y + Math.sin(angle) * r * 0.24;

    ctx.beginPath();
    ctx.arc(px, py, r * 0.075, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
  }

  ctx.restore();
}
