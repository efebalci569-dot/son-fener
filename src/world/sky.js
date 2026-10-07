import * as THREE from 'three';

export class Sky {
  constructor(scene) {
    this.uniforms = {
      top: { value: new THREE.Color('#4f88d6') },
      horizon: { value: new THREE.Color('#d6e8f5') },
      bottom: { value: new THREE.Color('#2a3a48') },
      fogCol: { value: new THREE.Color('#888') },
      fogAmt: { value: 0 },
      sunDir: { value: new THREE.Vector3(0, 1, -1).normalize() },
      sunCol: { value: new THREE.Color('#ffd8a0') },
      sunGlow: { value: 0.5 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 fogCol; uniform float fogAmt;
        uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunGlow;
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 c = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.55, h), 0.75)) : mix(horizon, bottom, smoothstep(0.0, 0.15, -h));
          float g = max(dot(d, normalize(sunDir)), 0.0);
          c += sunCol * (pow(g, 12.0) * 0.35 + pow(g, 3.0) * 0.12) * sunGlow;
          c = mix(c, fogCol, fogAmt * (1.0 - smoothstep(-0.05, 0.45, h)));
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), mat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    // Yıldızlar
    const N = 900, sp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = Math.random() * Math.PI * 2, v = Math.acos(Math.random() * 0.92);
      const r = 650;
      sp[i * 3] = Math.sin(v) * Math.cos(u) * r; sp[i * 3 + 1] = Math.cos(v) * r; sp[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: '#dfe8ff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // Güneş ve ay
    this.sunMat = new THREE.MeshBasicMaterial({ color: '#fff4dc', fog: false, transparent: true, depthWrite: false });
    this.sun = new THREE.Mesh(new THREE.CircleGeometry(22, 24), this.sunMat);
    this.moonMat = new THREE.MeshBasicMaterial({ color: '#e8eeff', fog: false, transparent: true, depthWrite: false });
    this.moon = new THREE.Mesh(new THREE.CircleGeometry(14, 24), this.moonMat);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(40, 24), new THREE.MeshBasicMaterial({ color: '#9fb4e0', fog: false, transparent: true, opacity: 0.08, depthWrite: false }));
    halo.position.z = -1; this.moon.add(halo);
    this.moonHalo = halo;
    for (const m of [this.sun, this.moon]) { m.renderOrder = -9; m.frustumCulled = false; scene.add(m); }

    // Bulutlar
    this.clouds = new THREE.Group();
    this.cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, transparent: true, opacity: 0.92, fog: false });
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(6 + Math.random() * 6, 0), this.cloudMat);
        b.position.set(k * 8 - n * 4, Math.random() * 3, Math.random() * 4);
        b.scale.y = 0.55;
        c.add(b);
      }
      c.position.set(-400 + i * 70 + Math.random() * 30, 70 + Math.random() * 40, -220 - Math.random() * 120);
      c.userData.speed = 1 + Math.random() * 1.5;
      this.clouds.add(c);
    }
    scene.add(this.clouds);
  }

  update(dt, camPos, p) {
    // p: palet nesnesi (env'den)
    this.dome.position.copy(camPos);
    this.stars.position.copy(camPos);
    this.stars.rotation.y += dt * 0.002;
    this.uniforms.top.value.copy(p.skyTop);
    this.uniforms.horizon.value.copy(p.skyHorizon);
    this.uniforms.bottom.value.copy(p.skyBottom);
    this.uniforms.fogCol.value.copy(p.fogColor);
    this.uniforms.fogAmt.value = p.skyFog;
    this.uniforms.sunDir.value.copy(p.sunDir);
    this.uniforms.sunCol.value.copy(p.sunGlowColor);
    this.uniforms.sunGlow.value = p.sunGlow;
    this.starMat.opacity = p.stars;

    const place = (mesh, dir, dist) => {
      mesh.position.copy(camPos).addScaledVector(dir, dist);
      mesh.lookAt(camPos);
    };
    place(this.sun, p.sunDir, 600);
    place(this.moon, p.moonDir, 600);
    this.sunMat.opacity = p.sunVisible;
    this.moonMat.opacity = p.moonVisible;
    this.moonHalo.material.opacity = p.moonVisible * 0.1;

    this.cloudMat.color.copy(p.cloudColor);
    this.cloudMat.opacity = p.cloudOpacity;
    for (const c of this.clouds.children) {
      c.position.x += c.userData.speed * dt * (1 + p.wind * 4);
      if (c.position.x > camPos.x + 520) c.position.x -= 1040;
      if (c.position.x < camPos.x - 520) c.position.x += 1040;
    }
  }
}
