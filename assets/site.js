(function () {
  'use strict';
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#24161c' : '#fcecf1';
    var toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
      toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }
  var saved = 'light';
  try { saved = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'; } catch (_) {}
  applyTheme(saved);
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(document.documentElement.dataset.theme);
    var toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) toggle.addEventListener('click', function () {
      var theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      try { localStorage.setItem('theme', theme); } catch (_) {}
    });
    document.querySelectorAll('[data-gallery]').forEach(function (gallery) {
      var track = gallery.querySelector('.gallery-track');
      var slides = Array.from(track.children);
      var controls = gallery.querySelector('.gallery-controls');
      if (slides.length < 2 || !controls) return;
      var previous = controls.querySelector('[data-previous]');
      var next = controls.querySelector('[data-next]');
      var status = controls.querySelector('[data-status]');
      var current = 0;
      var frame = 0;
      var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      function update(index) {
        current = Math.max(0, Math.min(slides.length - 1, index));
        previous.disabled = current === 0;
        next.disabled = current === slides.length - 1;
        status.textContent = 'Foto ' + (current + 1) + ' de ' + slides.length;
        slides.forEach(function (slide, i) { slide.setAttribute('aria-hidden', String(i !== current)); });
      }
      function goTo(index) {
        var target = Math.max(0, Math.min(slides.length - 1, index));
        track.scrollTo({ left: target * track.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      }
      previous.addEventListener('click', function () { goTo(current - 1); });
      next.addEventListener('click', function () { goTo(current + 1); });
      track.addEventListener('keydown', function (event) {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        var target;
        if (event.key === 'ArrowLeft') target = current - 1;
        else if (event.key === 'ArrowRight') target = current + 1;
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = slides.length - 1;
        else return;
        event.preventDefault();
        goTo(target);
      });
      track.addEventListener('scroll', function () {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(function () {
          if (track.clientWidth) update(Math.round(track.scrollLeft / track.clientWidth));
          frame = 0;
        });
      }, { passive: true });
      var resize = new ResizeObserver(function () {
        track.scrollTo({ left: current * track.clientWidth, behavior: 'instant' });
      });
      resize.observe(track);
      controls.hidden = false;
      gallery.classList.add('enhanced');
      update(0);
    });
  });
})();
