(() => {
  const root = document.querySelector('.episode-gallery');
  if (!root) return;

  const seriesKey = document.body.dataset.series;
  const dataUrl = 'data/episodes.json';
  const STORAGE_KEY = 'woft-language';

  const escapeId = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, '-');
  const getNumber = (episode) => episode.number || episode.id;
  const primaryNumber = (episode) => Math.max(...String(getNumber(episode)).split(/[–-]/).map(Number));

  async function loadData() {
    const response = await fetch(dataUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load ${dataUrl}`);
    return response.json();
  }

  loadData().then(init).catch(showError);

  function showError(error) {
    root.innerHTML = `
      <section class="data-error glass-panel">
        <span class="eyebrow">Data loading error</span>
        <h2>The episode database could not be loaded</h2>
        <p>${error.message}. Run the project through a local web server instead of opening the HTML file directly.</p>
        <code>python -m http.server 8000</code>
      </section>`;
  }

  function init(site) {
    const series = site.series?.[seriesKey];
    if (!series) return showError(new Error(`Series "${seriesKey}" was not found in the JSON database`));

    const labels = site.ui;
    const episodes = [...(series.episodes || [])].sort((a, b) => primaryNumber(b) - primaryNumber(a));
    let currentLanguage = localStorage.getItem(STORAGE_KEY) || site.defaultLanguage || 'en';
    if (!site.languages.includes(currentLanguage)) currentLanguage = 'en';

    root.innerHTML = `
      <section class="episode-intro">
        <div>
          <p class="eyebrow" id="series-eyebrow">${series.title}</p>
          <h2 id="episode-heading"></h2>
          <p id="episode-description">${series.episodes.length} episodes in the database</p>
        </div>
        <div class="episode-controls">
          <label for="episode-search"></label>
          <div class="search-shell">
            <span aria-hidden="true">⌕</span>
            <input id="episode-search" type="search" autocomplete="off">
          </div>
          <div class="episode-search-status" id="episode-search-status" aria-live="polite"></div>
          <div class="episode-language" role="group"></div>
        </div>
      </section>
      <div class="episode-list" id="episode-list"></div>`;

    const episodeList = root.querySelector('#episode-list');
    const episodeSearch = root.querySelector('#episode-search');
    const episodeSearchStatus = root.querySelector('#episode-search-status');
    const languageWrap = root.querySelector('.episode-language');

    site.languages.forEach((language) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.language = language;
      button.textContent = language.toUpperCase();
      button.addEventListener('click', () => setLanguage(language));
      languageWrap.append(button);
    });

    function translatedEpisode(episode) {
      if (currentLanguage === 'en') return episode;
      return { ...episode, ...(episode.translations?.[currentLanguage] || {}) };
    }

    function formatDate(dateString, language) {
      if (!dateString) return '';
      const value = new Date(`${dateString}T12:00:00`);
      if (Number.isNaN(value.getTime())) return dateString;
      return new Intl.DateTimeFormat(labels[language]?.lang || 'en', { dateStyle: 'long' }).format(value);
    }

    function countText(shown, total) {
      const ui = labels[currentLanguage] || labels.en;
      const template = shown === total ? ui.count.all : ui.count.template;
      return template.replace('{shown}', shown).replace('{total}', total);
    }

    function render() {
      episodeList.innerHTML = '';
      episodes.forEach((episode, index) => {
        const view = translatedEpisode(episode);
        const id = `episode-${escapeId(episode.id)}`;
        const card = document.createElement('details');
        card.className = 'episode-card';
        card.id = id;

        const summary = document.createElement('summary');
        const image = document.createElement('img');
        image.src = episode.image;
        image.alt = view.alt || episode.alt || '';
        image.loading = 'lazy';
        const number = document.createElement('span');
        number.className = 'episode-number';
        const range = String(episode.number).includes('–');
        const ui = labels[currentLanguage] || labels.en;
        number.textContent = currentLanguage === 'en'
          ? `Episode ${episode.number}`
          : `${range ? ui.many : ui.one} ${episode.number}`;
        const action = document.createElement('span');
        action.className = 'episode-action';
        action.textContent = ui.view;
        action.dataset.closeLabel = ui.close;
        summary.append(image, number, action);

        const copy = document.createElement('div');
        copy.className = 'episode-copy';
        const time = document.createElement('time');
        time.className = 'episode-date';
        time.dateTime = episode.date || '';
        time.textContent = formatDate(episode.date, currentLanguage);
        const title = document.createElement('h3');
        title.textContent = view.title || episode.title;
        const paragraph = document.createElement('p');
        paragraph.textContent = view.summary || episode.summary;
        const pagination = document.createElement('nav');
        pagination.className = 'episode-pagination';
        pagination.setAttribute('aria-label', `${ui.pagination}: ${number.textContent}`);

        const previous = episodes[index + 1];
        const next = episodes[index - 1];
        if (previous) pagination.append(makePager(previous, 'previous', ui));
        if (next) pagination.append(makePager(next, 'next', ui));
        copy.append(time, title, paragraph, pagination);
        card.append(summary, copy);
        episodeList.append(card);
      });

      bindHashOpen();
    }

    function makePager(target, direction, ui) {
      const link = document.createElement('a');
      link.href = `#episode-${escapeId(target.id)}`;
      link.dataset.direction = direction;
      link.textContent = direction === 'previous' ? `← ${ui.previous}` : `${ui.next} →`;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const targetCard = document.getElementById(`episode-${escapeId(target.id)}`);
        if (!targetCard) return;
        document.querySelectorAll('.episode-card').forEach((card) => { card.open = false; });
        targetCard.open = true;
        history.replaceState(null, '', `#${targetCard.id}`);
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return link;
    }

    function bindHashOpen() {
      const target = window.location.hash.replace('#', '');
      if (!target) return;
      const card = document.getElementById(target);
      if (card) {
        card.open = true;
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
      }
    }

    function filterEpisodes() {
      const query = episodeSearch.value.trim().toLocaleLowerCase();
      let shown = 0;
      episodeList.querySelectorAll('.episode-card').forEach((card, index) => {
        const episode = episodes[index];
        const view = translatedEpisode(episode);
        const haystack = `${episode.number} ${episode.title} ${view.title}`.toLocaleLowerCase();
        card.hidden = query && !haystack.includes(query);
        if (!card.hidden) shown += 1;
      });
      episodeSearchStatus.textContent = shown === 0
        ? (labels[currentLanguage] || labels.en).noResults
        : countText(shown, episodes.length);
    }

    function setLanguage(language) {
      if (!labels[language]) return;
      currentLanguage = language;
      localStorage.setItem(STORAGE_KEY, language);
      const ui = labels[language];
      document.documentElement.lang = ui.lang;
      document.title = `${series.title} | ${ui.title}`;
      document.querySelector('header h1').textContent = ui.title;
      document.querySelector('#episode-heading').textContent = ui.heading[seriesKey];
      document.querySelector('#episode-description').textContent = countText(episodes.length, episodes.length);
      document.querySelector('.episode-controls label').textContent = ui.searchLabel;
      document.querySelector('.episode-language').setAttribute('aria-label', ui.language);
      document.querySelector('body > nav').setAttribute('aria-label', ui.nav);
      episodeSearch.placeholder = ui.searchPlaceholder;

      document.querySelectorAll('body > nav a').forEach((link, index) => { link.textContent = ui.navLinks[index]; });
      document.querySelectorAll('.site-footer a:not(.admin-link)').forEach((link, index) => { link.textContent = ui.footerLinks[index]; });
      document.querySelectorAll('.episode-language button').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.language === language));
      });

      render();
      episodeSearch.value = '';
      filterEpisodes();
    }

    episodeSearch.addEventListener('input', () => {
      episodeList.querySelectorAll('.episode-card').forEach((card) => { card.open = false; });
      filterEpisodes();
    });

    setLanguage(currentLanguage);
  }
})();
