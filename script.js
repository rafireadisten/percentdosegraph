const MS_PER_DAY = 24 * 60 * 60 * 1000;
const API_BASE_PATH = resolveApiBasePath();
const AUTH_TOKEN_STORAGE_KEY = 'percentdosegraph:static-auth-token';
const AUTH_ACCOUNT_STORAGE_KEY = 'percentdosegraph:static-auth-account';
const LOCAL_PROFILES_STORAGE_KEY = 'percentdosegraph:static-local-profiles';
const STATIC_ACCOUNTS_STORAGE_KEY = 'percentdosegraph:static-accounts';
const STATIC_ACCOUNT_PROFILES_STORAGE_KEY = 'percentdosegraph:static-account-profiles';
const STATIC_WORKSPACE_STORAGE_KEY = 'percentdosegraph:static-workspace';
const STATIC_ACCOUNT_WORKSPACES_STORAGE_KEY = 'percentdosegraph:static-account-workspaces';
const CURRENT_DOSE_NOTE = 'Current dose segment';
const STATIC_CHART_COLORS = [
  '#0d7c66',
  '#2956bf',
  '#bc6c25',
  '#8a3ffc',
  '#c93d71',
  '#1d4d4f',
  '#7d5a12',
  '#2f855a',
];

let drugReferenceLibrary = [];

const state = {
  settings: {
    medicationName: '',
    medicationId: '',
    patientName: '',
    medicationRoute: 'PO',
    doseUnit: '',
    maxDose: '',
    timeframe: '1y',
  },
  inference: {
    match: null,
    matches: [],
    catalogMatch: null,
    matchScore: -1,
    isOverridden: false,
  },
  libraryStatus: {
    referenceLoaded: false,
    catalogLoaded: false,
  },
  doseEvents: [],
  profiles: [],
  editingDoseId: null,
  profileSearch: '',
  profileStorageMode: 'local',
  activeProfileId: null,
  profileSyncTimer: null,
  catalogDrugs: [],
  cardiovascularDrugs: [],
  randomProfile: {
    drugs: [],
    points: [],
    regimens: [],
    startDate: null,
    endDate: null,
  },
  chartHover: {
    drugKey: null,
    renderModel: null,
    selectedDateKey: null,
  },
  auth: {
    token: '',
    account: null,
    mode: 'login',
  },
  persistenceReady: false,
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
  medicationMatchStatus: document.getElementById('medicationMatchStatus'),
  medicationSuggestions: document.getElementById('medicationSuggestions'),
  patientName: document.getElementById('patientName'),
  patientProfileStatus: document.getElementById('patientProfileStatus'),
  medicationRoute: document.getElementById('medicationRoute'),
  doseUnit: document.getElementById('doseUnit'),
  maxDose: document.getElementById('maxDose'),
  timeframe: document.getElementById('timeframe'),
  doseStartDate: document.getElementById('doseStartDate'),
  doseEndDate: document.getElementById('doseEndDate'),
  doseRoute: document.getElementById('doseRoute'),
  doseAmount: document.getElementById('doseAmount'),
  doseStatus: document.getElementById('doseStatus'),
  doseStatusCurrentButton: document.getElementById('doseStatusCurrentButton'),
  doseStatusEndedButton: document.getElementById('doseStatusEndedButton'),
  eventsTableBody: document.getElementById('eventsTableBody'),
  chartSubtitle: document.getElementById('chartSubtitle'),
  headlinePercent: document.getElementById('headlinePercent'),
  highDays: document.getElementById('highDays'),
  chartHoverCard: document.getElementById('chartHoverCard'),
  chartLegend: document.getElementById('chartLegend'),
  interpretationText: document.getElementById('interpretationText'),
  rangeText: document.getElementById('rangeText'),
  doseChart: document.getElementById('doseChart'),
  inferenceStatus: document.getElementById('inferenceStatus'),
  inferenceSummary: document.getElementById('inferenceSummary'),
  referenceList: document.getElementById('referenceList'),
  referencePanel: document.getElementById('referencePanel'),
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
  authDeveloperLabel: document.getElementById('authDeveloperLabel'),
  authName: document.getElementById('authName'),
  authIsDeveloper: document.getElementById('authIsDeveloper'),
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
  workspacePatient: document.getElementById('workspacePatient'),
  workspaceMedication: document.getElementById('workspaceMedication'),
  workspaceRoute: document.getElementById('workspaceRoute'),
  workspaceTimeframe: document.getElementById('workspaceTimeframe'),
  workspaceMaxDose: document.getElementById('workspaceMaxDose'),
  workspaceInference: document.getElementById('workspaceInference'),
  workspaceEventCount: document.getElementById('workspaceEventCount'),
  workspaceLastEvent: document.getElementById('workspaceLastEvent'),
  setTodayButton: document.getElementById('setTodayButton'),
  setTwoYearButton: document.getElementById('setTwoYearButton'),
  doseFormHeading: document.getElementById('doseFormHeading'),
  doseFormHint: document.getElementById('doseFormHint'),
  cancelEditButton: document.getElementById('cancelEditButton'),
  doseSubmitButton: document.getElementById('doseSubmitButton'),
  doseSubmitAndAddButton: document.getElementById('doseSubmitAndAddButton'),
  profileSearch: document.getElementById('profileSearch'),
  profileStatusText: document.getElementById('profileStatusText'),
};

function getDoseStatusValue() {
  return elements.doseStatus.value === 'ended' ? 'ended' : 'current';
}

function syncDoseDateConstraints() {
  elements.doseEndDate.min = elements.doseStartDate.value || '';
}

function setDoseStatus(status) {
  const normalizedStatus = status === 'ended' ? 'ended' : 'current';
  elements.doseStatus.value = normalizedStatus;
  elements.doseStatusCurrentButton.classList.toggle('active', normalizedStatus === 'current');
  elements.doseStatusEndedButton.classList.toggle('active', normalizedStatus === 'ended');
  elements.doseStatusEndedButton.classList.toggle('ended', normalizedStatus === 'ended');
  elements.doseEndDate.disabled = normalizedStatus === 'current';

  if (normalizedStatus === 'current') {
    elements.doseEndDate.value = '';
    elements.doseEndDate.required = false;
  } else {
    elements.doseEndDate.required = true;
  }

  syncDoseDateConstraints();
}

restoreAuthSession();
syncFormFromState();
setDoseStatus('current');
initialize();

function handleSettingsFormUpdate(event) {
  const previousRoute = state.settings.medicationRoute;
  const previousDrug = state.settings.medicationName;

  state.settings.medicationName = elements.medicationName.value.trim();
  state.settings.patientName = elements.patientName.value.trim();
  state.settings.medicationRoute = elements.medicationRoute.value;
  state.settings.doseUnit = elements.doseUnit.value.trim();
  state.settings.timeframe = normalizeTimeframe(elements.timeframe.value);

  if (event.target === elements.maxDose) {
    const nextMaxDose = parsePositiveNumber(elements.maxDose.value);
    state.settings.maxDose = nextMaxDose === null ? '' : nextMaxDose;
    state.inference.isOverridden = true;
  } else {
    const routeChanged = previousRoute !== state.settings.medicationRoute;
    const drugChanged =
      normalizeDrugName(previousDrug) !== normalizeDrugName(state.settings.medicationName);

    refreshInference({ preserveManual: !(routeChanged || drugChanged) });

    if (state.inference.match && !state.inference.isOverridden) {
      elements.maxDose.value = state.settings.maxDose;
      elements.doseUnit.value = state.settings.doseUnit;
    }

    if (
      event.target === elements.medicationName &&
      event.type === 'change' &&
      state.inference.catalogMatch &&
      state.inference.matchScore >= 2
    ) {
      state.settings.medicationName = state.inference.catalogMatch.name;
      elements.medicationName.value = state.settings.medicationName;
    }
  }

  syncLoadedProfileIdentity();
  queueActiveProfileSync();
  elements.doseRoute.value = state.settings.medicationRoute;
  render();
}

elements.settingsForm.addEventListener('input', handleSettingsFormUpdate);
elements.settingsForm.addEventListener('change', handleSettingsFormUpdate);

elements.doseStartDate.addEventListener('input', () => {
  syncDoseDateConstraints();
});

elements.doseStatusCurrentButton.addEventListener('click', () => {
  setDoseStatus('current');
});

elements.doseStatusEndedButton.addEventListener('click', () => {
  setDoseStatus('ended');
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
  if (confirm('Are you sure you want to clear all dose segments? This cannot be undone.')) {
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
  elements.doseStartDate.value = formatDateInput(new Date());
  syncDoseDateConstraints();
});

elements.setTwoYearButton.addEventListener('click', () => {
  state.settings.timeframe = '2y';
  render();
});

elements.chartLegend.addEventListener('click', event => {
  const button = event.target.closest('[data-action="remove-medication"]');
  if (!button) {
    return;
  }

  removeMedicationGroup(button.dataset.drugKey);
});

elements.doseChart.addEventListener('mousemove', event => {
  handleDoseChartHover(event);
});

elements.doseChart.addEventListener('mouseleave', () => {
  setHoveredDrugGroup(null);
});

elements.doseChart.addEventListener('click', () => {
  const hoveredGroup = getHoveredDrugGroup();
  const editableEvent = getEditableDoseEventForHoverSelection(hoveredGroup);

  if (!editableEvent) {
    return;
  }

  startEditingDoseEvent(editableEvent);
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

  const startDate = elements.doseStartDate.value;
  const endDate = elements.doseEndDate.value;
  const route = elements.doseRoute.value;
  const amount = Number(elements.doseAmount.value);
  const status = getDoseStatusValue();
  const saveAndAddAnother =
    event.submitter?.id === 'doseSubmitAndAddButton' && !state.editingDoseId;

  if (!startDate || Number.isNaN(amount) || amount <= 0) {
    return;
  }

  if (status === 'ended' && !endDate) {
    elements.doseEndDate.focus();
    return;
  }

  if (endDate && endDate < startDate) {
    elements.doseEndDate.focus();
    return;
  }

  const nextEvent = normalizeDoseEvent({
    date: startDate,
    endDate: status === 'current' ? '' : endDate,
    route,
    amount,
    medicationId: state.settings.medicationId,
    medicationName: state.settings.medicationName,
    maxDose: state.settings.maxDose,
    doseUnit: state.settings.doseUnit,
    status,
    notes: status === 'current' ? CURRENT_DOSE_NOTE : '',
  });
  const editingDoseIndex = state.doseEvents.findIndex(item => item.id === state.editingDoseId);
  const editingDose = editingDoseIndex >= 0 ? state.doseEvents[editingDoseIndex] : null;
  const apiPayload = {
    date: nextEvent.date,
    endDate: nextEvent.endDate || undefined,
    route: nextEvent.route,
    amount: nextEvent.amount,
    notes: nextEvent.isCurrent ? CURRENT_DOSE_NOTE : '',
  };

  if (editingDose) {
    const updatedPayload = normalizeDoseEvent({
      ...editingDose,
      ...nextEvent,
    });

    if (
      !String(editingDose.id).startsWith('local-') &&
      !String(editingDose.id).startsWith('seed-')
    ) {
      try {
        const updated = await apiPut(`/doses/${editingDose.id}`, apiPayload);
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
      const created = await apiPost('/doses', apiPayload);
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
  if (saveAndAddAnother) {
    prepareNextDoseForm(nextEvent);
  } else {
    resetDoseForm();
  }
  render();

  if (saveAndAddAnother) {
    elements.doseStartDate.focus();
  }
});

elements.eventsTableBody.addEventListener('click', async event => {
  const button = event.target.closest('button[data-index]');
  const row = event.target.closest('tr[data-index]');

  if (!button && !row) {
    return;
  }

  const index = Number((button ?? row).dataset.index);
  const doseEvent = state.doseEvents[index];

  if (!doseEvent) {
    return;
  }

  if (!button) {
    startEditingDoseEvent(doseEvent);
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

function removeMedicationGroup(drugKey) {
  if (!drugKey) {
    return;
  }

  state.doseEvents = state.doseEvents.filter(event => getDoseEventDrugKey(event) !== drugKey);

  if (state.editingDoseId) {
    const editingStillExists = state.doseEvents.some(event => event.id === state.editingDoseId);
    if (!editingStillExists) {
      resetDoseForm();
    }
  }

  render();
}

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

elements.chartHoverCard?.addEventListener('click', event => {
  const button = event.target.closest('button[data-action="edit-hovered-dose"]');
  if (!button) {
    return;
  }

  const hoveredGroup = getHoveredDrugGroup();
  const editableEvent = getEditableDoseEventForHoverSelection(hoveredGroup);

  if (!editableEvent) {
    return;
  }

  startEditingDoseEvent(editableEvent);
  render();
});

async function initialize() {
  await hydrateAuthSession();
  await loadDrugReferenceLibrary();
  await loadCardiovascularDrugLibrary();
  await loadDoseEvents();
  await loadProfiles();
  const restoredWorkspace = restorePersistedWorkspace();
  generateRandomMedGrafProfile();
  refreshInference({ preserveManual: restoredWorkspace ? state.inference.isOverridden : false });
  state.persistenceReady = true;
  render();
}

async function loadDrugReferenceLibrary() {
  const candidatePaths = ['./drug-library.json', '../drug-library.json', '/drug-library.json'];

  try {
    for (const path of candidatePaths) {
      try {
        const attempt = await fetch(path);
        const contentType = attempt.headers.get('content-type') || '';

        if (!attempt.ok || !contentType.includes('application/json')) {
          continue;
        }

        drugReferenceLibrary = await attempt.json();
        state.libraryStatus.referenceLoaded = true;
        renderMedicationSuggestions();
        return;
      } catch {
        continue;
      }
    }
    throw new Error('Unable to load drug-library.json from known paths');
  } catch (error) {
    console.error(error);
    drugReferenceLibrary = [];
    state.libraryStatus.referenceLoaded = false;
    elements.inferenceSummary.textContent =
      'Reference library failed to load. Inference is unavailable until drug-library.json is served correctly.';
    elements.medicationMatchStatus.textContent =
      'Drug library failed to load. Serve the static app over localhost so medication matching can work.';
  }
}

async function loadCardiovascularDrugLibrary() {
  const candidatePaths = ['./data/drugs.json', '../data/drugs.json', '/data/drugs.json'];

  try {
    for (const path of candidatePaths) {
      try {
        const attempt = await fetch(path);
        const contentType = attempt.headers.get('content-type') || '';

        if (!attempt.ok || !contentType.includes('application/json')) {
          continue;
        }

        const library = await attempt.json();
        state.libraryStatus.catalogLoaded = true;
        state.catalogDrugs = library;
        state.cardiovascularDrugs = library.filter(drug => isCardiovascularDrugClass(drug.drugClass));
        renderMedicationSuggestions();
        return;
      } catch {
        continue;
      }
    }
    throw new Error('Unable to load cardiovascular source data from known paths');
  } catch (error) {
    console.error(error);
    state.libraryStatus.catalogLoaded = false;
    state.catalogDrugs = [];
    state.cardiovascularDrugs = [];
    elements.medicationMatchStatus.textContent =
      'Drug catalog failed to load. Serve the static app over localhost so medication matching can work.';
  }
}

async function loadDoseEvents() {
  try {
    const apiDoses = await apiGet('/doses');
    state.doseEvents = apiDoses
      .map(normalizeDoseEvent)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.warn('Dose API unavailable. Starting with an empty static timeline:', error);
    state.doseEvents = [];
  }
}

function render() {
  const range = buildRange(state.settings.timeframe);
  const filteredEvents = getFilteredEvents(range);
  const drugGroups = getVisibleDrugGroups(filteredEvents);
  const dailyPoints = buildMultiDrugDailySeries(range.startDate, range.endDate, drugGroups);
  const metrics = summarize(dailyPoints, drugGroups);

  syncFormFromState();
  renderMedicationMatchState();
  renderReferenceState();
  renderPatientProfileStatus();
  renderEventsTable(filteredEvents);
  renderMetrics(metrics);
  renderNarrative(range, metrics);
  renderChart(dailyPoints, drugGroups);
  renderAuthState();
  renderWorkspaceSummary(range, filteredEvents);
  renderDoseFormState();
  renderRandomProfile();

  if (state.persistenceReady) {
    persistCurrentWorkspace();
  }
}

function renderAuthState() {
  const isAuthenticated = Boolean(state.auth.token && state.auth.account);
  const mode = state.auth.mode;
  const account = state.auth.account;

  elements.authNameLabel.classList.toggle('hidden', mode !== 'register' || isAuthenticated);
  elements.authDeveloperLabel.classList.toggle('hidden', mode !== 'register' || isAuthenticated);
  elements.authToggleButton.classList.toggle('hidden', isAuthenticated);
  elements.authLogoutButton.classList.toggle('hidden', !isAuthenticated);
  elements.authSubmitButton.classList.toggle('hidden', isAuthenticated);
  elements.authEmail.disabled = isAuthenticated;
  elements.authPassword.disabled = isAuthenticated;
  elements.authName.disabled = isAuthenticated;
  elements.authIsDeveloper.disabled = isAuthenticated;
  elements.authSubmitButton.textContent = mode === 'login' ? 'Login' : 'Register';
  elements.authToggleButton.textContent =
    mode === 'login' ? 'Need an account?' : 'Have an account?';

  if (isAuthenticated) {
    elements.authStatusText.textContent = `Signed in as ${account.name || account.email} (${formatAccountDesignation(account)}). Profiles saved now belong to this ${account.source === 'api' ? 'saved account' : 'browser-local account'}.`;
  } else {
    elements.authStatusText.textContent =
      'Not signed in. Guest profiles stay on this device until you register or log in.';
  }
}

function syncFormFromState() {
  elements.medicationName.value = state.settings.medicationName;
  elements.patientName.value = state.settings.patientName;
  elements.medicationRoute.value = state.settings.medicationRoute;
  elements.doseUnit.value = state.settings.doseUnit;
  elements.maxDose.value = state.settings.maxDose === '' ? '' : String(state.settings.maxDose);
  state.settings.timeframe = normalizeTimeframe(state.settings.timeframe);
  elements.timeframe.value = state.settings.timeframe;
  elements.doseStartDate.value = elements.doseStartDate.value || formatDateInput(new Date());
  elements.doseRoute.value = state.settings.medicationRoute;
  syncDoseDateConstraints();
}

function getActiveProfile() {
  if (!state.activeProfileId) {
    return null;
  }

  return state.profiles.find(profile => profile.id === String(state.activeProfileId)) ?? null;
}

function canPersistProfile(profile) {
  if (!profile) {
    return false;
  }

  if (profile.accountId) {
    return true;
  }

  return String(profile.id).startsWith('local-');
}

function resolveProfileIdentityName(profile = null) {
  const typedPatientName = state.settings.patientName.trim();

  if (typedPatientName) {
    return typedPatientName;
  }

  return profile?.name ?? '';
}

function syncLoadedProfileIdentity() {
  const activeProfile = getActiveProfile();
  if (!activeProfile) {
    return;
  }

  const nextProfileName = resolveProfileIdentityName(activeProfile);
  if (!nextProfileName || nextProfileName === activeProfile.name) {
    return;
  }

  activeProfile.name = nextProfileName;
}

function renderPatientProfileStatus() {
  if (!elements.patientProfileStatus) {
    return;
  }

  const activeProfile = getActiveProfile();
  const typedPatientName = state.settings.patientName.trim();
  const matchingProfile = typedPatientName
    ? state.profiles.find(
        profile =>
          profile.id !== state.activeProfileId &&
          String(profile.name || '').trim().toLowerCase() === typedPatientName.toLowerCase()
      ) ?? null
    : null;

  if (activeProfile) {
    const activeLabel = activeProfile.name || 'Unnamed profile';
    elements.patientProfileStatus.textContent =
      typedPatientName && typedPatientName !== activeLabel
        ? `Loaded profile ID: ${activeLabel}. Step 1 changes are saving back to this profile, and a new patient name will rename that same profile ID.`
        : `Loaded profile ID: ${activeLabel}. Step 1 changes save back to this same profile.`;
    return;
  }

  if (matchingProfile) {
    elements.patientProfileStatus.textContent = `Patient name matches existing profile ID "${matchingProfile.name}". Load that profile to edit it in place.`;
    return;
  }

  if (typedPatientName) {
    elements.patientProfileStatus.textContent = `Patient name "${typedPatientName}" will be used as the new profile ID when you save.`;
    return;
  }

  elements.patientProfileStatus.textContent =
    'Patient name can become the saved profile ID for this workspace.';
}

function getDoseEventDrugName(event) {
  return event.medicationName || 'Medication';
}

function getDoseEventMaxDose(event) {
  const fallback = Number(state.settings.maxDose) || 1;
  const eventMaxDose = Number(event.maxDose);
  return eventMaxDose > 0 ? eventMaxDose : fallback;
}

function getDoseEventUnit(event) {
  return event.doseUnit || state.settings.doseUnit;
}

function getDoseEventDrugKey(event) {
  return normalizeDrugName(getDoseEventDrugName(event));
}

function getVisibleDrugGroups(events) {
  const grouped = new Map();

  for (const event of events) {
    const key = getDoseEventDrugKey(event);
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        name: getDoseEventDrugName(event),
        route: event.route,
        maxDose: getDoseEventMaxDose(event),
        unit: getDoseEventUnit(event),
        events: [],
      });
    }

    const group = grouped.get(key);
    group.events.push(event);
    group.maxDose = Math.max(group.maxDose, getDoseEventMaxDose(event));
  }

  return Array.from(grouped.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function isDoseEventCurrent(event) {
  return event.status === 'current' || event.isCurrent === true;
}

function getDoseEventStatusLabel(event) {
  return isDoseEventCurrent(event) ? 'Current' : 'Ended';
}

function getDoseEventRangeEnd(event, fallbackEndKey) {
  return event.endDate || (isDoseEventCurrent(event) ? fallbackEndKey : event.date);
}

function getDoseEventAnchorEnd(event) {
  return getDoseEventRangeEnd(event, formatDateInput(new Date()));
}

function getLatestVisibleDoseEvent(events, rangeEndKey) {
  return events.reduce((latest, event) => {
    if (!latest) {
      return event;
    }

    const latestEnd = getDoseEventRangeEnd(latest, rangeEndKey);
    const eventEnd = getDoseEventRangeEnd(event, rangeEndKey);

    if (eventEnd !== latestEnd) {
      return eventEnd > latestEnd ? event : latest;
    }

    return event.date > latest.date ? event : latest;
  }, null);
}

function prepareNextDoseForm(referenceEvent) {
  state.editingDoseId = null;

  const nextStartDate = referenceEvent.endDate
    ? formatDateInput(addDays(new Date(`${referenceEvent.endDate}T00:00:00`), 1))
    : formatDateInput(new Date());

  elements.doseStartDate.value = nextStartDate;
  elements.doseEndDate.value = '';
  elements.doseRoute.value = referenceEvent.route;
  elements.doseAmount.value = referenceEvent.amount;
  state.settings.medicationId = referenceEvent.medicationId ?? '';
  state.settings.medicationName = getDoseEventDrugName(referenceEvent);
  state.settings.maxDose = getDoseEventMaxDose(referenceEvent);
  state.settings.doseUnit = getDoseEventUnit(referenceEvent);
  syncFormFromState();
  setDoseStatus('current');
}

function renderWorkspaceSummary(range, filteredEvents = getFilteredEvents(range)) {
  const rangeEndKey = formatDateInput(range.endDate);
  const lastEvent = filteredEvents.length ? getLatestVisibleDoseEvent(filteredEvents, rangeEndKey) : null;
  const visibleDrugGroups = getVisibleDrugGroups(filteredEvents);
  const visibleRoutes = [...new Set(filteredEvents.map(event => event.route).filter(Boolean))];
  const referenceLabel = state.inference.match
    ? `${state.inference.match.drug} ${state.inference.match.route}${state.inference.isOverridden ? ' adjusted' : ' inferred'}`
    : 'Manual ceiling';

  elements.workspacePatient.textContent = state.settings.patientName || 'Patient not set';
  elements.workspaceMedication.textContent = visibleDrugGroups.length
    ? visibleDrugGroups.map(group => group.name).join(' · ')
    : state.settings.medicationName
      ? `${state.settings.medicationName} only`
      : 'No medication selected yet';
  elements.workspaceRoute.textContent = visibleRoutes.length
    ? visibleRoutes.length === 1
      ? visibleRoutes[0]
      : 'Mixed routes'
    : state.settings.medicationRoute;
  elements.workspaceTimeframe.textContent = formatTimeframeLabel(state.settings.timeframe);
  elements.workspaceMaxDose.textContent = formatWorkspaceMaxDose();
  elements.workspaceInference.textContent = referenceLabel;
  elements.workspaceEventCount.textContent = `${filteredEvents.length} in view`;
  elements.workspaceLastEvent.textContent = lastEvent
    ? isDoseEventCurrent(lastEvent)
      ? `Current dose since ${formatDisplayDate(new Date(`${lastEvent.date}T00:00:00`))} · ${formatNumber(lastEvent.amount)} ${displayEventUnit()}`
      : `Latest segment ended ${formatDisplayDate(new Date(`${getDoseEventRangeEnd(lastEvent, rangeEndKey)}T00:00:00`))} · ${formatNumber(lastEvent.amount)} ${displayEventUnit()}`
    : `No dose segments in ${formatTimeframeLabel(state.settings.timeframe).replace(' view', '')}`;
}

function renderDoseFormState() {
  const isEditing = Boolean(state.editingDoseId);
  elements.cancelEditButton.classList.toggle('hidden', !isEditing);
  elements.doseSubmitAndAddButton.classList.toggle('hidden', isEditing);
  elements.doseFormHeading.textContent = isEditing ? 'Edit dose segment' : 'Add a dose segment';
  elements.doseFormHint.textContent = isEditing
    ? 'Update the recorded start date, end date, status, route, or dose and save the revision.'
    : 'Record one dose segment for the selected medication and route, then add another segment if the dosing changes.';
  elements.doseSubmitButton.textContent = isEditing ? 'Update Dose Segment' : 'Save Dose Segment';
}

function renderMedicationSuggestions() {
  const suggestions = [
    ...drugReferenceLibrary.flatMap(entry => [entry.drug, ...(entry.aliases || [])]).filter(Boolean),
    ...state.catalogDrugs.map(entry => entry.name).filter(Boolean),
  ];
  const uniqueSuggestions = [...new Set(suggestions)].sort((a, b) => a.localeCompare(b));

  elements.medicationSuggestions.innerHTML = uniqueSuggestions
    .map(name => `<option value="${escapeHtml(name)}"></option>`)
    .join('');
}

function refreshInference({ preserveManual }) {
  const resolution = resolveMedicationBinding(
    state.settings.medicationName,
    state.settings.medicationRoute
  );

  state.settings.medicationId = resolution.medicationId;
  state.inference.matches = resolution.referenceMatches;
  state.inference.match = resolution.match;
  state.inference.catalogMatch = resolution.catalogMatch;
  state.inference.matchScore = resolution.matchScore;

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

  elements.referencePanel.classList.toggle('hidden', !match);
  elements.applyInferenceButton.disabled = !match;

  if (!match) {
    elements.inferenceStatus.textContent = '';
    elements.inferenceStatus.className = 'reference-pill';
    elements.inferenceSummary.textContent = '';
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

function renderMedicationMatchState() {
  const typedName = state.settings.medicationName.trim();
  const catalogMatch = state.inference.catalogMatch;
  const referenceMatch = state.inference.match;

  if (!state.libraryStatus.referenceLoaded && !state.libraryStatus.catalogLoaded) {
    elements.medicationMatchStatus.textContent =
      'Drug libraries did not load, so medication matching is unavailable right now.';
    return;
  }

  if (!state.libraryStatus.catalogLoaded && referenceMatch) {
    elements.medicationMatchStatus.textContent = `Reference max dose matched ${referenceMatch.drug} ${referenceMatch.route}, but the broader drug catalog did not load.`;
    return;
  }

  if (!state.libraryStatus.referenceLoaded && catalogMatch) {
    elements.medicationMatchStatus.textContent = `Linked to ${catalogMatch.name} (ID ${catalogMatch.id}), but the reference max-dose library did not load.`;
    return;
  }

  if (!typedName) {
    elements.medicationMatchStatus.textContent =
      'Type or choose a medication to link it to the local library.';
    return;
  }

  if (catalogMatch && referenceMatch) {
    elements.medicationMatchStatus.textContent = `Linked to ${catalogMatch.name} (ID ${catalogMatch.id}) with a ${referenceMatch.route} reference max dose match.`;
    return;
  }

  if (catalogMatch) {
    elements.medicationMatchStatus.textContent = `Linked to ${catalogMatch.name} (ID ${catalogMatch.id}), but no ${state.settings.medicationRoute} reference max dose is available.`;
    return;
  }

  elements.medicationMatchStatus.textContent =
    'No catalog-linked medication match is available for the current selection.';
}

function renderEventsTable(filteredEvents) {
  if (!filteredEvents.length) {
    elements.eventsTableBody.innerHTML = `<tr><td colspan="8">No dose segments fall inside the current ${formatTimeframeLabel(state.settings.timeframe).replace(' view', '')}.</td></tr>`;
    return;
  }

  elements.eventsTableBody.innerHTML = [...filteredEvents]
    .sort((left, right) => right.date.localeCompare(left.date))
    .map(event => {
      const percent = ((event.amount / getDoseEventMaxDose(event)) * 100).toFixed(1);
      const index = state.doseEvents.indexOf(event);

      return `
        <tr data-index="${index}" class="dose-row">
          <td>${escapeHtml(getDoseEventDrugName(event))}</td>
          <td class="mono">${event.date}</td>
          <td class="mono">${event.endDate || 'Ongoing'}</td>
          <td><span class="status-badge ${isDoseEventCurrent(event) ? 'current' : 'ended'}">${getDoseEventStatusLabel(event)}</span></td>
          <td>${event.route}</td>
          <td>${formatNumber(event.amount)} ${getDoseEventUnit(event).replace('/day', '')}</td>
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
  state.settings.medicationId = doseEvent.medicationId ?? '';
  state.settings.medicationName = getDoseEventDrugName(doseEvent);
  state.settings.maxDose = getDoseEventMaxDose(doseEvent);
  state.settings.doseUnit = getDoseEventUnit(doseEvent);
  syncFormFromState();
  elements.doseStartDate.value = doseEvent.date;
  elements.doseEndDate.value = doseEvent.endDate || '';
  elements.doseRoute.value = doseEvent.route;
  elements.doseAmount.value = doseEvent.amount;
  setDoseStatus(isDoseEventCurrent(doseEvent) ? 'current' : 'ended');
  renderDoseFormState();
  elements.doseAmount.focus();
  elements.doseForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetDoseForm() {
  state.editingDoseId = null;
  elements.doseForm.reset();
  elements.doseStartDate.value = formatDateInput(new Date());
  elements.doseEndDate.value = '';
  elements.doseRoute.value = state.settings.medicationRoute;
  elements.doseAmount.value = '';
  setDoseStatus('current');
}

function renderMetrics(metrics) {
  elements.headlinePercent.textContent = `${metrics.daysAbove80}`;
  elements.highDays.textContent = `${metrics.daysAbove80}`;
}

function renderNarrative(range, metrics) {
  const comparedLabel =
    metrics.drugCount > 1
      ? `${metrics.drugCount} drugs compared on the same timeline`
      : `${state.settings.medicationName} ${state.settings.medicationRoute}`;
  elements.chartSubtitle.textContent = `${comparedLabel} for ${state.settings.patientName}, shown as ordinal stepwise dose segments and expressed as percent of each drug's own max daily dose.`;
  elements.rangeText.textContent = `${formatDisplayDate(range.startDate)} through ${formatDisplayDate(range.endDate)} (${range.totalDays} days).`;

  const referenceText = state.inference.match
    ? `The current max dose is anchored to a listed reference entry for ${state.inference.match.drug} ${state.inference.match.route}${state.inference.isOverridden ? ', then manually adjusted' : ''}.`
    : 'No reference entry was found, so the current max dose is fully manual.';

  elements.interpretationText.textContent = `${metrics.drugCount > 1 ? `The ${metrics.drugCount} visible drugs` : `${state.settings.medicationName} ${state.settings.medicationRoute}`} are shown as recorded ordinal dose segments across the selected window. ${metrics.daysAbove80} day(s) exceeded 80% of the defined maximum dose. ${referenceText}`;
}

function renderChart(points, drugGroups) {
  const canvas = elements.doseChart;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 22, right: 22, bottom: 54, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxY = Math.max(
    100,
    ...points.flatMap(point =>
      drugGroups.map(group => Number(point.series?.[group.key]?.percentOfMax ?? 0))
    ),
    10
  );

  ctx.clearRect(0, 0, width, height);

  drawRoundedRect(ctx, 0, 0, width, height, 18, '#fffaf5');
  drawGrid(ctx, padding, chartWidth, chartHeight, maxY);
  renderChartLegend(drugGroups);
  state.chartHover.renderModel = {
    points,
    drugGroups,
    padding,
    chartWidth,
    chartHeight,
    maxY,
    range: buildRange(state.settings.timeframe),
  };

  if (!points.length || !drugGroups.length) {
    setHoveredDrugGroup(null);
    return;
  }

  const xForIndex = index =>
    points.length > 1 ? padding.left + (chartWidth * index) / (points.length - 1) : padding.left + chartWidth / 2;

  drugGroups.forEach((group, groupIndex) => {
    const color = STATIC_CHART_COLORS[groupIndex % STATIC_CHART_COLORS.length];
    const seriesValues = points.map(point => Number(point.series?.[group.key]?.percentOfMax ?? 0));
    const hasAnyValue = seriesValues.some(value => value > 0);

    if (!hasAnyValue) {
      return;
    }

    ctx.save();
    ctx.beginPath();

    seriesValues.forEach((value, index) => {
      const x = xForIndex(index);
      const y = padding.top + chartHeight - (value / maxY) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        const previousValue = seriesValues[index - 1];
        const previousY = padding.top + chartHeight - (previousValue / maxY) * chartHeight;
        ctx.lineTo(x, previousY);
        ctx.lineTo(x, y);
      }
    });

    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();

    points.forEach((point, index) => {
      if (
        points.length > 36 &&
        index % Math.ceil(points.length / 12) !== 0 &&
        index !== points.length - 1
      ) {
        return;
      }

      const value = Number(point.series?.[group.key]?.percentOfMax ?? 0);
      if (value <= 0) {
        return;
      }

      const x = xForIndex(index);
      const y = padding.top + chartHeight - (value / maxY) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  });

  points.forEach((point, index) => {
    if (
      points.length > 36 &&
      index % Math.ceil(points.length / 12) !== 0 &&
      index !== points.length - 1
    ) {
      return;
    }

    const x = xForIndex(index);
    ctx.fillStyle = '#69594b';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(shortDate(point.date), x, padding.top + chartHeight + 22);
  });

  if (
    state.chartHover.drugKey &&
    !drugGroups.some(group => group.key === state.chartHover.drugKey)
  ) {
    setHoveredDrugGroup(null);
  }
}

function renderChartLegend(drugGroups) {
  if (!elements.chartLegend) {
    return;
  }

  if (!drugGroups.length) {
    elements.chartLegend.innerHTML = '';
    return;
  }

  elements.chartLegend.innerHTML = drugGroups
    .map((group, index) => {
      const color = STATIC_CHART_COLORS[index % STATIC_CHART_COLORS.length];
      return `<span class="legend-chip"><span class="legend-swatch" style="background:${color}"></span>${escapeHtml(group.name)} <button class="table-action secondary" type="button" data-action="remove-medication" data-drug-key="${escapeHtml(group.key)}">Remove</button></span>`;
    })
    .join('');
}

function handleDoseChartHover(event) {
  const renderModel = state.chartHover.renderModel;
  if (!renderModel?.points?.length || !renderModel.drugGroups?.length) {
    setHoveredDrugGroup(null);
    return;
  }

  const rect = elements.doseChart.getBoundingClientRect();
  const scaleX = elements.doseChart.width / rect.width;
  const scaleY = elements.doseChart.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const hoveredGroup = findHoveredDrugGroup(renderModel, x, y);
  const selectedDateKey = hoveredGroup ? findNearestPointDateKey(renderModel, x) : null;

  state.chartHover.selectedDateKey = selectedDateKey;
  setHoveredDrugGroup(hoveredGroup);
}

function findHoveredDrugGroup(renderModel, x, y) {
  const { points, drugGroups, padding, chartWidth, chartHeight, maxY } = renderModel;
  const minX = padding.left;
  const maxX = padding.left + chartWidth;
  const minY = padding.top;
  const maxYCoord = padding.top + chartHeight;

  if (x < minX || x > maxX || y < minY || y > maxYCoord) {
    return null;
  }

  const xForIndex = index =>
    points.length > 1 ? padding.left + (chartWidth * index) / (points.length - 1) : padding.left + chartWidth / 2;

  let bestGroup = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  drugGroups.forEach(group => {
    const values = points.map(point => Number(point.series?.[group.key]?.percentOfMax ?? 0));
    if (!values.some(value => value > 0)) {
      return;
    }

    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      const pointX = xForIndex(index);
      const pointY = padding.top + chartHeight - (value / maxY) * chartHeight;

      if (index === 0) {
        bestDistance = maybeUpdateBestDistance(x, y, pointX, pointY, pointX, pointY, bestDistance, value, group, result => {
          bestGroup = result.group;
          bestDistance = result.distance;
        });
        continue;
      }

      const previousValue = values[index - 1];
      const previousX = xForIndex(index - 1);
      const previousY = padding.top + chartHeight - (previousValue / maxY) * chartHeight;

      bestDistance = maybeUpdateBestDistance(x, y, previousX, previousY, pointX, previousY, bestDistance, value || previousValue, group, result => {
        bestGroup = result.group;
        bestDistance = result.distance;
      });
      bestDistance = maybeUpdateBestDistance(x, y, pointX, previousY, pointX, pointY, bestDistance, value || previousValue, group, result => {
        bestGroup = result.group;
        bestDistance = result.distance;
      });
    }
  });

  return bestDistance <= 12 ? bestGroup : null;
}

function maybeUpdateBestDistance(x, y, x1, y1, x2, y2, currentBest, seriesValue, group, onBetter) {
  if (seriesValue <= 0) {
    return currentBest;
  }

  const distance = distanceToSegment(x, y, x1, y1, x2, y2);
  if (distance < currentBest) {
    onBetter({ distance, group });
    return distance;
  }

  return currentBest;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}

function setHoveredDrugGroup(group) {
  const nextKey = group?.key ?? null;
  if (state.chartHover.drugKey === nextKey) {
    return;
  }

  state.chartHover.drugKey = nextKey;
  renderChartHoverCard(group);
}

function getHoveredDrugGroup() {
  if (!state.chartHover.drugKey || !state.chartHover.renderModel?.drugGroups?.length) {
    return null;
  }

  return (
    state.chartHover.renderModel.drugGroups.find(group => group.key === state.chartHover.drugKey) ??
    null
  );
}

function getPreferredEditableDoseEvent(group) {
  if (!group?.events?.length) {
    return null;
  }

  return group.events.reduce((latest, event) => {
    if (!latest) {
      return event;
    }

    const latestEnd = getDoseEventAnchorEnd(latest);
    const eventEnd = getDoseEventAnchorEnd(event);

    if (eventEnd !== latestEnd) {
      return eventEnd > latestEnd ? event : latest;
    }

    return event.date > latest.date ? event : latest;
  }, null);
}

function getEditableDoseEventForHoverSelection(group) {
  if (!group) {
    return null;
  }

  const selectedDateKey = state.chartHover.selectedDateKey;
  if (!selectedDateKey) {
    return getPreferredEditableDoseEvent(group);
  }

  return getEditableDoseEventForDate(group, selectedDateKey) ?? getPreferredEditableDoseEvent(group);
}

function getEditableDoseEventForDate(group, dateKey) {
  if (!group?.events?.length || !dateKey) {
    return null;
  }

  const matchingEvents = group.events.filter(event => {
    const eventStart = event.date;
    const eventEnd = getDoseEventAnchorEnd(event);
    return eventStart <= dateKey && eventEnd >= dateKey;
  });

  if (!matchingEvents.length) {
    return null;
  }

  return matchingEvents.reduce((best, event) => {
    if (!best) {
      return event;
    }

    const bestEnd = getDoseEventAnchorEnd(best);
    const eventEnd = getDoseEventAnchorEnd(event);

    if (event.date !== best.date) {
      return event.date > best.date ? event : best;
    }

    return eventEnd > bestEnd ? event : best;
  }, null);
}

function findNearestPointDateKey(renderModel, x) {
  const { points, padding, chartWidth } = renderModel;
  if (!points?.length) {
    return null;
  }

  const xForIndex = index =>
    points.length > 1
      ? padding.left + (chartWidth * index) / (points.length - 1)
      : padding.left + chartWidth / 2;

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  points.forEach((point, index) => {
    const distance = Math.abs(x - xForIndex(index));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return points[nearestIndex]?.date ?? null;
}

function renderChartHoverCard(group) {
  if (!elements.chartHoverCard) {
    return;
  }

  if (!group) {
    elements.chartHoverCard.classList.add('hidden');
    elements.chartHoverCard.innerHTML = '';
    return;
  }

  const definition = buildStaticLineDefinition(group, state.chartHover.renderModel?.range);
  const editableEvent = getEditableDoseEventForHoverSelection(group);
  elements.chartHoverCard.innerHTML = `
    <p class="chart-hover-eyebrow">Hovered plot line</p>
    <strong>${escapeHtml(definition.drugName)}</strong>
    <dl class="chart-hover-definition">
      <dt>Dose</dt>
      <dd>${escapeHtml(definition.doseText)}</dd>
      <dt>Time frame</dt>
      <dd>${escapeHtml(definition.timeframeText)}</dd>
    </dl>
    ${
      editableEvent
        ? `<button type="button" class="table-action secondary chart-hover-edit" data-action="edit-hovered-dose">Edit plotted dose near cursor</button>`
        : ''
    }
  `;
  elements.chartHoverCard.classList.remove('hidden');
}

function buildStaticLineDefinition(group, range) {
  const amounts = group.events
    .map(event => Number(event.amount))
    .filter(amount => Number.isFinite(amount) && amount > 0);
  const doseRange = amounts.length
    ? `${formatNumber(Math.min(...amounts))} to ${formatNumber(Math.max(...amounts))} ${group.unit.replace('/day', '')}`
    : null;
  const eventWindow = group.events
    .map(event => {
      const endDate = getDoseEventRangeEnd(event, formatDateInput(new Date()));
      return endDate && endDate !== event.date
        ? `${event.date} to ${endDate}`
        : event.date;
    })
    .join('; ');

  return {
    drugName: group.name,
    doseText: doseRange
      ? `Visible doses span ${doseRange} on ${group.route}; percentages are normalized to ${formatNumber(group.maxDose)} ${group.unit}.`
      : `Percentages are normalized to ${formatNumber(group.maxDose)} ${group.unit} for ${group.route}.`,
    timeframeText: range
      ? `${formatTimeframeLabel(state.settings.timeframe)} (${formatDisplayDate(range.startDate)} to ${formatDisplayDate(range.endDate)}); visible segments: ${eventWindow}.`
      : `${formatTimeframeLabel(state.settings.timeframe)}.`,
  };
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
  const normalizedTimeframe = normalizeTimeframe(timeframe);
  const anchorDate = getTimelineAnchorDate();
  const timelineEvents = getTimelineRangeEvents();
  const latestEvent = timelineEvents.reduce((latest, event) => {
    if (!latest) {
      return event;
    }

    return getDoseEventAnchorEnd(event) > getDoseEventAnchorEnd(latest) ? event : latest;
  }, null);
  const earliestEvent = timelineEvents.reduce((earliest, event) => {
    if (!earliest) {
      return event;
    }

    return event.date < earliest.date ? event : earliest;
  }, null);
  const endDate = latestEvent ? new Date(`${getDoseEventAnchorEnd(latestEvent)}T00:00:00`) : anchorDate;
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);

  switch (normalizedTimeframe) {
    case '1d':
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 6);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 29);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 89);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setDate(startDate.getDate() + 1);
      break;
    case '2y':
      startDate.setFullYear(startDate.getFullYear() - 2);
      startDate.setDate(startDate.getDate() + 1);
      break;
    default:
      break;
  }

  if (earliestEvent) {
    const earliestDate = new Date(`${earliestEvent.date}T00:00:00`);
    if (earliestDate > startDate) {
      startDate.setTime(earliestDate.getTime());
    }
  }

  return {
    startDate,
    endDate,
    totalDays: Math.round((endDate - startDate) / MS_PER_DAY) + 1,
  };
}

function getTimelineRangeEvents() {
  return state.doseEvents.filter(event => {
    const amount = Number(event.amount);
    return !Number.isNaN(amount) && amount > 0;
  });
}

function buildMultiDrugDailySeries(startDate, endDate, drugGroups) {
  const totals = new Map();
  const rangeStartKey = formatDateInput(startDate);
  const rangeEndKey = formatDateInput(endDate);

  drugGroups.forEach(group => {
    group.events.forEach(event => {
      const eventStartKey = event.date;
      const eventEndKey = getDoseEventRangeEnd(event, rangeEndKey);
      const overlapStart = eventStartKey > rangeStartKey ? eventStartKey : rangeStartKey;
      const overlapEnd = eventEndKey < rangeEndKey ? eventEndKey : rangeEndKey;

      if (overlapStart > overlapEnd) {
        return;
      }

      const currentDate = new Date(`${overlapStart}T12:00:00`);
      const finalDate = new Date(`${overlapEnd}T12:00:00`);

      while (currentDate <= finalDate) {
        const key = formatDateInput(currentDate);
        if (!totals.has(key)) {
          totals.set(key, {});
        }

        const daySeries = totals.get(key);
        const currentSeries = daySeries[group.key] ?? { totalDose: 0, percentOfMax: 0 };
        currentSeries.totalDose += event.amount;
        currentSeries.percentOfMax +=
          getDoseEventMaxDose(event) > 0 ? (event.amount / getDoseEventMaxDose(event)) * 100 : 0;
        daySeries[group.key] = currentSeries;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
  });

  const dayCount = Math.round((endDate - startDate) / MS_PER_DAY) + 1;
  const points = [];

  for (let offset = 0; offset < dayCount; offset += 1) {
    const current = new Date(startDate.getTime() + offset * MS_PER_DAY);
    const key = formatDateInput(current);
    const series = totals.get(key) || {};
    const totalDose = Object.values(series).reduce((sum, entry) => sum + Number(entry.totalDose || 0), 0);
    const peakPercentOfMax = Object.values(series).reduce(
      (peak, entry) => Math.max(peak, Number(entry.percentOfMax || 0)),
      0
    );
    points.push({
      date: formatDateInput(current),
      totalDose,
      bucketDays: 1,
      percentOfMax: peakPercentOfMax,
      series,
    });
  }

  return points;
}

function summarize(points, drugGroups) {
  if (!points.length) {
    return {
      averagePercent: 0,
      peakPercent: 0,
      totalDose: 0,
      daysAbove80: 0,
      drugCount: drugGroups.length,
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
    drugCount: drugGroups.length,
  };
}

function getFilteredEvents(range = buildRange(state.settings.timeframe)) {
  const startKey = formatDateInput(range.startDate);
  const endKey = formatDateInput(range.endDate);

  return state.doseEvents.filter(event => {
    const eventEndKey = getDoseEventRangeEnd(event, endKey);

    return event.date <= endKey && eventEndKey >= startKey;
  });
}

function findReferenceMatches(drugName, route) {
  const normalizedName = normalizeDrugName(drugName);
  if (!normalizedName) {
    return [];
  }

  const routeMatches = drugReferenceLibrary.filter(entry => entry.route === route);
  const scoredMatches = routeMatches
    .map(entry => {
      const names = [entry.drug, ...(entry.aliases || [])].map(normalizeDrugName);
      const score = Math.max(...names.map(name => scoreNormalizedMedicationMatch(normalizedName, name)));

      return { entry, score };
    })
    .filter(match => match.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return String(left.entry.drug || '').localeCompare(String(right.entry.drug || ''));
    });

  return scoredMatches.map(match => match.entry);
}

function findCatalogMatches(drugName, route) {
  const normalizedName = normalizeDrugName(drugName);
  if (!normalizedName) {
    return [];
  }

  return state.catalogDrugs
    .map(drug => {
      const names = [...new Set([drug.name, drug.genericName].filter(Boolean).map(normalizeDrugName))];
      const nameScore = Math.max(...names.map(name => scoreNormalizedMedicationMatch(normalizedName, name)));
      const routeScore =
        drug.routeMaxDoses && Object.prototype.hasOwnProperty.call(drug.routeMaxDoses, route)
          ? 2
          : !drug.routeMaxDoses && route === 'PO'
            ? 1
            : 0;

      return {
        drug,
        score: nameScore,
        routeScore,
      };
    })
    .filter(match => match.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (right.routeScore !== left.routeScore) {
        return right.routeScore - left.routeScore;
      }
      return String(left.drug.name || '').localeCompare(String(right.drug.name || ''));
    })
    .map(match => match.drug);
}

function buildCatalogReferenceMatch(drug, route) {
  if (!drug) {
    return null;
  }

  const routeMaxDose =
    drug.routeMaxDoses && Object.prototype.hasOwnProperty.call(drug.routeMaxDoses, route)
      ? Number(drug.routeMaxDoses[route])
      : route === 'PO'
        ? Number(drug.maxDailyDose)
        : NaN;

  if (!Number.isFinite(routeMaxDose) || routeMaxDose <= 0) {
    return null;
  }

  return {
    drug: drug.name,
    aliases: [],
    route,
    maxDose: routeMaxDose,
    unit: `${drug.unit}/day`,
    source: 'Bundled catalog reference',
    note: drug.notes || 'Bundled catalog reference used for static inference.',
  };
}

function resolveMedicationBinding(drugName, route) {
  const referenceMatches = findReferenceMatches(drugName, route);
  const catalogMatches = findCatalogMatches(drugName, route);
  const catalogMatch = catalogMatches[0] || null;
  const match = referenceMatches[0] || buildCatalogReferenceMatch(catalogMatch, route);
  const normalizedName = normalizeDrugName(drugName);
  const matchScore = match
    ? scoreNormalizedMedicationMatch(normalizedName, normalizeDrugName(match.drug))
    : -1;

  return {
    medicationId: catalogMatch ? String(catalogMatch.id) : '',
    catalogMatch,
    referenceMatches,
    match,
    matchScore,
  };
}

function scoreNormalizedMedicationMatch(input, candidate) {
  if (!input || !candidate) {
    return -1;
  }

  if (candidate === input) {
    return 3;
  }

  if (candidate.startsWith(input)) {
    return 2;
  }

  if (candidate.includes(input)) {
    return 1;
  }

  return -1;
}

function normalizeDrugName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
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
        {
          id: 'fallback-hydrochlorothiazide',
          name: 'Hydrochlorothiazide',
          drugClass: 'Thiazide diuretic',
          maxDailyDose: 50,
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
  return (state.settings.doseUnit || 'units').replace('/day', '');
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
  if (!Number.isFinite(Number(value))) {
    return 'Not set';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(Number(value));
}

function parsePositiveNumber(value) {
  const trimmed = String(value ?? '').trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatWorkspaceMaxDose() {
  const hasMaxDose = Number.isFinite(Number(state.settings.maxDose)) && Number(state.settings.maxDose) > 0;
  const unitLabel = state.settings.doseUnit || 'units/day';

  if (!hasMaxDose) {
    return `Not set ${unitLabel}`;
  }

  return `${formatNumber(state.settings.maxDose)} ${unitLabel}`;
}

function normalizeTimeframe(timeframe) {
  const normalized = String(timeframe || '1y');
  const supported = new Set(['1d', '7d', '30d', '90d', '1y', '2y']);
  return supported.has(normalized) ? normalized : '2y';
}

function formatTimeframeLabel(timeframe) {
  const labels = {
    '1d': '1 day view',
    '7d': '1 week view',
    '30d': '30 day view',
    '90d': '90 day view',
    '1y': '1 year view',
    '2y': '2 year view',
  };

  return labels[normalizeTimeframe(timeframe)] || timeframe;
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
  const headers = ['Drug', 'Start Date', 'End Date', 'Status', 'Route', 'Dose', 'Percent of Max'];
  const visibleEvents = getFilteredEvents();
  const rows = visibleEvents
    .map(event => {
      const percent = ((event.amount / getDoseEventMaxDose(event)) * 100).toFixed(1);
      return [
        getDoseEventDrugName(event),
        event.date,
        event.endDate || 'Ongoing',
        getDoseEventStatusLabel(event),
        event.route,
        event.amount,
        percent,
      ];
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
    if (state.auth.account.source === 'api') {
      try {
        const apiProfiles = await apiGet(`/profiles?accountId=${encodeURIComponent(state.auth.account.id)}`);
        state.profiles = Array.isArray(apiProfiles) ? apiProfiles.map(normalizeProfile) : [];
        state.profileStorageMode = 'account';
        renderProfileList();
        return;
      } catch (error) {
        console.warn('Failed to load API-backed profiles, falling back to browser-local account profiles:', error);
      }
    }

    state.profiles = readAccountProfiles(state.auth.account.id);
    state.profileStorageMode = 'account';
    renderProfileList();
    return;
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
  const activeProfile = getActiveProfile();
  const profileName =
    elements.profileName.value.trim() ||
    resolveProfileIdentityName(activeProfile) ||
    `${state.settings.medicationName || 'Medication'} · ${formatDateInput(new Date())}`;
  const profilePayload = buildProfilePayload(profileName);

  if (activeProfile && canPersistProfile(activeProfile)) {
    await updatePersistedProfile(activeProfile, profilePayload);
    renderProfileList();
    elements.profileName.value = '';
    render();
    return;
  }

  if (state.auth.account?.id) {
    if (state.auth.account.source === 'api') {
      const createdProfile = await apiPost('/profiles', {
        accountId: Number(state.auth.account.id),
        name: profileName,
        payload: profilePayload.payload,
      });
      const normalizedProfile = normalizeProfile(createdProfile);
      state.profiles.push(normalizedProfile);
      state.activeProfileId = normalizedProfile.id;
      state.profileStorageMode = 'account';
    } else {
      const now = new Date().toISOString();
      const accountProfile = normalizeProfile({
        id: `account-${state.auth.account.id}-${Date.now()}`,
        accountId: state.auth.account.id,
        name: profileName,
        payload: profilePayload.payload,
        createdAt: now,
        updatedAt: now,
      });
      state.profiles.push(accountProfile);
      state.activeProfileId = accountProfile.id;
      state.profileStorageMode = 'account';
      persistAccountProfiles(state.auth.account.id, state.profiles);
    }
  } else {
    const localProfile = normalizeProfile({
      id: `local-${Date.now()}`,
      name: profileName,
      payload: profilePayload.payload,
      createdAt: new Date().toISOString(),
    });
    state.profiles.push(localProfile);
    state.activeProfileId = localProfile.id;
    state.profileStorageMode = 'local';
    persistLocalProfiles();
  }

  renderProfileList();
  elements.profileName.value = '';
}

function renderProfileList() {
  if (state.activeProfileId && !getActiveProfile()) {
    state.activeProfileId = null;
  }

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
      <div class="profile-item ${profile.id === state.activeProfileId ? 'active' : ''}">
        <div class="profile-info">
          <h4>${escapeHtml(profile.name)}</h4>
          <p>${escapeHtml(
            [
              ...new Set(profile.doseEvents.map(event => getDoseEventDrugName(event)).filter(Boolean)),
            ].join(', ') || profile.settings.medicationName
          )} (${escapeHtml(profile.settings.medicationRoute)}) · ${profile.doseEvents.length} dose segments · ${formatProfileStorageLabel(profile)}</p>
          <p>${profile.id === state.activeProfileId ? 'Loaded in Step 1 · ' : ''}Saved ${formatDisplayDate(new Date(profile.createdAt))}</p>
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
    confirm(`Load profile "${profile.name}"? This will replace current settings and dose segments.`)
  ) {
    applyProfileToWorkspace(profile);
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

  state.profiles = state.profiles.filter(entry => entry.id !== profileId);
  if (state.activeProfileId === String(profileId)) {
    state.activeProfileId = null;
  }
  if (state.auth.account?.id && profile.accountId === String(state.auth.account.id)) {
    if (state.auth.account.source === 'api') {
      await apiDelete(`/profiles/${profile.id}`);
    } else {
      persistAccountProfiles(state.auth.account.id, state.profiles);
    }
  } else if (String(profile.id).startsWith('local-') || state.profileStorageMode === 'local') {
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

  profile.name = nextName;
  profile.settings = {
    ...profile.settings,
    patientName: nextName,
  };
  if (state.activeProfileId === profile.id) {
    state.settings.patientName = nextName;
  }
  profile.updatedAt = new Date().toISOString();
  if (state.auth.account?.id && profile.accountId === String(state.auth.account.id)) {
    if (state.auth.account.source === 'api') {
      await apiPut(`/profiles/${profile.id}`, {
        name: profile.name,
        payload: {
          settings: profile.settings,
          doseEvents: profile.doseEvents.map(serializeDoseEvent),
          graphState: profile.graphState,
        },
      });
    } else {
      persistAccountProfiles(state.auth.account.id, state.profiles);
    }
  } else {
    persistLocalProfiles();
  }
  render();
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
    return 'account-owned';
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
  const startDate = event.date ?? event.startDate ?? formatDateInput(new Date());
  const notes = event.notes ?? '';
  const markedCurrent =
    event.isCurrent === true ||
    event.status === 'current' ||
    String(notes).toLowerCase().includes(CURRENT_DOSE_NOTE.toLowerCase());
  const endDate = markedCurrent ? '' : event.endDate ?? startDate;

  return {
    id: event.id ?? `local-${startDate}-${event.route}-${event.amount}`,
    date: startDate,
    endDate,
    medicationId: event.medicationId ?? '',
    medicationName: event.medicationName ?? event.drugName ?? event.name ?? state.settings.medicationName,
    maxDose: Number(event.maxDose ?? event.maxDailyDose ?? state.settings.maxDose),
    doseUnit: event.doseUnit ?? event.unit ?? state.settings.doseUnit,
    route: event.route,
    amount: Number(event.amount),
    notes: markedCurrent ? CURRENT_DOSE_NOTE : notes,
    status: markedCurrent ? 'current' : 'ended',
    isCurrent: markedCurrent,
  };
}

function normalizeProfile(profile) {
  const payload = profile.payload ?? {};
  const settings = payload.settings ?? profile.settings ?? { ...state.settings };
  const doseEvents = payload.doseEvents ?? profile.doseEvents ?? [];
  const graphState = payload.graphState ?? profile.graphState ?? null;

  return {
    id: String(profile.id),
    accountId: profile.accountId ? String(profile.accountId) : null,
    name: profile.name,
    settings,
    graphState,
    doseEvents: doseEvents.map(normalizeDoseEvent),
    createdAt: profile.createdAt ?? new Date().toISOString(),
    updatedAt: profile.updatedAt ?? profile.createdAt ?? new Date().toISOString(),
  };
}

function buildProfilePayload(profileName) {
  const resolvedPatientName = profileName || state.settings.patientName.trim();
  const graphState = {
    ...buildStaticGraphStateSnapshot(),
    patientName: resolvedPatientName,
  };

  return {
    name: profileName,
    payload: {
      settings: {
        ...state.settings,
        patientName: resolvedPatientName,
      },
      doseEvents: state.doseEvents.map(event =>
        Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'id'))
      ),
      graphState,
    },
  };
}

async function updatePersistedProfile(profile, profilePayload) {
  profile.name = profilePayload.name;
  profile.settings = profilePayload.payload.settings;
  profile.graphState = profilePayload.payload.graphState;
  profile.doseEvents = profilePayload.payload.doseEvents.map(normalizeDoseEvent);
  profile.updatedAt = new Date().toISOString();

  if (state.auth.account?.id && profile.accountId === String(state.auth.account.id)) {
    if (state.auth.account.source === 'api') {
      await apiPut(`/profiles/${profile.id}`, {
        name: profile.name,
        payload: profilePayload.payload,
      });
    } else {
      persistAccountProfiles(state.auth.account.id, state.profiles);
    }
    return;
  }

  persistLocalProfiles();
}

function queueActiveProfileSync() {
  const activeProfile = getActiveProfile();
  if (!activeProfile || !canPersistProfile(activeProfile)) {
    return;
  }

  window.clearTimeout(state.profileSyncTimer);
  state.profileSyncTimer = window.setTimeout(() => {
    void syncActiveProfileToWorkspace();
  }, 450);
}

async function syncActiveProfileToWorkspace() {
  const activeProfile = getActiveProfile();
  if (!activeProfile || !canPersistProfile(activeProfile)) {
    return;
  }

  const profileName = resolveProfileIdentityName(activeProfile) || activeProfile.name;
  if (!profileName) {
    return;
  }

  try {
    await updatePersistedProfile(activeProfile, buildProfilePayload(profileName));
    renderProfileList();
    renderPatientProfileStatus();
  } catch (error) {
    console.warn('Unable to sync the loaded profile after Step 1 changes:', error);
  }
}

function serializeDoseEvent(event) {
  return Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'id'));
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

function readGuestWorkspaceSnapshot() {
  try {
    const stored = window.localStorage.getItem(STATIC_WORKSPACE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to read guest workspace snapshot:', error);
    return null;
  }
}

function persistGuestWorkspaceSnapshot(snapshot) {
  try {
    window.localStorage.setItem(STATIC_WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('Failed to persist guest workspace snapshot:', error);
  }
}

function readAccountWorkspaceSnapshotsMap() {
  try {
    const stored = window.localStorage.getItem(STATIC_ACCOUNT_WORKSPACES_STORAGE_KEY);
    if (!stored) {
      return {};
    }

    const workspacesByAccount = JSON.parse(stored);
    return workspacesByAccount && typeof workspacesByAccount === 'object' ? workspacesByAccount : {};
  } catch (error) {
    console.warn('Failed to read account workspaces:', error);
    return {};
  }
}

function persistAccountWorkspaceSnapshotsMap(workspacesByAccount) {
  try {
    window.localStorage.setItem(
      STATIC_ACCOUNT_WORKSPACES_STORAGE_KEY,
      JSON.stringify(workspacesByAccount)
    );
  } catch (error) {
    console.warn('Failed to persist account workspaces:', error);
  }
}

function readAccountWorkspaceSnapshot(accountId) {
  const workspacesByAccount = readAccountWorkspaceSnapshotsMap();
  return workspacesByAccount[String(accountId)] ?? null;
}

function persistAccountWorkspaceSnapshot(accountId, snapshot) {
  const workspacesByAccount = readAccountWorkspaceSnapshotsMap();
  workspacesByAccount[String(accountId)] = snapshot;
  persistAccountWorkspaceSnapshotsMap(workspacesByAccount);
}

function formatProfileStorageLabel(profile) {
  if (profile.accountId) {
    return 'account profile';
  }

  if (String(profile.id).startsWith('local-')) {
    return 'local profile';
  }

  return 'seeded profile';
}

function buildStaticGraphStateSnapshot() {
  const sortedEvents = [...state.doseEvents].sort((left, right) => left.date.localeCompare(right.date));
  const firstDoseDate = sortedEvents[0]?.date ?? '';
  const referenceMaxDose = state.inference.match?.maxDose ?? null;
  const groupedDrugs = getVisibleDrugGroups(sortedEvents);

  return {
    version: 1,
    patientName: state.settings.patientName,
    route: state.settings.medicationRoute,
    timeframe: state.settings.timeframe,
    selectedDrugIds: groupedDrugs.map(group => group.key),
    drugStates: groupedDrugs.map(group => ({
      id: group.key,
      name: group.name,
      route: group.route,
      unit: group.unit,
      referenceMaxDailyDose:
        group.name === state.settings.medicationName ? referenceMaxDose : null,
      overrideMaxDailyDose: group.maxDose,
      maxDailyDose: group.maxDose,
      isMaxDoseOverridden: true,
    })),
    medicationEntries: groupedDrugs.map(group => {
      const groupEvents = [...group.events].sort((left, right) => left.date.localeCompare(right.date));
      const groupHasCurrent = groupEvents.some(isDoseEventCurrent);
      const groupLastDate = groupEvents.reduce(
        (latest, event) => {
          const eventEnd = getDoseEventAnchorEnd(event);
          return eventEnd > latest ? eventEnd : latest;
        },
        groupEvents[0]?.date ?? ''
      );

      return {
        id: `entry-${group.key}`,
        name: group.name,
        route: group.route,
        startDate: groupEvents[0]?.date ?? firstDoseDate,
        endDate: groupHasCurrent ? '' : groupLastDate,
        stopDate: groupLastDate,
        timelineStatus: groupHasCurrent ? 'current' : 'historic',
        referenceMaxDailyDose: null,
        overrideMaxDailyDose: group.maxDose,
        maxDailyDose: group.maxDose,
      };
    }),
  };
}

function buildCurrentWorkspaceSnapshot() {
  return {
    version: 1,
    activeProfileId: state.activeProfileId,
    settings: { ...state.settings },
    doseEvents: state.doseEvents.map(serializeDoseEvent),
    graphState: buildStaticGraphStateSnapshot(),
    updatedAt: new Date().toISOString(),
  };
}

function persistCurrentWorkspace() {
  const snapshot = buildCurrentWorkspaceSnapshot();

  if (state.auth.account?.id) {
    persistAccountWorkspaceSnapshot(state.auth.account.id, snapshot);
    return;
  }

  persistGuestWorkspaceSnapshot(snapshot);
}

function applyWorkspaceSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return false;
  }

  restoreStaticGraphState(snapshot.graphState ?? null, snapshot.settings ?? state.settings);
  state.doseEvents = Array.isArray(snapshot.doseEvents)
    ? snapshot.doseEvents.map(normalizeDoseEvent).sort((left, right) => left.date.localeCompare(right.date))
    : [];
  state.activeProfileId = snapshot.activeProfileId ? String(snapshot.activeProfileId) : null;
  resetDoseForm();
  return true;
}

function applyProfileToWorkspace(profile) {
  restoreStaticGraphState(profile.graphState ?? null, profile.settings);
  state.settings.patientName = profile.name || profile.settings.patientName || '';
  state.doseEvents = profile.doseEvents
    .map(normalizeDoseEvent)
    .sort((left, right) => left.date.localeCompare(right.date));
  state.activeProfileId = profile.id;
  resetDoseForm();
}

function getLatestRestorableProfile() {
  if (state.profileStorageMode === 'seeded') {
    return null;
  }

  return [...state.profiles]
    .filter(profile => Array.isArray(profile.doseEvents) && profile.doseEvents.length)
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt ?? left.createdAt).getTime();
      const rightTime = new Date(right.updatedAt ?? right.createdAt).getTime();
      return rightTime - leftTime;
    })[0] ?? null;
}

function restorePersistedWorkspace() {
  const snapshot =
    (state.auth.account?.id ? readAccountWorkspaceSnapshot(state.auth.account.id) : null) ??
    readGuestWorkspaceSnapshot();

  if (applyWorkspaceSnapshot(snapshot)) {
    return true;
  }

  const latestProfile = getLatestRestorableProfile();
  if (!latestProfile) {
    return false;
  }

  applyProfileToWorkspace(latestProfile);
  return true;
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
    timeframe: normalizeTimeframe(graphState?.timeframe ?? nextSettings.timeframe),
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

  if (isStaticSessionToken(state.auth.token)) {
    const storedAccount = findStaticAccountById(state.auth.account?.id);
    if (storedAccount) {
      state.auth.account = sanitizeStaticAccount(storedAccount);
      persistAuthSession(state.auth.token, state.auth.account);
    } else {
      clearAuthSession();
    }
  } else {
    try {
      state.auth.account = await fetchApiSessionAccount();
      persistAuthSession(state.auth.token, state.auth.account);
    } catch (error) {
      console.warn('Failed to restore API-backed auth session:', error);
      clearAuthSession();
    }
  }

  renderAuthState();
}

async function handleAuthSubmit() {
  const mode = state.auth.mode;
  const email = elements.authEmail.value.trim().toLowerCase();
  const password = elements.authPassword.value;
  const name = elements.authName.value.trim();
  const isDeveloper = elements.authIsDeveloper.checked;

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
    let account;
    let token;

    if (mode === 'login') {
      try {
        account = await loginStaticAccount(email, password);
        token = createStaticSessionToken(account);
      } catch {
        const apiSession = await loginApiAccount(email, password);
        account = apiSession.account;
        token = apiSession.token;
      }
    } else {
      account = await registerStaticAccount(name, email, password, { isDeveloper });
      token = createStaticSessionToken(account);
      state.auth.mode = 'login';
      elements.authName.value = '';
      elements.authIsDeveloper.checked = false;
    }

    state.auth.token = token;
    state.auth.account =
      account.source === 'api' ? account : sanitizeStaticAccount(account);
    persistAuthSession(token, state.auth.account);
    if (state.auth.account.source === 'static') {
      migrateGuestProfilesToAccount(account.id);
    }
    elements.authPassword.value = '';
    setAuthMessage(
      mode === 'login'
        ? `Signed in. ${formatAccountDesignation(state.auth.account)} access is active for this ${state.auth.account.source === 'api' ? 'saved account' : 'browser account'}.`
        : `Account created. ${formatAccountDesignation(state.auth.account)} access is active for this browser account.`,
      'success'
    );
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

function readStaticAccounts() {
  try {
    const stored = window.localStorage.getItem(STATIC_ACCOUNTS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const accounts = JSON.parse(stored);
    return Array.isArray(accounts) ? accounts : [];
  } catch (error) {
    console.warn('Failed to read static accounts:', error);
    return [];
  }
}

function persistStaticAccounts(accounts) {
  try {
    window.localStorage.setItem(STATIC_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (error) {
    console.warn('Failed to persist static accounts:', error);
  }
}

function readStaticAccountProfilesMap() {
  try {
    const stored = window.localStorage.getItem(STATIC_ACCOUNT_PROFILES_STORAGE_KEY);
    if (!stored) {
      return {};
    }

    const profilesByAccount = JSON.parse(stored);
    return profilesByAccount && typeof profilesByAccount === 'object' ? profilesByAccount : {};
  } catch (error) {
    console.warn('Failed to read account profiles:', error);
    return {};
  }
}

function persistStaticAccountProfilesMap(profilesByAccount) {
  try {
    window.localStorage.setItem(
      STATIC_ACCOUNT_PROFILES_STORAGE_KEY,
      JSON.stringify(profilesByAccount)
    );
  } catch (error) {
    console.warn('Failed to persist account profiles:', error);
  }
}

function readAccountProfiles(accountId) {
  const profilesByAccount = readStaticAccountProfilesMap();
  const accountProfiles = profilesByAccount[String(accountId)];
  return Array.isArray(accountProfiles) ? accountProfiles.map(normalizeProfile) : [];
}

function persistAccountProfiles(accountId, profiles) {
  const profilesByAccount = readStaticAccountProfilesMap();
  profilesByAccount[String(accountId)] = profiles.map(profile => ({
    id: profile.id,
    accountId: profile.accountId ?? String(accountId),
    name: profile.name,
    payload: {
      settings: profile.settings,
      doseEvents: profile.doseEvents.map(event =>
        Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'id'))
      ),
      graphState: profile.graphState,
    },
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt ?? profile.createdAt,
  }));
  persistStaticAccountProfilesMap(profilesByAccount);
}

function findStaticAccountByEmail(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  return readStaticAccounts().find(account => account.email === normalizedEmail) || null;
}

function findStaticAccountById(accountId) {
  const normalizedId = String(accountId || '');
  if (!normalizedId) {
    return null;
  }

  return readStaticAccounts().find(account => String(account.id) === normalizedId) || null;
}

function sanitizeStaticAccount(account) {
  return {
    id: String(account.id),
    name: account.name,
    email: account.email,
    source: 'static',
    isDeveloper: account.isDeveloper === true,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt ?? account.createdAt,
  };
}

function sanitizeApiAccount(account) {
  return {
    id: String(account.id),
    name: account.name,
    email: account.email,
    source: 'api',
    isDeveloper: account.role === 'admin' || account.role === 'developer',
    role: account.role ?? 'user',
    createdAt: account.createdAt,
    updatedAt: account.updatedAt ?? account.createdAt,
  };
}

function formatAccountDesignation(account) {
  return account?.isDeveloper ? 'developer' : 'standard';
}

async function hashStaticPassword(password) {
  if (window.crypto?.subtle && window.TextEncoder) {
    const encoded = new TextEncoder().encode(password);
    const digest = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  }

  return `plain:${password}`;
}

function createStaticSessionToken(account) {
  const randomPart =
    window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `static-${account.id}-${randomPart}`;
}

async function registerStaticAccount(name, email, password, options = {}) {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = readStaticAccounts();

  if (accounts.some(account => account.email === normalizedEmail)) {
    throw new Error('An account with that email already exists in this browser.');
  }

  const now = new Date().toISOString();
  const account = {
    id: `acct-${Date.now()}`,
    name,
    email: normalizedEmail,
    isDeveloper: options.isDeveloper === true,
    passwordHash: await hashStaticPassword(password),
    createdAt: now,
    updatedAt: now,
  };

  accounts.push(account);
  persistStaticAccounts(accounts);
  return account;
}

async function loginStaticAccount(email, password) {
  const account = findStaticAccountByEmail(email);
  if (!account) {
    throw new Error('No browser-local account was found for that email.');
  }

  const passwordHash = await hashStaticPassword(password);
  if (account.passwordHash !== passwordHash) {
    throw new Error('Incorrect password for this browser-local account.');
  }

  return account;
}

async function loginApiAccount(email, password) {
  const response = await apiPost(
    '/auth/login',
    { email, password },
    { skipAuth: true }
  );

  if (!response?.account || !response?.token) {
    throw new Error('The account service returned an invalid response.');
  }

  return {
    account: sanitizeApiAccount(response.account),
    token: response.token,
  };
}

async function fetchApiSessionAccount() {
  const response = await apiGet('/auth/me');
  if (!response?.account) {
    throw new Error('No authenticated account was returned.');
  }

  return sanitizeApiAccount(response.account);
}

function isStaticSessionToken(token) {
  return String(token || '').startsWith('static-');
}

function migrateGuestProfilesToAccount(accountId) {
  const guestProfiles = readLocalProfiles();
  if (!guestProfiles.length) {
    return;
  }

  const existingProfiles = readAccountProfiles(accountId);
  const existingSignatures = new Set(
    existingProfiles.map(profile => buildProfileMigrationSignature(profile))
  );
  const now = new Date().toISOString();
  const migratedProfiles = [];

  for (const profile of guestProfiles) {
    const signature = buildProfileMigrationSignature(profile);
    if (existingSignatures.has(signature)) {
      continue;
    }

    existingSignatures.add(signature);
    migratedProfiles.push(
      normalizeProfile({
        id: `account-${accountId}-${Date.now()}-${migratedProfiles.length + 1}`,
        accountId,
        name: profile.name,
        payload: {
          settings: profile.settings,
          doseEvents: profile.doseEvents.map(event =>
            Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'id'))
          ),
          graphState: profile.graphState,
        },
        createdAt: profile.createdAt,
        updatedAt: now,
      })
    );
  }

  if (migratedProfiles.length) {
    persistAccountProfiles(accountId, [...existingProfiles, ...migratedProfiles]);
  }
}

function buildProfileMigrationSignature(profile) {
  return JSON.stringify({
    name: profile.name,
    settings: profile.settings,
    doseEvents: profile.doseEvents,
  });
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
  const routeEvents = state.doseEvents.filter(event => event.route === state.settings.medicationRoute);
  const anchorEvents = routeEvents.length ? routeEvents : state.doseEvents;

  if (!anchorEvents.length) {
    return new Date();
  }

  if (anchorEvents.some(isDoseEventCurrent)) {
    return new Date();
  }

  const latestDate = anchorEvents.reduce((latest, event) => {
    const eventEnd = getDoseEventAnchorEnd(event);
    return eventEnd > latest ? eventEnd : latest;
  }, getDoseEventAnchorEnd(anchorEvents[0]));

  return new Date(`${latestDate}T00:00:00`);
}
