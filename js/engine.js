// map helpers not needed in engine

const TEX_SIZE = 64;

// Generate simple textures procedurally
function createTextures() {
  const textures = [];
  // 0 - brick red
  textures.push(genBrick(120, 30, 20, 80, 20, 15));
  // 1 - tech grey
  textures.push(genTech(60, 60, 70));
  // 2 - green slime
  textures.push(genNoise(20, 80, 30));
  // 3 - blue metal
  textures.push(genMetal(30, 50, 100));
  // 4 - exit green
  textures.push(genBrick(20, 100, 40, 10, 60, 20));
  return textures;
}

function genBrick(r, g, b, r2, g2, b2) {
  const data = new Uint8ClampedArray(TEX_SIZE * TEX_SIZE * 4);
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const i = (y * TEX_SIZE + x) * 4;
      const brickY = Math.floor(y / 8);
      const offset = (brickY % 2) * 16;
      const isMortar = (y % 8 === 0) || ((x + offset) % 32 < 2);
      if (isMortar) {
        data[i] = 40; data[i+1] = 40; data[i+2] = 40;
      } else {
        const n = ((x * 7 + y * 13) % 20) - 10;
        data[i] = Math.min(255, r + n);
        data[i+1] = Math.min(255, g + n);
        data[i+2] = Math.min(255, b + n);
      }
      data[i+3] = 255;
    }
  }
  return data;
}

function genTech(r, g, b) {
  const data = new Uint8ClampedArray(TEX_SIZE * TEX_SIZE * 4);
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const i = (y * TEX_SIZE + x) * 4;
      const panel = (Math.floor(x / 16) + Math.floor(y / 16)) % 2;
      const edge = (x % 16 < 2) || (y % 16 < 2);
      if (edge) {
        data[i] = 20; data[i+1] = 20; data[i+2] = 25;
      } else {
        data[i] = r + (panel ? 15 : 0);
        data[i+1] = g + (panel ? 15 : 0);
        data[i+2] = b + (panel ? 20 : 0);
      }
      data[i+3] = 255;
    }
  }
  return data;
}

function genNoise(r, g, b) {
  const data = new Uint8ClampedArray(TEX_SIZE * TEX_SIZE * 4);
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const i = (y * TEX_SIZE + x) * 4;
      const n = Math.sin(x * 0.3) * Math.cos(y * 0.4) * 30;
      data[i] = Math.max(0, Math.min(255, r + n));
      data[i+1] = Math.max(0, Math.min(255, g + n));
      data[i+2] = Math.max(0, Math.min(255, b + n));
      data[i+3] = 255;
    }
  }
  return data;
}

function genMetal(r, g, b) {
  const data = new Uint8ClampedArray(TEX_SIZE * TEX_SIZE * 4);
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const i = (y * TEX_SIZE + x) * 4;
      const stripe = (y % 8 < 3) ? 20 : 0;
      data[i] = r + stripe;
      data[i+1] = g + stripe;
      data[i+2] = b + stripe;
      data[i+3] = 255;
    }
  }
  return data;
}

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.textures = createTextures();
    this.zBuffer = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    // Cap resolution for performance on high-DPI / mobile
    const maxW = Math.min(window.innerWidth, 960);
    const maxH = Math.min(window.innerHeight, 540);
    const scale = Math.min(window.innerWidth / maxW, window.innerHeight / maxH);
    this.w = this.canvas.width = Math.floor(maxW);
    this.h = this.canvas.height = Math.floor(maxH);
    this.canvas.style.width = (this.w * scale) + 'px';
    this.canvas.style.height = (this.h * scale) + 'px';
    this.zBuffer = new Array(this.w).fill(0);
    this.imageData = this.ctx.createImageData(this.w, this.h);
  }

  render(player, map, enemies, pickups = []) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const data = this.imageData.data;

    // Ceiling & floor colors
    const ceilR = 26, ceilG = 26, ceilB = 46;
    const floorR = 22, floorG = 33, floorB = 62;

    for (let i = 0; i < data.length; i += 4) {
      const y = Math.floor((i / 4) / w);
      if (y < h / 2) {
        data[i] = ceilR; data[i+1] = ceilG; data[i+2] = ceilB; data[i+3] = 255;
      } else {
        data[i] = floorR; data[i+1] = floorG; data[i+2] = floorB; data[i+3] = 255;
      }
    }

    // Raycasting
    for (let x = 0; x < w; x++) {
      const cameraX = 2 * x / w - 1;
      const rayDirX = player.dirX + player.planeX * cameraX;
      const rayDirY = player.dirY + player.planeY * cameraX;

      let mapX = Math.floor(player.x);
      let mapY = Math.floor(player.y);

      const deltaDistX = Math.abs(1 / (rayDirX || 1e-10));
      const deltaDistY = Math.abs(1 / (rayDirY || 1e-10));

      let stepX, stepY, sideDistX, sideDistY;
      let hit = 0;
      let side = 0;

      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (player.x - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1 - player.x) * deltaDistX;
      }
      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (player.y - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1 - player.y) * deltaDistY;
      }

      let texNum = 0;
      while (hit === 0) {
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }
        if (mapX < 0 || mapY < 0 || mapX >= map.width || mapY >= map.height) {
          hit = 1;
          texNum = 0;
          break;
        }
        const tile = map.data[mapY * map.width + mapX];
        if (tile === 1 || tile === 2) {
          hit = 1;
          texNum = (mapX + mapY) % 4;
          if (tile === 2) texNum = 2;
        }
        if (tile === 5) {
          hit = 1;
          texNum = 4;
        }
      }

      let perpWallDist;
      if (side === 0) perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
      else perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;
      if (perpWallDist < 0.01) perpWallDist = 0.01;

      this.zBuffer[x] = perpWallDist;

      const lineHeight = Math.floor(h / perpWallDist);
      let drawStart = Math.floor(-lineHeight / 2 + h / 2);
      if (drawStart < 0) drawStart = 0;
      let drawEnd = Math.floor(lineHeight / 2 + h / 2);
      if (drawEnd >= h) drawEnd = h - 1;

      let wallX;
      if (side === 0) wallX = player.y + perpWallDist * rayDirY;
      else wallX = player.x + perpWallDist * rayDirX;
      wallX -= Math.floor(wallX);

      let texX = Math.floor(wallX * TEX_SIZE);
      if (side === 0 && rayDirX > 0) texX = TEX_SIZE - texX - 1;
      if (side === 1 && rayDirY < 0) texX = TEX_SIZE - texX - 1;

      const tex = this.textures[texNum] || this.textures[0];
      const step = TEX_SIZE / lineHeight;
      let texPos = (drawStart - h / 2 + lineHeight / 2) * step;

      const shade = side === 1 ? 0.7 : 1.0;
      const fog = Math.min(1, perpWallDist / 18);

      for (let y = drawStart; y < drawEnd; y++) {
        const texY = Math.floor(texPos) & (TEX_SIZE - 1);
        texPos += step;
        const ti = (texY * TEX_SIZE + texX) * 4;
        let r = tex[ti] * shade;
        let g = tex[ti + 1] * shade;
        let b = tex[ti + 2] * shade;
        r = r * (1 - fog) + 20 * fog;
        g = g * (1 - fog) + 20 * fog;
        b = b * (1 - fog) + 30 * fog;

        const idx = (y * w + x) * 4;
        data[idx] = r | 0;
        data[idx + 1] = g | 0;
        data[idx + 2] = b | 0;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(this.imageData, 0, 0);

    // Draw enemies as sprites (billboards)
    this._drawSprites(player, enemies, pickups, w, h);

    // Crosshair
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    const cx = w / 2, cy = h / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 10);
    ctx.stroke();
  }

  _drawSprites(player, enemies, pickups, w, h) {
    const list = [];
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - player.x, dy = e.y - player.y;
      list.push({ kind: 'enemy', obj: e, dist: dx*dx+dy*dy, dx, dy });
    }
    for (const p of pickups) {
      if (!p.alive) continue;
      const dx = p.x - player.x, dy = p.y - player.y;
      list.push({ kind: 'pickup', obj: p, dist: dx*dx+dy*dy, dx, dy });
    }
    list.sort((a, b) => b.dist - a.dist);

    const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);

    for (const s of list) {
      const transformX = invDet * (player.dirY * s.dx - player.dirX * s.dy);
      const transformY = invDet * (-player.planeY * s.dx + player.planeX * s.dy);
      if (transformY <= 0.1) continue;

      const spriteScreenX = Math.floor(w / 2 * (1 + transformX / transformY));
      let spriteH = Math.abs(Math.floor(h / transformY));
      if (s.kind === 'pickup') spriteH = Math.floor(spriteH * 0.35);
      const spriteW = spriteH;

      const drawStartY = Math.floor(-spriteH / 2 + h / 2);
      const drawEndY = Math.floor(spriteH / 2 + h / 2);
      const drawStartX = Math.floor(-spriteW / 2 + spriteScreenX);
      const drawEndX = Math.floor(spriteW / 2 + spriteScreenX);

      const baseColor = s.kind === 'enemy' ? (s.obj.color || [180, 30, 30]) : (s.obj.type === 'health' ? [40, 200, 60] : [220, 180, 40]);

      for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
        if (stripe < 0 || stripe >= w) continue;
        if (transformY >= this.zBuffer[stripe]) continue;
        const texX = Math.floor((stripe - (-spriteW / 2 + spriteScreenX)) * TEX_SIZE / spriteW);
        for (let y = Math.max(0, drawStartY); y < Math.min(h, drawEndY); y++) {
          const d = y * 256 - h * 128 + spriteH * 128;
          const texY = ((d * TEX_SIZE) / spriteH) / 256 | 0;
          const cx = TEX_SIZE / 2, cy = TEX_SIZE / 2;
          const tdx = texX - cx, tdy = texY - cy;
          const r2 = tdx * tdx + tdy * tdy;
          const maxR = s.kind === 'pickup' ? 280 : 400;
          if (r2 < maxR) {
            let r = baseColor[0], g = baseColor[1], b = baseColor[2];
            if (s.kind === 'enemy') {
              if (r2 < 80) { r = 40; g = 10; b = 10; }
              if (texY > 40 && Math.abs(tdx) < 8) { r = Math.floor(r * 0.6); }
            }
            const fog = Math.min(1, Math.sqrt(s.dist) / 14);
            r = r * (1 - fog) + 20 * fog;
            g = g * (1 - fog) + 20 * fog;
            b = b * (1 - fog) + 30 * fog;
            this.ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
            this.ctx.fillRect(stripe, y, 1, 1);
          }
        }
      }
    }
  }

  // Hitscan for shooting
  castRay(player, map, maxDist = 20) {
    const rayDirX = player.dirX;
    const rayDirY = player.dirY;
    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    const deltaDistX = Math.abs(1 / (rayDirX || 1e-10));
    const deltaDistY = Math.abs(1 / (rayDirY || 1e-10));

    let stepX = rayDirX < 0 ? -1 : 1;
    let stepY = rayDirY < 0 ? -1 : 1;
    let sideDistX = rayDirX < 0 ? (player.x - mapX) * deltaDistX : (mapX + 1 - player.x) * deltaDistX;
    let sideDistY = rayDirY < 0 ? (player.y - mapY) * deltaDistY : (mapY + 1 - player.y) * deltaDistY;

    let dist = 0;
    while (dist < maxDist) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        dist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        dist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;
      }
      if (mapX < 0 || mapY < 0 || mapX >= map.width || mapY >= map.height) break;
      const tile = map.data[mapY * map.width + mapX];
      if (tile === 1 || tile === 2) return { type: 'wall', dist: Math.abs(dist) };
    }
    return { type: 'miss', dist: maxDist };
  }
}
