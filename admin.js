(() => {
  const DATA_URL = 'data/episodes.json';
  const DRAFT_KEY = 'woft-json-draft';
  const languages = ['pl', 'de', 'cs', 'tr', 'ru'];
  const languageNames = { pl: 'Polish', de: 'German', cs: 'Czech', tr: 'Turkish', ru: 'Russian' };
  let site = null;
  let currentSeries = 'gelin';
  let currentId = null;
  let currentTranslation = 'pl';
  let isNew = false;
  const pendingTranslations = {};

  const $ = (s) => document.querySelector(s);
  const allEpisodes = () => Object.values(site.series).flatMap(s => s.episodes.map(e => ({ ...e, _series: s.slug })));
  const findEpisode = (seriesKey, id) => site.series[seriesKey].episodes.find(e => e.id === id);

  async function loadInitial() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      site = await response.json();
      renderList();
      updateCount();
    } catch (error) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try { site = JSON.parse(draft); renderList(); updateCount(); notice('Loaded browser draft', true); return; } catch {}
      }
      notice('Open this project through a local server or use Import JSON.', false);
    }
  }

  function notice(message, positive = true) {
    const status = $('#save-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('ok', positive);
  }

  function updateCount() {
    const total = allEpisodes().length;
    $('#episode-count').textContent = `${total} ${total === 1 ? 'episode' : 'episodes'}`;
  }

  function renderList() {
    const wrap = $('#episode-list');
    if (!site) return;
    wrap.innerHTML = '';
    const query = $('#admin-search').value.trim().toLowerCase();
    const sortedSeries = Object.values(site.series);
    sortedSeries.forEach(series => {
      const header = document.createElement('div');
      header.className = 'admin-series-label';
      header.textContent = `${series.title} · ${series.episodes.length}`;
      wrap.append(header);

      [...series.episodes].sort((a,b) => maxNum(b)-maxNum(a)).forEach(ep => {
        const hay = `${ep.number} ${ep.title}`.toLowerCase();
        if (query && !hay.includes(query)) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'admin-episode-item';
        button.dataset.series = series.slug;
        button.dataset.id = ep.id;
        if (series.slug === currentSeries && ep.id === currentId) button.classList.add('active');
        button.innerHTML = `<span class="admin-episode-number">${ep.number}</span><span class="admin-episode-name"></span>`;
        button.querySelector('.admin-episode-name').textContent = ep.title;
        button.addEventListener('click', () => selectEpisode(series.slug, ep.id));
        wrap.append(button);
      });
    });
  }

  function maxNum(ep) { const nums = String(ep.number).match(/\d+/g) || ['0']; return Math.max(...nums.map(Number)); }

  function selectEpisode(seriesKey, id) {
    currentSeries = seriesKey;
    currentId = id;
    isNew = false;
    const ep = findEpisode(seriesKey, id);
    if (!ep) return;
    fillForm(ep);
    renderList();
  }

  function fillForm(ep) {
    Object.keys(pendingTranslations).forEach(key => delete pendingTranslations[key]);
    $('#editor-empty').hidden = true;
    $('#episode-form').hidden = false;
    $('#editor-mode').textContent = isNew ? 'Creating episode' : `Editing ${site.series[currentSeries].title}`;
    $('#editor-title').textContent = isNew ? 'New episode' : `Episode ${ep.number}`;
    $('#field-series').value = currentSeries;
    $('#field-number').value = ep.number || '';
    $('#field-date').value = ep.date || '';
    $('#field-image').value = ep.image || '';
    $('#field-title').value = ep.title || '';
    $('#field-alt').value = ep.alt || '';
    $('#field-summary').value = ep.summary || '';
    renderTranslationTabs(ep);
    renderTranslationFields(ep);
  }

  function renderTranslationTabs(ep) {
    const tabs = $('#translation-tabs');
    tabs.innerHTML = '';
    languages.forEach(lang => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = lang === currentTranslation ? 'active' : '';
      button.textContent = `${lang.toUpperCase()} · ${languageNames[lang]}`;
      button.addEventListener('click', () => { captureTranslationFields(); currentTranslation = lang; renderTranslationTabs(ep); renderTranslationFields(ep); });
      tabs.append(button);
    });
  }

  function captureTranslationFields() {
    const title = document.querySelector('#translation-title');
    const summary = document.querySelector('#translation-summary');
    const alt = document.querySelector('#translation-alt');
    if (!title || !summary || !alt) return;
    pendingTranslations[currentTranslation] = { title:title.value.trim(), summary:summary.value.trim(), alt:alt.value.trim() };
  }

  function renderTranslationFields(ep) {
    const data = pendingTranslations[currentTranslation] || ep.translations?.[currentTranslation] || { title:'', summary:'', alt:'' };
    const wrap = $('#translation-fields');
    wrap.innerHTML = `
      <label class="span-2"><span>${languageNames[currentTranslation]} title</span><input id="translation-title"></label>
      <label><span>Alt text</span><input id="translation-alt"></label>
      <label class="full-field"><span>Summary</span><textarea id="translation-summary" rows="6"></textarea></label>`;
    $('#translation-title').value = data.title || '';
    $('#translation-alt').value = data.alt || '';
    $('#translation-summary').value = data.summary || '';
  }

  function readForm() {
    const episode = {
      id: normalizeId($('#field-number').value),
      number: normalizeNumber($('#field-number').value),
      date: $('#field-date').value,
      image: $('#field-image').value.trim(),
      alt: $('#field-alt').value.trim(),
      title: $('#field-title').value.trim(),
      summary: $('#field-summary').value.trim(),
      translations: {}
    };
    captureTranslationFields();
    languages.forEach(lang => episode.translations[lang] = { ...(findEpisode(currentSeries, currentId)?.translations?.[lang] || {title:'',summary:'',alt:''}) });
    Object.entries(pendingTranslations).forEach(([lang, data]) => { episode.translations[lang] = { ...data }; });
    episode.translations[currentTranslation] = {
      title: $('#translation-title').value.trim(),
      summary: $('#translation-summary').value.trim(),
      alt: $('#translation-alt').value.trim()
    };
    return episode;
  }

  function normalizeNumber(value) {
    return value.trim().replace(/\s*[-–]\s*/g, '–');
  }
  function normalizeId(value) { return normalizeNumber(value).replace('–','-'); }

  $('#episode-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!site) return;
    const targetSeries = $('#field-series').value;
    const episode = readForm();
    currentSeries = targetSeries;

    if (isNew) {
      const duplicate = site.series[targetSeries].episodes.find(e => e.id === episode.id);
      if (duplicate) { alert('That episode number already exists in this series.'); return; }
      site.series[targetSeries].episodes.push(episode);
      currentId = episode.id;
      isNew = false;
    } else {
      const oldSeries = Object.values(site.series).find(s => s.episodes.some(e => e.id === currentId));
      const oldIndex = oldSeries?.episodes.findIndex(e => e.id === currentId);
      if (oldSeries && oldSeries.slug !== targetSeries) {
        if (oldIndex >= 0) oldSeries.episodes.splice(oldIndex,1);
        site.series[targetSeries].episodes.push(episode);
      } else if (oldSeries && oldIndex >= 0) {
        oldSeries.episodes[oldIndex] = episode;
      }
      currentId = episode.id;
    }

    persistDraft();
    renderList();
    updateCount();
    fillForm(findEpisode(currentSeries, currentId));
    notice('Saved to browser draft · download JSON to publish', true);
  });

  $('#new-episode').addEventListener('click', () => {
    isNew = true;
    currentId = `new-${Date.now()}`;
    currentSeries = $('#field-series')?.value || 'gelin';
    const blank = { number:'', date:'', image:'', alt:'', title:'', summary:'', translations:{} };
    fillForm(blank);
    renderList();
  });

  $('#duplicate-episode').addEventListener('click', () => {
    const ep = findEpisode(currentSeries, currentId);
    if (!ep) return;
    const copy = structuredClone(ep);
    copy.id = `${copy.id}-copy`;
    copy.number = `${copy.number} (copy)`;
    site.series[currentSeries].episodes.push(copy);
    currentId = copy.id;
    isNew = false;
    persistDraft(); renderList(); updateCount(); fillForm(copy);
    notice('Duplicated episode', true);
  });

  $('#delete-episode').addEventListener('click', () => {
    if (isNew) { $('#episode-form').hidden = true; $('#editor-empty').hidden = false; return; }
    const series = site.series[currentSeries];
    const index = series.episodes.findIndex(e => e.id === currentId);
    if (index < 0) return;
    if (!confirm(`Delete episode ${series.episodes[index].number}?`)) return;
    series.episodes.splice(index,1);
    currentId = null;
    isNew = false;
    $('#episode-form').hidden = true;
    $('#editor-empty').hidden = false;
    persistDraft(); renderList(); updateCount();
    notice('Episode deleted from draft', true);
  });

  $('#field-series').addEventListener('change', () => { currentSeries = $('#field-series').value; });
  $('#admin-search').addEventListener('input', renderList);

  $('#load-json').addEventListener('click', () => loadInitial());
  $('#import-json').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      site = JSON.parse(await file.text());
      localStorage.setItem(DRAFT_KEY, JSON.stringify(site));
      renderList(); updateCount();
      notice('Imported JSON successfully', true);
      event.target.value = '';
    } catch (error) { alert('The selected JSON file is invalid.'); }
  });

  $('#download-json').addEventListener('click', async () => {
    if (!site) return alert('Load or import the database first.');
    const exportSite = structuredClone(site);
    Object.values(exportSite.series).forEach(series => series.episodes.sort((a,b) => maxNum(b) - maxNum(a)));
    const text = JSON.stringify(exportSite, null, 2);
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName:'episodes.json', types:[{description:'JSON',accept:{'application/json':['.json']}}] });
        const writable = await handle.createWritable();
        await writable.write(text); await writable.close();
        notice('JSON saved', true); return;
      } catch (error) { if (error?.name === 'AbortError') return; }
    }
    const blob = new Blob([text], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='episodes.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    notice('JSON downloaded', true);
  });

  function persistDraft() { localStorage.setItem(DRAFT_KEY, JSON.stringify(site)); }
  loadInitial();
})();
