// Bounded GPU resources: one instanced particle draw and one instanced decal draw.
export function createFieldEffects(T, scene) {
  const count = 160, marks = 48;
  const particles = new T.InstancedMesh(new T.SphereGeometry(1, 4, 3), new T.MeshBasicMaterial({ transparent: true, opacity: .72, depthWrite: false }), count);
  const decals = new T.InstancedMesh(new T.CircleGeometry(1, 7), new T.MeshBasicMaterial({ color: 0x202323, transparent: true, opacity: .65, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), marks);
  particles.frustumCulled = decals.frustumCulled = false;
  particles.instanceMatrix.setUsage(T.DynamicDrawUsage); decals.instanceMatrix.setUsage(T.DynamicDrawUsage);
  scene.add(particles, decals);
  const dummy = new T.Object3D(), color = new T.Color();
  const slots = Array.from({ length: count }, () => ({ life: 0, pos: new T.Vector3(), vel: new T.Vector3(), size: .025, max: 1, splash: false }));
  const markSlots = Array.from({ length: marks }, () => ({ life: 0, matrix: new T.Matrix4() }));
  let cursor = 0, markCursor = 0, rainTime = 0;
  function hide(mesh, index) { dummy.position.set(0, -1000, 0); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix); }
  function clear() { slots.forEach((s, i) => { s.life = 0; hide(particles, i); }); markSlots.forEach((s, i) => { s.life = 0; hide(decals, i); }); particles.instanceMatrix.needsUpdate = decals.instanceMatrix.needsUpdate = true; }
  function emit(point, normal, metal, quality) {
    const total = quality === 'performance' ? 3 : quality === 'quality' ? 13 : 8;
    for (let n = 0; n < total; n++) {
      const i = cursor++ % count, s = slots[i];
      s.pos.copy(point); s.vel.copy(normal).multiplyScalar(metal ? 3 : 1.3).add(new T.Vector3((Math.random() - .5) * 2, Math.random() * 2, (Math.random() - .5) * 2));
      s.life = s.max = metal ? .24 + Math.random() * .2 : .5 + Math.random() * .3;
      s.size = metal ? .018 : .05; s.splash = false;
      particles.setColorAt(i, color.setHex(metal ? 0xffca75 : 0xaaa99e));
    }
    if (quality !== 'performance') {
      const i = markCursor++ % marks;
      dummy.position.copy(point).addScaledVector(normal, .012); dummy.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal); dummy.scale.setScalar(metal ? .045 : .08); dummy.updateMatrix();
      markSlots[i].life = 14; markSlots[i].matrix.copy(dummy.matrix); decals.setMatrixAt(i, dummy.matrix); decals.instanceMatrix.needsUpdate = true;
    }
    if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
  }
  function update(delta, { rain, camera, quality, active, blocked }) {
    rainTime += delta;
    if (rain && active && rainTime > (quality === 'performance' ? .18 : .045)) {
      rainTime = 0;
      const x = camera.position.x + (Math.random() - .5) * 20, z = camera.position.z + (Math.random() - .5) * 20;
      if (!blocked(x, z, .1)) {
        const i = cursor++ % count, s = slots[i]; s.pos.set(x, .035, z); s.vel.set(0, 0, 0); s.life = s.max = .32; s.size = .055; s.splash = true;
        particles.setColorAt(i, color.setHex(0xa1bcc6)); particles.instanceColor.needsUpdate = true;
      }
    }
    slots.forEach((s, i) => {
      if (s.life <= 0) return;
      s.life -= delta;
      if (s.life <= 0) { hide(particles, i); return; }
      if (!s.splash) { s.vel.y -= 5 * delta; s.pos.addScaledVector(s.vel, delta); }
      dummy.position.copy(s.pos); dummy.rotation.set(0, 0, 0);
      const scale = s.size * (s.splash ? 1 + (1 - s.life / s.max) * 4 : s.life / s.max);
      dummy.scale.set(scale, s.splash ? .005 : scale, scale); dummy.updateMatrix(); particles.setMatrixAt(i, dummy.matrix);
    });
    markSlots.forEach((s, i) => { if (s.life > 0) { s.life -= delta; if (s.life <= 0 || quality === 'performance') { s.life = 0; hide(decals, i); } } });
    particles.instanceMatrix.needsUpdate = decals.instanceMatrix.needsUpdate = true;
  }
  clear();
  return { emit, update, clear };
}

export function createFinish(T, skin, index) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const rough = document.createElement('canvas'); rough.width = rough.height = 256;
  const c = canvas.getContext('2d'), r = rough.getContext('2d');
  let seed = 981 + index * 193;
  const rand = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  const style = skin.weapon === 'knife' ? skin.id === 'knife-carbon' ? 'carbon' : skin.id === 'knife-sand' ? 'worn' : 'anodized' : index < 3 ? (index === 2 ? 'worn' : 'camo') : index === 8 || index >= 12 ? 'carbon' : 'anodized';
  c.fillStyle = skin.color; c.fillRect(0, 0, 256, 256);
  r.fillStyle = style === 'anodized' ? '#656565' : style === 'carbon' ? '#858585' : '#cccccc'; r.fillRect(0, 0, 256, 256);
  if (style === 'camo' || style === 'worn') {
    for (let i = 0; i < 105; i++) {
      const x = rand() * 256, y = rand() * 256;
      c.fillStyle = i % 3 ? `#${skin.metal.toString(16).padStart(6, '0')}` : '#29302a';
      c.globalAlpha = .45 + rand() * .3; c.beginPath();
      for (let j = 0; j < 7; j++) { const a = j / 7 * Math.PI * 2, radius = 5 + rand() * 21; c.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius); }
      c.closePath(); c.fill();
    }
  } else if (style === 'carbon') {
    c.fillStyle = '#10171f'; c.globalAlpha = .78; c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 8) for (let x = 0; x < 256; x += 8) {
      c.globalAlpha = (x + y) % 16 ? .3 : .1; c.fillStyle = skin.color; c.fillRect(x, y, 7, 3);
      r.fillStyle = (x + y) % 16 ? '#676767' : '#9a9a9a'; r.fillRect(x, y, 8, 8);
    }
    c.globalAlpha = .75; c.fillStyle = skin.color; c.fillRect(36, 0, 5, 256); c.fillRect(48, 0, 2, 256);
  } else {
    const gradient = c.createLinearGradient(0, 0, 256, 256); gradient.addColorStop(0, '#cbd6dc'); gradient.addColorStop(.35, skin.color); gradient.addColorStop(1, `#${skin.metal.toString(16).padStart(6, '0')}`);
    c.fillStyle = gradient; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#122130'; c.globalAlpha = .35; c.lineWidth = 2;
    for (let n = -256; n < 512; n += 48) { c.beginPath(); c.moveTo(n, 0); c.lineTo(n + 180, 256); c.stroke(); }
  }
  for (let i = 0; i < 800; i++) {
    const x = rand() * 256, y = rand() * 256, length = rand() * (style === 'worn' ? 16 : 4);
    c.globalAlpha = style === 'worn' ? .4 : .15; c.fillStyle = '#d0d6d2'; c.fillRect(x, y, length, .5);
    r.fillStyle = '#e1e1e1'; r.fillRect(x, y, length, 1);
  }
  c.globalAlpha = 1;
  const texture = new T.CanvasTexture(canvas), roughnessMap = new T.CanvasTexture(rough);
  texture.colorSpace = T.SRGBColorSpace;
  for (const map of [texture, roughnessMap]) { map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4; }
  return { texture, roughnessMap, finish: style, metalness: style === 'anodized' ? .78 : style === 'carbon' ? .3 : .18, roughness: 1 };
}

export function createLobbyFlight(T) {
  // Closed spline: entry → container yard → central terminal, with continuous joins.
  const route = new T.CatmullRomCurve3([new T.Vector3(-20, 9, 38), new T.Vector3(10, 8, 56), new T.Vector3(36, 11, 18), new T.Vector3(35, 13, -30), new T.Vector3(-12, 16, -46), new T.Vector3(-40, 11, 1)], true, 'centripetal');
  let elapsed = 0;
  return (delta, camera, reduced) => {
    if (reduced) { camera.position.set(-20, 9, 38); camera.lookAt(9, 2, -20); return; }
    elapsed += delta;
    const t = (elapsed % 84) / 84;
    camera.position.copy(route.getPointAt(t));
    camera.lookAt(Math.sin(t * Math.PI * 2) * 8, 2.4, -8 + Math.cos(t * Math.PI * 2) * 8);
  };
}

export function createSurfaceMaps(T) {
  const wet = document.createElement('canvas'); wet.width = wet.height = 256;
  const c = wet.getContext('2d'); c.fillStyle = '#cccccc'; c.fillRect(0, 0, 256, 256);
  let seed = 117;
  const rand = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 85; i++) {
    const x = rand() * 256, y = rand() * 256, radius = 5 + rand() * 28;
    const g = c.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, '#383838'); g.addColorStop(1, '#cccccc00');
    c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const wetness = new T.CanvasTexture(wet); wetness.wrapS = wetness.wrapT = T.RepeatWrapping; wetness.repeat.set(12, 12);
  const weave = document.createElement('canvas'); weave.width = weave.height = 128;
  const f = weave.getContext('2d'); f.fillStyle = '#9a9c96'; f.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) for (let x = 0; x < 128; x += 4) { f.fillStyle = (x + y) % 8 ? '#777d78' : '#b9bab0'; f.fillRect(x, y, 3, 1); }
  const fabric = new T.CanvasTexture(weave); fabric.wrapS = fabric.wrapT = T.RepeatWrapping; fabric.repeat.set(3, 3);
  return { wetness, fabric };
}

export function addOvercastEnvironment(T, renderer, scene) {
  const faces = Array.from({ length: 6 }, (_, index) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const c = canvas.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, index === 3 ? '#282d31' : '#aabcc9'); g.addColorStop(.55, '#788b99'); g.addColorStop(1, '#30383b');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64); return canvas;
  });
  const cube = new T.CubeTexture(faces); cube.colorSpace = T.SRGBColorSpace; cube.needsUpdate = true;
  const generator = new T.PMREMGenerator(renderer), env = generator.fromCubemap(cube);
  scene.environment = env.texture;
  generator.dispose(); cube.dispose();
  return env;
}
