/* =========================================================
   FAJR FILM — main.js
   Shared across all pages:
   - Preloader (film leader)
   - Page transitions (film gate)
   - Custom cursor (viewfinder + labels)
   - Navbar (glass on scroll, hide on down/show on up, mobile menu)
   - Smooth scroll (Lenis synced with ScrollTrigger)
   - Magnetic buttons
   - Scroll progress bar
   - Text reveal splitter helper
   - Number counters
   - Marquee with scroll velocity
   - Film grain already CSS-driven; nothing to do here
   - Clean global API: window.FajrMain
   ========================================================= */

(function () {
  'use strict';

  /* ----------------- Constants ----------------- */
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IS_TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ----------------- Persian digit helper ----------------- */
  function faDigits(input) {
    return String(input).replace(/\d/g, function (d) {
      return '۰۱۲۳۴۵۶۷۸۹'[+d];
    });
  }
  function faNum(n) {
    try { return Number(n).toLocaleString('fa-IR'); }
    catch (e) { return faDigits(n); }
  }

  /* ----------------- Custom text splitter ----------------- */
  // Splits an element's text into lines (wrapped in .reveal-line > .inner)
  // and optionally into words/letters for finer reveals.
  function splitText(el, opts) {
    opts = opts || {};
    const mode = opts.mode || 'lines'; // 'lines' | 'words' | 'letters'
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';

    if (mode === 'letters') {
      const wrap = document.createElement('span');
      wrap.className = 'reveal-line';
      const inner = document.createElement('span');
      inner.className = 'inner';
      text.split('').forEach(function (ch) {
        if (ch === ' ') {
          inner.appendChild(document.createTextNode(' '));
        } else {
          const span = document.createElement('span');
          span.className = 'split-letter';
          span.textContent = ch;
          inner.appendChild(span);
        }
      });
      wrap.appendChild(inner);
      el.appendChild(wrap);
      return el.querySelectorAll('.split-letter');
    }

    if (mode === 'words') {
      const wrap = document.createElement('span');
      wrap.className = 'reveal-line';
      const inner = document.createElement('span');
      inner.className = 'inner';
      text.split(' ').forEach(function (w, i, arr) {
        const wordSpan = document.createElement('span');
        wordSpan.style.display = 'inline-block';
        wordSpan.textContent = w;
        inner.appendChild(wordSpan);
        if (i < arr.length - 1) inner.appendChild(document.createTextNode(' '));
      });
      wrap.appendChild(inner);
      el.appendChild(wrap);
      return el.querySelectorAll('.inner > span');
    }

    // lines mode
    // We approximate by splitting on a delimiter; for headings we treat each
    // existing <br> as a line break. If none, split on long-text boundaries.
    const rawLines = el.dataset.lines
      ? el.dataset.lines.split('|')
      : [text];
    rawLines.forEach(function (lineText) {
      const wrap = document.createElement('span');
      wrap.className = 'reveal-line';
      const inner = document.createElement('span');
      inner.className = 'inner';
      inner.textContent = lineText;
      wrap.appendChild(inner);
      el.appendChild(wrap);
      // space between lines
      el.appendChild(document.createTextNode(' '));
    });
    return el.querySelectorAll('.reveal-line .inner');
  }

  /* ----------------- Preloader ----------------- */
  function initPreloader(done) {
    const preloader = document.getElementById('fajr-preloader');
    if (!preloader) { done && done(); return; }

    // If reduced motion, skip animation
    if (REDUCED_MOTION) {
      preloader.style.display = 'none';
      done && done();
      return;
    }

    const countEl = preloader.querySelector('.preloader-count');
    const ring = preloader.querySelector('.preloader-ring');
    let n = 3;
    countEl.textContent = faDigits(n);

    const tick = setInterval(function () {
      n--;
      if (n < 0) {
        clearInterval(tick);
        // shutter wipe reveal
        const shutter = document.createElement('div');
        shutter.className = 'preloader-shutter';
        shutter.innerHTML = '<div class="panel top"></div><div class="panel bottom"></div>';
        document.body.appendChild(shutter);

        // animate the panels away (top -> up, bottom -> down)
        // Use GSAP if available, otherwise CSS transition
        if (window.gsap) {
          gsap.to(shutter.querySelector('.top'), { y: '-100%', duration: .9, ease: 'expo.inOut' });
          gsap.to(shutter.querySelector('.bottom'), {
            y: '100%', duration: .9, ease: 'expo.inOut',
            onComplete: function () {
              shutter.remove();
              preloader.style.display = 'none';
              done && done();
            }
          });
          gsap.to(preloader, { opacity: 0, duration: .4, ease: 'power2.out' });
        } else {
          shutter.querySelector('.top').style.transition = 'transform .9s cubic-bezier(.7,0,.2,1)';
          shutter.querySelector('.bottom').style.transition = 'transform .9s cubic-bezier(.7,0,.2,1)';
          requestAnimationFrame(function () {
            shutter.querySelector('.top').style.transform = 'translateY(-100%)';
            shutter.querySelector('.bottom').style.transform = 'translateY(100%)';
          });
          setTimeout(function () {
            shutter.remove();
            preloader.style.display = 'none';
            done && done();
          }, 950);
        }
        return;
      }
      countEl.textContent = faDigits(n);
    }, 600);
  }

  /* ----------------- Custom cursor ----------------- */
  function initCursor() {
    if (IS_TOUCH) return;
    const dot = document.querySelector('.fajr-cursor-dot');
    const ring = document.querySelector('.fajr-cursor-ring');
    if (!dot || !ring) return;

    document.body.classList.add('cursor-ready');

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
    });

    function raf() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(raf);
    }
    raf();

    // hover states
    document.addEventListener('mouseover', function (e) {
      const t = e.target;
      const link = t.closest('a, button, .nav-link, [data-cursor="link"]');
      const view = t.closest('[data-cursor="view"]');
      const drag = t.closest('[data-cursor="drag"]');

      ring.classList.remove('hover-link', 'hover-view', 'hover-drag');
      ring.removeAttribute('data-label');

      if (view) {
        ring.classList.add('hover-view');
        ring.setAttribute('data-label', view.getAttribute('data-cursor-label') || 'مشاهده');
      } else if (drag) {
        ring.classList.add('hover-drag');
        ring.setAttribute('data-label', drag.getAttribute('data-cursor-label') || 'بکش');
      } else if (link) {
        ring.classList.add('hover-link');
      }
    });
  }

  /* ----------------- Navbar ----------------- */
  function initNavbar() {
    const navbar = document.getElementById('fajr-navbar');
    if (!navbar) return;

    let lastY = window.scrollY;
    let ticking = false;

    function update() {
      const y = window.scrollY;
      // glass on scroll
      if (y > 40) navbar.classList.add('navbar-glass');
      else navbar.classList.remove('navbar-glass');

      // hide on down, show on up (after a small threshold)
      if (!navbar.classList.contains('menu-open')) {
        if (y > 200 && y > lastY + 5) {
          navbar.classList.add('navbar-hidden');
        } else if (y < lastY - 5) {
          navbar.classList.remove('navbar-hidden');
        }
      }
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  /* ----------------- Mobile menu ----------------- */
  function initMobileMenu() {
    const burger = document.getElementById('fajr-burger');
    const menu = document.getElementById('fajr-mobile-menu');
    const navbar = document.getElementById('fajr-navbar');
    if (!burger || !menu) return;

    const links = menu.querySelectorAll('[data-stagger]');

    function open() {
      menu.classList.remove('hidden');
      menu.classList.add('flex');
      navbar.classList.add('menu-open');
      burger.classList.add('open');
      document.body.classList.add('locked');
      // stagger reveal
      if (window.gsap) {
        gsap.fromTo(links,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, stagger: .08, duration: .6, ease: 'power3.out', delay: .1 }
        );
      }
    }
    function close() {
      if (window.gsap) {
        gsap.to(links, {
          y: -20, opacity: 0, stagger: .04, duration: .3, ease: 'power2.in',
          onComplete: function () {
            menu.classList.add('hidden');
            menu.classList.remove('flex');
            navbar.classList.remove('menu-open');
            burger.classList.remove('open');
            document.body.classList.remove('locked');
          }
        });
      } else {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
        navbar.classList.remove('menu-open');
        burger.classList.remove('open');
        document.body.classList.remove('locked');
      }
    }

    burger.addEventListener('click', function () {
      if (menu.classList.contains('hidden')) open(); else close();
    });
    links.forEach(function (l) { l.addEventListener('click', close); });
  }

  /* ----------------- Smooth scroll (Lenis) ----------------- */
  function initSmoothScroll() {
    if (REDUCED_MOTION) return;
    if (!window.Lenis) return;
    const lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      smoothTouch: false,
    });
    window.__fajrLenis = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync with ScrollTrigger
    if (window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // internal anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        const id = a.getAttribute('href');
        if (id.length > 1) {
          const target = document.querySelector(id);
          if (target) {
            e.preventDefault();
            lenis.scrollTo(target, { offset: -80 });
          }
        }
      });
    });

    // back to top
    const backTop = document.getElementById('back-to-top');
    if (backTop) {
      backTop.addEventListener('click', function () {
        lenis.scrollTo(0);
      });
    }
  }

  /* ----------------- Magnetic buttons ----------------- */
  function initMagnetic() {
    if (IS_TOUCH) return;
    const magnets = document.querySelectorAll('.magnetic');
    magnets.forEach(function (m) {
      const strength = parseFloat(m.dataset.magnetic || '0.35');
      m.addEventListener('mousemove', function (e) {
        const r = m.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        if (window.gsap) {
          gsap.to(m, { x: x * strength, y: y * strength, duration: .5, ease: 'power3.out' });
          const inner = m.querySelector('.magnetic-inner');
          if (inner) gsap.to(inner, { x: x * strength * 0.4, y: y * strength * 0.4, duration: .5, ease: 'power3.out' });
        }
      });
      m.addEventListener('mouseleave', function () {
        if (window.gsap) {
          gsap.to(m, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1, .4)' });
          const inner = m.querySelector('.magnetic-inner');
          if (inner) gsap.to(inner, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1, .4)' });
        }
      });
    });
  }

  /* ----------------- Scroll progress bar ----------------- */
  function initScrollProgress() {
    const bar = document.querySelector('#fajr-scroll-progress .bar');
    if (!bar) return;
    function update() {
      const h = document.documentElement;
      const max = h.scrollHeight - window.innerHeight;
      const p = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = p + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ----------------- Number counters ----------------- */
  function initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;
    if (!window.ScrollTrigger) {
      counters.forEach(function (c) {
        const target = parseInt(c.dataset.counter, 10);
        c.textContent = faNum(target);
      });
      return;
    }
    counters.forEach(function (c) {
      const target = parseInt(c.dataset.counter, 10);
      const suffix = c.dataset.suffix || '';
      ScrollTrigger.create({
        trigger: c,
        start: 'top 85%',
        once: true,
        onEnter: function () {
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target,
            duration: 2,
            ease: 'power2.out',
            onUpdate: function () {
              c.textContent = faNum(Math.round(obj.v)) + suffix;
            }
          });
        }
      });
    });
  }

  /* ----------------- Marquee with scroll velocity ----------------- */
  function initMarquees() {
    const marquees = document.querySelectorAll('[data-marquee]');
    if (!marquees.length) return;
    marquees.forEach(function (m) {
      const track = m.querySelector('.marquee-track');
      if (!track) return;
      const dir = m.dataset.direction === 'rtl' ? -1 : 1;
      const speed = parseFloat(m.dataset.speed || '40');
      // duplicate content for seamless
      track.innerHTML += track.innerHTML;
      let x = 0;
      let velocity = 0;
      let baseV = speed * dir;

      // Scroll velocity
      if (window.ScrollTrigger) {
        let lastY = window.scrollY;
        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: function (self) {
            const dy = window.scrollY - lastY;
            lastY = window.scrollY;
            velocity = dy * 0.5;
          }
        });
      }

      // hover slow down
      let hoverFactor = 1;
      m.addEventListener('mouseenter', function () { hoverFactor = 0.2; });
      m.addEventListener('mouseleave', function () { hoverFactor = 1; });

      const w = track.scrollWidth / 2;
      function tick() {
        x -= (baseV + velocity) * hoverFactor * 0.016;
        velocity *= 0.9;
        if (dir > 0) {
          if (x <= -w) x += w;
          if (x > 0) x -= w;
        } else {
          if (x >= 0) x -= w;
          if (x < -w) x += w;
        }
        track.style.transform = 'translate3d(' + x + 'px,0,0)';
        requestAnimationFrame(tick);
      }
      tick();
    });
  }

  /* ----------------- Page transitions ----------------- */
  function initPageTransitions() {
    const gate = document.getElementById('fajr-page-transition');
    if (!gate) return;
    // create gates if not present
    if (!gate.children.length) {
      for (let i = 0; i < 6; i++) {
        const g = document.createElement('div');
        g.className = 'gate';
        gate.appendChild(g);
      }
    }

    // intercept internal links
    document.addEventListener('click', function (e) {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      // only same-origin, .html, no target=_blank, no hash-only
      if (a.target === '_blank') return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (href.startsWith('http')) {
        try {
          const u = new URL(href, location.href);
          if (u.origin !== location.origin) return;
        } catch (err) { return; }
      }
      // skip if modifier keys
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      e.preventDefault();
      animateOut(function () {
        window.location.href = href;
      });
    });

    // play intro
    animateIn();

    function animateIn() {
      const gates = gate.querySelectorAll('.gate');
      if (window.gsap) {
        gsap.set(gates, { scaleY: 1, transformOrigin: 'top' });
        gsap.to(gates, {
          scaleY: 0,
          transformOrigin: 'top',
          duration: .8,
          stagger: { each: .05, from: 'start' },
          ease: 'expo.inOut',
          onComplete: function () { gate.style.pointerEvents = 'none'; }
        });
      }
    }
    function animateOut(cb) {
      gate.style.pointerEvents = 'auto';
      const gates = gate.querySelectorAll('.gate');
      if (window.gsap) {
        gsap.set(gates, { scaleY: 0, transformOrigin: 'bottom' });
        gsap.to(gates, {
          scaleY: 1,
          transformOrigin: 'bottom',
          duration: .6,
          stagger: { each: .04, from: 'start' },
          ease: 'expo.inOut',
          onComplete: cb
        });
      } else {
        cb && cb();
      }
    }

    window.addEventListener('pageshow', function (e) {
      if (e.persisted) animateIn();
    });
  }

  /* ----------------- Parallax helper (data-speed) ----------------- */
  function initParallax() {
    if (REDUCED_MOTION) return;
    const els = document.querySelectorAll('[data-speed]');
    if (!els.length) return;
    if (!window.ScrollTrigger || !window.gsap) return;
    els.forEach(function (el) {
      const speed = parseFloat(el.dataset.speed || '0.5');
      gsap.to(el, {
        yPercent: speed * 30,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  }

  /* ----------------- Reveal helper ----------------- */
  // Auto-split and reveal any element with [data-reveal="lines|words|letters"]
  function initReveals() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    if (!window.gsap) {
      els.forEach(function (el) { el.style.opacity = 1; });
      return;
    }
    els.forEach(function (el) {
      const mode = el.dataset.reveal || 'lines';
      const targets = splitText(el, { mode: mode });
      gsap.set(targets, { yPercent: 110 });
      const st = {
        trigger: el,
        start: el.dataset.revealStart || 'top 80%',
        once: true,
      };
      if (el.dataset.revealScrub === 'true') {
        st.scrub = true;
        st.end = 'bottom 60%';
        gsap.to(targets, { yPercent: 0, ease: 'none', scrollTrigger: st });
      } else {
        gsap.to(targets, {
          yPercent: 0,
          duration: 1.1,
          ease: 'expo.out',
          stagger: el.dataset.revealStagger ? parseFloat(el.dataset.revealStagger) : 0.05,
          scrollTrigger: st
        });
      }
    });
  }

  /* ----------------- Service card 3D tilt ----------------- */
  function initServiceTilt() {
    if (IS_TOUCH) return;
    const cards = document.querySelectorAll('.service-card');
    cards.forEach(function (card) {
      const max = 8;
      card.addEventListener('mousemove', function (e) {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        if (window.gsap) {
          gsap.to(card, {
            rotateY: px * max * 2,
            rotateX: -py * max * 2,
            duration: .6,
            ease: 'power2.out',
            transformPerspective: 800
          });
        }
      });
      card.addEventListener('mouseleave', function () {
        if (window.gsap) {
          gsap.to(card, { rotateY: 0, rotateX: 0, duration: .9, ease: 'elastic.out(1,.4)' });
        }
      });
    });
  }

  /* ----------------- FAQ accordion ----------------- */
  function initAccordion() {
    const items = document.querySelectorAll('[data-accordion-item]');
    if (!items.length) return;
    items.forEach(function (item) {
      const head = item.querySelector('[data-accordion-head]');
      const body = item.querySelector('[data-accordion-body]');
      if (!head || !body) return;
      // init height 0
      if (window.gsap) gsap.set(body, { height: 0, opacity: 0, overflow: 'hidden' });
      head.setAttribute('tabindex', '0');
      head.setAttribute('role', 'button');
      head.setAttribute('aria-expanded', 'false');
      function toggle() {
        const open = item.classList.toggle('open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (window.gsap) {
          if (open) {
            gsap.to(body, { height: 'auto', opacity: 1, duration: .55, ease: 'power2.out' });
          } else {
            gsap.to(body, { height: 0, opacity: 0, duration: .45, ease: 'power2.in' });
          }
        } else {
          body.style.height = open ? 'auto' : '0';
          body.style.opacity = open ? '1' : '0';
          body.style.overflow = 'hidden';
        }
      }
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  /* ----------------- Portfolio filter (Flip) ----------------- */
  function initPortfolioFilter() {
    const filterBar = document.querySelector('[data-filter-bar]');
    if (!filterBar) return;
    const grid = document.querySelector(filterBar.dataset.target);
    if (!grid) return;
    const items = grid.querySelectorAll('[data-category]');

    filterBar.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const f = btn.dataset.filter;
        filterBar.querySelectorAll('[data-filter]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        const state = window.Flip && window.Flip.getState ? Flip.getState(items) : null;
        items.forEach(function (it) {
          const show = (f === 'all' || it.dataset.category === f);
          it.style.display = show ? '' : 'none';
        });
        if (state && window.Flip) {
          Flip.from(state, { duration: .6, ease: 'power2.inOut', absolute: true, stagger: .04 });
        } else if (window.gsap) {
          gsap.fromTo(items, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .4, stagger: .03 });
        }
      });
    });
  }

  /* ----------------- Portfolio lightbox ----------------- */
  function initLightbox() {
    const triggers = document.querySelectorAll('[data-lightbox-trigger]');
    const modal = document.getElementById('fajr-lightbox');
    if (!triggers.length || !modal) return;
    const img = modal.querySelector('[data-lightbox-img]');
    const title = modal.querySelector('[data-lightbox-title]');
    const cat = modal.querySelector('[data-lightbox-cat]');
    const close = modal.querySelector('[data-lightbox-close]');

    triggers.forEach(function (t) {
      t.addEventListener('click', function () {
        img.src = t.dataset.lightboxImg || '';
        img.alt = t.dataset.lightboxTitle || '';
        if (title) title.textContent = t.dataset.lightboxTitle || '';
        if (cat) cat.textContent = t.dataset.lightboxCat || '';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.classList.add('locked');
        if (window.gsap) {
          gsap.fromTo(modal.querySelector('.lb-inner'),
            { scale: .92, opacity: 0 },
            { scale: 1, opacity: 1, duration: .6, ease: 'expo.out' });
        }
      });
    });
    function closeFn() {
      if (window.gsap) {
        gsap.to(modal.querySelector('.lb-inner'),
          { scale: .92, opacity: 0, duration: .35, ease: 'power2.in',
            onComplete: function () {
              modal.classList.add('hidden');
              modal.classList.remove('flex');
              document.body.classList.remove('locked');
            }});
      } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.classList.remove('locked');
      }
    }
    close && close.addEventListener('click', closeFn);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeFn();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeFn();
    });
  }

  /* ----------------- Testimonials slider ----------------- */
  function initTestimonials() {
    const root = document.querySelector('[data-testimonials]');
    if (!root) return;
    const track = root.querySelector('[data-track]');
    const slides = Array.prototype.slice.call(track.children);
    const dots = root.querySelectorAll('[data-dot]');
    const prev = root.querySelector('[data-prev]');
    const next = root.querySelector('[data-next]');
    if (!track || !slides.length) return;

    let idx = 0;
    const slideW = function () { return slides[0].getBoundingClientRect().width; };
    function go(i) {
      idx = (i + slides.length) % slides.length;
      if (window.gsap) {
        gsap.to(track, { x: -slideW() * idx, duration: .7, ease: 'expo.inOut' });
      } else {
        track.style.transform = 'translateX(' + (-slideW() * idx) + 'px)';
      }
      dots.forEach(function (d, di) { d.classList.toggle('active', di === idx); });
    }
    prev && prev.addEventListener('click', function () { go(idx - 1); });
    next && next.addEventListener('click', function () { go(idx + 1); });
    dots.forEach(function (d, di) { d.addEventListener('click', function () { go(di); }); });

    // autoplay
    let timer = setInterval(function () { go(idx + 1); }, 5500);
    root.addEventListener('mouseenter', function () { clearInterval(timer); });
    root.addEventListener('mouseleave', function () { timer = setInterval(function () { go(idx + 1); }, 5500); });

    // drag (mouse)
    let startX = null;
    track.addEventListener('mousedown', function (e) { startX = e.clientX; });
    window.addEventListener('mouseup', function (e) {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 50) go(idx + (dx > 0 ? -1 : 1));
      startX = null;
    });

    // responsive resize refresh
    window.addEventListener('resize', function () { go(idx); });
  }

  /* ----------------- Contact form (frontend only) ----------------- */
  function initContactForm() {
    const form = document.getElementById('fajr-contact-form');
    if (!form) return;

    const fields = form.querySelectorAll('.floating-field');
    // mark select has-value
    form.querySelectorAll('select').forEach(function (s) {
      function upd() { s.classList.toggle('has-value', !!s.value); }
      s.addEventListener('change', upd); upd();
    });

    // success tick on blur if valid
    fields.forEach(function (f) {
      const input = f.querySelector('input, textarea, select');
      if (!input) return;
      input.addEventListener('blur', function () {
        f.classList.remove('error');
        if (input.value && input.checkValidity()) {
          f.classList.add('success');
        } else {
          f.classList.remove('success');
        }
      });
      input.addEventListener('input', function () {
        f.classList.remove('error', 'success');
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      let valid = true;
      fields.forEach(function (f) {
        const input = f.querySelector('input, textarea, select');
        if (!input) return;
        if (!input.checkValidity()) {
          valid = false;
          f.classList.add('error');
          f.classList.remove('success');
        }
      });
      if (!valid) return;

      // loading state
      const btn = form.querySelector('[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'در حال ارسال...';

      // Simulate submission (no backend)
      // ---- BACKEND HOOK: replace this block with fetch() to your API ----
      setTimeout(function () {
        btn.disabled = false;
        btn.textContent = originalText;
        // clap/flash
        triggerClap();
        showThankYou();
      }, 1400);
    });

    function triggerClap() {
      const flash = document.createElement('div');
      flash.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:99991;pointer-events:none;opacity:1;';
      document.body.appendChild(flash);
      if (window.gsap) {
        gsap.to(flash, { opacity: 0, duration: .6, ease: 'power2.out', onComplete: function () { flash.remove(); }});
      } else {
        setTimeout(function () { flash.remove(); }, 600);
      }
    }
    function showThankYou() {
      const thanks = document.getElementById('form-success');
      if (!thanks) return;
      thanks.classList.remove('hidden');
      form.classList.add('hidden');
      if (window.gsap) {
        gsap.fromTo(thanks, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .8, ease: 'expo.out' });
      }
    }
  }

  /* ----------------- Back to top visibility ----------------- */
  function initBackToTop() {
    const b = document.getElementById('back-to-top');
    if (!b) return;
    window.addEventListener('scroll', function () {
      if (window.scrollY > 600) b.classList.remove('opacity-0', 'pointer-events-none');
      else b.classList.add('opacity-0', 'pointer-events-none');
    }, { passive: true });
  }

  /* ----------------- Newsletter focus anim ----------------- */
  function initNewsletter() {
    const wrap = document.querySelector('[data-newsletter]');
    if (!wrap) return;
    const input = wrap.querySelector('input');
    const line = wrap.querySelector('.nl-line');
    if (!input || !line) return;
    input.addEventListener('focus', function () {
      if (window.gsap) gsap.to(line, { width: '100%', duration: .6, ease: 'expo.out' });
      else line.style.width = '100%';
    });
    input.addEventListener('blur', function () {
      if (window.gsap) gsap.to(line, { width: '0%', duration: .6, ease: 'expo.in' });
      else line.style.width = '0%';
    });
  }

  /* ----------------- Master init ----------------- */
  function initCommon() {
    initCursor();
    initNavbar();
    initMobileMenu();
    initSmoothScroll();
    initMagnetic();
    initScrollProgress();
    initMarquees();
    initPageTransitions();
    initParallax();
    initReveals();
    initServiceTilt();
    initAccordion();
    initPortfolioFilter();
    initLightbox();
    initTestimonials();
    initContactForm();
    initBackToTop();
    initNewsletter();
    // refresh ScrollTrigger after load
    window.addEventListener('load', function () {
      if (window.ScrollTrigger) {
        ScrollTrigger.refresh();
      }
    });
  }

  // Expose
  window.FajrMain = {
    initPreloader: initPreloader,
    initCommon: initCommon,
    faNum: faNum,
    faDigits: faDigits,
    splitText: splitText,
    IS_TOUCH: IS_TOUCH,
    REDUCED_MOTION: REDUCED_MOTION
  };

  // Boot
  document.addEventListener('DOMContentLoaded', function () {
    initPreloader(function () {
      initCommon();
      // page-specific init hook (set by each page)
      if (typeof window.FajrPageInit === 'function') {
        window.FajrPageInit();
      }
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });
})();
