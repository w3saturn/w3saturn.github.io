// Focus Carousel — 绝对定位，无限循环
(function () {
  'use strict';

  function FocusCarousel(el) {
    this.el = el;
    this.viewport = el.querySelector('.carousel-viewport');
    this.track = el.querySelector('.carousel-track');
    var originals = Array.from(this.track.querySelectorAll('.carousel-card'));
    this.totalCards = originals.length;

    if (this.totalCards < 2) {
      if (originals[0]) {
        originals[0].classList.add('active');
        originals[0].setAttribute('aria-hidden', 'false');
        originals[0].style.left = '0%';
      }
      return;
    }

    // 克隆首尾实现无限循环：[lastClone] [c0] [c1] ... [cN-1] [firstClone]
    var firstClone = originals[0].cloneNode(true);
    var lastClone  = originals[this.totalCards - 1].cloneNode(true);
    this.track.appendChild(firstClone);
    this.track.insertBefore(lastClone, originals[0]);

    this.cards = Array.from(this.track.querySelectorAll('.carousel-card'));
    // displayIndex: 0=lastClone, 1=c0, ..., N=cN-1, N+1=firstClone
    this.displayIndex = 1;
    this.realIndex = 0;
    this.transitionMs = 550;

    this.prevBtn = el.querySelector('.carousel-arrow.prev');
    this.nextBtn = el.querySelector('.carousel-arrow.next');
    this.dotsContainer = el.querySelector('.carousel-dots');
    this.autoTimer = null;
    this.autoDelay = 10000;
    this.locked = false;

    var self = this;

    this.createDots();
    this.bindEvents();
    this.preloadImages();
    this._layoutCards();

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        self._refresh();
        self._snapTo(self.displayIndex);
        self.startAuto();
      });
    });

    window.addEventListener('resize', function () {
      clearTimeout(self.resizeTimer);
      self.resizeTimer = setTimeout(function () {
        self._layoutCards();
        self._snapTo(self.displayIndex);
      }, 120);
    });
  }

  /* ---- 读实际渲染宽度，设 left ---- */
  FocusCarousel.prototype._layoutCards = function () {
    this.cardW = this.cards[0].offsetWidth; // 桌面 33.333vw，手机 100vw
    var self = this;
    this.cards.forEach(function (card, i) {
      card.style.left = (i * self.cardW) + 'px';
    });
  };

  /* ---- 居中偏移 ---- */
  FocusCarousel.prototype._getTrackOffset = function (dispIdx) {
    var vw = this.viewport.clientWidth;
    var side = (vw - this.cardW) / 2; // = vw / 3
    return side - dispIdx * this.cardW;
  };

  FocusCarousel.prototype._reposition = function (dispIdx) {
    this.track.style.transform = 'translateX(' + this._getTrackOffset(dispIdx) + 'px)';
  };

  FocusCarousel.prototype._snapTo = function (dispIdx) {
    this.track.style.transition = 'none';
    this._reposition(dispIdx);
    this.track.offsetHeight;
    this.track.style.transition = '';
  };

  FocusCarousel.prototype._realFromDisplay = function (dispIdx) {
    if (dispIdx === 0) return this.totalCards - 1;
    if (dispIdx === this.totalCards + 1) return 0;
    return dispIdx - 1;
  };

  FocusCarousel.prototype._normalizeDisplay = function (dispIdx) {
    if (dispIdx === 0) return this.totalCards;
    if (dispIdx === this.totalCards + 1) return 1;
    return dispIdx;
  };

  FocusCarousel.prototype.preloadImages = function () {
    var seen = {};
    this.cards.forEach(function (card) {
      var img = card.querySelector('img');
      if (!img || !img.src || seen[img.src]) return;
      seen[img.src] = true;
      img.loading = 'eager';
      img.decoding = 'async';

      var preload = new Image();
      preload.src = img.src;
    });
  };

  /* ---- 视觉状态 ---- */
  FocusCarousel.prototype._refresh = function () {
    var self = this;
    this.cards.forEach(function (card, i) {
      card.classList.remove('active', 'side', 'hidden');
      if (i === self.displayIndex) {
        card.classList.add('active');
        card.setAttribute('aria-hidden', 'false');
      } else if (i === self.displayIndex - 1 || i === self.displayIndex + 1) {
        card.classList.add('side');
        card.setAttribute('aria-hidden', 'true');
      } else {
        card.classList.add('hidden');
        card.setAttribute('aria-hidden', 'true');
      }
    });
    if (this.dotsContainer) {
      var dots = this.dotsContainer.querySelectorAll('.dot');
      dots.forEach(function (d, i) { d.classList.toggle('active', i === self.realIndex); });
    }
  };

  FocusCarousel.prototype._refreshForTransition = function (fromDisplay, targetDisplay) {
    var self = this;
    var visible = {};

    [fromDisplay - 1, fromDisplay, fromDisplay + 1, targetDisplay - 1, targetDisplay, targetDisplay + 1].forEach(function (i) {
      if (i >= 0 && i < self.cards.length) visible[i] = true;
    });

    this.cards.forEach(function (card, i) {
      card.classList.remove('active', 'side', 'hidden');
      if (i === targetDisplay) {
        card.classList.add('active');
        card.setAttribute('aria-hidden', 'false');
      } else if (visible[i]) {
        card.classList.add('side');
        card.setAttribute('aria-hidden', 'true');
      } else {
        card.classList.add('hidden');
        card.setAttribute('aria-hidden', 'true');
      }
    });

    if (this.dotsContainer) {
      var dots = this.dotsContainer.querySelectorAll('.dot');
      dots.forEach(function (d, i) { d.classList.toggle('active', i === self.realIndex); });
    }
  };

  /* ---- 导航 ---- */
  FocusCarousel.prototype._animateToDisplay = function (targetDisplay) {
    if (this.locked) return;

    this.locked = true;
    var fromDisplay = this.displayIndex;
    var self = this;

    this.displayIndex = targetDisplay;
    this.realIndex = this._realFromDisplay(targetDisplay);
    this._refreshForTransition(fromDisplay, targetDisplay);

    this.track.style.transition = 'transform ' + this.transitionMs + 'ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    this._reposition(targetDisplay);

    clearTimeout(this.transitionTimer);
    this.transitionTimer = setTimeout(function () {
      self.displayIndex = self._normalizeDisplay(targetDisplay);
      self.realIndex = self._realFromDisplay(self.displayIndex);
      self._snapTo(self.displayIndex);
      self._refresh();
      self.locked = false;
    }, this.transitionMs + 30);

    this.resetAuto();
  };

  FocusCarousel.prototype.goTo = function (realTarget, animate) {
    if (realTarget === this.realIndex || this.locked) return;
    if (animate === undefined) animate = true;

    var targetDisplay = realTarget + 1; // 1=c0, 2=c1, ...

    if (this.displayIndex === this.totalCards && realTarget === 0) {
      targetDisplay = this.totalCards + 1; // last -> firstClone，继续向右
    } else if (this.displayIndex === 1 && realTarget === this.totalCards - 1) {
      targetDisplay = 0; // first -> lastClone，继续向左
    }

    if (!animate) {
      this.displayIndex = this._normalizeDisplay(targetDisplay);
      this.realIndex = realTarget;
      this._refresh();
      this._snapTo(this.displayIndex);
      return;
    }

    this._animateToDisplay(targetDisplay);
  };

  FocusCarousel.prototype.goNext = function () {
    this._animateToDisplay(this.displayIndex + 1);
  };

  FocusCarousel.prototype.goPrev = function () {
    this._animateToDisplay(this.displayIndex - 1);
  };

  /* ---- 自动播放 ---- */
  FocusCarousel.prototype.startAuto = function () {
    this.stopAuto();
    var self = this;
    this.autoTimer = setInterval(function () { self.goNext(); }, this.autoDelay);
  };
  FocusCarousel.prototype.stopAuto = function () {
    if (this.autoTimer) { clearInterval(this.autoTimer); this.autoTimer = null; }
  };
  FocusCarousel.prototype.resetAuto = function () {
    this.stopAuto(); this.startAuto();
  };

  /* ---- 圆点 ---- */
  FocusCarousel.prototype.createDots = function () {
    if (!this.dotsContainer) return;
    this.dotsContainer.innerHTML = '';
    var self = this;
    for (var i = 0; i < this.totalCards; i++) {
      var btn = document.createElement('button');
      btn.className = 'dot' + (i === 0 ? ' active' : '');
      btn.setAttribute('aria-label', '跳转到第 ' + (i + 1) + ' 张');
      (function (idx) { btn.addEventListener('click', function () { self.goTo(idx); }); })(i);
      this.dotsContainer.appendChild(btn);
    }
  };

  /* ---- 事件 ---- */
  FocusCarousel.prototype.bindEvents = function () {
    var self = this;
    if (this.prevBtn) this.prevBtn.addEventListener('click', function () { self.goPrev(); });
    if (this.nextBtn) this.nextBtn.addEventListener('click', function () { self.goNext(); });
    this.el.addEventListener('mouseenter', function () { self.stopAuto(); });
    this.el.addEventListener('mouseleave', function () { self.startAuto(); });
    this.el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); self.goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); self.goNext(); }
    });

    this.cards.forEach(function (card, i) {
      card.addEventListener('click', function (e) {
        if (i === self.displayIndex) return;
        if (card.classList.contains('side')) {
          e.preventDefault();
          var real = ((i - 1) % self.totalCards + self.totalCards) % self.totalCards;
          self.goTo(real);
        }
      });
    });

    var startX = 0;
    this.track.addEventListener('touchstart', function (e) { startX = e.changedTouches[0].screenX; }, { passive: true });
    this.track.addEventListener('touchend', function (e) {
      if (Math.abs(startX - e.changedTouches[0].screenX) > 50) {
        (startX - e.changedTouches[0].screenX) > 0 ? self.goNext() : self.goPrev();
      }
    });
  };

  document.querySelectorAll('.carousel-wrapper').forEach(function (el) { new FocusCarousel(el); });
})();
