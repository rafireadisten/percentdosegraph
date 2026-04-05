const MS_PER_DAY = 24 * 60 * 60 * 1000;
const API_BASE_PATH = resolveApiBasePath();
const AUTH_TOKEN_STORAGE_KEY = 'percentdosegraph:static-auth-token';
const AUTH_ACCOUNT_STORAGE_KEY = 'percentdosegraph:static-auth-account';
const LOCAL_PROFILES_STORAGE_KEY = 'percentdosegraph:static-local-profiles';

let drugReferenceLibrary = [];

const state = {
  settings: {
    medicationName: 'Morphine',
    patientName: 'Example Patient',
    medicationRoute: 'PO',
    doseUnit: 'mg/day',
    maxDose: 120,
    timeframe: '1y',
  },
  inference: {
    match: null,
    matches: [],
    isOverridden: false,
  },
  doseEvents: [],
  profiles: [],
  editingDoseId: null,
  profileSearch: '',
  profileStorageMode: 'local',
  cardiovascularDrugs: [],
  randomProfile: {
    drugs: [],
    points: [],
    regimens: [],
    startDate: null,
    endDate: null,
  },
  auth: {
    token: '',
    account: null,
    mode: 'login',
  },
};

function resolveApiBasePath() {
  if (window.location.protocol === 'file:') {
    return 'http://localhost:3001/api';
  }

  if (window.location.hostname === 'localhost' && window.location.port === '8080') {
    return 'http://localhost:3001/api';
  }

  return `${window.location.origin}/api`;
}

const elements = {
  settingsForm: document.getElementById('settingsForm'),
  doseForm: document.getElementById('doseForm'),
  medicationName: document.getElementById('medicationName'),
  patientName: document.getElementById('patientName'),
  medicationRoute: document.getElementById('medicationRoute'),
  doseUnit: document.getElementById('doseUnit'),
  maxDose: document.getElementById('maxDose'),
  timeframe: document.getElementById('timeframe'),
  doseDate: document.getElementById('doseDate'),
  doseRoute: document.getElementById('doseRoute'),
  doseAmount: document.getElementById('doseAmount'),
  eventsTableBody: document.getElementById('eventsTableBody'),
  chartSubtitle: document.getElementById('chartSubtitle'),
  headlinePercent: document.getElementById('headlinePercent'),
  averagePercent: document.getElementById('averagePercent'),
  peakPercent: document.getElementById('peakPercent'),
  totalDose: document.getElementById('totalDose'),
  highDays: document.getElementById('highDays'),
  interpretationText: document.getElementById('interpretationText'),
  rangeText: document.getElementById('rangeText'),
  doseChart: document.getElementById('doseChart'),
  inferenceStatus: document.getElementById('inferenceStatus'),
  inferenceSummary: document.getElementById('inferenceSummary'),
  referenceList: document.getElementById('referenceList'),
  applyInferenceButton: document.getElementById('applyInferenceButton'),
  exportJsonButton: document.getElementById('exportJsonButton'),
  exportCsvButton: document.getElementById('exportCsvButton'),
  importJsonButton: document.getElementById('importJsonButton'),
  importFileInput: document.getElementById('importFileInput'),
  clearDataButton: document.getElementById('clearDataButton'),
  profileName: document.getElementById('profileName'),
  saveProfileButton: document.getElementById('saveProfileButton'),
  loadProfileButton: document.getElementById('loadProfileButton'),
  profileList: document.getElementById('profileList'),
  authForm: document.getElementById('authForm'),
  authNameLabel: document.getElementById('authNameLabel'),
  authName: document.getElementById('authName'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authSubmitButton: document.getElementById('authSubmitButton'),
  authToggleButton: document.getElementById('authToggleButton'),
  authLogoutButton: document.getElementById('authLogoutButton'),
  authStatusText: document.getElementById('authStatusText'),
  authMessage: document.getElementById('authMessage'),
  generateRandomProfileButton: document.getElementById('generateRandomProfileButton'),
  randomProfileCanvas: document.getElementById('randomProfileChart'),
  randomProfileSummary: document.getElementById('randomProfileSummary'),
  randomProfileMeta: document.getElementById('randomProfileMeta'),
  medicationSuggestions: document.getElementById('medicationSuggestions'),
  workspacePatient: document.getElementById('workspacePatient'),
  workspaceMedication: document.getElementById('workspaceMedication'),
  workspaceRoute: document.getElementById('workspaceRoute'),
  workspaceTimeframe: document.getElementById('workspaceTimeframe'),
  workspaceMaxDose: document.getElementById('workspaceMaxDose'),
  workspaceInference: document.getElementById('workspaceInference'),
  workspaceEventCount: document.getElementById('workspaceEventCount'),
  workspaceLastEvent: document.getElementById('workspaceLastEvent'),
  setTodayButton: document.getElementById('setTodayButton'),
  setThreeYearButton: document.getElementById('setThreeYearButton'),
  doseFormHeading: document.getElementById('doseFormHeading'),
  doseFormHint: document.getElementById('doseFormHint'),
  cancelEditButton: document.getElementById('cancelEditButton'),
  doseSubmitButton: document.getElementById('doseSubmitButton'),
  profileSearch: document.getElementById('profileSearch'),
  profileStatusText: document.getElementById('profileStatusText'),
};

restoreAuthSession();
syncFormFromState();
initialize();

elements.settingsForm.addEventListener('input', event => {
  const previousRoute = state.settings.medicationRoute;
  const previousDrug = state.settings.medicationName;

  state.settings.medicationName = elements.medicationName.value.trim() || 'Medication';
  state.settings.patientName = elements.patientName.value.trim() || 'Patient';
  state.settings.medicationRoute = elements.medicationRoute.value;
  state.settings.doseUnit = elements.doseUnit.value.trim() || 'units/day';
  state.settings.timeframe = elements.timeframe.value;

  if (event.target === elements.maxDose) {
    state.settings.maxDose = Math.max(Number(elements.maxDose.value) || 0, 0.1);
    state.inference.isOverridden = true;
  } else {
    const routeChanged = previousRoute !== state.settings.medicationRoute;
    const drugChanged =
      normalizeDrugName(previousDrug) !== normalizeDrugName(state.settings.medicationName);

    refreshInference({ preserveManual: !(routeChanged || drugChanged) });
  }

  elements.doseRoute.value = state.settings.medicationRoute;
  render();
});

elements.applyInferenceButton.addEventListener('click', () => {
  applyInferredMaxDose();
  render();
});

elements.exportJsonButton.addEventListener('click', () => {
  exportDataAsJson();
});

elements.exportCsvButton.addEventListener('click', () => {
  exportDataAsCsv();
});

elements.importJsonButton.addEventListener('click', () => {
  elements.importFileInput.click();
});

elements.importFileInput.addEventListener('change', async event => {
  const file = event.target.files[0];
  if (file) {
    await importDataFromJson(file);
  }
});

elements.clearDataButton.addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all dose events? This cannot be undone.')) {
    await clearDoseEvents();
  }
});

elements.saveProfileButton.addEventListener('click', async () => {
  await saveProfile();
});

elements.loadProfileButton.addEventListener('click', async () => {
  await loadProfiles();
});

elements.authForm.addEventListener('submit', async event => {
  event.preventDefault();
  await handleAuthSubmit();
});

elements.authToggleButton.addEventListener('click', () => {
  state.auth.mode = state.auth.mode === 'login' ? 'register' : 'login';
  renderAuthState();
});

elements.authLogoutButton.addEventListener('click', async () => {
  clearAuthSession();
  renderAuthState();
  await loadProfiles();
});

elements.setTodayButton.addEventListener('click', () => {
  elements.doseDate.value = formatDateInput(new Date());
});

elements.setThreeYearButton.addEventListener('click', () => {
  state.settings.timeframe = '3y';
  render();
});

elements.cancelEditButton.addEventListener('click', () => {
  resetDoseForm();
  render();
});

elements.profileSearch.addEventListener('input', event => {
  state.profileSearch = event.target.value.trim().toLowerCase();
  renderProfileList();
});

elements.generateRandomProfileButton.addEventListener('click', () => {
  generateRandomMedGrafProfile();
  renderRandomProfile();
});

elements.doseForm.addEventListener('submit', async event => {
  event.preventDefault();

  const date = elements.doseDate.value;
  const route = elements.doseRoute.value;
  const amount = Number(elements.doseAmount.value);

  if (!date || Number.isNaN(amount) || amount < 0) {
    return;
  }

  const nextEvent = { date, route, amount };
  const editingDoseIndex = state.doseEvents.findIndex(item => item.id === state.editingDoseId);
  const editingDose = editingDoseIndex >= 0 ? state.doseEvents[editingDoseIndex] : null;

  if (editingDose) {
    const updatedPayload = normalizeDoseEvent({
      ...editingDose,
      ...nextEvent,
    });

    if (!String(editingDose.id).startsWith('local-') && !String(editingDose.id).startsWith('seed-')) {
      try {
        const updated = await apiPut(`/doses/${editingDose.id}`, nextEvent);
        state.doseEvents.splice(editingDoseIndex, 1, normalizeDoseEvent(updated));
      } catch (error) {
        console.warn('Updating dose locally because API update failed:', error);
        state.doseEvents.splice(editingDoseIndex, 1, updatedPayload);
      }
    } else {
      state.doseEvents.splice(editingDoseIndex, 1, updatedPayload);
    }
  } else {
    try {
      const created = await apiPost('/doses', nextEvent);
      state.doseEvents.push(normalizeDoseEvent(created));
    } catch (error) {
      console.warn('Saving dose locally because API create failed:', error);
      state.doseEvents.push({
        id: `local-${Date.now()}`,
        ...nextEvent,
      });
    }
  }

  state.doseEvents.sort((a, b) => a.date.localeCompare(b.date));
  resetDoseForm();
  render();
});

elements.eventsTableBody.addEventListener('click', async event => {
  const button = event.target.closest('button[data-index]');

  if (!button) {
    return;
  }

  const index = Number(button.dataset.index);
  const doseEvent = state.doseEvents[index];

  if (!doseEvent) {
    return;
  }

  if (button.dataset.action === 'edit') {
    startEditingDoseEvent(doseEvent);
    return;
  }

  if (!String(doseEvent.id).startsWith('local-') && !String(doseEvent.id).startsWith('seed-')) {
    try {
      await apiDelete(`/doses/${doseEvent.id}`);
    } catch (error) {
      console.warn('Removing dose locally because API delete failed:', error);
    }
  }

  state.doseEvents.splice(index, 1);
  render();
});

elements.profileList.addEventListener('click', async event => {
  const button = event.target.closest('button[data-profile-id]');

  if (!button) {
    return;
  }

  const profileId = button.dataset.profileId;

  if (button.dataset.action === 'load') {
    loadProfile(profileId);
    return;
  }

  if (button.dataset.action === 'rename') {
    await renameProfile(profileId);
    return;
  }

  if (button.dataset.action === 'delete') {
    await deleteProfile(profileId);
  }
});

async function initialize() {
  await hydrateAuthSession();
  await loadDrugReferenceLibrary();
  await loadCardiovascularDrugLibrary();
  await loadDoseEvents();
  await loadProfiles();
  generateRandomMedGrafProfile();
  refreshInference({ preserveManual: false });
  render();
}

async function loadDrugReferenceLibrary() {
  const candidatePaths = ['./drug-library.json', '../drug-library.json'];

  try {
    let response = null;

    for (const path of candidatePaths) {
      const attempt = await fetch(path);
      if (attempt.ok) {
        response = attempt;
        break;
      }
    }

    if (!response) {
      throw new Error('Unable to load drug-library.json from known paths');
    }

    drugReferenceLibrary = await response.json();
    renderMedicationSuggestions();
  } catch (error) {
    console.error(error);
    drugReferenceLibrary = [];
    elements.inferenceSummary.textContent =
      'Reference library failed to load. Inference is unavailable until drug-library.json is served correctly.';
  }
}

async function loadCardiovascularDrugLibrary() {
  const candidatePaths = ['./data/drugs.json', '../data/drugs.json'];

  try {
    let response = null;

    for (const path of candidatePaths) {
      const attempt = await fetch(path);
      if (attempt.ok) {
        response = attempt;
        break;
      }
    }

    if (!response) {
      throw new Error('Unable to load cardiovascular source data from known paths');
    }

    const library = await response.json();
    state.cardiovascularDrugs = library.filter(drug => isCardiovascularDrugClass(drug.drugClass));
    renderMedicationSuggestions();
  } catch (error) {
    console.error(error);
    state.cardiovascularDrugs = [];
  }
}

async function loadDoseEvents() {
  try {
    const apiDoses = await apiGet('/doses');
    state.doseEvents = apiDoses
      .map(normalizeDoseEvent)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.warn('Falling back to seeded dose events:', error);
    state.doseEvents = seedDoseEvents();
  }
}

function render() {
  const range = buildRange(state.settings.timeframe);
  const filteredEvents = getFilteredEvents();
  const dailyPoints = buildDailySeries(
    range.startDate,
    range.endDate,
    filteredEvents,
    state.settings.maxDose
  );
  const chartPoints = bucketSeries(dailyPoints);
  const metrics = summarize(dailyPoints);

  syncFormFromState();
  renderReferenceState();
  renderEventsTable(filteredEvents);
  renderMetrics(metrics);
  renderNarrative(range, metrics);
  renderChart(chartPoints);
  renderAuthState();
  renderWorkspaceSummary();
  renderDoseFormState();
  renderRandomProfile();
}

function renderAuthState() {
  const isAuthenticated = Boolean(state.auth.token && state.auth.account);
  const mode = state.auth.mode;
  const account = state.auth.account;

  elements.authNameLabel.classList.toggle('hidden', mode !== 'register' || isAuthenticated);
  elements.authToggleButton.classList.toggle('hidden', isAuthenticated);
  elements.authLogoutButton.classList.toggle('hidden', !isAuthenticated);
  elements.authSubmitButton.classList.toggle('hidden', isAuthenticated);
  elements.authEmail.disabled = isAuthenticated;
  elements.authPassword.disabled = isAuthenticated;
  elements.authName.disabled = isAuthenticated;
  elements.authSubmitButton.textContent = mode === 'login' ? 'Login' : 'Register';
  elements.authToggleButton.textContent =
    mode === 'login' ? 'Need an account?' : 'Have an account?';

  if (isAuthenticated) {
    elements.authStatusText.textContent = `Signed in as ${account.name || account.email}. Backend profile persistence is active.`;
  } else {
    elements.authStatusText.textContent =
      'Not signed in. Profiles will stay local until you authenticate.';
  }
}

function syncFormFromState() {
  elements.medicationName.value = state.settings.medicationName;
  elements.patientName.value = state.settings.patientName;
  elements.medicationRoute.value = state.settings.medicationRoute;
  elements.doseUnit.value = state.settings.doseUnit;
  elements.maxDose.value = state.settings.maxDose;
  elements.timeframe.value = state.settings.timeframe;
  elements.doseDate.value = elements.doseDate.value || formatDateInput(new Date());
  elements.doseRoute.value = state.settings.medicationRoute;
}

function renderWorkspaceSummary() {
  const filteredEvents = getFilteredEvents();
  const lastEvent = filteredEvents.length ? filteredEvents[filteredEvents.length - 1] : null;
  const referenceLabel = state.inference.match
    ? `${state.inference.match.drug} ${state.inference.match.route}${state.inference.isOverridden ? ' adjusted' : ' inferred'}`
    : 'Manual ceiling';

  elements.workspacePatient.textContent = state.settings.patientName;
  elements.workspaceMedication.textContent = state.settings.medicationName;
  elements.workspaceRoute.textContent = state.settings.medicationRoute;
  elements.workspaceTimeframe.textContent = formatTimeframeLabel(state.settings.timeframe);
  elements.workspaceMaxDose.textContent = `${formatNumber(state.settings.maxDose)} ${state.settings.doseUnit}`;
  elements.workspaceInference.textContent = referenceLabel;
  elements.workspaceEventCount.textContent = `${filteredEvents.length} recorded`;
  elements.workspaceLastEvent.textContent = lastEvent
    ? `Latest ${formatDisplayDate(new Date(`${lastEvent.date}T00:00:00`))} · ${formatNumber(lastEvent.amount)} ${displayEventUnit()}`
    : 'No doses yet';
}

function renderDoseFormState() {
  const isEditing = Boolean(state.editingDoseId);
  elements.cancelEditButton.classList.toggle('hidden', !isEditing);
  elements.doseFormHeading.textContent = isEditing ? 'Edit dose event' : 'Add a dose event';
  elements.doseFormHint.textContent = isEditing
    ? 'Update the recorded dose, route, or date and save the revision.'
    : 'Record one administered daily dose for the selected medication and route.';
  elements.doseSubmitButton.textContent = isEditing ? 'Update Dose Event' : 'Add Dose Event';
}

function renderMedicationSuggestions() {
  const suggestions = [
    ...drugReferenceLibrary.map(entry => entry.drug).filter(Boolean),
    ...state.cardiovascularDrugs.map(entry => entry.name).filter(Boolean),
  ];
  const uniqueSuggestions = [...new Set(suggestions)].sort((a, b) => a.localeCompare(b));

  elements.medicationSuggestions.innerHTML = uniqueSuggestions
    .map(name => `<option value="${escapeHtml(name)}"></option>`)
    .join('');
}

function refreshInference({ preserveManual }) {
  const matches = findReferenceMatches(
    state.settings.medicationName,
    state.settings.medicationRoute
  );

  state.inference.matches = matches;
  state.inference.match = matches[0] || null;

  if (!preserveManual) {
    state.inference.isOverridden = false;
  }

  if (state.inference.match && !state.inference.isOverridden) {
    state.settings.maxDose = state.inference.match.maxDose;
    state.settings.doseUnit = state.inference.match.unit;
  }
}

function applyInferredMaxDose() {
  if (!state.inference.match) {
    return;
  }

  state.settings.maxDose = state.inference.match.maxDose;
  state.settings.doseUnit = state.inference.match.unit;
  state.inference.isOverridden = false;
}

function renderReferenceState() {
  const match = state.inference.match;

  elements.applyInferenceButton.disabled = !match;

  if (!match) {
    elements.inferenceStatus.textContent = 'No reference match';
    elements.inferenceStatus.className = 'reference-pill';
    elements.inferenceSummary.textContent =
      'No built-in drug + route reference matched the current regimen. Enter the reference max dose manually.';
    elements.referenceList.innerHTML = '';
    return;
  }

  if (state.inference.isOverridden) {
    elements.inferenceStatus.textContent = 'Manual override active';
    elements.inferenceStatus.className = 'reference-pill overridden';
    elements.inferenceSummary.textContent = `Matched ${match.drug} ${match.route} at ${formatNumber(match.maxDose)} ${match.unit}, but the current max dose has been manually adjusted.`;
  } else {
    elements.inferenceStatus.textContent = 'Auto-inferred reference applied';
    elements.inferenceStatus.className = 'reference-pill matched';
    elements.inferenceSummary.textContent = `Using ${formatNumber(match.maxDose)} ${match.unit} for ${match.drug} ${match.route} from the built-in starter library.`;
  }

  elements.referenceList.innerHTML = state.inference.matches
    .map(
      entry => `
        <article class="reference-card">
          <h3>${entry.drug} ${entry.route}</h3>
          <p><strong>Reference max:</strong> ${formatNumber(entry.maxDose)} ${entry.unit}</p>
          <p><strong>Source:</strong> ${entry.source}</p>
          <p>${entry.note}</p>
        </article>
      `
    )
    .join('');
}

function renderEventsTable(filteredEvents) {
  const maxDose = state.settings.maxDose;

  if (!filteredEvents.length) {
    elements.eventsTableBody.innerHTML = `<tr><td colspan="5">No ${state.settings.medicationRoute} dose events in the current view yet.</td></tr>`;
    return;
  }

  elements.eventsTableBody.innerHTML = filteredEvents
    .map(event => {
      const percent = ((event.amount / maxDose) * 100).toFixed(1);
      const index = state.doseEvents.indexOf(event);

      return `
        <tr>
          <td class="mono">${event.date}</td>
          <td>${event.route}</td>
          <td>${formatNumber(event.amount)} ${displayEventUnit()}</td>
          <td>${percent}%</td>
          <td>
            <button class="table-action secondary" data-action="edit" data-index="${index}">Edit</button>
            <button class="table-action" data-action="remove" data-index="${index}">Remove</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function startEditingDoseEvent(doseEvent) {
  state.editingDoseId = doseEvent.id;
  elements.doseDate.value = doseEvent.date;
  elements.doseRoute.value = doseEvent.route;
  elements.doseAmount.value = doseEvent.amount;
  renderDoseFormState();
  elements.doseAmount.focus();
  elements.doseForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetDoseForm() {
  state.editingDoseId = null;
  elements.doseForm.reset();
  elements.doseDate.value = formatDateInput(new Date());
  elements.doseRoute.value = state.settings.medicationRoute;
  elements.doseAmount.value = '';
}

function renderMetrics(metrics) {
  elements.headlinePercent.textContent = `${metrics.averagePercent.toFixed(1)}%`;
  elements.averagePercent.textContent = `${metrics.averagePercent.toFixed(1)}%`;
  elements.peakPercent.textContent = `${metrics.peakPercent.toFixed(1)}%`;
  elements.totalDose.textContent = `${formatNumber(metrics.totalDose)} ${displayEventUnit()}`;
  elements.highDays.textContent = `${metrics.daysAbove80}`;
}

function renderNarrative(range, metrics) {
  elements.chartSubtitle.textContent = `${state.settings.medicationName} ${state.settings.medicationRoute} for ${state.settings.patientName}, expressed as a percentage of ${formatNumber(state.settings.maxDose)} ${state.settings.doseUnit}.`;
  elements.rangeText.textContent = `${formatDisplayDate(range.startDate)} through ${formatDisplayDate(range.endDate)} (${range.totalDays} days).`;

  let riskBand = 'well below';

  if (metrics.averagePercent >= 80) {
    riskBand = 'near or above';
  } else if (metrics.averagePercent >= 50) {
    riskBand = 'approaching';
  }

  const referenceText = state.inference.match
    ? `The current max dose is anchored to a listed reference entry for ${state.inference.match.drug} ${state.inference.match.route}${state.inference.isOverridden ? ', then manually adjusted' : ''}.`
    : 'No reference entry was found, so the current max dose is fully manual.';

  elements.interpretationText.textContent = `${state.settings.medicationName} ${state.settings.medicationRoute} averaged ${metrics.averagePercent.toFixed(1)}% of the patient-specific maximum dose during the selected window, with a peak daily exposure of ${metrics.peakPercent.toFixed(1)}%. This pattern is ${riskBand} the defined ceiling on average, and ${metrics.daysAbove80} day(s) exceeded 80% of max. ${referenceText}`;
}

function renderChart(points) {
  const canvas = elements.doseChart;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 22, right: 22, bottom: 54, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxY = Math.max(100, ...points.map(point => point.percentOfMax), 10);

  ctx.clearRect(0, 0, width, height);

  drawRoundedRect(ctx, 0, 0, width, height, 18, '#fffaf5');
  drawGrid(ctx, padding, chartWidth, chartHeight, maxY);

  if (!points.length) {
    return;
  }

  const xStep = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth / 2;

  ctx.save();
  ctx.beginPath();

  points.forEach((point, index) => {
    const x = padding.left + xStep * index;
    const y = padding.top + chartHeight - (point.percentOfMax / maxY) * chartHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0d7c66';
  ctx.stroke();

  ctx.lineTo(padding.left + xStep * (points.length - 1), padding.top + chartHeight);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.closePath();
  ctx.fillStyle = 'rgba(13, 124, 102, 0.14)';
  ctx.fill();
  ctx.restore();

  points.forEach((point, index) => {
    if (
      points.length > 36 &&
      index % Math.ceil(points.length / 12) !== 0 &&
      index !== points.length - 1
    ) {
      return;
    }

    const x = padding.left + xStep * index;
    const y = padding.top + chartHeight - (point.percentOfMax / maxY) * chartHeight;

    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = point.percentOfMax >= 80 ? '#bc6c25' : '#0d7c66';
    ctx.fill();

    ctx.fillStyle = '#69594b';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(shortDate(point.date), x, padding.top + chartHeight + 22);
  });
}

function renderRandomProfile() {
  renderRandomProfileSummary();
  renderRandomProfileChart();
}

function renderRandomProfileSummary() {
  const { drugs, regimens, startDate, endDate } = state.randomProfile;

  if (!drugs.length) {
    elements.randomProfileMeta.textContent =
      'Cardiovascular reference data was not available for random generation.';
    elements.randomProfileSummary.innerHTML =
      '<p class="empty-state">Unable to build a random cardiovascular medication profile.</p>';
    return;
  }

  elements.randomProfileMeta.textContent = `${formatDisplayDate(startDate)} through ${formatDisplayDate(endDate)} · ${drugs.length} cardiovascular medications`;
  elements.randomProfileSummary.innerHTML = drugs
    .map(
      (drug, index) => `
        <article class="generator-drug-card">
          <p class="card-label">${drug.drugClass}</p>
          <h3>${drug.name}</h3>
          <p><strong>Reference max daily dose:</strong> ${formatNumber(drug.maxDailyDose)} ${drug.unit}</p>
          <p>${drug.notes || 'Bundled demo ceiling used to generate a synthetic percent-of-max trend.'}</p>
          <div class="generator-regimen">
            ${regimens[index]
              .map(
                segment => `
                  <p>
                    <strong>${segment.label} ${formatNumber(segment.dose)} ${drug.unit}/day</strong>:
                    ${formatDisplayDate(segment.startDate)} to
                    ${segment.status === 'ongoing'
                      ? 'present and continuing'
                      : formatDisplayDate(segment.endDate)}
                    (${segment.percentOfMax.toFixed(0)}% max)
                  </p>
                `
              )
              .join('')}
            ${regimens[index].some(segment => segment.status === 'discontinued')
              ? `<p><strong>Discontinued:</strong> ${formatDisplayDate(regimens[index][regimens[index].length - 1].endDate)}</p>`
              : ''}
          </div>
        </article>
      `
    )
    .join('');
}

function renderRandomProfileChart() {
  const canvas = elements.randomProfileCanvas;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 26, right: 30, bottom: 56, left: 64 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const colors = ['#0d7c66', '#2956bf', '#bc6c25'];
  const points = state.randomProfile.points;

  ctx.clearRect(0, 0, width, height);
  drawRoundedRect(ctx, 0, 0, width, height, 18, '#fffaf5');
  drawRandomProfileGrid(ctx, padding, chartWidth, chartHeight);

  if (!points.length) {
    return;
  }

  const xStep = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth / 2;

  state.randomProfile.drugs.forEach((drug, drugIndex) => {
    ctx.save();
    ctx.beginPath();

    points.forEach((point, pointIndex) => {
      const x = padding.left + xStep * pointIndex;
      const y = padding.top + chartHeight - (point.values[drugIndex] / 100) * chartHeight;

      if (pointIndex === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, points[pointIndex - 1].values[drugIndex] === point.values[drugIndex]
          ? y
          : padding.top + chartHeight - (points[pointIndex - 1].values[drugIndex] / 100) * chartHeight);
        ctx.lineTo(x, y);
      }
    });

    ctx.lineWidth = 3;
    ctx.strokeStyle = colors[drugIndex % colors.length];
    ctx.stroke();
    ctx.restore();

    points.forEach((point, pointIndex) => {
      const showPoint = pointIndex % 6 === 0 || pointIndex === points.length - 1;
      if (!showPoint) {
        return;
      }

      const x = padding.left + xStep * pointIndex;
      const y = padding.top + chartHeight - (point.values[drugIndex] / 100) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = colors[drugIndex % colors.length];
      ctx.fill();
    });

    ctx.fillStyle = colors[drugIndex % colors.length];
    ctx.fillRect(padding.left + drugIndex * 230, 16, 14, 14);
    ctx.fillStyle = '#43301c';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(drug.name, padding.left + 20 + drugIndex * 230, 28);
  });

  points.forEach((point, index) => {
    const showLabel = index % 6 === 0 || index === points.length - 1;
    if (!showLabel) {
      return;
    }

    const x = padding.left + xStep * index;
    ctx.fillStyle = '#69594b';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(shortDate(point.date), x, padding.top + chartHeight + 22);
    ctx.fillText(new Date(`${point.date}T00:00:00`).getFullYear(), x, padding.top + chartHeight + 38);
  });

  ctx.save();
  ctx.translate(16, padding.top + chartHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#69594b';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('% Max Daily Dose', 0, 0);
  ctx.restore();

  ctx.fillStyle = '#69594b';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Time (Calendar Dates)', padding.left + chartWidth / 2, height - 10);
}

function drawRandomProfileGrid(ctx, padding, chartWidth, chartHeight) {
  const rows = 5;

  for (let row = 0; row <= rows; row += 1) {
    const y = padding.top + (chartHeight / rows) * row;
    const value = 100 - (100 / rows) * row;

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.strokeStyle = 'rgba(67, 48, 28, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#69594b';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${value.toFixed(0)}%`, padding.left - 10, y + 4);
  }

  const thresholdY = padding.top + chartHeight - 0.8 * chartHeight;
  ctx.beginPath();
  ctx.moveTo(padding.left, thresholdY);
  ctx.lineTo(padding.left + chartWidth, thresholdY);
  ctx.strokeStyle = 'rgba(188, 108, 37, 0.55)';
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawGrid(ctx, padding, chartWidth, chartHeight, maxY) {
  const rows = 5;

  for (let row = 0; row <= rows; row += 1) {
    const y = padding.top + (chartHeight / rows) * row;
    const value = maxY - (maxY / rows) * row;

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.strokeStyle = 'rgba(67, 48, 28, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#69594b';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${value.toFixed(0)}%`, padding.left - 10, y + 4);
  }

  const dangerY = padding.top + chartHeight - (80 / maxY) * chartHeight;
  ctx.beginPath();
  ctx.moveTo(padding.left, dangerY);
  ctx.lineTo(padding.left + chartWidth, dangerY);
  ctx.strokeStyle = 'rgba(188, 108, 37, 0.55)';
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRoundedRect(ctx, x, y, width, height, radius, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fill();
}

function buildRange(timeframe) {
  const endDate = getTimelineAnchorDate();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);

  switch (timeframe) {
    case '1d':
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 6);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setDate(startDate.getDate() + 1);
      break;
    case '2y':
      startDate.setFullYear(startDate.getFullYear() - 2);
      startDate.setDate(startDate.getDate() + 1);
      break;
    case '3y':
      startDate.setFullYear(startDate.getFullYear() - 3);
      startDate.setDate(startDate.getDate() + 1);
      break;
    case '5y':
      startDate.setFullYear(startDate.getFullYear() - 5);
      startDate.setDate(startDate.getDate() + 1);
      break;
    case '10y':
      startDate.setFullYear(startDate.getFullYear() - 10);
      startDate.setDate(startDate.getDate() + 1);
      break;
    default:
      break;
  }

  return {
    startDate,
    endDate,
    totalDays: Math.round((endDate - startDate) / MS_PER_DAY) + 1,
  };
}

function buildDailySeries(startDate, endDate, events, maxDose) {
  const totals = new Map();

  events.forEach(event => {
    if (!totals.has(event.date)) {
      totals.set(event.date, 0);
    }
    totals.set(event.date, totals.get(event.date) + event.amount);
  });

  const dayCount = Math.round((endDate - startDate) / MS_PER_DAY) + 1;
  const points = [];

  for (let offset = 0; offset < dayCount; offset += 1) {
    const current = new Date(startDate.getTime() + offset * MS_PER_DAY);
    const key = formatDateInput(current);
    const dose = totals.get(key) || 0;
    points.push({
      date: formatDateInput(current),
      averageDose: dose,
      totalDose: dose,
      bucketDays: 1,
      percentOfMax: maxDose > 0 ? (dose / maxDose) * 100 : 0,
    });
  }

  return points;
}

function summarize(points) {
  if (!points.length) {
    return {
      averagePercent: 0,
      peakPercent: 0,
      totalDose: 0,
      daysAbove80: 0,
    };
  }

  const totalDose = points.reduce((sum, point) => sum + point.totalDose, 0);
  const averagePercent = points.reduce((sum, point) => sum + point.percentOfMax, 0) / points.length;
  const peakPercent = Math.max(...points.map(point => point.percentOfMax));
  const daysAbove80 = points.filter(point => point.percentOfMax >= 80).length;

  return {
    averagePercent,
    peakPercent,
    totalDose,
    daysAbove80,
  };
}

function getFilteredEvents() {
  return state.doseEvents.filter(event => event.route === state.settings.medicationRoute);
}

function bucketSeries(points) {
  if (!points.length) {
    return [];
  }

  const targetPoints = choosePointCount(points.length);
  const bucketSize = Math.max(1, Math.ceil(points.length / targetPoints));
  const buckets = [];

  for (let index = 0; index < points.length; index += bucketSize) {
    const bucketPoints = points.slice(index, index + bucketSize);
    const totalDose = bucketPoints.reduce((sum, point) => sum + point.totalDose, 0);
    const bucketDays = bucketPoints.length;
    const averageDose = totalDose / bucketDays;
    const percentOfMax =
      bucketPoints.reduce((sum, point) => sum + point.percentOfMax, 0) / bucketDays;

    buckets.push({
      date: bucketPoints[0].date,
      averageDose,
      totalDose,
      bucketDays,
      percentOfMax,
    });
  }

  return buckets;
}

function findReferenceMatches(drugName, route) {
  const normalizedName = normalizeDrugName(drugName);

  return drugReferenceLibrary.filter(entry => {
    if (entry.route !== route) {
      return false;
    }

    const names = [entry.drug, ...(entry.aliases || [])].map(normalizeDrugName);
    return names.includes(normalizedName);
  });
}

function normalizeDrugName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function choosePointCount(dayCount) {
  if (dayCount <= 14) {
    return dayCount;
  }

  if (dayCount <= 120) {
    return 30;
  }

  if (dayCount <= 365 * 3) {
    return 36;
  }

  return 48;
}

function generateRandomMedGrafProfile() {
  const sourceDrugs = state.cardiovascularDrugs.length
    ? state.cardiovascularDrugs
    : [
        {
          id: 'fallback-atorvastatin',
          name: 'Atorvastatin',
          drugClass: 'Statin',
          maxDailyDose: 80,
          unit: 'mg',
          notes: 'Fallback cardiovascular demo entry.',
        },
        {
          id: 'fallback-losartan',
          name: 'Losartan',
          drugClass: 'ARB',
          maxDailyDose: 100,
          unit: 'mg',
          notes: 'Fallback cardiovascular demo entry.',
        },
        {
          id: 'fallback-lisinopril',
          name: 'Lisinopril',
          drugClass: 'ACE inhibitor',
          maxDailyDose: 40,
          unit: 'mg',
          notes: 'Fallback cardiovascular demo entry.',
        },
        {
          id: 'fallback-amlodipine',
          name: 'Amlodipine',
          drugClass: 'Calcium channel blocker',
          maxDailyDose: 10,
          unit: 'mg',
          notes: 'Fallback cardiovascular demo entry.',
        },
      ];

  const selectedDrugs = shuffleArray([...sourceDrugs]).slice(0, 3);
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - 3);
  startDate.setDate(startDate.getDate() + 1);

  const monthCount = 37;
  const regimens = selectedDrugs.map(drug => createRandomMedicationSchedule(drug, startDate, endDate));

  const points = Array.from({ length: monthCount }, (_, index) => {
    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + index);

    const values = regimens.map((segments, regimenIndex) => {
      const activeSegment = segments.find(segment => {
        const segmentStart = formatDateInput(segment.startDate);
        const segmentEnd = formatDateInput(segment.endDate);
        const currentKey = formatDateInput(currentDate);
        return currentKey >= segmentStart && currentKey <= segmentEnd;
      });
      if (!activeSegment) {
        return 0;
      }

      return (activeSegment.dose / selectedDrugs[regimenIndex].maxDailyDose) * 100;
    });

    return {
      date: formatDateInput(currentDate),
      values,
    };
  });

  state.randomProfile = {
    drugs: selectedDrugs,
    points,
    regimens,
    startDate,
    endDate: new Date(`${points[points.length - 1].date}T00:00:00`),
  };
}

function createRandomMedicationSchedule(drug, globalStartDate, globalEndDate) {
  const doseOptions = buildOrdinalDoseOptions(drug);
  const titrationRule = getTitrationRule(drug);
  const initiationOffsetMonths = randomIntBetween(0, 12);
  const regimenStart = addMonths(globalStartDate, initiationOffsetMonths);
  const segmentCount = randomIntBetween(2, 4);
  const remainingMonths = Math.max(6, monthsBetween(regimenStart, globalEndDate));
  const boundaries = [0];
  const discontinueEarly =
    remainingMonths >= 10 && Math.random() < titrationRule.discontinueProbability;
  const stopMonth =
    discontinueEarly
      ? randomIntBetween(
          Math.min(remainingMonths - 3, 8),
          Math.max(Math.min(remainingMonths - 3, 8), remainingMonths - 2)
        )
      : remainingMonths;
  const scheduleEndDate = discontinueEarly
    ? addDays(addMonths(regimenStart, stopMonth), -1)
    : new Date(globalEndDate);

  for (let index = 1; index < segmentCount; index += 1) {
    const minBoundary = index * 3;
    const maxBoundary = stopMonth - (segmentCount - index) * 3;
    boundaries.push(randomIntBetween(minBoundary, Math.max(minBoundary, maxBoundary)));
  }

  boundaries.sort((a, b) => a - b);

  let optionIndex = titrationRule.startIndex(doseOptions.length);
  const segments = boundaries.map((boundary, index) => {
    if (index > 0) {
      optionIndex = chooseNextDoseIndex(optionIndex, doseOptions.length, titrationRule);
    }

    const segmentStart = addMonths(regimenStart, boundary);
    const segmentEnd =
      index === boundaries.length - 1
        ? new Date(scheduleEndDate)
        : addDays(addMonths(regimenStart, boundaries[index + 1]), -1);
    const dose = doseOptions[optionIndex];

    return {
      startDate: segmentStart,
      endDate: segmentEnd,
      dose,
      percentOfMax: (dose / drug.maxDailyDose) * 100,
      status:
        index === boundaries.length - 1
          ? discontinueEarly
            ? 'discontinued'
            : 'ongoing'
          : 'active',
      label:
        index === 0
          ? 'Started at'
          : dose > doseOptions[titrationRule.previousIndex ?? optionIndex]
            ? 'Titrated to'
            : dose < doseOptions[titrationRule.previousIndex ?? optionIndex]
              ? 'Reduced to'
              : 'Continued at',
    };
  });

  for (let index = 1; index < segments.length; index += 1) {
    const previousDose = segments[index - 1].dose;
    if (segments[index].dose > previousDose) {
      segments[index].label = 'Titrated to';
    } else if (segments[index].dose < previousDose) {
      segments[index].label = 'Reduced to';
    } else {
      segments[index].label = 'Continued at';
    }
  }

  return segments;
}

function buildOrdinalDoseOptions(drug) {
  const commonDoseMap = {
    amlodipine: [2.5, 5, 10],
    losartan: [25, 50, 100],
    lisinopril: [2.5, 5, 10, 20, 40],
    atorvastatin: [10, 20, 40, 80],
    simvastatin: [5, 10, 20, 40],
    metoprolol: [25, 50, 100, 200],
    carvedilol: [3.125, 6.25, 12.5, 25, 50],
    hydrochlorothiazide: [12.5, 25, 50],
    chlorthalidone: [12.5, 25, 50],
    valsartan: [40, 80, 160, 320],
  };

  const normalizedName = normalizeDrugName(drug.name || drug.genericName || '');

  for (const [name, doses] of Object.entries(commonDoseMap)) {
    if (normalizedName.includes(name)) {
      return doses.filter(dose => dose <= drug.maxDailyDose);
    }
  }

  const maxDose = Number(drug.maxDailyDose) || 100;
  const candidates = [
    maxDose / 4,
    maxDose / 2,
    (maxDose * 3) / 4,
    maxDose,
  ];

  return [...new Set(candidates.map(value => roundDose(value)).filter(value => value > 0))];
}

function chooseNextDoseIndex(currentIndex, totalOptions, titrationRule = getDefaultTitrationRule()) {
  const weightedMoves = [
    ...Array(titrationRule.downWeight).fill(-1),
    ...Array(titrationRule.holdWeight).fill(0),
    ...Array(titrationRule.upWeight).fill(1),
  ].filter(move => {
    const nextIndex = currentIndex + move;
    return nextIndex >= 0 && nextIndex < totalOptions;
  });
  const nextMove = weightedMoves[randomIntBetween(0, weightedMoves.length - 1)];
  return currentIndex + nextMove;
}

function getTitrationRule(drug) {
  const normalizedName = normalizeDrugName(drug.name || drug.genericName || '');
  const normalizedClass = String(drug.drugClass || '').toLowerCase();

  if (normalizedName.includes('amlodipine') || normalizedClass.includes('calcium channel')) {
    return {
      ...getDefaultTitrationRule(),
      upWeight: 4,
      holdWeight: 3,
      downWeight: 1,
      discontinueProbability: 0.04,
      startIndex: () => 0,
    };
  }

  if (
    normalizedName.includes('losartan') ||
    normalizedName.includes('valsartan') ||
    normalizedClass.includes('arb')
  ) {
    return {
      ...getDefaultTitrationRule(),
      upWeight: 4,
      holdWeight: 2,
      downWeight: 1,
      discontinueProbability: 0.05,
      startIndex: totalOptions => Math.min(1, totalOptions - 1),
    };
  }

  if (normalizedName.includes('lisinopril') || normalizedClass.includes('ace')) {
    return {
      ...getDefaultTitrationRule(),
      upWeight: 4,
      holdWeight: 2,
      downWeight: 1,
      discontinueProbability: 0.06,
      startIndex: totalOptions => Math.min(1, totalOptions - 1),
    };
  }

  if (normalizedClass.includes('statin')) {
    return {
      ...getDefaultTitrationRule(),
      upWeight: 3,
      holdWeight: 4,
      downWeight: 1,
      discontinueProbability: 0.03,
      startIndex: totalOptions => Math.min(1, totalOptions - 1),
    };
  }

  if (normalizedClass.includes('diuretic')) {
    return {
      ...getDefaultTitrationRule(),
      upWeight: 2,
      holdWeight: 4,
      downWeight: 2,
      discontinueProbability: 0.07,
      startIndex: () => 0,
    };
  }

  return getDefaultTitrationRule();
}

function getDefaultTitrationRule() {
  return {
    upWeight: 3,
    holdWeight: 3,
    downWeight: 1,
    discontinueProbability: 0.05,
    startIndex: totalOptions => Math.max(0, Math.min(totalOptions - 1, 0)),
  };
}

function isCardiovascularDrugClass(drugClass = '') {
  const normalized = String(drugClass).trim().toLowerCase();

  return (
    normalized.includes('cardio') ||
    normalized.includes('statin') ||
    normalized.includes('ace') ||
    normalized.includes('arb') ||
    normalized.includes('calcium channel') ||
    normalized.includes('beta') ||
    normalized.includes('diuretic')
  );
}

function shuffleArray(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomIntBetween(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function roundDose(value) {
  if (value < 5) {
    return Math.round(value * 8) / 8;
  }

  if (value < 20) {
    return Math.round(value * 2) / 2;
  }

  return Math.round(value / 5) * 5;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function monthsBetween(startDate, endDate) {
  return Math.max(
    0,
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth())
  );
}

function displayEventUnit() {
  return state.settings.doseUnit.replace('/day', '');
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function shortDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatTimeframeLabel(timeframe) {
  const labels = {
    '1d': '1 day view',
    '7d': '1 week view',
    '1y': '1 year view',
    '2y': '2 year view',
    '3y': '3 year view',
    '5y': '5 year view',
    '10y': '10 year view',
  };

  return labels[timeframe] || timeframe;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function exportDataAsJson() {
  const data = {
    settings: state.settings,
    doseEvents: state.doseEvents.map(event =>
      Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'id'))
    ),
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `percent-dose-data-${formatDateInput(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportDataAsCsv() {
  const headers = ['Date', 'Route', 'Dose', 'Percent of Max'];
  const rows = state.doseEvents
    .filter(event => event.route === state.settings.medicationRoute)
    .map(event => {
      const percent = ((event.amount / state.settings.maxDose) * 100).toFixed(1);
      return [event.date, event.route, event.amount, percent];
    });

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `percent-dose-data-${formatDateInput(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importDataFromJson(file) {
  const text = await file.text();

  try {
    const data = JSON.parse(text);
    if (!data.settings || !data.doseEvents) {
      alert('Invalid file format. Please select a valid export file.');
      return;
    }

    state.settings = { ...state.settings, ...data.settings };
    state.doseEvents = data.doseEvents.map(normalizeDoseEvent);
    state.inference.isOverridden = true;
    resetDoseForm();
    render();
    alert('Data imported successfully!');
  } catch (error) {
    alert(`Error reading file: ${error.message}`);
  }
}

async function loadProfiles() {
  if (state.auth.account?.id) {
    try {
      const apiProfiles = await apiGet(`/accounts/${state.auth.account.id}/profiles`);
      state.profiles = apiProfiles.map(normalizeProfile);
      state.profileStorageMode = 'account';
      renderProfileList();
      return;
    } catch (error) {
      console.warn('Falling back to local profiles because account profile load failed:', error);
    }
  }

  const localProfiles = readLocalProfiles();
  if (localProfiles.length) {
    state.profiles = localProfiles;
    state.profileStorageMode = 'local';
    renderProfileList();
    return;
  }

  try {
    const response = await fetch('./profiles.json');
    if (!response.ok) {
      throw new Error(`Unable to load profiles.json (${response.status})`);
    }
    const fallbackProfiles = await response.json();
    state.profiles = fallbackProfiles.map(normalizeProfile);
    state.profileStorageMode = 'seeded';
  } catch (fallbackError) {
    console.error('Error loading profiles:', fallbackError);
    state.profiles = [];
    state.profileStorageMode = 'local';
  }

  renderProfileList();
}

async function saveProfile() {
  const profileName =
    elements.profileName.value.trim() ||
    `${state.settings.patientName} · ${state.settings.medicationName} · ${formatDateInput(new Date())}`;
  const graphState = buildStaticGraphStateSnapshot();

  const profilePayload = {
    name: profileName,
    payload: {
      settings: { ...state.settings },
      doseEvents: state.doseEvents.map(event =>
        Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'id'))
      ),
      graphState,
    },
  };

  if (state.auth.account?.id) {
    try {
      const createdProfile = await apiPost(
        `/accounts/${state.auth.account.id}/profiles`,
        profilePayload
      );
      state.profiles.push(normalizeProfile(createdProfile));
      state.profileStorageMode = 'account';
    } catch (error) {
      console.warn('Saving profile locally because API create failed:', error);
      const localProfile = normalizeProfile({
        id: `local-${Date.now()}`,
        name: profileName,
        payload: profilePayload.payload,
        createdAt: new Date().toISOString(),
      });
      state.profiles.push(localProfile);
      state.profileStorageMode = 'local';
      persistLocalProfiles();
    }
  } else {
    const localProfile = normalizeProfile({
      id: `local-${Date.now()}`,
      name: profileName,
      payload: profilePayload.payload,
      createdAt: new Date().toISOString(),
    });
    state.profiles.push(localProfile);
    state.profileStorageMode = 'local';
    persistLocalProfiles();
  }

  renderProfileList();
  elements.profileName.value = '';
}

function renderProfileList() {
  if (!state.profiles.length) {
    elements.profileStatusText.textContent = 'No saved profiles yet.';
    elements.profileList.innerHTML = '<p class="empty-state">No saved profiles yet.</p>';
    return;
  }

  const filteredProfiles = getVisibleProfiles();
  elements.profileStatusText.textContent = `${filteredProfiles.length} of ${state.profiles.length} profiles shown · ${formatProfileStorageSummary()}`;

  if (!filteredProfiles.length) {
    elements.profileList.innerHTML =
      '<p class="empty-state">No profiles match the current search.</p>';
    return;
  }

  elements.profileList.innerHTML = filteredProfiles
    .map(
      profile => `
      <div class="profile-item">
        <div class="profile-info">
          <h4>${escapeHtml(profile.name)}</h4>
          <p>${escapeHtml(profile.settings.medicationName)} (${escapeHtml(profile.settings.medicationRoute)}) · ${profile.doseEvents.length} dose events · ${formatProfileStorageLabel(profile)}</p>
          <p>Saved ${formatDisplayDate(new Date(profile.createdAt))}</p>
        </div>
        <div class="profile-actions">
          <button class="table-action secondary" data-action="load" data-profile-id="${profile.id}">Load</button>
          <button class="table-action secondary" data-action="rename" data-profile-id="${profile.id}">Rename</button>
          <button class="table-action" data-action="delete" data-profile-id="${profile.id}">Delete</button>
        </div>
      </div>
    `
    )
    .join('');
}

function loadProfile(profileId) {
  const profile = state.profiles.find(entry => entry.id === profileId);
  if (!profile) {
    alert('Profile not found.');
    return;
  }

  if (
    confirm(`Load profile "${profile.name}"? This will replace current settings and dose events.`)
  ) {
    restoreStaticGraphState(profile.graphState ?? null, profile.settings);
    state.doseEvents = profile.doseEvents.map(normalizeDoseEvent);
    resetDoseForm();
    render();
  }
}

async function deleteProfile(profileId) {
  const profile = state.profiles.find(entry => entry.id === profileId);
  if (!profile) {
    return;
  }

  if (!confirm(`Delete profile "${profile.name}"? This cannot be undone.`)) {
    return;
  }

  if (!String(profile.id).startsWith('local-')) {
    try {
      await apiDelete(`/profiles/${profile.id}`);
    } catch (error) {
      console.warn('Deleting profile locally because API delete failed:', error);
    }
  }

  state.profiles = state.profiles.filter(entry => entry.id !== profileId);
  if (String(profile.id).startsWith('local-') || state.profileStorageMode === 'local') {
    persistLocalProfiles();
  }
  renderProfileList();
}

async function renameProfile(profileId) {
  const profile = state.profiles.find(entry => entry.id === profileId);
  if (!profile) {
    return;
  }

  const nextName = prompt('Rename profile', profile.name)?.trim();
  if (!nextName || nextName === profile.name) {
    return;
  }

  if (!String(profile.id).startsWith('local-')) {
    try {
      const updated = await apiPut(`/profiles/${profile.id}`, { name: nextName });
      const index = state.profiles.findIndex(entry => entry.id === profileId);
      state.profiles.splice(index, 1, normalizeProfile(updated));
      renderProfileList();
      return;
    } catch (error) {
      console.warn('Renaming profile locally because API update failed:', error);
    }
  }

  profile.name = nextName;
  persistLocalProfiles();
  renderProfileList();
}

function getVisibleProfiles() {
  const query = state.profileSearch;
  const profiles = [...state.profiles].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  if (!query) {
    return profiles;
  }

  return profiles.filter(profile => {
    const haystack = [
      profile.name,
      profile.settings.patientName,
      profile.settings.medicationName,
      profile.settings.medicationRoute,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

function formatProfileStorageSummary() {
  if (state.profileStorageMode === 'account') {
    return 'account-backed';
  }

  if (state.profileStorageMode === 'seeded') {
    return 'seeded defaults';
  }

  return 'local-only';
}

async function clearDoseEvents() {
  const persistedEvents = state.doseEvents.filter(
    event => !String(event.id).startsWith('local-') && !String(event.id).startsWith('seed-')
  );

  try {
    await Promise.all(persistedEvents.map(event => apiDelete(`/doses/${event.id}`)));
  } catch (error) {
    console.warn('Clearing doses locally because API delete failed:', error);
  }

  state.doseEvents = [];
  resetDoseForm();
  render();
}

function normalizeDoseEvent(event) {
  return {
    id: event.id ?? `local-${event.date}-${event.route}-${event.amount}`,
    date: event.date,
    route: event.route,
    amount: Number(event.amount),
    notes: event.notes ?? '',
  };
}

function normalizeProfile(profile) {
  const payload = profile.payload ?? {};
  const settings = payload.settings ?? profile.settings ?? { ...state.settings };
  const doseEvents = payload.doseEvents ?? profile.doseEvents ?? [];
  const graphState = payload.graphState ?? profile.graphState ?? null;

  return {
    id: String(profile.id),
    name: profile.name,
    settings,
    graphState,
    doseEvents: doseEvents.map(normalizeDoseEvent),
    createdAt: profile.createdAt ?? new Date().toISOString(),
  };
}

function readLocalProfiles() {
  try {
    const stored = window.localStorage.getItem(LOCAL_PROFILES_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    return JSON.parse(stored).map(normalizeProfile);
  } catch (error) {
    console.warn('Failed to read local profiles:', error);
    return [];
  }
}

function persistLocalProfiles() {
  try {
    const localProfiles = state.profiles.filter(profile => String(profile.id).startsWith('local-'));
    window.localStorage.setItem(LOCAL_PROFILES_STORAGE_KEY, JSON.stringify(localProfiles));
  } catch (error) {
    console.warn('Failed to persist local profiles:', error);
  }
}

function formatProfileStorageLabel(profile) {
  if (String(profile.id).startsWith('local-')) {
    return 'local profile';
  }

  if (state.profileStorageMode === 'account') {
    return 'account profile';
  }

  return 'seeded profile';
}

function buildStaticGraphStateSnapshot() {
  const sortedEvents = [...state.doseEvents].sort((left, right) => left.date.localeCompare(right.date));
  const firstDoseDate = sortedEvents[0]?.date ?? '';
  const lastDoseDate = sortedEvents[sortedEvents.length - 1]?.date ?? '';
  const referenceMaxDose = state.inference.match?.maxDose ?? null;

  return {
    version: 1,
    patientName: state.settings.patientName,
    route: state.settings.medicationRoute,
    timeframe: state.settings.timeframe,
    selectedDrugIds: [normalizeDrugName(state.settings.medicationName)],
    drugStates: [
      {
        id: normalizeDrugName(state.settings.medicationName),
        name: state.settings.medicationName,
        route: state.settings.medicationRoute,
        unit: state.settings.doseUnit,
        referenceMaxDailyDose: referenceMaxDose,
        overrideMaxDailyDose: state.inference.isOverridden ? state.settings.maxDose : null,
        maxDailyDose: state.settings.maxDose,
        isMaxDoseOverridden: state.inference.isOverridden,
      },
    ],
    medicationEntries: [
      {
        id: `entry-${normalizeDrugName(state.settings.medicationName)}`,
        name: state.settings.medicationName,
        route: state.settings.medicationRoute,
        startDate: firstDoseDate,
        endDate: '',
        stopDate: lastDoseDate,
        timelineStatus: 'current',
        referenceMaxDailyDose: referenceMaxDose,
        overrideMaxDailyDose: state.inference.isOverridden ? state.settings.maxDose : null,
        maxDailyDose: state.settings.maxDose,
      },
    ],
  };
}

function restoreStaticGraphState(graphState, fallbackSettings) {
  const nextSettings = { ...(fallbackSettings ?? state.settings) };
  const primaryDrugState = graphState?.drugStates?.[0] ?? null;

  state.settings = {
    ...nextSettings,
    patientName: graphState?.patientName ?? nextSettings.patientName,
    medicationName: primaryDrugState?.name ?? nextSettings.medicationName,
    medicationRoute: primaryDrugState?.route ?? graphState?.route ?? nextSettings.medicationRoute,
    doseUnit: primaryDrugState?.unit ?? nextSettings.doseUnit,
    maxDose:
      Number(primaryDrugState?.maxDailyDose) > 0
        ? Number(primaryDrugState.maxDailyDose)
        : nextSettings.maxDose,
    timeframe: graphState?.timeframe ?? nextSettings.timeframe,
  };

  refreshInference({ preserveManual: Boolean(primaryDrugState?.isMaxDoseOverridden) });
  state.inference.isOverridden = Boolean(primaryDrugState?.isMaxDoseOverridden);

  if (state.inference.isOverridden && Number(primaryDrugState?.maxDailyDose) > 0) {
    state.settings.maxDose = Number(primaryDrugState.maxDailyDose);
  }
}

async function hydrateAuthSession() {
  if (!state.auth.token) {
    renderAuthState();
    return;
  }

  try {
    const payload = await apiGet('/auth/me');
    state.auth.account = payload.account;
    persistAuthSession(state.auth.token, payload.account);
  } catch (error) {
    console.warn('Clearing stale static auth session:', error);
    clearAuthSession();
  }

  renderAuthState();
}

async function handleAuthSubmit() {
  const mode = state.auth.mode;
  const email = elements.authEmail.value.trim().toLowerCase();
  const password = elements.authPassword.value;
  const name = elements.authName.value.trim();

  if (!email || !password || (mode === 'register' && !name)) {
    setAuthMessage('Complete the required account fields first.', 'error');
    return;
  }

  if (mode === 'register' && password.length < 8) {
    setAuthMessage('Passwords need at least 8 characters.', 'error');
    return;
  }

  elements.authSubmitButton.disabled = true;
  setAuthMessage(mode === 'login' ? 'Signing in...' : 'Creating your account...');

  try {
    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
    const payload = mode === 'login' ? { email, password } : { name, email, password };
    const authPayload = await apiPost(endpoint, payload, { skipAuth: true });

    state.auth.token = authPayload.token;
    state.auth.account = authPayload.account;
    persistAuthSession(authPayload.token, authPayload.account);
    elements.authPassword.value = '';
    if (mode === 'register') {
      elements.authName.value = '';
      state.auth.mode = 'login';
    }

    setAuthMessage('Signed in. Backend profile persistence is ready.', 'success');
    renderAuthState();
    await loadProfiles();
  } catch (error) {
    setAuthMessage(error.message || 'Authentication failed.', 'error');
  } finally {
    elements.authSubmitButton.disabled = false;
  }
}

function setAuthMessage(message, tone = '') {
  elements.authMessage.textContent = message;
  elements.authMessage.className = `auth-message${tone ? ` ${tone}` : ''}`;
}

function restoreAuthSession() {
  try {
    state.auth.token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
    const rawAccount = window.localStorage.getItem(AUTH_ACCOUNT_STORAGE_KEY);
    state.auth.account = rawAccount ? JSON.parse(rawAccount) : null;
  } catch {
    state.auth.token = '';
    state.auth.account = null;
  }
}

function persistAuthSession(token, account) {
  try {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    window.localStorage.setItem(AUTH_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  } catch {
    // ignore storage errors
  }
}

function clearAuthSession() {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_ACCOUNT_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }

  state.auth.token = '';
  state.auth.account = null;
  setAuthMessage('Signed out.');
}

async function apiGet(path, options) {
  const response = await fetch(buildApiUrl(path), {
    headers: buildApiHeaders(options),
  });
  return readApiResponse(response);
}

async function apiPost(path, body, options) {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: buildApiHeaders(options),
    body: JSON.stringify(body),
  });

  return readApiResponse(response);
}

async function apiDelete(path, options) {
  const response = await fetch(buildApiUrl(path), {
    method: 'DELETE',
    headers: buildApiHeaders(options),
  });

  return readApiResponse(response);
}

async function apiPut(path, body, options) {
  const response = await fetch(buildApiUrl(path), {
    method: 'PUT',
    headers: buildApiHeaders(options),
    body: JSON.stringify(body),
  });

  return readApiResponse(response);
}

function buildApiHeaders(options = {}) {
  const headers = {};
  if (!options.noJson) {
    headers['Content-Type'] = 'application/json';
  }

  if (!options.skipAuth && state.auth.token) {
    headers.Authorization = `Bearer ${state.auth.token}`;
  }

  return headers;
}

function buildApiUrl(path) {
  return `${API_BASE_PATH}${path}`;
}

async function readApiResponse(response) {
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}

function getTimelineAnchorDate() {
  if (!state.doseEvents.length) {
    return new Date();
  }

  const latestDate = state.doseEvents.reduce((latest, event) => {
    return event.date > latest ? event.date : latest;
  }, state.doseEvents[0].date);

  return new Date(`${latestDate}T00:00:00`);
}

function seedDoseEvents() {
  const today = new Date();
  const events = [];
  const samples = [
    { daysAgo: 4, route: 'PO', amount: 62 },
    { daysAgo: 9, route: 'PO', amount: 70 },
    { daysAgo: 15, route: 'IV', amount: 24 },
    { daysAgo: 28, route: 'PO', amount: 88 },
    { daysAgo: 44, route: 'PO', amount: 82 },
    { daysAgo: 76, route: 'PO', amount: 96 },
    { daysAgo: 120, route: 'PO', amount: 68 },
    { daysAgo: 180, route: 'PO', amount: 90 },
    { daysAgo: 240, route: 'PO', amount: 74 },
    { daysAgo: 300, route: 'IV', amount: 20 },
    { daysAgo: 344, route: 'PO', amount: 60 },
  ];

  samples.forEach(sample => {
    const date = new Date(today);
    date.setDate(date.getDate() - sample.daysAgo);
    events.push({
      id: `seed-${sample.daysAgo}-${sample.route}`,
      date: formatDateInput(date),
      route: sample.route,
      amount: sample.amount,
    });
  });

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
