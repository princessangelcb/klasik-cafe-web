// All image paths are local to imagess/. Keep this list in sync with those files.
const COFFEE_PRODUCTS = [
  { src: 'imagess/amerikano.png', name: 'Amerikano', href: 'menu.html#amerikano', color: '#e3eaf2', wave: '#527eae' },
  { src: 'imagess/biscoffmatcha.png', name: 'Biscoff Matcha', href: 'menu.html#biscoff-matcha', color: '#e4ebdf', wave: '#6387a9' },
  { src: 'imagess/biscoffmilk.png', name: 'Biscoff Milk', href: 'menu.html#biscoff-milk', color: '#eee5dc', wave: '#4779aa' },
  { src: 'imagess/caramelmacchiato.png', name: 'Caramel Macchiato', href: 'menu.html#caramel-macchiato', color: '#eee2d6', wave: '#4674a4' },
  { src: 'imagess/icecappucino.png', name: 'Iced Cappuccino', href: 'menu.html#iced-cappuccino', color: '#e0e9ed', wave: '#4b84a8' },
  { src: 'imagess/klasikpremium.png', name: 'Klasik Premium', href: 'menu.html#klasik-premium', color: '#e9e5dc', wave: '#446e9c' },
  { src: 'imagess/latte.png', name: 'Latte', href: 'menu.html#latte', color: '#eae5dc', wave: '#567da4' },
  { src: 'imagess/manggoklasikmilk.png', name: 'Manggo Klasik Milk', href: 'menu.html#manggo-klasik-milk', color: '#f0e8d8', wave: '#5981a8' },
  { src: 'imagess/matchalatte.png', name: 'Matcha Latte', href: 'menu.html#matcha-latte', color: '#e2e9de', wave: '#4d7c9f' },
  { src: 'imagess/matchasomething.png', name: 'Matcha Something', href: 'menu.html#matcha-something', color: '#e4ebdd', wave: '#5c86a4' },
  { src: 'imagess/minasalatte.png', name: 'Minasa Latte', href: 'menu.html#minasa-latte', color: '#eee5dc', wave: '#5075a1' },
  { src: 'imagess/seasaltlatte.png', name: 'Seasalt Latte', href: 'menu.html#seasalt-latte', color: '#e0e9ec', wave: '#4c85a8' },
  { src: 'imagess/strawbmatcha.png', name: 'Strawberry Matcha', href: 'menu.html#strawberry-matcha', color: '#efe2e3', wave: '#587dac' },
  { src: 'imagess/tresletches.png', name: 'Tres Leches', href: 'menu.html#tres-leches', color: '#eee5dc', wave: '#5279a6' },
  { src: 'imagess/ubecloudlatte.png', name: 'Ube Cloud Latte', href: 'menu.html#ube-cloud-latte', color: '#e9e4ef', wave: '#647ba7' },
  { src: 'imagess/ubematcha.png', name: 'Ube Matcha', href: 'menu.html#ube-matcha', color: '#e7e2ed', wave: '#5678a5' }
];

const initCoffeeHero = () => {
  const section = document.querySelector('.coffee-hero');
  const track = section?.querySelector('[data-coffee-carousel]');
  const wave = section?.querySelector('[data-coffee-wave]');
  const nameLabel = section?.querySelector('[data-coffee-name]');
  const previousButton = section?.querySelector('[data-coffee-prev]');
  const nextButton = section?.querySelector('[data-coffee-next]');
  if (!section || !track || !wave || !nameLabel || !previousButton || !nextButton) return;

  const slides = COFFEE_PRODUCTS.map((product, index) => {
    const slide = document.createElement('article');
    slide.className = 'coffee-slide';
    slide.dataset.index = String(index);
    slide.dataset.color = product.color;
    slide.dataset.waveColor = product.wave;

    const link = document.createElement('a');
    link.href = product.href;
    link.setAttribute('aria-label', `View ${product.name} on the menu`);

    const image = document.createElement('img');
    image.setAttribute('src', product.src);
    image.alt = product.name;
    image.decoding = 'async';
    if (index === 0) image.fetchPriority = 'high';
    else image.loading = 'lazy';

    link.append(image);
    slide.append(link);
    track.append(slide);
    return slide;
  });

  let activeIndex = 0;
  let isAnimating = false;
  let pointerStartX = 0;
  let pointerId = null;
  let dragMoved = false;
  let suppressClick = false;

  const setPositions = () => {
    slides.forEach((slide, index) => {
      const offset = (index - activeIndex + slides.length) % slides.length;
      slide.classList.remove('is-active', 'is-second', 'is-third', 'is-hidden');
      if (offset === 0) slide.classList.add('is-active');
      else if (offset === 1) slide.classList.add('is-second');
      else if (offset === 2) slide.classList.add('is-third');
      else slide.classList.add('is-hidden');
      slide.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
      slide.querySelector('a').tabIndex = offset === 0 ? 0 : -1;
    });

    const active = slides[activeIndex];
    document.body.style.backgroundColor = active.dataset.color;
    nameLabel.textContent = COFFEE_PRODUCTS[activeIndex].name;
  };

  const goTo = direction => {
    if (isAnimating) return;
    isAnimating = true;
    const outgoing = slides[activeIndex];
    const targetIndex = (activeIndex + direction + slides.length) % slides.length;
    const incoming = slides[targetIndex];
    activeIndex = targetIndex;
    setPositions();

    outgoing.classList.add(direction > 0 ? 'is-leaving-next' : 'is-leaving-prev');
    incoming.classList.add(direction > 0 ? 'is-entering-next' : 'is-entering-prev');
    previousButton.classList.toggle('is-selected', direction < 0);
    nextButton.classList.toggle('is-selected', direction > 0);

    window.setTimeout(() => {
      outgoing.classList.remove('is-leaving-next', 'is-leaving-prev');
      incoming.classList.remove('is-entering-next', 'is-entering-prev');
      isAnimating = false;
    }, 760);
  };

  previousButton.addEventListener('click', () => goTo(-1));
  nextButton.addEventListener('click', () => goTo(1));
  section.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(-1); }
  });

  track.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStartX = event.clientX;
    pointerId = event.pointerId;
    dragMoved = false;
    suppressClick = false;
    track.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId) return;
    const delta = event.clientX - pointerStartX;
    if (Math.abs(delta) > 15) {
      dragMoved = true;
      suppressClick = true;
      if (event.cancelable) event.preventDefault();
    }
    if (dragMoved) track.style.setProperty('--drag-offset', `${delta * .38}px`);
  }, { passive: false });
  const finishPointer = event => {
    if (event.pointerId !== pointerId) return;
    const delta = event.clientX - pointerStartX;
    track.classList.remove('is-dragging');
    track.style.setProperty('--drag-offset', '0px');
    if (Math.abs(delta) > 15) {
      suppressClick = true;
      goTo(delta < 0 ? 1 : -1);
      window.setTimeout(() => { suppressClick = false; }, 400);
    }
    pointerId = null;
  };
  window.addEventListener('pointerup', finishPointer);
  window.addEventListener('pointercancel', finishPointer);
  track.addEventListener('click', event => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }, true);

  setPositions();
  nextButton.classList.add('is-selected');
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCoffeeHero, { once: true });
else initCoffeeHero();
