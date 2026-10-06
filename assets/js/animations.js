/* =========================================================
   FAJR FILM — animations.js
   All GSAP + ScrollTrigger timelines organized by page/section.
   Includes:
   - Service card hover (mini-3D motifs via CSS/SVG + GSAP)
   - Process pinned horizontal scroll (RTL)
   - About teaser pinned image mask expansion
   - Team card grayscale-to-color
   - Clients marquee (handled in main.js as data-marquee)
   - Footer wordmark reveal
   - Section pinning, parallax, text reveals
   ========================================================= */

(function () {
  'use strict';

  if (!window.gsap) {
    console.warn('[FajrFilm] GSAP not loaded; skipping animations.');
    return;
  }
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(Flip);

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Service card mini motifs ---------- */
  // Each motif uses CSS/DOM/SVG; here we animate them on hover via GSAP.
  function initServiceMotifs() {
    const cards = document.querySelectorAll('[data-service-motif]');
    cards.forEach(function (card) {
      const type = card.dataset.serviceMotif;
      const motif = card.querySelector('.motif');
      if (!motif) return;
      let tl;
      card.addEventListener('mouseenter', function () {
        if (REDUCED_MOTION) return;
        switch (type) {
          case 'photography':
            tl = gsap.timeline();
            tl.to(motif.querySelector('.lens-ring'), { rotate: 360, duration: 2.4, ease: 'power2.inOut' });
            tl.to(motif.querySelector('.flash'), { opacity: 1, duration: .12, ease: 'power2.out' }, 0);
            tl.to(motif.querySelector('.flash'), { opacity: 0, duration: .4, ease: 'power2.in' });
            break;
          case 'voice':
            tl = gsap.timeline();
            motif.querySelectorAll('.bar').forEach(function (b, i) {
              tl.to(b, { scaleY: 0.2 + Math.random() * 0.8, duration: .25, ease: 'sine.inOut', repeat: -1, yoyo: true }, i * 0.04);
            });
            break;
          case 'music':
            tl = gsap.timeline();
            motif.querySelectorAll('.note').forEach(function (n, i) {
              tl.to(n, { y: -22, rotate: Math.sin(i) * 20, opacity: 0, duration: 1.6, ease: 'power1.out', repeat: -1, repeatDelay: .2 }, i * 0.2);
              tl.to(n, { opacity: 1, duration: .3, ease: 'power2.out' }, i * 0.2);
            });
            motif.querySelectorAll('.eq-bar').forEach(function (b, i) {
              tl.to(b, { scaleY: 0.3 + Math.random() * 0.7, duration: .4, ease: 'sine.inOut', repeat: -1, yoyo: true }, i * 0.05);
            });
            break;
          case 'web':
            tl = gsap.timeline();
            motif.querySelectorAll('.ui-block').forEach(function (b, i) {
              tl.fromTo(b, { opacity: 0.2, scaleX: 0.6 }, { opacity: 1, scaleX: 1, duration: .8, ease: 'power2.out', repeat: -1, yoyo: true, repeatDelay: .1 }, i * 0.1);
            });
            tl.to(motif.querySelector('.cursor-blink'), { opacity: 0, duration: .4, ease: 'steps(1)', repeat: -1, yoyo: true }, 0);
            break;
          case 'social':
            tl = gsap.timeline();
            motif.querySelectorAll('.node').forEach(function (n, i) {
              tl.to(n, { scale: 1.4, opacity: 1, duration: .5, ease: 'power2.out', repeat: -1, yoyo: true, repeatDelay: .1 }, i * 0.15);
            });
            break;
          case 'shortfilm':
            tl = gsap.timeline();
            tl.to(motif.querySelector('.clapper-top'), { rotate: -25, transformOrigin: 'right bottom', duration: .12, ease: 'power2.in' });
            tl.to(motif.querySelector('.clapper-top'), { rotate: 0, duration: .08, ease: 'power2.out' });
            tl.to(motif, { x: 2, duration: .05, ease: 'power1.inOut' }, '<');
            break;
          case 'television':
            tl = gsap.timeline();
            tl.to(motif.querySelector('.scanline'), { y: 80, duration: 1.2, ease: 'none', repeat: -1 }, 0);
            tl.to(motif.querySelector('.static'), { opacity: 0.3, duration: .1, ease: 'steps(1)', repeat: -1, yoyo: true }, 0);
            break;
          case 'documentary':
            tl = gsap.timeline();
            tl.to(motif.querySelector('.reel'), { rotate: 360, duration: 4, ease: 'none', repeat: -1 }, 0);
            break;
          case 'costume':
            tl = gsap.timeline();
            tl.to(motif.querySelector('.cone-l'), { rotation: -8, transformOrigin: 'top center', duration: 1.2, ease: 'sine.inOut', repeat: -1, yoyo: true }, 0);
            tl.to(motif.querySelector('.cone-r'), { rotation: 8, transformOrigin: 'top center', duration: 1.2, ease: 'sine.inOut', repeat: -1, yoyo: true }, 0);
            break;
        }
      });
      card.addEventListener('mouseleave', function () {
        if (tl) tl.kill();
        gsap.set(motif.querySelectorAll('.bar, .note, .eq-bar, .ui-block, .node, .reel, .cone-l, .cone-r, .clapper-top, .scanline, .static, .lens-ring, .flash'), { clearProps: 'all' });
      });
    });
  }

  /* ---------- Service card Flip expand on click ---------- */
  function initServiceExpand() {
    const cards = document.querySelectorAll('[data-service-expand]');
    cards.forEach(function (card) {
      const full = card.querySelector('.service-full');
      if (!full) return;
      let open = false;
      card.addEventListener('click', function (e) {
        if (e.target.closest('a, button')) return;
        const state = window.Flip ? Flip.getState(card) : null;
        open = !open;
        card.classList.toggle('expanded', open);
        if (open) {
          if (window.gsap) {
            gsap.set(full, { display: 'block', height: 0, opacity: 0 });
            gsap.to(full, { height: 'auto', opacity: 1, duration: .6, ease: 'expo.out' });
          } else { full.style.display = 'block'; }
        } else {
          if (window.gsap) {
            gsap.to(full, { height: 0, opacity: 0, duration: .4, ease: 'power2.in', onComplete: function () { full.style.display = 'none'; }});
          } else { full.style.display = 'none'; }
        }
      });
    });
  }

  /* ---------- Process: pinned horizontal scroll (RTL) ---------- */
  function initProcessHorizontal() {
    const section = document.getElementById('process');
    if (!section) return;
    const track = section.querySelector('[data-horizontal-track]');
    if (!track) return;
    if (REDUCED_MOTION) return;

    const isDesktop = window.innerWidth >= 1024;
    if (!isDesktop) return; // mobile keeps vertical layout

    const stages = track.querySelectorAll('[data-stage]');
    const line = section.querySelector('.process-line');

    const total = track.scrollWidth - window.innerWidth;

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=' + total,
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        const x = -self.progress * total; // LTR horizontal; for RTL we negate
        // For RTL, we want the track to come from the right, so progress moves us to the left.
        // Since the track is inside an RTL container, setting x negative scrolls visually left.
        gsap.set(track, { x: x });
        // line draw
        if (line) line.style.strokeDashoffset = (1 - self.progress) * (line.getTotalLength ? line.getTotalLength() : 1000);
        // stage activation
        stages.forEach(function (s, i) {
          const r = s.getBoundingClientRect();
          const visible = r.left < window.innerWidth * 0.7 && r.right > window.innerWidth * 0.3;
          s.classList.toggle('active', visible);
        });
      }
    });

    window.addEventListener('resize', function () {
      st.scroll(window.scrollY);
      ScrollTrigger.refresh();
    });
  }

  /* ---------- About teaser pinned image mask ---------- */
  function initAboutTeaserPin() {
    const section = document.getElementById('about-teaser');
    if (!section) return;
    const img = section.querySelector('[data-mask-image]');
    const lines = section.querySelectorAll('[data-story-line]');
    if (!img || !lines.length) return;
    if (REDUCED_MOTION) return;

    // pin and reveal
    gsap.to(img, {
      clipPath: 'inset(0% 0% 0% 0%)',
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=120%',
        scrub: true,
        pin: true,
      }
    });
    // start hidden
    gsap.set(img, { clipPath: 'inset(0% 50% 0% 50%)' });
    gsap.set(lines, { yPercent: 110 });
    lines.forEach(function (l, i) {
      gsap.to(l, {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=120%',
          scrub: true,
        },
        delay: i * 0.05
      });
    });
  }

  /* ---------- Team card grayscale-to-color ---------- */
  function initTeamCards() {
    const cards = document.querySelectorAll('[data-team-card]');
    cards.forEach(function (c) {
      const img = c.querySelector('img');
      if (!img) return;
      gsap.set(img, { filter: 'grayscale(100%)' });
      c.addEventListener('mouseenter', function () {
        gsap.to(img, { filter: 'grayscale(0%)', duration: .8, ease: 'power2.out' });
      });
      c.addEventListener('mouseleave', function () {
        gsap.to(img, { filter: 'grayscale(100%)', duration: .8, ease: 'power2.in' });
      });
    });
    if (!REDUCED_MOTION && window.ScrollTrigger) {
      gsap.fromTo(cards,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: .8, ease: 'expo.out', stagger: .1,
          scrollTrigger: { trigger: '[data-team-grid]', start: 'top 75%' }
        });
    }
  }

  /* ---------- Clients infinite logo marquee (already in main.js, but ensure pause) ---------- */
  // handled by main.js initMarquees; no extra work needed.

  /* ---------- Footer wordmark reveal ---------- */
  function initFooterWordmark() {
    const w = document.querySelector('[data-footer-wordmark]');
    if (!w) return;
    if (REDUCED_MOTION) return;
    // split into letters
    const text = w.textContent.trim();
    w.setAttribute('aria-label', text);
    w.textContent = '';
    const inner = document.createElement('span');
    inner.className = 'inline-block reveal-line';
    const wrap = document.createElement('span');
    wrap.className = 'inline-block inner';
    text.split('').forEach(function (ch) {
      const s = document.createElement('span');
      s.className = 'split-letter inline-block';
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      wrap.appendChild(s);
    });
    inner.appendChild(wrap);
    w.appendChild(inner);
    gsap.set(w.querySelectorAll('.split-letter'), { yPercent: 110 });
    gsap.to(w.querySelectorAll('.split-letter'), {
      yPercent: 0,
      duration: 1,
      ease: 'expo.out',
      stagger: 0.05,
      scrollTrigger: { trigger: w, start: 'top 90%' }
    });
  }

  /* ---------- Section dividers draw line ---------- */
  function initDrawLines() {
    document.querySelectorAll('[data-draw-line]').forEach(function (svg) {
      const path = svg.querySelector('path, line');
      if (!path) return;
      const len = path.getTotalLength ? path.getTotalLength() : 1000;
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      gsap.to(path, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: svg.closest('section') || svg,
          start: 'top 75%',
          end: 'bottom 50%',
          scrub: true
        }
      });
    });
  }

  /* ---------- Generic stagger reveal for cards ---------- */
  function initStaggerReveal() {
    const groups = document.querySelectorAll('[data-stagger-group]');
    groups.forEach(function (g) {
      const items = g.querySelectorAll('[data-stagger-item]');
      if (!items.length) return;
      gsap.fromTo(items,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: .9, ease: 'expo.out',
          stagger: parseFloat(g.dataset.staggerDelay || '0.08'),
          scrollTrigger: { trigger: g, start: 'top 80%', once: true }
        });
    });
  }

  /* ---------- Blog cards arrow animation (RTL) ---------- */
  function initBlogCards() {
    document.querySelectorAll('[data-blog-card]').forEach(function (c) {
      const arrow = c.querySelector('[data-arrow]');
      c.addEventListener('mouseenter', function () {
        if (arrow) gsap.to(arrow, { x: -8, duration: .4, ease: 'power2.out' });
      });
      c.addEventListener('mouseleave', function () {
        if (arrow) gsap.to(arrow, { x: 0, duration: .5, ease: 'power2.out' });
      });
    });
  }

  /* ---------- Stats strip fade ---------- */
  function initStatsStrip() {
    const strip = document.querySelector('[data-stats-strip]');
    if (!strip) return;
    if (REDUCED_MOTION) return;
    gsap.fromTo(strip.querySelectorAll('[data-stat-item]'),
      { y: 30, opacity: 0 },
      {
        y: 0, opacity: 1, duration: .8, ease: 'expo.out', stagger: .1,
        scrollTrigger: { trigger: strip, start: 'top 80%' }
      });
  }

  /* ---------- Hero scroll cue ---------- */
  function initHeroCue() {
    const cue = document.querySelector('[data-hero-cue]');
    if (!cue) return;
    if (REDUCED_MOTION) return;
    gsap.to(cue, { y: 8, duration: 1, ease: 'sine.inOut', repeat: -1, yoyo: true });
  }

  /* ---------- Awards strip ---------- */
  function initAwardsStrip() {
    const strip = document.querySelector('[data-awards-strip]');
    if (!strip) return;
    if (REDUCED_MOTION) return;
    gsap.fromTo(strip.querySelectorAll('[data-award]'),
      { y: 40, opacity: 0 },
      {
        y: 0, opacity: 1, duration: .8, ease: 'expo.out', stagger: .08,
        scrollTrigger: { trigger: strip, start: 'top 80%' }
      });
  }

  /* ---------- Page-specific entrypoint ---------- */
  // Each page sets window.FajrPageInit = animations.initHome (or about/contact)
  const FajrAnimations = {
    initServiceMotifs: initServiceMotifs,
    initServiceExpand: initServiceExpand,
    initProcessHorizontal: initProcessHorizontal,
    initAboutTeaserPin: initAboutTeaserPin,
    initTeamCards: initTeamCards,
    initFooterWordmark: initFooterWordmark,
    initDrawLines: initDrawLines,
    initStaggerReveal: initStaggerReveal,
    initBlogCards: initBlogCards,
    initStatsStrip: initStatsStrip,
    initHeroCue: initHeroCue,
    initAwardsStrip: initAwardsStrip,

    initHome: function () {
      // Three.js scenes
      if (window.FajrThree) {
        window.FajrThree.initGlobalDust();
        window.FajrThree.initHeroLens();
        window.FajrThree.initPortfolioRipples();
      }
      initServiceMotifs();
      initServiceExpand();
      initProcessHorizontal();
      initAboutTeaserPin();
      initTeamCards();
      initFooterWordmark();
      initDrawLines();
      initStaggerReveal();
      initBlogCards();
      initStatsStrip();
      initHeroCue();
      ScrollTrigger.refresh();
    },

    initAbout: function () {
      if (window.FajrThree) {
        window.FajrThree.initGlobalDust();
        window.FajrThree.initAboutReel();
      }
      initFooterWordmark();
      initDrawLines();
      initStaggerReveal();
      initTeamCards();
      initStatsStrip();
      initAwardsStrip();
      ScrollTrigger.refresh();
    },

    initContact: function () {
      if (window.FajrThree) {
        window.FajrThree.initGlobalDust();
        window.FajrThree.initContactSpotlight();
      }
      initFooterWordmark();
      initDrawLines();
      initStaggerReveal();
      ScrollTrigger.refresh();
    }
  };

  window.FajrAnimations = FajrAnimations;
})();
