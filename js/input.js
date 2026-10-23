export class Input {
  constructor() {
    this.keys = {};
    this.mouseDX = 0;
    this.mouseLocked = false;
    this.isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
                    ('ontouchstart' in window);
    this.joyActive = false;
    this.joyX = 0;
    this.joyY = 0;
    this.joyId = null;
    this.lookId = null;
    this.lookLastX = 0;
    this.lookLastY = 0;
    this.firePressed = false;
    this.weaponPressed = false;
    this._qWasPressed = false;
    this.mouseDown = false;
    this.mouseSens = 1.5;
    this.touchSens = 1.2;
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    document.addEventListener('mousemove', e => {
      if (this.mouseLocked) this.mouseDX += e.movementX * this.mouseSens * 0.002;
    });
    document.addEventListener('click', () => {
      if (!this.isMobile && !this.mouseLocked) document.body.requestPointerLock?.();
    });
    document.addEventListener('mousedown', e => { if (e.button === 0) this.mouseDown = true; });
    document.addEventListener('mouseup', e => { if (e.button === 0) this.mouseDown = false; });
    document.addEventListener('pointerlockchange', () => {
      this.mouseLocked = document.pointerLockElement === document.body;
    });

    const joyZone = document.getElementById('joystick-zone');
    const lookZone = document.getElementById('look-zone');
    const fireBtn = document.getElementById('btn-fire');
    const weaponBtn = document.getElementById('btn-weapon');

    if (joyZone) {
      joyZone.addEventListener('touchstart', e => this._joyStart(e), { passive: false });
      joyZone.addEventListener('touchmove', e => this._joyMove(e), { passive: false });
      joyZone.addEventListener('touchend', e => this._joyEnd(e), { passive: false });
      joyZone.addEventListener('touchcancel', e => this._joyEnd(e), { passive: false });
    }
    if (lookZone) {
      lookZone.addEventListener('touchstart', e => this._lookStart(e), { passive: false });
      lookZone.addEventListener('touchmove', e => this._lookMove(e), { passive: false });
      lookZone.addEventListener('touchend', e => this._lookEnd(e), { passive: false });
      lookZone.addEventListener('touchcancel', e => this._lookEnd(e), { passive: false });
    }
    if (fireBtn) {
      fireBtn.addEventListener('touchstart', e => { e.preventDefault(); this.firePressed = true; }, { passive: false });
      fireBtn.addEventListener('touchend', () => { this.firePressed = false; });
    }
    if (weaponBtn) {
      weaponBtn.addEventListener('touchstart', e => { e.preventDefault(); this.weaponPressed = true; }, { passive: false });
      weaponBtn.addEventListener('touchend', () => { this.weaponPressed = false; });
    }
  }

  _joyStart(e) {
    e.preventDefault();
    const t = e.changedTouches[0];
    this.joyId = t.identifier;
    this.joyActive = true;
    this._updateJoy(t);
  }
  _joyMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === this.joyId) { this._updateJoy(t); break; }
    }
  }
  _joyEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.joyId) {
        this.joyActive = false; this.joyX = 0; this.joyY = 0; this.joyId = null; this._setKnob(0, 0); break;
      }
    }
  }
  _updateJoy(t) {
    const zone = document.getElementById('joystick-zone');
    const rect = zone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = t.clientX - cx, dy = t.clientY - cy;
    const max = rect.width / 2 - 10;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > max) { dx = (dx / dist) * max; dy = (dy / dist) * max; }
    this.joyX = dx / max; this.joyY = dy / max;
    this._setKnob(dx, dy);
  }
  _setKnob(dx, dy) {
    const knob = document.getElementById('joystick-knob');
    if (knob) knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  _lookStart(e) {
    e.preventDefault();
    const t = e.changedTouches[0];
    this.lookId = t.identifier;
    this.lookLastX = t.clientX; this.lookLastY = t.clientY;
  }
  _lookMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === this.lookId) {
        this.mouseDX += (t.clientX - this.lookLastX) * this.touchSens * 0.004;
        this.lookLastX = t.clientX; this.lookLastY = t.clientY; break;
      }
    }
  }
  _lookEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.lookId) { this.lookId = null; break; }
    }
  }
  getMovement() {
    let forward = 0, strafe = 0;
    if (this.isMobile && this.joyActive) { forward = -this.joyY; strafe = this.joyX; }
    else {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) strafe -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) strafe += 1;
    }
    return { forward, strafe };
  }
  getRotation() {
    const rot = this.mouseDX; this.mouseDX = 0; return rot;
  }
  isShooting() {
    if (this.isMobile) return this.firePressed;
    return this.mouseDown || this.keys['Space'] || this.keys['ControlLeft'] || this.keys['ControlRight'];
  }
  isWeaponSwitch() {
    if (this.isMobile) {
      if (this.weaponPressed) { this.weaponPressed = false; return true; }
      return false;
    }
    if (this.keys['KeyQ'] && !this._qWasPressed) { this._qWasPressed = true; return true; }
    if (!this.keys['KeyQ']) this._qWasPressed = false;
    return false;
  }
  isPause() {
    return this.keys['Escape'] || this.keys['KeyP'];
  }
}
