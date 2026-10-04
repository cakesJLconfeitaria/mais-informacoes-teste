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

  /* Popup de foto (P11, 03/10/2026). Sem JavaScript, cada miniatura é um link
     que abre a própria imagem. Com JavaScript, o clique abre este popup, que
     reúne as fotos do mesmo grupo ([data-photos]): botão X, toque fora da foto
     e Esc fecham; setas, contador, deslize e teclado passam entre as fotos;
     sem troca automática; o foco fica preso no popup e volta à miniatura. */
  function iniciarPopupDeFotos() {
    var grupos = Array.prototype.map.call(document.querySelectorAll('[data-photos]'), function (el) {
      return { nome: el.dataset.photos, preco: el.dataset.price || '', links: Array.prototype.slice.call(el.querySelectorAll('a.thumb')) };
    }).filter(function (g) { return g.links.length; });
    if (!grupos.length) return;

    var ICONE_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    var ICONE_ANT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>';
    var ICONE_PROX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';

    var popup = document.createElement('div');
    popup.className = 'lightbox';
    popup.hidden = true;
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.innerHTML =
      '<div class="lightbox-stage" data-stage><img alt="" draggable="false"></div>' +
      '<button type="button" class="lightbox-close" data-close aria-label="Fechar foto">' + ICONE_X + '</button>' +
      '<div class="lightbox-bar"><div class="lightbox-info">' +
      '<span class="lightbox-kicker" data-kicker hidden></span><strong class="lightbox-title" data-title></strong>' +
      '<span class="lightbox-price" data-price hidden></span><span class="lightbox-desc" data-desc hidden></span></div>' +
      '<span class="sr-only" data-live aria-live="polite" aria-atomic="true"></span><div class="lightbox-controls">' +
      '<button type="button" class="lightbox-arrow" data-previous aria-label="Foto anterior">' + ICONE_ANT + '</button>' +
      '<span class="lightbox-counter" data-counter></span>' +
      '<button type="button" class="lightbox-arrow" data-next aria-label="Próxima foto">' + ICONE_PROX + '</button>' +
      '</div></div>';
    document.body.appendChild(popup);

    var palco = popup.querySelector('[data-stage]');
    var imagem = palco.querySelector('img');
    var fechar = popup.querySelector('[data-close]');
    var anterior = popup.querySelector('[data-previous]');
    var proxima = popup.querySelector('[data-next]');
    var contador = popup.querySelector('[data-counter]');
    var chapeu = popup.querySelector('[data-kicker]');
    var titulo = popup.querySelector('[data-title]');
    var preco = popup.querySelector('[data-price]');
    var descricao = popup.querySelector('[data-desc]');
    var leitor = popup.querySelector('[data-live]');
    var painel = document.querySelector('.panel');
    var grupo = null, atual = 0, origem = null;

    function dadosDaFoto(g, link) {
      // título: o da foto (adicionais) ou o do grupo (produto); valor: o da foto (Bentô) ou o do grupo; descrição: a da foto ou o alt
      var img = link.querySelector('img');
      var alt = img ? img.alt : '';
      var nome = link.dataset.title || g.nome;
      return { src: link.getAttribute('href'), alt: alt, chapeu: nome === g.nome ? '' : g.nome, titulo: nome,
        preco: link.dataset.price || g.preco, descricao: link.dataset.desc || alt };
    }
    function texto(el, valor) { el.textContent = valor; el.hidden = !valor; }
    function mostrar(indice) {
      atual = Math.max(0, Math.min(grupo.links.length - 1, indice));
      var foto = dadosDaFoto(grupo, grupo.links[atual]);
      var posicao = (atual + 1) + ' de ' + grupo.links.length;
      imagem.src = foto.src;
      imagem.alt = foto.alt;
      texto(chapeu, foto.chapeu);
      texto(titulo, foto.titulo);
      texto(preco, foto.preco);
      texto(descricao, foto.descricao === foto.titulo ? '' : foto.descricao);
      contador.textContent = posicao;
      anterior.disabled = atual === 0;
      proxima.disabled = atual === grupo.links.length - 1;
      popup.setAttribute('aria-label', 'Foto ' + posicao + ' — ' + foto.titulo);
      leitor.textContent = (grupo.links.length > 1 ? 'Foto ' + posicao + ': ' : '') + foto.titulo + (foto.preco ? ', ' + foto.preco : '') + (foto.descricao && foto.descricao !== foto.titulo ? '. ' + foto.descricao : '');
      var ativo = document.activeElement; // se a seta usada ficou desabilitada, o foco não pode se perder
      if (!ativo || ativo === document.body || ativo.disabled || !popup.contains(ativo)) fechar.focus();
    }
    function abrir(g, indice, link) {
      grupo = g; origem = link;
      popup.classList.toggle('single', g.links.length < 2);
      popup.hidden = false;
      document.body.classList.add('lightbox-open');
      if (painel && 'inert' in painel) painel.inert = true;
      mostrar(indice);
      fechar.focus();
    }
    function encerrar() {
      if (popup.hidden) return;
      popup.hidden = true;
      document.body.classList.remove('lightbox-open');
      if (painel && 'inert' in painel) painel.inert = false;
      imagem.removeAttribute('src');
      if (origem) origem.focus();
      grupo = null; origem = null;
    }

    grupos.forEach(function (g) {
      g.links.forEach(function (link, i) {
        link.setAttribute('aria-haspopup', 'dialog');
        link.addEventListener('click', function (event) {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.button) return;
          event.preventDefault();
          abrir(g, i, link);
        });
      });
    });

    fechar.addEventListener('click', encerrar);
    anterior.addEventListener('click', function () { mostrar(atual - 1); });
    proxima.addEventListener('click', function () { mostrar(atual + 1); });
    popup.addEventListener('click', function (event) {
      if (event.target === popup || event.target === palco) encerrar();
    });
    document.addEventListener('keydown', function (event) {
      if (popup.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); encerrar(); return; }
      if (event.key === 'Tab') {
        var focaveis = [fechar, anterior, proxima].filter(function (b) { return !b.disabled && b.offsetParent !== null; });
        var primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
        if (event.shiftKey && (document.activeElement === primeiro || !popup.contains(document.activeElement))) { event.preventDefault(); ultimo.focus(); }
        else if (!event.shiftKey && (document.activeElement === ultimo || !popup.contains(document.activeElement))) { event.preventDefault(); primeiro.focus(); }
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var alvo;
      if (event.key === 'ArrowLeft') alvo = atual - 1;
      else if (event.key === 'ArrowRight') alvo = atual + 1;
      else if (event.key === 'Home') alvo = 0;
      else if (event.key === 'End') alvo = grupo.links.length - 1;
      else return;
      event.preventDefault();
      mostrar(alvo);
    });

    var toqueX = null, toqueY = null;
    palco.addEventListener('touchstart', function (event) {
      if (event.touches.length !== 1) { toqueX = null; return; }
      toqueX = event.touches[0].clientX; toqueY = event.touches[0].clientY;
    }, { passive: true });
    palco.addEventListener('touchend', function (event) {
      if (toqueX === null || !event.changedTouches.length) return;
      var dx = event.changedTouches[0].clientX - toqueX;
      var dy = event.changedTouches[0].clientY - toqueY;
      toqueX = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      mostrar(dx < 0 ? atual + 1 : atual - 1);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(document.documentElement.dataset.theme);
    var toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) toggle.addEventListener('click', function () {
      var theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      try { localStorage.setItem('theme', theme); } catch (_) {}
    });
    iniciarPopupDeFotos();
  });
})();
