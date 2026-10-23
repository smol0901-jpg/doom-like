import { isSolid, isExit, openDoor } from './map.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dirX = -1;
    this.dirY = 0;
    this.planeX = 0;
    this.planeY = 0.66;
    this.moveSpeed = 0.085;
    this.rotSpeed = 0.04;
    this.hp = 100;
    this.maxHp = 100;
    this.score = 0;
    this.ammo = { pistol: 50, shotgun: 25 };
    this.currentWeapon = 'pistol';
    this.weapons = {
      pistol: { name: 'ПИСТОЛЕТ', damage: 18, range: 16, cooldown: 220, ammoKey: 'pistol', sfx: 'shoot' },
      shotgun: { name: 'ДРОБОВИК', damage: 12, range: 9, cooldown: 650, ammoKey: 'shotgun', pellets: 7, spread: 0.35, sfx: 'shotgun' }
    };
    this.lastShot = 0;
    this.alive = true;
    this.bob = 0;
  }

  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const odx = this.dirX;
    this.dirX = this.dirX * cos - this.dirY * sin;
    this.dirY = odx * sin + this.dirY * cos;
    const opx = this.planeX;
    this.planeX = this.planeX * cos - this.planeY * sin;
    this.planeY = opx * sin + this.planeY * cos;
  }

  tryMove(forward, strafe, map) {
    const mx = this.dirX * forward * this.moveSpeed + this.planeX * strafe * this.moveSpeed;
    const my = this.dirY * forward * this.moveSpeed + this.planeY * strafe * this.moveSpeed;
    if (!isSolid(map, this.x + mx, this.y)) this.x += mx;
    if (!isSolid(map, this.x, this.y + my)) this.y += my;
    if (forward || strafe) this.bob += 0.25;
  }

  tryOpenDoor(map) {
    const checkDist = 0.8;
    return openDoor(map, this.x + this.dirX * checkDist, this.y + this.dirY * checkDist);
  }

  canShoot() {
    const w = this.weapons[this.currentWeapon];
    return this.alive && Date.now() - this.lastShot >= w.cooldown && this.ammo[w.ammoKey] > 0;
  }

  shoot() {
    if (!this.canShoot()) return null;
    const w = this.weapons[this.currentWeapon];
    this.ammo[w.ammoKey]--;
    this.lastShot = Date.now();
    return { ...w, pellets: w.pellets || 1, spread: w.spread || 0.12 };
  }

  switchWeapon() {
    this.currentWeapon = this.currentWeapon === 'pistol' ? 'shotgun' : 'pistol';
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addAmmo(pistol, shotgun) {
    this.ammo.pistol = Math.min(99, this.ammo.pistol + pistol);
    this.ammo.shotgun = Math.min(40, this.ammo.shotgun + shotgun);
  }

  checkExit(map) {
    return isExit(map, this.x, this.y);
  }

  getState() {
    return {
      x: this.x, y: this.y, dirX: this.dirX, dirY: this.dirY,
      planeX: this.planeX, planeY: this.planeY,
      hp: this.hp, score: this.score, ammo: { ...this.ammo },
      currentWeapon: this.currentWeapon
    };
  }

  loadState(s) {
    Object.assign(this, s);
    this.ammo = { ...s.ammo };
    this.alive = this.hp > 0;
  }
}
