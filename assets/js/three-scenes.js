/* =========================================================
   FAJR FILM — three-scenes.js
   All Three.js scenes, exposed as init functions per page/section.
   Performance:
   - DPR capped at 2
   - IntersectionObserver pause off-screen
   - prefers-reduced-motion: static gradient fallback
   - reduced particle counts on mobile
   - dispose geometries/materials on cleanup
   Palette: #861A1A (red), #0D2819 (dark), #C5DCCC (sage), #FFFFFF
   ========================================================= */

(function () {
  'use strict';

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IS_TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const IS_MOBILE = window.innerWidth < 768;

  // Try to get THREE from global (CDN script)
  const THREE = window.THREE;
  if (!THREE) {
    console.warn('[FajrFilm] THREE not found; skipping 3D scenes.');
    return;
  }

  /* ----------------- Color palette as THREE.Color ----------------- */
  const C_RED = new THREE.Color(0x861A1A);
  const C_DARK = new THREE.Color(0x0D2819);
  const C_SAGE = new THREE.Color(0xC5DCCC);
  const C_WHITE = new THREE.Color(0xFFFFFF);

  /* ----------------- Utility: webgl available? ----------------- */
  function webglAvailable() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  /* ----------------- Utility: make renderer ----------------- */
  function makeRenderer(canvas, alpha) {
    const r = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !IS_MOBILE,
      alpha: alpha !== false,
      powerPreference: 'high-performance'
    });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    return r;
  }

  /* ----------------- Utility: IntersectionObserver pause ----------------- */
  function attachPause(canvas, render) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        canvas.__fajrPaused = !e.isIntersecting;
      });
    }, { threshold: 0.01 });
    io.observe(canvas);
    return io;
  }

  /* ----------------- Utility: dispose ----------------- */
  function disposeObject(obj) {
    obj.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); });
        else o.material.dispose();
      }
    });
  }

  /* ----------------- Global floating dust (background layer) ----------------- */
  function initGlobalDust() {
    if (REDUCED_MOTION || !webglAvailable()) return null;
    const canvas = document.getElementById('three-global-dust');
    if (!canvas) return null;

    const renderer = makeRenderer(canvas);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 8;

    const N = IS_MOBILE ? 220 : 600;
    const positions = new Float32Array(N * 3);
    const sizes = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      sizes[i] = Math.random() * 0.06 + 0.01;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: C_SAGE,
      size: 0.05,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // light-leak gradient overlay (a big plane with shader)
    const leakGeo = new THREE.PlaneGeometry(60, 40);
    const leakMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: [
        'varying vec2 vUv; uniform float uTime;',
        'void main(){',
          'vec3 c1=vec3(0.527,0.102,0.102);',
          'vec3 c2=vec3(0.772,0.862,0.800);',
          'float t=sin(uTime*0.2)*0.5+0.5;',
          'vec3 col=mix(c1,c2,smoothstep(0.0,0.7,vUv.x));',
          'float a=smoothstep(0.0,0.35,vUv.y)*0.18*0.6;',
          'gl_FragColor=vec4(col,a);',
        '}'
      ].join('\n')
    });
    const leak = new THREE.Mesh(leakGeo, leakMat);
    leak.position.z = -10;
    scene.add(leak);

    attachPause(canvas);
    let scrollVel = 0;
    window.addEventListener('scroll', function () {
      scrollVel = Math.min(Math.abs(window.scrollY - (window.__lastSY || 0)), 60);
      window.__lastSY = window.scrollY;
    }, { passive: true });

    let mx = 0, my = 0;
    window.addEventListener('mousemove', function (e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 0.5;
      my = (e.clientY / window.innerHeight - 0.5) * 0.5;
    });

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', resize);
    resize();

    let t = 0;
    function loop() {
      requestAnimationFrame(loop);
      if (canvas.__fajrPaused) return;
      t += 0.016;
      mat.uniforms && (leakMat.uniforms.uTime.value = t);
      points.rotation.y = t * 0.02 + mx * 0.4;
      points.rotation.x = my * 0.4 + t * 0.01;
      const boost = 1 + scrollVel / 60;
      points.scale.setScalar(boost);
      scrollVel *= 0.92;
      renderer.render(scene, camera);
    }
    loop();

    return {
      dispose: function () {
        window.removeEventListener('resize', resize);
        disposeObject(scene);
        renderer.dispose();
      }
    };
  }

  /* =========================================================
   HOME — Hero: cinematic camera lens / aperture + film ribbons + dust
   ========================================================= */
  function initHeroLens() {
    if (REDUCED_MOTION || !webglAvailable()) {
      const wrap = document.getElementById('three-hero');
      if (wrap) wrap.style.background = 'radial-gradient(circle at 50% 50%, #1a3a28 0%, #0D2819 60%, #05110a 100%)';
      return null;
    }
    const canvas = document.getElementById('three-hero-canvas');
    const wrap = document.getElementById('three-hero');
    if (!canvas) return null;

    const renderer = makeRenderer(canvas);
    renderer.setClearColor(0x0D2819, 1);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0D2819, 0.05);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    /* ---- Aperture iris blades group ---- */
    const apertureGroup = new THREE.Group();
    scene.add(apertureGroup);

    const blades = [];
    const BLADE_COUNT = 8;
    for (let i = 0; i < BLADE_COUNT; i++) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(1.0, 0.18);
      shape.lineTo(1.0, -0.18);
      shape.lineTo(0, 0);
      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshBasicMaterial({
        color: C_SAGE,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide
      });
      const blade = new THREE.Mesh(geo, mat);
      const angle = (i / BLADE_COUNT) * Math.PI * 2;
      blade.rotation.z = angle;
      blade.position.set(Math.cos(angle) * 0, Math.sin(angle) * 0, 0);
      apertureGroup.add(blade);
      blades.push(blade);
    }

    // Outer ring (red rim light)
    const ringGeo = new THREE.RingGeometry(2.4, 2.6, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: C_RED, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    apertureGroup.add(ring);

    // Inner glow disc
    const glowGeo = new THREE.CircleGeometry(2.3, 64);
    const glowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uOpen: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: [
        'varying vec2 vUv; uniform float uTime; uniform float uOpen;',
        'void main(){',
          'vec2 c=vUv-0.5;',
          'float d=length(c);',
          'float glow=smoothstep(0.5,0.0,d)*0.6;',
          'vec3 col=mix(vec3(0.527,0.102,0.102),vec3(0.772,0.862,0.800),uOpen);',
          'float a=glow*(1.0-uOpen*0.7);',
          'gl_FragColor=vec4(col,a);',
        '}'
      ].join('\n')
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = -0.1;
    apertureGroup.add(glow);

    // Front glass highlight
    const glassGeo = new THREE.CircleGeometry(2.4, 64);
    const glassMat = new THREE.MeshBasicMaterial({ color: C_WHITE, transparent: true, opacity: 0.05, side: THREE.DoubleSide });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.z = 0.05;
    apertureGroup.add(glass);

    /* ---- Film strip ribbons ---- */
    const ribbons = [];
    function makeRibbon(z, color, opacity, segs) {
      const N = segs || 80;
      const positions = new Float32Array(N * 3);
      const colors = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        positions[i * 3 + 0] = (i - N / 2) * 0.18;
        positions[i * 3 + 1] = Math.sin(i * 0.2) * 0.5;
        positions[i * 3 + 2] = Math.cos(i * 0.2) * 0.5;
        colors[i * 3 + 0] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: opacity, linewidth: 1 });
      const line = new THREE.Line(g, m);
      line.position.z = z;
      scene.add(line);
      return { line: line, g: g, m: m, N: N };
    }
    ribbons.push(makeRibbon(-2.5, C_RED, 0.6, 100));
    ribbons.push(makeRibbon(-3.0, C_SAGE, 0.45, 90));
    ribbons.push(makeRibbon(3.5, C_SAGE, 0.35, 70));

    /* ---- Film dust particles ---- */
    const DUST_N = IS_MOBILE ? 200 : 600;
    const dPos = new Float32Array(DUST_N * 3);
    const dVel = new Float32Array(DUST_N * 3);
    for (let i = 0; i < DUST_N; i++) {
      dPos[i * 3 + 0] = (Math.random() - 0.5) * 20;
      dPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      dPos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1;
      dVel[i * 3 + 0] = (Math.random() - 0.5) * 0.01;
      dVel[i * 3 + 1] = -Math.random() * 0.005;
      dVel[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: C_SAGE,
      size: 0.04,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    /* ---- Lights ---- */
    const amb = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(amb);
    const rim = new THREE.PointLight(0x861A1A, 2, 30);
    rim.position.set(4, 2, 4);
    scene.add(rim);
    const fill = new THREE.PointLight(0xC5DCCC, 1.4, 25);
    fill.position.set(-4, -2, 3);
    scene.add(fill);

    /* ---- Resize ---- */
    function resize() {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', resize);
    resize();

    /* ---- Mouse parallax ---- */
    let mx = 0, my = 0;
    if (!IS_TOUCH) {
      window.addEventListener('mousemove', function (e) {
        mx = (e.clientX / window.innerWidth - 0.5);
        my = (e.clientY / window.innerHeight - 0.5);
      });
    }

    /* ---- Scroll-driven camera dolly + aperture open ---- */
    let scrollProgress = 0; // 0..1 for hero section
    function updateScrollProgress() {
      const heroEl = document.getElementById('hero');
      if (!heroEl) return;
      const r = heroEl.getBoundingClientRect();
      const total = r.height;
      // how much scrolled past top of hero
      const past = Math.max(0, -r.top);
      scrollProgress = Math.min(1, past / total);
    }
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress();

    attachPause(canvas);

    /* ---- Animate ---- */
    let t = 0;
    function loop() {
      requestAnimationFrame(loop);
      if (canvas.__fajrPaused) return;
      t += 0.016;

      // aperture open with scroll
      const open = scrollProgress; // 0..1
      // shrink blades toward center as we open
      blades.forEach(function (b, i) {
        const baseAngle = (i / BLADE_COUNT) * Math.PI * 2;
        b.rotation.z = baseAngle + open * 0.6;
        const scale = 1 - open * 0.6;
        b.scale.setScalar(scale);
        b.material.opacity = 0.18 + Math.sin(t + i) * 0.04;
      });
      glowMat.uniforms.uTime.value = t;
      glowMat.uniforms.uOpen.value = open;
      ring.material.opacity = 0.85 - open * 0.5;
      ring.scale.setScalar(1 + open * 0.3);

      apertureGroup.rotation.z = t * 0.1;
      apertureGroup.rotation.y = my * 0.4;
      apertureGroup.rotation.x = mx * 0.3;

      // ribbons wave
      ribbons.forEach(function (r, idx) {
        const pos = r.g.attributes.position.array;
        for (let i = 0; i < r.N; i++) {
          pos[i * 3 + 1] = Math.sin(i * 0.2 + t * 0.5 + idx) * 0.5;
          pos[i * 3 + 2] = Math.cos(i * 0.2 + t * 0.4 + idx) * 0.5;
        }
        r.g.attributes.position.needsUpdate = true;
        r.line.rotation.z = t * 0.05 * (idx % 2 === 0 ? 1 : -1);
      });

      // dust drift
      const dp = dustGeo.attributes.position.array;
      for (let i = 0; i < DUST_N; i++) {
        dp[i * 3 + 0] += dVel[i * 3 + 0];
        dp[i * 3 + 1] += dVel[i * 3 + 1];
        dp[i * 3 + 2] += dVel[i * 3 + 2];
        if (dp[i * 3 + 1] < -7) dp[i * 3 + 1] = 7;
        if (Math.abs(dp[i * 3 + 0]) > 10) dp[i * 3 + 0] *= -1;
      }
      dustGeo.attributes.position.needsUpdate = true;

      // camera dolly through lens
      camera.position.z = 8 - open * 7; // approach and pass through
      camera.position.x = mx * 0.8;
      camera.position.y = -my * 0.6;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    loop();

    return {
      dispose: function () {
        window.removeEventListener('resize', resize);
        window.removeEventListener('scroll', updateScrollProgress);
        disposeObject(scene);
        renderer.dispose();
      }
    };
  }

  /* =========================================================
   HOME — Service motifs (lightweight CSS/SVG driven in animations.js
   via DOM; here we only init a shared WebGL ripple shader for portfolio)
   ========================================================= */

  /* =========================================================
   HOME — Portfolio ripple shader (hover)
   ========================================================= */
  function initPortfolioRipples() {
    if (REDUCED_MOTION || !webglAvailable()) return null;
    const cards = document.querySelectorAll('[data-ripple]');
    if (!cards.length) return null;
    const instances = [];

    cards.forEach(function (card) {
      const img = card.querySelector('img');
      const imgSrc = img ? img.src : '';
      if (!imgSrc) return;
      const wrap = document.createElement('canvas');
      wrap.className = 'three-canvas';
      wrap.style.position = 'absolute';
      wrap.style.inset = '0';
      wrap.style.width = '100%';
      wrap.style.height = '100%';
      wrap.style.opacity = '0';
      wrap.style.transition = 'opacity .4s ease';
      wrap.style.pointerEvents = 'none';
      card.appendChild(wrap);

      const renderer = makeRenderer(wrap);
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
      camera.position.z = 1;

      const tex = new THREE.TextureLoader().load(imgSrc);
      tex.colorSpace = THREE.SRGBColorSpace;

      const geo = new THREE.PlaneGeometry(2, 2);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTex: { value: tex },
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uStrength: { value: 0 }
        },
        vertexShader: [
          'varying vec2 vUv;',
          'void main(){ vUv=uv; gl_Position=vec4(position,1.0); }'
        ].join('\n'),
        fragmentShader: [
          'uniform sampler2D uTex; uniform float uTime; uniform vec2 uMouse; uniform float uStrength;',
          'varying vec2 vUv;',
          'void main(){',
            'vec2 uv=vUv;',
            'float d=distance(uv,uMouse);',
            'float w=sin(d*40.0 - uTime*3.0)*0.02*uStrength;',
            'uv+=w*normalize(uv-uMouse);',
            'vec3 col=texture2D(uTex,uv).rgb;',
            'col=mix(col,col*0.6,uStrength*0.4);',
            'gl_FragColor=vec4(col,1.0);',
          '}'
        ].join('\n')
      });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      function resize() {
        const w = card.clientWidth, h = card.clientHeight;
        renderer.setSize(w, h, false);
      }
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(card);

      card.addEventListener('mouseenter', function () {
        wrap.style.opacity = '1';
        if (window.gsap) gsap.to(mat.uniforms.uStrength, { value: 1, duration: .6, ease: 'power2.out' });
        else mat.uniforms.uStrength.value = 1;
      });
      card.addEventListener('mouseleave', function () {
        if (window.gsap) gsap.to(mat.uniforms.uStrength, { value: 0, duration: .8, ease: 'power2.in', onComplete: function () { wrap.style.opacity = '0'; }});
        else { mat.uniforms.uStrength.value = 0; wrap.style.opacity = '0'; }
      });
      card.addEventListener('mousemove', function (e) {
        const r = card.getBoundingClientRect();
        mat.uniforms.uMouse.value.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
      });

      attachPause(wrap);
      let t = 0;
      function loop() {
        requestAnimationFrame(loop);
        if (wrap.__fajrPaused) return;
        t += 0.016;
        mat.uniforms.uTime.value = t;
        renderer.render(scene, camera);
      }
      loop();

      instances.push({
        dispose: function () {
          ro.disconnect();
          disposeObject(scene);
          renderer.dispose();
        }
      });
    });

    return {
      dispose: function () { instances.forEach(function (i) { i.dispose(); }); }
    };
  }

  /* =========================================================
   ABOUT — rotating film reel / timeline spool + particle word
   ========================================================= */
  function initAboutReel() {
    if (REDUCED_MOTION || !webglAvailable()) return null;
    const canvas = document.getElementById('three-about-reel');
    const wrap = document.getElementById('three-about-wrap');
    if (!canvas) return null;

    const renderer = makeRenderer(canvas);
    renderer.setClearColor(0x0D2819, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    /* ---- Film reel ---- */
    const reel = new THREE.Group();
    scene.add(reel);

    // Outer rim torus
    const rim1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.08, 16, 64),
      new THREE.MeshStandardMaterial({ color: C_SAGE, metalness: 0.6, roughness: 0.4 })
    );
    reel.add(rim1);
    const rim2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.06, 16, 64),
      new THREE.MeshStandardMaterial({ color: C_SAGE, metalness: 0.6, roughness: 0.4 })
    );
    reel.add(rim2);
    // hub
    const hub = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 32),
      new THREE.MeshStandardMaterial({ color: C_RED, metalness: 0.4, roughness: 0.5 })
    );
    reel.add(hub);
    // spokes
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 2.0, 0.04),
        new THREE.MeshStandardMaterial({ color: C_SAGE, metalness: 0.5, roughness: 0.4 })
      );
      s.rotation.z = (i / 6) * Math.PI * 2;
      reel.add(s);
    }
    // perforations around rim
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.05),
        new THREE.MeshStandardMaterial({ color: C_WHITE, emissive: C_WHITE, emissiveIntensity: 0.2 })
      );
      p.position.set(Math.cos(a) * 1.95, Math.sin(a) * 1.95, 0.05);
      p.rotation.z = a;
      reel.add(p);
    }

    reel.rotation.x = -0.4;

    /* ---- Particle field ---- */
    const N = IS_MOBILE ? 400 : 1000;
    const pos = new Float32Array(N * 3);
    const target = new Float32Array(N * 3);
    // We form a simple "letter" cluster — a stylized فجر (we approximate by
    // placing particles in a vertical stack of 3 blobs resembling letters)
    for (let i = 0; i < N; i++) {
      // random initial
      pos[i * 3 + 0] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
      // target: form 3 vertical blobs (rough glyph stand-ins)
      const col = i % 3;
      const x = (col - 1) * 1.4;
      const y = (Math.random() - 0.5) * 1.6;
      const z = (Math.random() - 0.5) * 0.4;
      target[i * 3 + 0] = x + (Math.random() - 0.5) * 0.4;
      target[i * 3 + 1] = y;
      target[i * 3 + 2] = z;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: C_RED, size: 0.06, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const particles = new THREE.Points(pGeo, pMat);
    particles.position.z = -2;
    scene.add(particles);

    /* ---- Lights ---- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const l1 = new THREE.PointLight(0xC5DCCC, 1.5, 30); l1.position.set(3, 3, 5); scene.add(l1);
    const l2 = new THREE.PointLight(0x861A1A, 1.6, 30); l2.position.set(-3, -2, 4); scene.add(l2);

    function resize() {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', resize);
    resize();

    attachPause(canvas);

    // scroll-driven reel rotation
    let scrollP = 0;
    function updateScroll() {
      const wrapEl = document.getElementById('about-timeline');
      if (!wrapEl) return;
      const r = wrapEl.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const past = Math.max(0, -r.top);
      scrollP = Math.min(1, past / total);
    }
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    // particle formation flag
    let formed = false;
    if (window.ScrollTrigger) {
      ScrollTrigger.create({
        trigger: '#about-vision',
        start: 'top 70%',
        onEnter: function () { formed = true; },
        onLeaveBack: function () { formed = false; }
      });
    }

    let t = 0;
    function loop() {
      requestAnimationFrame(loop);
      if (canvas.__fajrPaused) return;
      t += 0.016;
      reel.rotation.z = t * 0.4 + scrollP * Math.PI * 2;
      reel.position.x = Math.sin(t * 0.3) * 0.2;

      // particles morph
      const p = pGeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const ix = i * 3;
        const tx = formed ? target[ix] : (Math.random() - 0.5) * 12;
        const ty = formed ? target[ix + 1] : (Math.random() - 0.5) * 8;
        const tz = formed ? target[ix + 2] : (Math.random() - 0.5) * 6;
        p[ix] += (tx - p[ix]) * 0.04;
        p[ix + 1] += (ty - p[ix + 1]) * 0.04;
        p[ix + 2] += (tz - p[ix + 2]) * 0.04;
      }
      pGeo.attributes.position.needsUpdate = true;
      particles.rotation.y = t * 0.05;

      renderer.render(scene, camera);
    }
    loop();

    return {
      dispose: function () {
        window.removeEventListener('resize', resize);
        window.removeEventListener('scroll', updateScroll);
        disposeObject(scene);
        renderer.dispose();
      }
    };
  }

  /* =========================================================
   CONTACT — spotlight scene
   ========================================================= */
  function initContactSpotlight() {
    if (REDUCED_MOTION || !webglAvailable()) return null;
    const canvas = document.getElementById('three-contact');
    const wrap = document.getElementById('three-contact-wrap');
    if (!canvas) return null;

    const renderer = makeRenderer(canvas);
    renderer.setClearColor(0x0D2819, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 1.5, 7);
    camera.lookAt(0, 0, 0);

    /* ---- Stage floor ---- */
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({
      color: C_DARK, metalness: 0.1, roughness: 0.85
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.5;
    scene.add(floor);

    /* ---- Stage backdrop ---- */
    const bgGeo = new THREE.PlaneGeometry(20, 10);
    const bgMat = new THREE.MeshStandardMaterial({ color: C_DARK, roughness: 1.0 });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.position.set(0, 3, -6);
    scene.add(bg);

    /* ---- Mannequin silhouette (a stylized human shape from primitives) ---- */
    const mannequin = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: C_DARK, metalness: 0.6, roughness: 0.4 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 32), bodyMat);
    head.position.y = 1.6;
    mannequin.add(head);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.4, 24), bodyMat);
    torso.position.y = 0.7;
    mannequin.add(torso);
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 1.6, 16), bodyMat);
    legs.position.y = -0.8;
    mannequin.add(legs);
    mannequin.position.set(0, -1.5, -1);
    scene.add(mannequin);

    /* ---- Spotlights (cones) ---- */
    function makeSpotlight(color, intensity, x, y, z, tx, ty, tz) {
      const s = new THREE.SpotLight(color, intensity, 20, 0.6, 0.5, 1.5);
      s.position.set(x, y, z);
      s.target.position.set(tx, ty, tz);
      scene.add(s);
      scene.add(s.target);
      // cone visual
      const coneGeo = new THREE.ConeGeometry(0.05, 4, 16, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.08,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(x, y - 1.5, z);
      // orient cone toward target
      cone.lookAt(tx, ty, tz);
      cone.rotateX(Math.PI / 2);
      scene.add(cone);
      return { light: s, cone: cone, mat: coneMat };
    }

    const sp1 = makeSpotlight(0x861A1A, 12, 3, 5, 3, 0, -1, -1);
    const sp2 = makeSpotlight(0xC5DCCC, 8, -3, 5, 3, 0, -1, -1);

    scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    /* ---- Dust in spotlight ---- */
    const D = IS_MOBILE ? 200 : 500;
    const dpos = new Float32Array(D * 3);
    for (let i = 0; i < D; i++) {
      dpos[i * 3 + 0] = (Math.random() - 0.5) * 12;
      dpos[i * 3 + 1] = Math.random() * 5;
      dpos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    const dMat = new THREE.PointsMaterial({
      color: C_SAGE, size: 0.04, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const dPts = new THREE.Points(dGeo, dMat);
    scene.add(dPts);

    function resize() {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', resize);
    resize();

    attachPause(canvas);

    // spotlight follows mouse; shifts toward focused form field
    let mx = 0, my = 0, tx = 0, ty = 0;
    window.addEventListener('mousemove', function (e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 6;
      my = -(e.clientY / window.innerHeight - 0.5) * 3;
    });
    document.querySelectorAll('#fajr-contact-form input, #fajr-contact-form textarea, #fajr-contact-form select').forEach(function (f) {
      f.addEventListener('focus', function () {
        const r = f.getBoundingClientRect();
        tx = (r.left + r.width / 2 - window.innerWidth / 2) / window.innerWidth * 6;
        ty = -(r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight * 3;
      });
      f.addEventListener('blur', function () { tx = 0; ty = 0; });
    });

    let t = 0;
    function loop() {
      requestAnimationFrame(loop);
      if (canvas.__fajrPaused) return;
      t += 0.016;
      // smoothing
      const targetX = mx + tx;
      const targetY = my + ty;
      sp1.light.target.position.x += (targetX - sp1.light.target.position.x) * 0.05;
      sp1.light.target.position.y += (targetY - sp1.light.target.position.y) * 0.05;
      sp2.light.target.position.x += (-targetX - sp2.light.target.position.x) * 0.05;
      sp2.light.target.position.y += (targetY - sp2.light.target.position.y) * 0.05;
      // subtle flicker
      sp1.light.intensity = 12 + Math.sin(t * 8) * 0.4;
      sp2.light.intensity = 8 + Math.cos(t * 7) * 0.3;

      // dust drift
      const p = dGeo.attributes.position.array;
      for (let i = 0; i < D; i++) {
        p[i * 3 + 1] -= 0.005;
        if (p[i * 3 + 1] < -1.5) p[i * 3 + 1] = 5;
      }
      dGeo.attributes.position.needsUpdate = true;

      // mannequin subtle sway
      mannequin.rotation.y = Math.sin(t * 0.4) * 0.1;

      renderer.render(scene, camera);
    }
    loop();

    return {
      dispose: function () {
        window.removeEventListener('resize', resize);
        disposeObject(scene);
        renderer.dispose();
      }
    };
  }

  /* =========================================================
   Service mini-3D motifs — single shared canvas approach would be
   heavy; instead we provide a single function that, given a card,
   applies CSS+SVG animations driven by animations.js. Here we only
   expose helpers for the few WebGL-driven ones.
   ========================================================= */

  /* Expose */
  window.FajrThree = {
    initGlobalDust: initGlobalDust,
    initHeroLens: initHeroLens,
    initPortfolioRipples: initPortfolioRipples,
    initAboutReel: initAboutReel,
    initContactSpotlight: initContactSpotlight,
    webglAvailable: webglAvailable,
    REDUCED_MOTION: REDUCED_MOTION,
    IS_TOUCH: IS_TOUCH,
    IS_MOBILE: IS_MOBILE,
    palette: { RED: 0x861A1A, DARK: 0x0D2819, SAGE: 0xC5DCCC, WHITE: 0xFFFFFF }
  };
})();
