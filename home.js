(async () => {
  try {
    const site = await fetch('data/episodes.json', { cache: 'no-store' }).then(r => r.json());
    const en = site.ui.en;
    const series = site.series.gelin;

    document.querySelector('header h1').textContent = en.title;
    document.querySelector('#home-eyebrow').textContent = site.home.intro.eyebrow;
    document.querySelector('#welcome-heading').textContent = site.home.intro.title;
    document.querySelector('#home-body').textContent = site.home.intro.body;

    const featured = series.episodes.find(ep => ep.id === site.home.featured.episode) || series.episodes[0];
    const figure = document.querySelector('#home-feature-image');
    figure.innerHTML = `<img src="${featured.image}" alt="${featured.alt}" fetchpriority="high"><figcaption><span>Featured story</span><strong>${series.title}, episode ${featured.number}</strong></figcaption>`;

    const nav = document.querySelector('body > nav');
    nav.setAttribute('aria-label', en.nav);
    nav.querySelectorAll('a').forEach((link, index) => link.textContent = en.navLinks[index]);

    const latest = series.episodes.slice(0, 3);
    document.querySelector('#latest-heading').textContent = series.title;
    const list = document.querySelector('.home-episode-list');
    list.innerHTML = '';
    latest.forEach(ep => {
      const a = document.createElement('a');
      a.className = 'home-episode';
      a.href = `${series.page}#episode-${ep.id}`;
      a.innerHTML = `<img src="${ep.image}" alt="${ep.alt}" loading="lazy"><span class="home-episode-copy"><span>Episode ${ep.number}</span><strong></strong></span><span class="home-episode-arrow" aria-hidden="true">↗</span>`;
      a.querySelector('strong').textContent = ep.title;
      list.append(a);
    });
  } catch (error) {
    document.querySelector('#latest-heading').textContent = 'The Bride';
    document.querySelector('.home-episode-list').innerHTML = `<section class="data-error glass-panel"><span class="eyebrow">Data loading error</span><h2>The latest episodes could not be loaded</h2><p>${error.message}</p></section>`;
  }
})();
