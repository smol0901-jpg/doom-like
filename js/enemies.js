import { isSolid } from './map.js';

const TYPES = {
  zombie: { hp: 35, speed: 0.028, damage: 7, color: [180, 40, 40], score: 100 },
  imp: { hp: 55, speed: 0.04, damage: 12, color: [220, 80, 20], score: 200 }
};

export class Enemy {
  constructor(x, y, type = 'zombie') {
    const t = TYPES[type] || TYPES.zombie;
    this.x = x;
    this.y = y;
    this.type = type;
    this.hp = t.hp;
    this.speed = t.speed;
    this.damage = t.damage;
    this.color = t.color;
    this.scoreValue = t.score;
    this.attackCooldown = 1100;
    this.lastAttack = 0;
    this.alive = true;
  }

  update(player, map) {
    if (!this.alive) return;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1.15) {
      if (Date.now() - this.lastAttack > this.attackCooldown) {
        player.takeDamage(this.damage);
        this.lastAttack = Date.now();
        return 'hit';
      }
    } else if (dist < 12) {
      const nx = dx / dist;
      const ny = dy / dist;
      const nx2 = this.x + nx * this.speed;
      const ny2 = this.y + ny * this.speed;
      if (!isSolid(map, nx2, this.y)) this.x = nx2;
      if (!isSolid(map, this.x, ny2)) this.y = ny2;
    }
    return null;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }
}

export function createEnemies(spawns) {
  return spawns.map(s => new Enemy(s.x, s.y, s.type));
}

export class Pickup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.alive = true;
  }
}

export function createPickups(spawns) {
  return spawns.map(s => new Pickup(s.x, s.y, s.type));
}
