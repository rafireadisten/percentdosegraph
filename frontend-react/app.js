import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const h = React.createElement;
const MAX_VISIBLE_DRUGS = 20;
const API_BASE_PATH = resolveApiBasePath();
const ROUTE_OPTIONS = ['PO', 'IV', 'IM', 'SC', 'SL', 'PR', 'TD', 'Other'];
const TIMELINE_STATUS_OPTIONS = [
  { value: 'current', label: 'Current' },
  { value: 'historic', label: 'Historic' },
  { value: 'planned', label: 'Planned' },
];
const TIMEFRAME_OPTIONS = [
  { value: '30d', label: '30 days', days: 30 },
  { value: '90d', label: '90 days', days: 90 },
  { value: '1y', label: '1 year', days: 365 },
  { value: '2y', label: '2 years', days: 365 * 2 },
  { value: '5y', label: '5 years', days: 365 * 5 },
];
const PROFILES_STORAGE_KEY = 'percentdosegraph:react-profiles';
const MEDICATION_LIST_STORAGE_KEY = 'percentdosegraph:react-medication-list';
const WORKSPACE_STORAGE_KEY = 'percentdosegraph:react-workspace';
const AUTH_TOKEN_STORAGE_KEY = 'percentdosegraph:auth-token';
const AUTH_ACCOUNT_STORAGE_KEY = 'percentdosegraph:auth-account';
const CHART_COLORS = [
  '#0d8f78',
  '#bf4f29',
  '#2956bf',
  '#7e5bef',
  '#986f0b',
  '#c93d71',
  '#2c7a7b',
  '#805ad5',
  '#c05621',
  '#276749',
  '#2b6cb0',
  '#97266d',
  '#4a5568',
  '#d69e2e',
  '#2f855a',
  '#dd6b20',
  '#3182ce',
  '#b83280',
  '#22543d',
  '#744210',
];

function App() {
  const workspaceDefaults = loadWorkspaceFromStorage();
  const sessionDefaults = loadAuthSessionFromStorage();
  const importFileRef = useRef(null);
  const [drugs, setDrugs] = useState([]);
  const [doses, setDoses] = useState([]);
  const [selectedDrugIds, setSelectedDrugIds] = useState([]);
  const [route, setRoute] = useState(workspaceDefaults.route ?? 'PO');
  const [timeframe, setTimeframe] = useState(workspaceDefaults.timeframe ?? '1y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [patientName, setPatientName] = useState(
    workspaceDefaults.patientName ?? 'Example Patient'
  );
  const [workspaceLabel, setWorkspaceLabel] = useState(
    workspaceDefaults.workspaceLabel ?? 'Current medication timeline'
  );
  const [patientNotes, setPatientNotes] = useState(workspaceDefaults.patientNotes ?? '');
  const [workspaceStatus, setWorkspaceStatus] = useState('');
  const [listDrugId, setListDrugId] = useState('');
  const [listStartDate, setListStartDate] = useState(formatDateKey(new Date()));
  const [listEndDate, setListEndDate] = useState('');
  const [listRoute, setListRoute] = useState('PO');
  const [listTimelineStatus, setListTimelineStatus] = useState('current');
  const [listNotes, setListNotes] = useState('');
  const [listStatus, setListStatus] = useState('');
  const [listError, setListError] = useState('');
  const [entryDrugId, setEntryDrugId] = useState('');
  const [entryDate, setEntryDate] = useState(formatDateKey(new Date()));
  const [entryEndDate, setEntryEndDate] = useState('');
  const [entryRoute, setEntryRoute] = useState('PO');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryStatus, setEntryStatus] = useState('');
  const [entryError, setEntryError] = useState('');
  const [editingDoseId, setEditingDoseId] = useState(null);
  const [medicationEntries, setMedicationEntries] = useState(() =>
    loadMedicationEntriesFromStorage()
  );
  const [profiles, setProfiles] = useState(() =>
    normalizeStoredProfiles(loadProfilesFromStorage())
  );
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [profileStatus, setProfileStatus] = useState('');
  const [profileName, setProfileName] = useState('');

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(sessionDefaults.token));
  const [user, setUser] = useState(sessionDefaults.account);
  const [authReady, setAuthReady] = useState(false);
  const [authToken, setAuthToken] = useState(sessionDefaults.token ?? '');
  const [authMode, setAuthMode] = useState('login'); // "login" or "register"
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    saveProfilesToStorage(profiles);
  }, [profiles]);

  useEffect(() => {
    saveMedicationEntriesToStorage(medicationEntries);
  }, [medicationEntries]);

  useEffect(() => {
    saveWorkspaceToStorage({
      patientName,
      workspaceLabel,
      patientNotes,
      route,
      timeframe,
    });
  }, [patientName, patientNotes, route, timeframe, workspaceLabel]);

  useEffect(() => {
    let cancelled = false;

    async function restoreAuth() {
      if (!sessionDefaults.token) {
        setAuthReady(true);
        return;
      }

      try {
        const payload = await apiGet('/auth/me', sessionDefaults.token);
        if (!cancelled) {
          persistAuthSession(sessionDefaults.token, payload.account);
          setAuthToken(sessionDefaults.token);
          setUser(payload.account);
          setIsAuthenticated(true);
        }
      } catch (authFailure) {
        console.warn('Clearing stale auth session:', authFailure);
        clearAuthSession();
        if (!cancelled) {
          setAuthToken('');
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    }

    restoreAuth();

    return () => {
      cancelled = true;
    };
  }, [sessionDefaults.token]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      if (!isAuthenticated || !user?.id) {
        return;
      }

      try {
        const apiProfiles = await apiGet(`/accounts/${user.id}/profiles`, authToken);
        if (!cancelled) {
          setProfiles(normalizeStoredProfiles(apiProfiles.map(mapApiProfileToAppProfile)));
        }
      } catch (profileError) {
        console.warn('Falling back to local profile storage:', profileError);
      }
    }

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [authToken, isAuthenticated, user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [nextDrugs, nextDoses] = await Promise.all([loadDrugs(), loadDoses()]);

        if (cancelled) {
          return;
        }

        const normalizedDrugs = nextDrugs.map(normalizeDrugRecord);
        const seededDoses = addSeededComparisonDoses(nextDoses, normalizedDrugs);
        const defaultDrugId = normalizedDrugs[0]?.id ?? null;
        const normalizedDoses = seededDoses.map((dose, index) =>
          normalizeDoseRecord(dose, index, defaultDrugId)
        );

        setDrugs(normalizedDrugs);
        setDoses(normalizedDoses);
        const initialSelection = getInitialSelectedDrugIds(normalizedDrugs, medicationEntries);
        const defaultSelection = initialSelection[0] ?? defaultDrugId ?? '';

        setSelectedDrugIds(initialSelection);
        setEntryDrugId(String(defaultSelection));
        setListDrugId(String(defaultSelection));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unknown loading error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const term = searchTerm.trim();

    if (!term) {
      setSearchResults([]);
      setSearchError('');
      setSearchLoading(false);
      return undefined;
    }

    const localMatches = searchCatalogLocally(drugs, term, selectedDrugIds);
    setSearchResults(localMatches);
    setSearchLoading(term.length >= 2);
    setSearchError('');

    if (term.length < 2) {
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const remoteMatches = await searchUsDrugCatalog(term);

        if (cancelled) {
          return;
        }

        setDrugs(current => mergeDrugCatalog(current, remoteMatches));
        setSearchResults(mergeSearchResults(localMatches, remoteMatches, selectedDrugIds));
      } catch (searchFailure) {
        if (!cancelled) {
          setSearchError(
            searchFailure instanceof Error
              ? searchFailure.message
              : 'Unable to search the U.S. drug catalog right now.'
          );
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [drugs, searchTerm, selectedDrugIds]);

  useEffect(() => {
    if (!drugs.length) {
      return;
    }

    const candidateDrugId = selectedDrugIds[0] ?? drugs[0]?.id ?? '';

    if (!entryDrugId || !drugs.some(drug => drug.id === entryDrugId)) {
      setEntryDrugId(String(candidateDrugId));
    }
    if (!listDrugId || !drugs.some(drug => drug.id === listDrugId)) {
      setListDrugId(String(candidateDrugId));
    }
  }, [drugs, entryDrugId, listDrugId, selectedDrugIds]);

  const drugLookup = useMemo(() => {
    return new Map(drugs.map(drug => [drug.id, drug]));
  }, [drugs]);

  const selectedDrugs = useMemo(() => {
    return selectedDrugIds
      .map(drugId => drugLookup.get(drugId))
      .filter(Boolean)
      .slice(0, MAX_VISIBLE_DRUGS);
  }, [drugLookup, selectedDrugIds]);

  const medicationTableRows = useMemo(() => {
    return buildMedicationTableRows(medicationEntries, drugLookup, selectedDrugIds);
  }, [drugLookup, medicationEntries, selectedDrugIds]);

  const range = useMemo(() => buildRange(doses, timeframe), [doses, timeframe]);
  const filteredEvents = useMemo(() => {
    return getFilteredEvents(
      doses,
      selectedDrugIds,
      route,
      range.startDate,
      range.endDate,
      medicationEntries
    ).sort((left, right) => right.date.localeCompare(left.date));
  }, [doses, medicationEntries, range.endDate, range.startDate, route, selectedDrugIds]);

  const chartData = useMemo(() => {
    return buildChartData(filteredEvents, selectedDrugs, range.startDate, range.endDate);
  }, [filteredEvents, range.endDate, range.startDate, selectedDrugs]);

  const summary = useMemo(
    () => summarizeChart(chartData, filteredEvents, selectedDrugs),
    [chartData, filteredEvents, selectedDrugs]
  );

  const medicationSummary = useMemo(
    () => summarizeMedicationEntries(medicationEntries),
    [medicationEntries]
  );

  function handleAddDrug(drug) {
    setDrugs(current => mergeDrugCatalog(current, [drug]));
    setSelectedDrugIds(current => {
      if (current.includes(drug.id)) {
        return current;
      }

      if (current.length >= MAX_VISIBLE_DRUGS) {
        return current;
      }

      return [...current, drug.id];
    });
  }

  function handleToggleDrugSelection(drugId) {
    setSelectedDrugIds(current => {
      if (current.includes(drugId)) {
        return current.filter(id => id !== drugId);
      }

      if (current.length >= MAX_VISIBLE_DRUGS) {
        return current;
      }

      return [...current, drugId];
    });
  }

  function handleMaxDoseChange(drugId, nextValue) {
    setDrugs(current =>
      current.map(drug => {
        if (drug.id !== drugId) {
          return drug;
        }

        const parsed = Number(nextValue);
        const nextMaxDailyDose =
          Number.isFinite(parsed) && parsed > 0 ? parsed : drug.referenceMaxDailyDose;

        return {
          ...drug,
          maxDailyDose: nextMaxDailyDose,
          overrideMaxDailyDose:
            nextMaxDailyDose !== drug.referenceMaxDailyDose ? nextMaxDailyDose : null,
          isMaxDoseOverridden: nextMaxDailyDose !== drug.referenceMaxDailyDose,
        };
      })
    );
  }

  function handleMedicationEntrySubmit(event) {
    event.preventDefault();

    if (!listDrugId) {
      setListError('Choose a medication before adding it to the list.');
      setListStatus('');
      return;
    }

    if (!listStartDate) {
      setListError('Choose a start date for the medication entry.');
      setListStatus('');
      return;
    }

    if (listEndDate && listEndDate < listStartDate) {
      setListError('Medication end date must be the same as or after the start date.');
      setListStatus('');
      return;
    }

    const normalizedEndDate =
      listTimelineStatus === 'historic' && !listEndDate ? listStartDate : listEndDate;
    const entry = normalizeMedicationEntry(
      {
        id: `med-${listDrugId}-${listStartDate}-${listRoute}-${Date.now()}`,
        drugId: listDrugId,
        startDate: listStartDate,
        endDate: normalizedEndDate,
        route: listRoute,
        timelineStatus: listTimelineStatus,
        notes: listNotes.trim(),
        createdAt: new Date().toISOString(),
        sourceProfileId: activeProfileId,
      },
      medicationEntries.length
    );

    setMedicationEntries(current => mergeMedicationEntries(current, [entry]));
    setSelectedDrugIds(current => {
      if (current.includes(entry.drugId) || current.length >= MAX_VISIBLE_DRUGS) {
        return current;
      }

      return [...current, entry.drugId];
    });
    setListStatus('Medication added to the active list and available in the graph key.');
    setListError('');
    setListEndDate('');
    setListNotes('');
    setEntryDrugId(String(entry.drugId));
    setWorkspaceStatus('');
  }

  function handleDeleteMedicationEntry(entryId) {
    setMedicationEntries(current => current.filter(entry => entry.id !== entryId));
  }

  async function handleSaveProfile() {
    if (!selectedDrugIds.length && !medicationEntries.length) {
      setProfileStatus('Add medications before saving a medication list profile.');
      return;
    }

    const label = profileName.trim() || generateSequentialProfileLabel(profiles);
    const draftProfile = {
      id: generateProfileId(
        {
          selectedDrugIds,
          route,
          timeframe,
          drugNames: selectedDrugs.map(drug => drug.name),
        },
        profiles.length + 1
      ),
      label,
      selectedDrugIds,
      drugStates: buildProfileDrugStates(drugs, selectedDrugIds, medicationEntries),
      medicationEntries,
      patientName,
      workspaceLabel,
      patientNotes,
      route,
      timeframe,
      savedListDate: formatDateKey(new Date()),
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await saveProfileToApi(draftProfile, profiles, user, authToken);
      const normalizedProfile = normalizeStoredProfiles([saved])[0];
      setProfiles(current => upsertProfile(current, normalizedProfile));
      setActiveProfileId(normalizedProfile.id);
      setProfileStatus(
        `Saved ${normalizedProfile.label} with ${medicationEntries.length} medication entries.`
      );
    } catch (profileError) {
      console.warn('Saving profile locally because API save failed:', profileError);
      setProfiles(current => upsertProfile(current, draftProfile));
      setActiveProfileId(draftProfile.id);
      setProfileStatus(`Saved ${draftProfile.label} locally in this browser.`);
    }

    setProfileName('');
  }

  function handleApplyProfile(profile) {
    const nextSelectedDrugIds = getSelectedDrugIdsFromProfile(profile);
    setDrugs(current => mergeDrugCatalog(current, profile.drugStates ?? []));
    setSelectedDrugIds(nextSelectedDrugIds);
    setMedicationEntries(profile.medicationEntries ?? []);
    setPatientName(profile.patientName ?? 'Example Patient');
    setWorkspaceLabel(profile.workspaceLabel ?? profile.label ?? 'Current medication timeline');
    setPatientNotes(profile.patientNotes ?? '');
    setRoute(profile.route);
    setTimeframe(profile.timeframe);
    setActiveProfileId(profile.id);
    setProfileStatus(`Opened ${profile.label} from ${profile.savedListDate ?? 'a previous save'}.`);
    setWorkspaceStatus('');
  }

  function handleMergeProfile(profile) {
    setDrugs(current => mergeDrugCatalog(current, profile.drugStates ?? []));
    setMedicationEntries(current =>
      mergeMedicationEntries(current, profile.medicationEntries ?? [])
    );
    setSelectedDrugIds(current => {
      const merged = new Set(current);
      for (const drugId of getSelectedDrugIdsFromProfile(profile)) {
        if (merged.size >= MAX_VISIBLE_DRUGS && !merged.has(drugId)) {
          continue;
        }
        merged.add(drugId);
      }
      return Array.from(merged);
    });
    setActiveProfileId(profile.id);
    setProfileStatus(`Added medications from ${profile.label} into the current list.`);
    setWorkspaceStatus('');
  }

  async function handleRenameProfile(profile) {
    const nextLabel = window.prompt('Rename this saved medication list profile:', profile.label);
    if (!nextLabel || nextLabel.trim() === profile.label) {
      return;
    }

    const updatedProfile = {
      ...profile,
      label: nextLabel.trim(),
      workspaceLabel: profile.workspaceLabel || nextLabel.trim(),
    };

    try {
      const saved = await saveProfileToApi(updatedProfile, profiles, user, authToken);
      const normalizedProfile = normalizeStoredProfiles([saved])[0];
      setProfiles(current => upsertProfile(current, normalizedProfile));
      if (activeProfileId === profile.id) {
        setActiveProfileId(normalizedProfile.id);
      }
      setProfileStatus(`Renamed profile to ${normalizedProfile.label}.`);
    } catch (profileError) {
      console.warn('Renaming profile locally because API save failed:', profileError);
      setProfiles(current => upsertProfile(current, updatedProfile));
      setProfileStatus(`Renamed profile to ${updatedProfile.label} locally.`);
    }
  }

  async function handleDeleteProfile(profileId) {
    try {
      if (isNumericIdentifier(profileId)) {
        await apiDelete(`/profiles/${profileId}`, authToken);
      }
    } catch (profileError) {
      console.warn('Deleting profile locally because API delete failed:', profileError);
    }

    setProfiles(current => current.filter(profile => profile.id !== profileId));
    if (activeProfileId === profileId) {
      setActiveProfileId(null);
    }
    setProfileStatus('Profile deleted.');
  }

  function handleStartDoseEdit(dose) {
    setEditingDoseId(dose.id);
    setEntryDrugId(String(dose.drugId));
    setEntryDate(dose.date);
    setEntryEndDate(dose.endDate ?? '');
    setEntryRoute(dose.route);
    setEntryAmount(String(dose.amount));
    setEntryNotes(dose.notes ?? '');
    setEntryStatus('Editing an existing dose event.');
    setEntryError('');
  }

  function handleCancelDoseEdit() {
    setEditingDoseId(null);
    setEntryDate(formatDateKey(new Date()));
    setEntryEndDate('');
    setEntryAmount('');
    setEntryNotes('');
    setEntryStatus('');
    setEntryError('');
  }

  async function handleDeleteDose(doseId) {
    try {
      if (isNumericIdentifier(doseId)) {
        await apiDelete(`/doses/${doseId}`);
      }
    } catch (deleteError) {
      console.warn('Deleting dose locally because API delete failed:', deleteError);
    }

    setDoses(current => current.filter(dose => dose.id !== doseId));
    if (editingDoseId === doseId) {
      handleCancelDoseEdit();
    }
    setWorkspaceStatus('Deleted the selected dose event.');
  }

  async function handleDoseEntrySubmit(event) {
    event.preventDefault();

    const amount = Number(entryAmount);
    if (!entryDrugId) {
      setEntryError('Choose a drug before logging a dose.');
      setEntryStatus('');
      return;
    }

    if (!entryDate) {
      setEntryError('Choose a dose date.');
      setEntryStatus('');
      return;
    }

    if (entryEndDate && entryEndDate < entryDate) {
      setEntryError('Dose end date must be the same as or after the start date.');
      setEntryStatus('');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setEntryError('Enter a dose amount greater than zero.');
      setEntryStatus('');
      return;
    }

    const payload = {
      drugId: coerceDrugId(entryDrugId),
      date: entryDate,
      endDate: entryEndDate || undefined,
      route: entryRoute,
      amount,
      notes: entryNotes.trim(),
    };

    try {
      if (editingDoseId && isNumericIdentifier(editingDoseId)) {
        const updated = await apiPut(`/doses/${editingDoseId}`, payload, authToken);
        setDoses(current =>
          current.map((dose, index) =>
            dose.id === editingDoseId ? normalizeDoseRecord(updated, index, entryDrugId) : dose
          )
        );
        setEntryStatus('Dose updated and the chart has been refreshed.');
      } else if (editingDoseId) {
        setDoses(current =>
          current.map((dose, index) =>
            dose.id === editingDoseId
              ? normalizeDoseRecord({ id: editingDoseId, ...payload }, index, entryDrugId)
              : dose
          )
        );
        setEntryStatus('Dose updated locally in the browser session.');
      } else {
        const created = await apiPost('/doses', payload, authToken);
        setDoses(current =>
          mergeDoseEvents(current, [normalizeDoseRecord(created, current.length, entryDrugId)])
        );
        setEntryStatus('Dose saved to the local API and added to the chart.');
      }
    } catch (saveError) {
      console.warn('Saving dose locally because API create/update failed:', saveError);
      const localDose = normalizeDoseRecord(
        {
          id: editingDoseId || `local-${entryDrugId}-${entryDate}-${entryRoute}-${amount}`,
          ...payload,
        },
        doses.length,
        entryDrugId
      );
      setDoses(current =>
        editingDoseId
          ? current.map(dose => (dose.id === editingDoseId ? localDose : dose))
          : mergeDoseEvents(current, [localDose])
      );
      setEntryStatus(
        editingDoseId
          ? 'Dose updated locally in the browser session.'
          : 'Dose saved locally in the browser session and added to the chart.'
      );
    }

    setSelectedDrugIds(current => {
      if (current.includes(entryDrugId) || current.length >= MAX_VISIBLE_DRUGS) {
        return current;
      }

      return [...current, entryDrugId];
    });
    setRoute(entryRoute);
    setEditingDoseId(null);
    setEntryAmount('');
    setEntryEndDate('');
    setEntryNotes('');
    setEntryError('');
    setWorkspaceStatus('');
  }

  function handleExportJson() {
    const payload = buildWorkspaceExportPayload({
      patientName,
      workspaceLabel,
      patientNotes,
      route,
      timeframe,
      selectedDrugIds,
      drugs,
      doses,
      medicationEntries,
      profiles,
    });

    downloadFile(
      `${slugify(workspaceLabel || patientName || 'workspace') || 'workspace'}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
    setWorkspaceStatus('Exported the current workspace as JSON.');
  }

  function handleExportCsv() {
    if (!filteredEvents.length) {
      setWorkspaceStatus('There are no visible dose events to export for the current filter.');
      return;
    }

    const csv = buildDoseEventsCsv(filteredEvents, drugLookup);
    downloadFile(
      `${slugify(workspaceLabel || patientName || 'dose-events') || 'dose-events'}.csv`,
      csv,
      'text/csv;charset=utf-8'
    );
    setWorkspaceStatus('Exported the visible dose-event table as CSV.');
  }

  function handleImportWorkspaceClick() {
    importFileRef.current?.click();
  }

  async function handleImportWorkspace(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      const normalizedDrugs = Array.isArray(imported.drugs)
        ? imported.drugs.map(normalizeDrugRecord)
        : [];
      const importedSelectedDrugIds = Array.isArray(imported.selectedDrugIds)
        ? imported.selectedDrugIds.map(String)
        : [];
      const importedMedicationEntries = Array.isArray(imported.medicationEntries)
        ? imported.medicationEntries.map(normalizeMedicationEntry)
        : [];

      setDrugs(current => mergeDrugCatalog(current, normalizedDrugs));
      setDoses(
        Array.isArray(imported.doses)
          ? imported.doses.map((dose, index) =>
              normalizeDoseRecord(dose, index, normalizedDrugs[0]?.id ?? drugs[0]?.id)
            )
          : []
      );
      setMedicationEntries(importedMedicationEntries);
      setProfiles(
        normalizeStoredProfiles(Array.isArray(imported.profiles) ? imported.profiles : [])
      );
      setSelectedDrugIds(
        importedSelectedDrugIds.length
          ? importedSelectedDrugIds.slice(0, MAX_VISIBLE_DRUGS)
          : getInitialSelectedDrugIds(
              normalizedDrugs.length ? normalizedDrugs : drugs,
              importedMedicationEntries
            )
      );
      setRoute(imported.route ?? 'PO');
      setTimeframe(imported.timeframe ?? '1y');
      setPatientName(imported.patientName ?? 'Example Patient');
      setWorkspaceLabel(imported.workspaceLabel ?? 'Imported medication timeline');
      setPatientNotes(imported.patientNotes ?? '');
      setActiveProfileId(null);
      setProfileStatus('');
      setWorkspaceStatus(`Imported workspace from ${file.name}.`);
    } catch (importError) {
      setWorkspaceStatus(
        importError instanceof Error ? importError.message : 'Unable to import that workspace file.'
      );
    } finally {
      event.target.value = '';
    }
  }

  function handleClearWorkspace() {
    if (
      !window.confirm(
        'Clear the current workspace, including the medication list, saved profiles, and visible dose history?'
      )
    ) {
      return;
    }

    setSelectedDrugIds([]);
    setDoses([]);
    setMedicationEntries([]);
    setProfiles([]);
    setActiveProfileId(null);
    setRoute('PO');
    setTimeframe('1y');
    setPatientName('Example Patient');
    setWorkspaceLabel('Current medication timeline');
    setPatientNotes('');
    setListStatus('');
    setListError('');
    setEntryStatus('');
    setEntryError('');
    setEditingDoseId(null);
    setProfileStatus('');
    setWorkspaceStatus('Cleared the current workspace.');
  }

  function handlePrintReport() {
    window.print();
  }

  // Auth functions
  async function handleAuth() {
    setAuthLoading(true);
    setAuthError('');

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const body =
        authMode === 'login'
          ? { email: authEmail, password: authPassword }
          : { name: authName, email: authEmail, password: authPassword };

      const response = await fetch(`${API_BASE_PATH}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      persistAuthSession(data.token, data.account);
      setAuthToken(data.token);
      setUser(data.account);
      setIsAuthenticated(true);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    clearAuthSession();
    setAuthToken('');
    setUser(null);
    setIsAuthenticated(false);
    setProfiles([]);
    setActiveProfileId(null);
  }

  // Check for token on mount
  useEffect(() => {
    if (sessionDefaults.account) {
      setUser(sessionDefaults.account);
    }
  }, []);

  const canAddMore = selectedDrugIds.length < MAX_VISIBLE_DRUGS;

  if (!authReady) {
    return h('div', { className: 'auth-container' }, h('p', null, 'Restoring session...'));
  }

  if (!isAuthenticated) {
    return h(
      'div',
      { className: 'auth-container' },
      h('h1', null, 'MedGraf Account Management'),
      h(
        'div',
        { className: 'auth-form' },
        h('h2', null, authMode === 'login' ? 'Login' : 'Register'),
        authError && h('div', { className: 'error' }, authError),
        authMode === 'register' &&
          h('input', {
            type: 'text',
            placeholder: 'Name',
            value: authName,
            onChange: e => setAuthName(e.target.value),
          }),
        h('input', {
          type: 'email',
          placeholder: 'Email',
          value: authEmail,
          onChange: e => setAuthEmail(e.target.value),
        }),
        h('input', {
          type: 'password',
          placeholder: 'Password',
          value: authPassword,
          onChange: e => setAuthPassword(e.target.value),
        }),
        h(
          'button',
          {
            onClick: handleAuth,
            disabled: authLoading,
          },
          authLoading ? 'Loading...' : authMode === 'login' ? 'Login' : 'Register'
        ),
        h(
          'button',
          { onClick: () => setAuthMode(authMode === 'login' ? 'register' : 'login') },
          authMode === 'login' ? 'Need an account? Register' : 'Have an account? Login'
        ),
        h(
          'p',
          { className: 'helper' },
          'Accounts now persist medication profiles in the backend. Sign in to load and manage your saved lists.'
        )
      )
    );
  }

  return h(
    'div',
    { className: 'shell' },
    h(
      'div',
      { className: 'topbar' },
      h('a', { className: 'home-link', href: '../index.html' }, 'Back to home'),
      h('span', { className: 'badge' }, 'Reactive Type'),
      h('span', { className: 'user-info' }, `Logged in as ${user?.name || user?.email}`),
      h(
        'a',
        {
          className: 'topbar-link',
          href: 'https://github.com/rafireadisten/percentdosegraph/blob/main/MOBILE_DEPLOYMENT.md',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        'Mobile App'
      ),
      h('button', { onClick: handleLogout }, 'Logout')
    ),
    h(
      'section',
      { className: 'hero' },
      h(
        'article',
        { className: 'hero-panel' },
        h('p', { className: 'badge' }, 'React + Recharts'),
        h(
          'h1',
          null,
          workspaceLabel || 'Multi-drug comparison charting for U.S. medication search.'
        ),
        h(
          'p',
          null,
          `${patientName} · Plot up to 20 medications at once, compare each against its own ceiling, and expand the selector with official FDA-listed U.S. drug names when you need more than the bundled sample library.`
        )
      ),
      h(
        'article',
        { className: 'hero-panel' },
        h('p', { className: 'metric-label' }, patientNotes ? 'Clinical note' : 'Plotted drugs'),
        patientNotes ? h('p', { className: 'helper' }, patientNotes) : null,
        h('p', { className: 'big-number' }, `${selectedDrugs.length}/${MAX_VISIBLE_DRUGS}`),
        h(
          'p',
          null,
          `${summary.activeDrugCount} selected drug(s) have data in the current ${route} view. Peak exposure across the chart is ${summary.peakPercent.toFixed(1)}%.`
        )
      )
    ),
    h(
      'section',
      { className: 'layout' },
      h(
        'aside',
        { className: 'panel controls selector-panel' },
        h(
          'div',
          null,
          h('h2', null, 'Drug selector'),
          h(
            'p',
            null,
            'Search the bundled sample library instantly and, when available, expand into the official FDA NDC directory for broader U.S. coverage.'
          )
        ),
        h(
          'div',
          { className: 'field' },
          h('label', { htmlFor: 'drugSearch' }, 'Find a medication'),
          h('input', {
            id: 'drugSearch',
            className: 'search-input',
            type: 'search',
            placeholder: 'Search brand or generic name',
            value: searchTerm,
            onChange: event => setSearchTerm(event.target.value),
          })
        ),
        h(
          'p',
          { className: 'helper' },
          `You can compare up to ${MAX_VISIBLE_DRUGS} drugs at once. Search official FDA-listed names online, or use the local sample library offline.`
        ),
        h(
          'div',
          { className: 'results-header' },
          h('strong', null, 'Search results'),
          h(
            'span',
            { className: 'metric-label' },
            searchLoading ? 'Searching FDA catalog...' : `${searchResults.length} shown`
          )
        ),
        h(
          'div',
          { className: 'search-results' },
          searchResults.length
            ? searchResults.map(drug =>
                h(
                  'div',
                  { className: 'result-row', key: drug.id },
                  h(
                    'div',
                    { className: 'result-copy' },
                    h('strong', null, drug.name),
                    h('p', null, buildDrugResultCaption(drug))
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'pill-button',
                      disabled: !canAddMore && !selectedDrugIds.includes(drug.id),
                      onClick: () => handleAddDrug(drug),
                    },
                    selectedDrugIds.includes(drug.id) ? 'Added' : 'Add'
                  )
                )
              )
            : h(
                'div',
                { className: 'empty small-empty' },
                searchTerm
                  ? 'No matches yet. Try a broader search term.'
                  : 'Start typing to search the bundled library and the FDA-backed catalog.'
              )
        ),
        searchError ? h('p', { className: 'helper error-text' }, searchError) : null,
        h(
          'div',
          { className: 'field' },
          h('label', { htmlFor: 'route' }, 'Route'),
          h(
            'select',
            {
              id: 'route',
              value: route,
              onChange: event => setRoute(event.target.value),
            },
            ROUTE_OPTIONS.map(option => h('option', { key: option, value: option }, option))
          )
        ),
        h(
          'section',
          { className: 'workspace-panel' },
          h(
            'div',
            null,
            h('h2', null, 'Patient workspace'),
            h(
              'p',
              null,
              'Capture the patient or medication-list context you want saved into profiles and exports.'
            )
          ),
          h(
            'div',
            { className: 'field' },
            h('label', { htmlFor: 'patientName' }, 'Patient / chart label'),
            h('input', {
              id: 'patientName',
              type: 'text',
              value: patientName,
              onChange: event => setPatientName(event.target.value),
            })
          ),
          h(
            'div',
            { className: 'field' },
            h('label', { htmlFor: 'workspaceLabel' }, 'Workspace title'),
            h('input', {
              id: 'workspaceLabel',
              type: 'text',
              value: workspaceLabel,
              onChange: event => setWorkspaceLabel(event.target.value),
            })
          ),
          h(
            'div',
            { className: 'field' },
            h('label', { htmlFor: 'patientNotes' }, 'Clinical notes'),
            h('textarea', {
              id: 'patientNotes',
              rows: 4,
              value: patientNotes,
              onChange: event => setPatientNotes(event.target.value),
            })
          )
        ),
        h(
          'form',
          { className: 'dose-entry-form', onSubmit: handleMedicationEntrySubmit },
          h(
            'div',
            null,
            h('h2', null, 'Medication list entry'),
            h(
              'p',
              null,
              'Build a patient medication list with start and end dates so you can reopen prior lists, add new medications later, and distinguish current from historic therapy.'
            )
          ),
          h(
            'div',
            { className: 'field' },
            h('label', { htmlFor: 'listDrug' }, 'Medication'),
            h(
              'select',
              {
                id: 'listDrug',
                value: listDrugId,
                onChange: event => setListDrugId(event.target.value),
              },
              drugs.map(drug => h('option', { key: drug.id, value: drug.id }, drug.name))
            )
          ),
          h(
            'div',
            { className: 'entry-grid' },
            h(
              'div',
              { className: 'field' },
              h('label', { htmlFor: 'listStartDate' }, 'Start date'),
              h('input', {
                id: 'listStartDate',
                type: 'date',
                value: listStartDate,
                onChange: event => setListStartDate(event.target.value),
              })
            ),
            h(
              'div',
              { className: 'field' },
              h('label', { htmlFor: 'listEndDate' }, 'End date'),
              h('input', {
                id: 'listEndDate',
                type: 'date',
                min: listStartDate,
                value: listEndDate,
                onChange: event => setListEndDate(event.target.value),
              })
            ),
            h(
              'div',
              { className: 'field' },
              h('label', { htmlFor: 'listRoute' }, 'Medication route'),
              h(
                'select',
                {
                  id: 'listRoute',
                  value: listRoute,
                  onChange: event => setListRoute(event.target.value),
                },
                ROUTE_OPTIONS.map(option => h('option', { key: option, value: option }, option))
              )
            )
          ),
          h(
            'div',
            { className: 'entry-grid two-up' },
            h(
              'div',
              { className: 'field' },
              h('label', { htmlFor: 'listTimelineStatus' }, 'Timeline'),
              h(
                'select',
                {
                  id: 'listTimelineStatus',
                  value: listTimelineStatus,
                  onChange: event => setListTimelineStatus(event.target.value),
                },
                TIMELINE_STATUS_OPTIONS.map(option =>
                  h('option', { key: option.value, value: option.value }, option.label)
                )
              )
            ),
            h(
              'div',
              { className: 'field' },
              h('label', { htmlFor: 'listNotes' }, 'Notes'),
              h('input', {
                id: 'listNotes',
                type: 'text',
                placeholder: 'Current, discontinued, resumed, etc.',
                value: listNotes,
                onChange: event => setListNotes(event.target.value),
              })
            )
          ),
          h('button', { type: 'submit', className: 'primary-button' }, 'Add Medication To List'),
          listStatus ? h('p', { className: 'helper success-text' }, listStatus) : null,
          listError ? h('p', { className: 'helper error-text' }, listError) : null
        ),
        h(
          'form',
          { className: 'dose-entry-form', onSubmit: handleDoseEntrySubmit },
          h(
            'div',
            null,
            h('h2', null, 'Log dose'),
            h(
              'p',
              null,
              'Add a drug-specific dose event with its own date, route, and amount so the chart updates immediately.'
            )
          ),
          h(
            'div',
            { className: 'field' },
            h('label', { htmlFor: 'entryDrug' }, 'Drug'),
            h(
              'select',
              {
                id: 'entryDrug',
                value: entryDrugId,
                onChange: event => setEntryDrugId(event.target.value),
              },
              drugs.map(drug => h('option', { key: drug.id, value: drug.id }, drug.name))
            )
          ),
          h(
            'div',
            { className: 'entry-grid' },
            h(
              'div',
              { className: 'field' },
              h('label', { htmlFor: 'entryDate' }, 'Dose date'),
              h('input', {
                id: 'entryDate',
                type: 'date',
                value: entryDate,
                onChange: event => setEntryDate(event.target.value),
              })
            ),
            h(
              'div',
              { className: 'field' },
              h('label', { htmlFor: 'entryEndDate' }, 'Dose end date'),
              h('input', {
                id: 'entryEndDate',
                type: 'date',
                value: entryEndDate,
                min: entryDate,
                onChange: event => setEntryEndDate(event.target.value),
              })
            ),
            h(
              'div',
              { className: 'field' },
              h('label', { htmlFor: 'entryRoute' }, 'Dose route'),
              h(
                'select',
                {
                  id: 'entryRoute',
                  value: entryRoute,
                  onChange: event => setEntryRoute(event.target.value),
                },
                ROUTE_OPTIONS.map(option => h('option', { key: option, value: option }, option))
              )
            )
          ),
          h(
            'div',
            { className: 'entry-grid two-up' },
            h(
              'div',
              { className: 'field' },
              h('label', { htmlFor: 'entryAmount' }, 'Dose amount'),
              h('input', {
                id: 'entryAmount',
                type: 'number',
                min: '0.1',
                step: '0.1',
                placeholder: 'e.g. 25',
                value: entryAmount,
                onChange: event => setEntryAmount(event.target.value),
              })
            ),
            h(
              'div',
              { className: 'field' },
              h('label', { htmlFor: 'entryNotes' }, 'Notes'),
              h('input', {
                id: 'entryNotes',
                type: 'text',
                placeholder: 'Optional note',
                value: entryNotes,
                onChange: event => setEntryNotes(event.target.value),
              })
            )
          ),
          h(
            'button',
            { type: 'submit', className: 'primary-button' },
            editingDoseId ? 'Update Dose Entry' : 'Add Dose Entry'
          ),
          editingDoseId
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'pill-button secondary-button',
                  onClick: handleCancelDoseEdit,
                },
                'Cancel edit'
              )
            : null,
          entryStatus ? h('p', { className: 'helper success-text' }, entryStatus) : null,
          entryError ? h('p', { className: 'helper error-text' }, entryError) : null
        ),
        h(
          'div',
          { className: 'field' },
          h('label', { htmlFor: 'timeframe' }, 'Timeframe'),
          h(
            'select',
            {
              id: 'timeframe',
              value: timeframe,
              onChange: event => setTimeframe(event.target.value),
            },
            TIMEFRAME_OPTIONS.map(option =>
              h('option', { key: option.value, value: option.value }, option.label)
            )
          )
        ),
        h(
          'div',
          { className: 'field profile-actions' },
          h(
            'button',
            {
              type: 'button',
              className: 'primary-button',
              onClick: handleSaveProfile,
              disabled: !selectedDrugs.length && !medicationEntries.length,
            },
            'Save med list profile'
          ),
          h(
            'div',
            { className: 'field' },
            h('label', { htmlFor: 'profileName' }, 'Profile name'),
            h('input', {
              id: 'profileName',
              type: 'text',
              placeholder: 'Optional custom name',
              value: profileName,
              onChange: event => setProfileName(event.target.value),
            })
          ),
          profileStatus ? h('p', { className: 'helper' }, profileStatus) : null
        ),
        h(
          'section',
          { className: 'workspace-panel' },
          h('h2', null, 'Data tools'),
          h(
            'div',
            { className: 'profile-card-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'pill-button secondary-button',
                onClick: handleImportWorkspaceClick,
              },
              'Import JSON'
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'pill-button secondary-button',
                onClick: handleExportJson,
              },
              'Export JSON'
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'pill-button secondary-button',
                onClick: handleExportCsv,
              },
              'Export CSV'
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'pill-button secondary-button',
                onClick: handlePrintReport,
              },
              'Print report'
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'remove-button',
                onClick: handleClearWorkspace,
              },
              'Clear Workspace'
            )
          ),
          h('input', {
            ref: importFileRef,
            type: 'file',
            accept: '.json,application/json',
            className: 'hidden-input',
            onChange: handleImportWorkspace,
          }),
          workspaceStatus ? h('p', { className: 'helper' }, workspaceStatus) : null
        ),
        h(
          'section',
          { className: 'profile-panel' },
          h('h2', null, 'Saved graph profiles'),
          profiles.length
            ? h(
                'div',
                { className: 'profile-list' },
                profiles.map(profile =>
                  h(
                    'article',
                    {
                      className: `profile-card${profile.id === activeProfileId ? ' active' : ''}`,
                      key: profile.id,
                    },
                    h(
                      'div',
                      { className: 'profile-card-header' },
                      h('strong', null, profile.label),
                      h('small', null, profile.savedListDate ?? profile.id)
                    ),
                    h(
                      'p',
                      null,
                      `${profile.patientName ?? 'Patient'} · ${getSelectedDrugIdsFromProfile(profile).length} medication(s) · ${profile.route} · ${TIMEFRAME_OPTIONS.find(option => option.value === profile.timeframe)?.label ?? profile.timeframe}`
                    ),
                    h(
                      'div',
                      { className: 'profile-card-actions' },
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'pill-button',
                          onClick: () => handleApplyProfile(profile),
                        },
                        'Open list'
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'pill-button secondary-button',
                          onClick: () => handleMergeProfile(profile),
                        },
                        'Add to current'
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'pill-button secondary-button',
                          onClick: () => handleRenameProfile(profile),
                        },
                        'Rename'
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'remove-button',
                          onClick: () => handleDeleteProfile(profile.id),
                        },
                        'Delete'
                      )
                    )
                  )
                )
              )
            : h(
                'p',
                { className: 'helper' },
                'Save a graph setup to revisit the same drug set, route, and timeframe quickly.'
              )
        ),
        h(
          'div',
          { className: 'selected-drug-list' },
          h(
            'div',
            { className: 'results-header' },
            h('strong', null, 'Selected drugs'),
            h('span', { className: 'metric-label' }, `${selectedDrugs.length}/${MAX_VISIBLE_DRUGS}`)
          ),
          medicationTableRows.length
            ? medicationTableRows.slice(0, 20).map(row =>
                h(
                  'article',
                  { className: 'selected-drug medication-row', key: row.id },
                  h(
                    'div',
                    { className: 'selected-drug-copy' },
                    h(
                      'div',
                      { className: 'medication-row-heading' },
                      row.plotted
                        ? h('span', {
                            className: 'color-swatch',
                            style: { backgroundColor: row.color },
                          })
                        : null,
                      h('strong', null, row.name),
                      h(
                        'span',
                        { className: `timeline-badge ${row.timelineStatus}` },
                        capitalizeLabel(row.timelineStatus)
                      )
                    ),
                    h(
                      'p',
                      null,
                      `${row.route} · ${row.windowLabel}${row.notes ? ` · ${row.notes}` : ''}`
                    )
                  ),
                  h(
                    'div',
                    { className: 'selected-drug-meta' },
                    h(
                      'label',
                      { className: 'small-label' },
                      'Max/day',
                      h('input', {
                        type: 'number',
                        min: '0.1',
                        step: '0.1',
                        value: row.maxDailyDose ?? '',
                        onChange: event => handleMaxDoseChange(row.drugId, event.target.value),
                      })
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'pill-button',
                        onClick: () => handleToggleDrugSelection(row.drugId),
                      },
                      row.plotted ? 'Hide' : 'Plot'
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'remove-button',
                        onClick: () => handleDeleteMedicationEntry(row.id),
                      },
                      'Delete'
                    )
                  )
                )
              )
            : h(
                'div',
                { className: 'empty small-empty' },
                'Add a few medications to start building the list and graph key.'
              )
        )
      ),
      h(
        'div',
        null,
        h(
          'section',
          { className: 'panel' },
          h(
            'div',
            { className: 'print-report-header' },
            h('h2', null, 'Patient report'),
            h(
              'p',
              null,
              `${patientName} · ${workspaceLabel} · ${formatDisplayDate(range.startDate)} through ${formatDisplayDate(range.endDate)}`
            ),
            patientNotes ? h('p', { className: 'helper' }, patientNotes) : null
          ),
          h(
            'div',
            { className: 'print-summary-grid' },
            h(
              'article',
              { className: 'insight-card' },
              h('span', { className: 'metric-label' }, 'Peak exposure'),
              h('strong', null, `${summary.peakPercent.toFixed(1)}%`)
            ),
            h(
              'article',
              { className: 'insight-card' },
              h('span', { className: 'metric-label' }, 'Dose events'),
              h('strong', null, summary.eventCount)
            ),
            h(
              'article',
              { className: 'insight-card' },
              h('span', { className: 'metric-label' }, 'Plotted drugs'),
              h('strong', null, selectedDrugs.length)
            )
          ),
          h(
            'div',
            { className: 'panel-copy' },
            h('h2', null, 'Comparison chart'),
            h(
              'p',
              null,
              `${formatDisplayDate(range.startDate)} through ${formatDisplayDate(range.endDate)}. ${summary.rangeNarrative}`
            )
          ),
          h(
            'div',
            { className: 'metrics' },
            h(
              'article',
              { className: 'metric' },
              h('span', { className: 'metric-label' }, 'Medication list'),
              h('strong', null, medicationEntries.length)
            ),
            h(
              'article',
              { className: 'metric' },
              h('span', { className: 'metric-label' }, 'Current meds'),
              h('strong', null, medicationSummary.currentCount)
            ),
            h(
              'article',
              { className: 'metric' },
              h('span', { className: 'metric-label' }, 'Historic meds'),
              h('strong', null, medicationSummary.historicCount)
            ),
            h(
              'article',
              { className: 'metric' },
              h('span', { className: 'metric-label' }, 'Dose events'),
              h('strong', null, summary.eventCount)
            )
          ),
          h(
            'div',
            { className: 'chart-panel tall-chart' },
            loading
              ? h('div', { className: 'empty' }, 'Loading chart data...')
              : error
                ? h('div', { className: 'empty' }, error)
                : !selectedDrugs.length
                  ? h(
                      'div',
                      { className: 'empty' },
                      'Select one or more drugs to render the chart.'
                    )
                  : h(
                      ResponsiveContainer,
                      { width: '100%', height: '100%' },
                      h(
                        LineChart,
                        {
                          data: chartData,
                          margin: { top: 12, right: 18, left: 0, bottom: 12 },
                        },
                        h(CartesianGrid, {
                          stroke: 'rgba(33, 49, 58, 0.12)',
                          strokeDasharray: '4 4',
                        }),
                        h(XAxis, {
                          dataKey: 'label',
                          tickLine: false,
                          axisLine: false,
                          minTickGap: 24,
                        }),
                        h(YAxis, {
                          tickLine: false,
                          axisLine: false,
                          width: 56,
                          domain: [0, dataMax => Math.max(100, Math.ceil(dataMax / 10) * 10)],
                          tickFormatter: value => `${value}%`,
                        }),
                        h(Tooltip, {
                          content: ({ active, payload }) =>
                            renderTooltip(active, payload, drugLookup),
                        }),
                        h(Legend, {
                          verticalAlign: 'top',
                          height: 36,
                          wrapperStyle: {
                            fontSize: '12px',
                          },
                        }),
                        h(ReferenceLine, {
                          y: 50,
                          stroke: 'rgba(33, 49, 58, 0.18)',
                          strokeDasharray: '4 4',
                        }),
                        h(ReferenceLine, {
                          y: 80,
                          stroke: 'var(--danger)',
                          strokeDasharray: '5 5',
                        }),
                        h(ReferenceLine, {
                          y: 100,
                          stroke: 'rgba(191, 79, 41, 0.45)',
                          strokeDasharray: '3 3',
                        }),
                        selectedDrugs.map((drug, index) =>
                          h(Line, {
                            key: drug.id,
                            type: 'monotone',
                            dataKey: getSeriesKey(drug.id),
                            name: drug.name,
                            stroke: CHART_COLORS[index % CHART_COLORS.length],
                            strokeWidth: index < 6 ? 2.4 : 1.8,
                            dot: false,
                            connectNulls: true,
                            isAnimationActive: false,
                          })
                        ),
                        chartData.length > 20
                          ? h(Brush, {
                              dataKey: 'label',
                              height: 28,
                              stroke: 'var(--line)',
                            })
                          : null
                      )
                    )
          ),
          h(
            'div',
            { className: 'insights' },
            h(
              'article',
              { className: 'insight-card' },
              h('span', { className: 'metric-label' }, 'Range density'),
              h('strong', null, `${summary.eventCount} events`),
              h(
                'p',
                null,
                `${summary.activeDayCount} day(s) in the range contain at least one selected-drug event.`
              )
            ),
            h(
              'article',
              { className: 'insight-card' },
              h('span', { className: 'metric-label' }, 'Legend load'),
              h('strong', null, `${selectedDrugs.length} lines`),
              h(
                'p',
                null,
                selectedDrugs.length > 12
                  ? 'The palette is recycling colors after the 20th line budget, so trim the list if you want a cleaner view.'
                  : 'You still have room to add more medications before reaching the 20-line comparison cap.'
              )
            ),
            h(
              'article',
              { className: 'insight-card insight-copy' },
              h('span', { className: 'metric-label' }, 'Medication list'),
              h(
                'p',
                null,
                medicationEntries.length
                  ? `${medicationSummary.currentCount} current, ${medicationSummary.historicCount} historic, and ${medicationSummary.plannedCount} planned entry/entries are available for this patient list.`
                  : 'Add a few medications from the list entry module to start a reusable medication history.'
              )
            )
          )
        ),
        h(
          'section',
          { className: 'panel' },
          h('h2', null, 'Graph key and medication list'),
          h(
            'p',
            null,
            'This key ties the plotted lines back to the medication list, including historic and current date windows.'
          ),
          h(
            'div',
            { className: 'table-wrap' },
            h(
              'table',
              { className: 'table' },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  h('th', null, 'Key'),
                  h('th', null, 'Medication'),
                  h('th', null, 'Timeline'),
                  h('th', null, 'Window'),
                  h('th', null, 'Route'),
                  h('th', null, 'Status')
                )
              ),
              h(
                'tbody',
                null,
                medicationTableRows.length
                  ? medicationTableRows.map(row =>
                      h(
                        'tr',
                        { key: `table-${row.id}` },
                        h(
                          'td',
                          null,
                          row.plotted
                            ? h('span', {
                                className: 'color-swatch table-swatch',
                                style: { backgroundColor: row.color },
                              })
                            : '—'
                        ),
                        h('td', null, row.name),
                        h('td', null, capitalizeLabel(row.timelineStatus)),
                        h('td', null, row.windowLabel),
                        h('td', null, row.route),
                        h('td', null, row.plotted ? 'Plotted' : 'Stored only')
                      )
                    )
                  : h('tr', null, h('td', { colSpan: 6 }, 'No medication list entries yet.'))
              )
            )
          )
        ),
        h(
          'section',
          { className: 'panel' },
          h('h2', null, 'Visible dose events'),
          h(
            'p',
            null,
            `Showing the most recent ${Math.min(filteredEvents.length, 20)} event(s) for the selected drugs on route ${route}.`
          ),
          h(
            'div',
            { className: 'table-wrap' },
            h(
              'table',
              { className: 'table' },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  h('th', null, 'Date'),
                  h('th', null, 'End'),
                  h('th', null, 'Drug'),
                  h('th', null, 'Route'),
                  h('th', null, 'Dose'),
                  h('th', null, '% Max'),
                  h('th', null, 'Actions')
                )
              ),
              h(
                'tbody',
                null,
                filteredEvents.length
                  ? filteredEvents.slice(0, 20).map(event => {
                      const drug = drugLookup.get(event.drugId);
                      const maxDose = drug?.maxDailyDose ?? 100;
                      const unit = drug?.unit ?? 'mg';
                      const percent = maxDose > 0 ? (event.amount / maxDose) * 100 : 0;

                      return h(
                        'tr',
                        { key: event.id },
                        h('td', null, event.date),
                        h('td', null, event.endDate ?? '—'),
                        h('td', null, drug?.name ?? 'Unknown drug'),
                        h('td', null, event.route),
                        h('td', null, `${event.amount.toFixed(1)} ${unit}`),
                        h('td', null, `${percent.toFixed(1)}%`),
                        h(
                          'td',
                          { className: 'table-actions' },
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'pill-button secondary-button compact-button',
                              onClick: () => handleStartDoseEdit(event),
                            },
                            'Edit'
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'remove-button compact-button',
                              onClick: () => handleDeleteDose(event.id),
                            },
                            'Delete'
                          )
                        )
                      );
                    })
                  : h(
                      'tr',
                      null,
                      h(
                        'td',
                        { colSpan: 7 },
                        'No dose events match the current route and selected drug set.'
                      )
                    )
              )
            )
          )
        )
      )
    )
  );
}

function resolveApiBasePath() {
  if (window.location.protocol === 'file:') {
    return 'http://localhost:3001/api';
  }

  if (window.location.hostname === 'localhost' && window.location.port === '8080') {
    return 'http://localhost:3001/api';
  }

  return `${window.location.origin}/api`;
}

function normalizeDrugRecord(drug, index) {
  const referenceMaxDailyDose =
    Number.isFinite(Number(drug.referenceMaxDailyDose)) && Number(drug.referenceMaxDailyDose) > 0
      ? Number(drug.referenceMaxDailyDose)
      : Number.isFinite(Number(drug.maxDailyDose)) && Number(drug.maxDailyDose) > 0
        ? Number(drug.maxDailyDose)
        : 100;
  const currentMaxDailyDose =
    Number.isFinite(Number(drug.overrideMaxDailyDose)) && Number(drug.overrideMaxDailyDose) > 0
      ? Number(drug.overrideMaxDailyDose)
      : Number.isFinite(Number(drug.maxDailyDose)) && Number(drug.maxDailyDose) > 0
        ? Number(drug.maxDailyDose)
        : referenceMaxDailyDose;

  return {
    id: String(drug.id ?? `local-${index + 1}`),
    name: drug.name ?? drug.brandName ?? drug.genericName ?? `Drug ${index + 1}`,
    genericName: drug.genericName ?? '',
    brandName: drug.brandName ?? drug.name ?? '',
    drugClass: drug.drugClass ?? '',
    dosageForm: drug.dosageForm ?? '',
    source: drug.source ?? 'Bundled sample library',
    unit: drug.unit ?? 'mg',
    referenceMaxDailyDose,
    overrideMaxDailyDose:
      drug.isMaxDoseOverridden ||
      (Number.isFinite(Number(drug.overrideMaxDailyDose)) && Number(drug.overrideMaxDailyDose) > 0)
        ? currentMaxDailyDose
        : null,
    isMaxDoseOverridden:
      Boolean(drug.isMaxDoseOverridden) || currentMaxDailyDose !== referenceMaxDailyDose,
    maxDailyDose: currentMaxDailyDose,
  };
}

function normalizeDoseRecord(dose, index, defaultDrugId) {
  return {
    id: String(dose.id ?? `dose-${index + 1}`),
    drugId: String(dose.drugId ?? defaultDrugId),
    date: dose.date,
    endDate: dose.endDate || dose.date,
    route: dose.route ?? 'PO',
    amount: Number(dose.amount ?? 0),
    notes: dose.notes ?? '',
  };
}

function addSeededComparisonDoses(doses, drugs) {
  const normalizedDoses = Array.isArray(doses) ? doses.slice() : [];
  const distinctDrugIds = new Set(
    normalizedDoses
      .map(dose => dose.drugId)
      .filter(drugId => drugId !== undefined && drugId !== null)
      .map(String)
  );

  if (distinctDrugIds.size >= 20 || !drugs.length) {
    return normalizedDoses;
  }

  const seeded = drugs
    .slice(0, 24)
    .flatMap((drug, drugIndex) => createSeededDoseTimeline(drug, drugIndex));

  return mergeDoseEvents(normalizedDoses, seeded);
}

function createSeededDoseTimeline(drug, drugIndex) {
  const maxDose = Number(drug.maxDailyDose) || 100;
  const anchor = new Date('2024-03-30T12:00:00');
  const ratios = [0.34, 0.48, 0.62, 0.41];

  return ratios.map((ratio, eventIndex) => {
    const eventDate = new Date(anchor);
    eventDate.setDate(anchor.getDate() - (drugIndex * 3 + eventIndex * 16));

    return {
      id: `seed-${drug.id}-${eventIndex}`,
      drugId: drug.id,
      date: formatDateKey(eventDate),
      endDate: formatDateKey(eventDate),
      route: 'PO',
      amount: Number((maxDose * (ratio + ((drugIndex + eventIndex) % 3) * 0.06)).toFixed(1)),
      notes: 'Bundled comparison sample',
    };
  });
}

function mergeDoseEvents(current, next) {
  const seen = new Set(
    current.map(dose => `${dose.drugId ?? 'none'}:${dose.date}:${dose.route}:${dose.amount}`)
  );
  const merged = current.slice();

  for (const dose of next) {
    const key = `${dose.drugId ?? 'none'}:${dose.date}:${dose.route}:${dose.amount}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(dose);
  }

  return merged;
}

function normalizeMedicationEntry(entry, index) {
  return {
    id: String(entry.id ?? `medication-${index + 1}`),
    drugId: String(entry.drugId ?? ''),
    startDate: entry.startDate ?? entry.date ?? formatDateKey(new Date()),
    endDate: entry.endDate ?? '',
    route: entry.route ?? 'PO',
    timelineStatus: entry.timelineStatus ?? 'current',
    notes: entry.notes ?? '',
    createdAt: entry.createdAt ?? new Date().toISOString(),
    sourceProfileId: entry.sourceProfileId ?? null,
  };
}

function mergeMedicationEntries(current, next) {
  const merged = current.slice();
  const seen = new Set(
    current.map(
      entry =>
        `${entry.drugId}:${entry.startDate}:${entry.endDate}:${entry.route}:${entry.timelineStatus}`
    )
  );

  for (const entry of next.map(normalizeMedicationEntry)) {
    const key = `${entry.drugId}:${entry.startDate}:${entry.endDate}:${entry.route}:${entry.timelineStatus}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(entry);
  }

  return merged.sort(compareMedicationEntries);
}

function compareMedicationEntries(left, right) {
  const statusOrder = {
    current: 0,
    planned: 1,
    historic: 2,
  };
  const leftRank = statusOrder[left.timelineStatus] ?? 3;
  const rightRank = statusOrder[right.timelineStatus] ?? 3;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return String(right.startDate).localeCompare(String(left.startDate));
}

function normalizeStoredProfiles(profiles) {
  if (!Array.isArray(profiles)) {
    return [];
  }

  return profiles.map((profile, index) => ({
    ...profile,
    id: String(profile.id ?? `profile-${index + 1}`),
    label: profile.label ?? profile.name ?? `Profile ${index + 1}`,
    selectedDrugIds: Array.isArray(profile.selectedDrugIds)
      ? profile.selectedDrugIds.map(String)
      : [],
    medicationEntries: Array.isArray(profile.medicationEntries)
      ? profile.medicationEntries.map(normalizeMedicationEntry)
      : [],
    drugStates: Array.isArray(profile.drugStates)
      ? profile.drugStates.map((drug, drugIndex) => normalizeDrugRecord(drug, drugIndex))
      : [],
    patientName: profile.patientName ?? 'Example Patient',
    workspaceLabel: profile.workspaceLabel ?? profile.label ?? `Profile ${index + 1}`,
    patientNotes: profile.patientNotes ?? '',
    route: profile.route ?? 'PO',
    timeframe: profile.timeframe ?? '1y',
    savedListDate: profile.savedListDate ?? profile.createdAt?.slice(0, 10) ?? '',
  }));
}

function getInitialSelectedDrugIds(drugs, medicationEntries) {
  const entryDrugIds = Array.from(
    new Set((medicationEntries ?? []).map(entry => String(entry.drugId)).filter(Boolean))
  ).slice(0, MAX_VISIBLE_DRUGS);

  if (entryDrugIds.length) {
    return entryDrugIds;
  }

  return drugs.slice(0, Math.min(5, drugs.length)).map(drug => drug.id);
}

function getSelectedDrugIdsFromProfile(profile) {
  const selectedDrugIds = Array.isArray(profile.selectedDrugIds)
    ? profile.selectedDrugIds.map(String)
    : [];

  if (selectedDrugIds.length) {
    return selectedDrugIds.slice(0, MAX_VISIBLE_DRUGS);
  }

  return Array.from(
    new Set((profile.medicationEntries ?? []).map(entry => String(entry.drugId)).filter(Boolean))
  ).slice(0, MAX_VISIBLE_DRUGS);
}

function buildProfileDrugStates(drugs, selectedDrugIds, medicationEntries) {
  const selected = new Set(selectedDrugIds.map(String));
  for (const entry of medicationEntries ?? []) {
    if (entry?.drugId) {
      selected.add(String(entry.drugId));
    }
  }

  return drugs
    .filter(drug => selected.has(String(drug.id)))
    .map((drug, index) => normalizeDrugRecord(drug, index));
}

function buildRange(doses, timeframe) {
  const endDate = getAnchorDate(doses);
  const selected = TIMEFRAME_OPTIONS.find(option => option.value === timeframe);
  const totalDays = selected?.days ?? 365;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (totalDays - 1));

  return { startDate, endDate, totalDays };
}

function getFilteredEvents(doses, selectedDrugIds, route, startDate, endDate, medicationEntries) {
  const selected = new Set(selectedDrugIds.map(String));
  const startKey = formatDateKey(startDate);
  const endKey = formatDateKey(endDate);
  const medicationByDrug = groupMedicationEntriesByDrug(medicationEntries);

  return doses.filter(dose => {
    const eventEndDate = dose.endDate ?? dose.date;
    const matchingEntries = (medicationByDrug.get(String(dose.drugId)) ?? []).filter(
      entry => entry.route === dose.route
    );
    const overlapsMedicationWindow =
      !matchingEntries.length ||
      matchingEntries.some(entry =>
        rangesOverlap(
          dose.date,
          eventEndDate,
          entry.startDate,
          getMedicationEntryEndDate(entry, endKey)
        )
      );

    return (
      selected.has(String(dose.drugId)) &&
      dose.route === route &&
      dose.date <= endKey &&
      eventEndDate >= startKey &&
      overlapsMedicationWindow
    );
  });
}

function buildChartData(events, selectedDrugs, startDate, endDate) {
  const byDrugAndDate = new Map();

  for (const event of events) {
    const eventStart = new Date(`${event.date}T12:00:00`);
    const eventEnd = new Date(`${event.endDate ?? event.date}T12:00:00`);
    const cursor = new Date(eventStart);

    while (cursor <= eventEnd) {
      const currentDate = formatDateKey(cursor);
      const key = `${event.drugId}:${currentDate}`;
      byDrugAndDate.set(key, (byDrugAndDate.get(key) ?? 0) + Number(event.amount));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const points = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dateKey = formatDateKey(cursor);
    const point = {
      date: dateKey,
      endDate: dateKey,
      label: formatShortDate(cursor),
      activeCount: 0,
    };

    for (const drug of selectedDrugs) {
      const amount = byDrugAndDate.get(`${drug.id}:${dateKey}`) ?? 0;
      const percent = drug.maxDailyDose > 0 ? (amount / drug.maxDailyDose) * 100 : 0;
      point[getSeriesKey(drug.id)] = Number(percent.toFixed(2));
      point[getDoseKey(drug.id)] = Number(amount.toFixed(2));

      if (amount > 0) {
        point.activeCount += 1;
      }
    }

    points.push(point);
    cursor.setDate(cursor.getDate() + 1);
  }

  return bucketSeries(points, selectedDrugs);
}

function bucketSeries(points, selectedDrugs) {
  if (!points.length) {
    return [];
  }

  const targetPoints = choosePointCount(points.length);
  const bucketSize = Math.max(1, Math.ceil(points.length / targetPoints));
  const buckets = [];

  for (let index = 0; index < points.length; index += bucketSize) {
    const bucketPoints = points.slice(index, index + bucketSize);
    const nextPoint = {
      date: bucketPoints[0].date,
      endDate: bucketPoints[bucketPoints.length - 1].date,
      label:
        bucketPoints.length === 1
          ? bucketPoints[0].label
          : `${bucketPoints[0].label} - ${bucketPoints[bucketPoints.length - 1].label}`,
      bucketDays: bucketPoints.length,
      activeCount: Math.max(...bucketPoints.map(point => point.activeCount)),
    };

    for (const drug of selectedDrugs) {
      const seriesKey = getSeriesKey(drug.id);
      const doseKey = getDoseKey(drug.id);
      nextPoint[seriesKey] = Number(
        (
          bucketPoints.reduce((sum, point) => sum + Number(point[seriesKey] ?? 0), 0) /
          bucketPoints.length
        ).toFixed(2)
      );
      nextPoint[doseKey] = Number(
        bucketPoints.reduce((sum, point) => sum + Number(point[doseKey] ?? 0), 0).toFixed(2)
      );
    }

    buckets.push(nextPoint);
  }

  return buckets;
}

function choosePointCount(dayCount) {
  if (dayCount <= 30) {
    return dayCount;
  }

  if (dayCount <= 120) {
    return 36;
  }

  if (dayCount <= 365 * 2) {
    return 42;
  }

  return 56;
}

function summarizeChart(chartData, filteredEvents, selectedDrugs) {
  const peakPercent = chartData.length
    ? Math.max(
        0,
        ...chartData.flatMap(point =>
          selectedDrugs.map(drug => Number(point[getSeriesKey(drug.id)] ?? 0))
        )
      )
    : 0;
  const activeDrugIds = new Set(filteredEvents.map(event => String(event.drugId)));
  const activeDayCount = chartData.filter(point => point.activeCount > 0).length;

  return {
    eventCount: filteredEvents.length,
    activeDrugCount: activeDrugIds.size,
    activeDayCount,
    peakPercent,
    rangeNarrative:
      activeDayCount > 0
        ? `${activeDayCount} day(s) in this range contain at least one dose event for the selected set.`
        : 'No dose events land in this route and date range yet.',
  };
}

function getSeriesKey(drugId) {
  return `series:${drugId}`;
}

function getDoseKey(drugId) {
  return `dose:${drugId}`;
}

async function loadDoses() {
  try {
    const doses = await apiGet('/doses');
    return doses;
  } catch (error) {
    console.warn('Falling back to local dose samples:', error);
    const response = await fetch('../data/doses.json');
    if (!response.ok) {
      throw new Error('Failed to load dose data');
    }
    return response.json();
  }
}

async function loadDrugs() {
  try {
    const drugs = await apiGet('/drugs');
    return drugs;
  } catch (error) {
    console.warn('Falling back to local drug samples:', error);
    const response = await fetch('../data/drugs.json');
    if (!response.ok) {
      throw new Error('Failed to load drug data');
    }
    return response.json();
  }
}

async function searchUsDrugCatalog(query) {
  const endpoint = `${API_BASE_PATH}/us-drugs/search?q=${encodeURIComponent(query)}&limit=20`;

  try {
    const payload = await fetchJson(endpoint);
    return (payload.results ?? []).map(normalizeDrugRecord);
  } catch (apiError) {
    console.warn('Falling back to direct openFDA search:', apiError);
    return searchOpenFdaDirect(query);
  }
}

async function searchOpenFdaDirect(query) {
  const token = query.trim().replace(/"/g, '');
  const search = token.includes(' ')
    ? `finished:true AND "${token}"`
    : `finished:true AND ${token}*`;
  const url = `https://api.fda.gov/drug/ndc.json?search=${encodeURIComponent(search)}&limit=20`;
  const payload = await fetchJson(url);

  return (payload.results ?? []).map((record, index) =>
    normalizeDrugRecord({
      id: `direct-${record.product_ndc ?? record.product_id ?? record.spl_id ?? index}`,
      name: record.brand_name || record.generic_name || 'Unnamed FDA listing',
      genericName: record.generic_name ?? '',
      brandName: record.brand_name ?? '',
      dosageForm: record.dosage_form ?? '',
      source: 'openFDA NDC',
    })
  );
}

async function apiGet(path, token) {
  return fetchJson(`${API_BASE_PATH}${path}`, token);
}

async function apiPost(path, payload, token) {
  return apiRequest(path, 'POST', payload, token);
}

async function apiPut(path, payload, token) {
  return apiRequest(path, 'PUT', payload, token);
}

async function apiDelete(path, token) {
  return apiRequest(path, 'DELETE', undefined, token);
}

async function apiRequest(path, method, payload, token) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_PATH}${path}`, {
    method,
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function fetchJson(url, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

function mergeDrugCatalog(current, incoming) {
  const byId = new Map(current.map(drug => [drug.id, drug]));

  for (const drug of incoming) {
    const normalized = normalizeDrugRecord(drug, byId.size + 1);
    const existing = byId.get(normalized.id);
    byId.set(
      normalized.id,
      existing
        ? {
            ...existing,
            ...normalized,
            referenceMaxDailyDose:
              existing.referenceMaxDailyDose ?? normalized.referenceMaxDailyDose,
            maxDailyDose:
              existing.isMaxDoseOverridden && !normalized.isMaxDoseOverridden
                ? existing.maxDailyDose
                : normalized.maxDailyDose,
            overrideMaxDailyDose:
              existing.isMaxDoseOverridden && !normalized.isMaxDoseOverridden
                ? existing.overrideMaxDailyDose ?? existing.maxDailyDose
                : normalized.overrideMaxDailyDose,
            isMaxDoseOverridden:
              existing.isMaxDoseOverridden && !normalized.isMaxDoseOverridden
                ? true
                : normalized.isMaxDoseOverridden,
          }
        : normalized
    );
  }

  return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function mergeSearchResults(localMatches, remoteMatches, selectedDrugIds) {
  return mergeDrugCatalog(localMatches, remoteMatches).filter(
    drug => !selectedDrugIds.includes(drug.id)
  );
}

function generateSequentialProfileLabel(profiles) {
  let index = profiles.length + 1;
  const existing = new Set(profiles.map(profile => profile.label));
  while (existing.has(`Profile ${index}`)) {
    index += 1;
  }
  return `Profile ${index}`;
}

function generateProfileId(profile, num) {
  const parts = [
    `profile-${num}`,
    profile.route.toLowerCase(),
    profile.timeframe,
    ...profile.drugNames
      .slice(0, 3)
      .map(name => slugify(name))
      .filter(Boolean),
  ];

  return parts.join('-');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function loadProfilesFromStorage() {
  try {
    const raw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadMedicationEntriesFromStorage() {
  try {
    const raw = window.localStorage.getItem(MEDICATION_LIST_STORAGE_KEY);
    return raw ? JSON.parse(raw).map(normalizeMedicationEntry) : [];
  } catch {
    return [];
  }
}

function loadWorkspaceFromStorage() {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadAuthSessionFromStorage() {
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    const accountRaw = window.localStorage.getItem(AUTH_ACCOUNT_STORAGE_KEY);
    return {
      token: token ?? '',
      account: accountRaw ? JSON.parse(accountRaw) : null,
    };
  } catch {
    return {
      token: '',
      account: null,
    };
  }
}

function saveProfilesToStorage(profiles) {
  try {
    window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // ignore storage errors
  }
}

function saveMedicationEntriesToStorage(entries) {
  try {
    window.localStorage.setItem(MEDICATION_LIST_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

function saveWorkspaceToStorage(workspace) {
  try {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  } catch {
    // ignore storage errors
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
}

function mapApiProfileToAppProfile(profile) {
  return {
    id: String(profile.id),
    name: profile.name,
    label: profile.payload?.label ?? profile.name,
    selectedDrugIds: profile.payload?.selectedDrugIds ?? [],
    drugStates: profile.payload?.drugStates ?? profile.payload?.graphState?.drugStates ?? [],
    medicationEntries: profile.payload?.medicationEntries ?? [],
    patientName: profile.payload?.patientName ?? 'Example Patient',
    workspaceLabel: profile.payload?.workspaceLabel ?? profile.name,
    patientNotes: profile.payload?.patientNotes ?? '',
    route: profile.payload?.route ?? 'PO',
    timeframe: profile.payload?.timeframe ?? '1y',
    savedListDate: profile.payload?.savedListDate ?? profile.createdAt?.slice(0, 10) ?? '',
    createdAt: profile.createdAt,
  };
}

function mapAppProfileToApiProfile(profile, accountId) {
  return {
    ...(accountId ? { accountId } : {}),
    name: profile.label,
    payload: {
      version: 2,
      label: profile.label,
      selectedDrugIds: profile.selectedDrugIds,
      drugStates: profile.drugStates ?? [],
      medicationEntries: profile.medicationEntries,
      graphState: {
        version: 1,
        selectedDrugIds: profile.selectedDrugIds,
        drugStates: profile.drugStates ?? [],
        medicationEntries: profile.medicationEntries,
        route: profile.route,
        timeframe: profile.timeframe,
      },
      patientName: profile.patientName,
      workspaceLabel: profile.workspaceLabel,
      patientNotes: profile.patientNotes,
      route: profile.route,
      timeframe: profile.timeframe,
      savedListDate: profile.savedListDate,
      createdAt: profile.createdAt,
    },
  };
}

async function saveProfileToApi(profile, profiles, user, token) {
  const existing = profiles.find(item => item.id === profile.id);
  const payload = mapAppProfileToApiProfile(profile, user?.id);

  if (existing && isNumericIdentifier(existing.id)) {
    const updated = await apiPut(`/profiles/${existing.id}`, payload, token);
    return mapApiProfileToAppProfile(updated);
  }

  const created = user?.id
    ? await apiPost(`/accounts/${user.id}/profiles`, payload, token)
    : await apiPost('/profiles', payload, token);
  return mapApiProfileToAppProfile(created);
}

function upsertProfile(profiles, nextProfile) {
  const byId = new Map(profiles.map(profile => [String(profile.id), profile]));
  byId.set(String(nextProfile.id), normalizeStoredProfiles([nextProfile])[0]);
  return Array.from(byId.values()).sort((left, right) => left.label.localeCompare(right.label));
}

function isNumericIdentifier(value) {
  return /^[0-9]+$/.test(String(value));
}

function searchCatalogLocally(drugs, term, selectedDrugIds) {
  const query = term.trim().toLowerCase();

  return drugs
    .filter(drug => !selectedDrugIds.includes(drug.id))
    .filter(drug => {
      return [drug.name, drug.genericName, drug.brandName, drug.drugClass]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query));
    })
    .slice(0, 20);
}

function buildDrugResultCaption(drug) {
  const parts = [drug.genericName, drug.drugClass, drug.dosageForm, drug.source].filter(Boolean);
  return parts.join(' · ') || 'No extra metadata';
}

function buildMedicationTableRows(medicationEntries, drugLookup, selectedDrugIds) {
  const plottedIndex = new Map(selectedDrugIds.map((drugId, index) => [String(drugId), index]));

  return medicationEntries
    .map(entry => {
      const drug = drugLookup.get(String(entry.drugId));
      const plotIndex = plottedIndex.get(String(entry.drugId));

      return {
        ...entry,
        drugId: String(entry.drugId),
        name: drug?.name ?? 'Unknown drug',
        maxDailyDose: drug?.maxDailyDose ?? 100,
        plotted: plottedIndex.has(String(entry.drugId)),
        color:
          plotIndex === undefined ? 'transparent' : CHART_COLORS[plotIndex % CHART_COLORS.length],
        windowLabel: describeMedicationWindow(entry),
      };
    })
    .sort(compareMedicationEntries);
}

function summarizeMedicationEntries(entries) {
  return entries.reduce(
    (summary, entry) => {
      if (entry.timelineStatus === 'historic') {
        summary.historicCount += 1;
      } else if (entry.timelineStatus === 'planned') {
        summary.plannedCount += 1;
      } else {
        summary.currentCount += 1;
      }

      return summary;
    },
    { currentCount: 0, historicCount: 0, plannedCount: 0 }
  );
}

function describeMedicationWindow(entry) {
  if (!entry.startDate) {
    return 'No timeline';
  }

  if (!entry.endDate) {
    return entry.timelineStatus === 'planned'
      ? `Starts ${entry.startDate}`
      : `${entry.startDate} onward`;
  }

  if (entry.startDate === entry.endDate) {
    return entry.startDate;
  }

  return `${entry.startDate} to ${entry.endDate}`;
}

function groupMedicationEntriesByDrug(entries) {
  const grouped = new Map();

  for (const entry of entries ?? []) {
    const drugId = String(entry.drugId);
    if (!grouped.has(drugId)) {
      grouped.set(drugId, []);
    }
    grouped.get(drugId).push(normalizeMedicationEntry(entry));
  }

  return grouped;
}

function getMedicationEntryEndDate(entry, fallbackEndDate) {
  return entry.endDate || fallbackEndDate;
}

function rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart <= rightEnd && leftEnd >= rightStart;
}

function capitalizeLabel(value) {
  if (!value) {
    return '';
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function buildWorkspaceExportPayload(workspace) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    patientName: workspace.patientName,
    workspaceLabel: workspace.workspaceLabel,
    patientNotes: workspace.patientNotes,
    route: workspace.route,
    timeframe: workspace.timeframe,
    selectedDrugIds: workspace.selectedDrugIds,
    drugs: workspace.drugs,
    doses: workspace.doses,
    medicationEntries: workspace.medicationEntries,
    profiles: workspace.profiles,
    graphState: {
      version: 1,
      selectedDrugIds: workspace.selectedDrugIds,
      drugStates: buildProfileDrugStates(
        workspace.drugs,
        workspace.selectedDrugIds,
        workspace.medicationEntries
      ),
      medicationEntries: workspace.medicationEntries,
      route: workspace.route,
      timeframe: workspace.timeframe,
    },
  };
}

function buildDoseEventsCsv(filteredEvents, drugLookup) {
  const rows = [['date', 'end_date', 'drug', 'route', 'amount', 'unit', 'percent_max', 'notes']];

  for (const event of filteredEvents) {
    const drug = drugLookup.get(String(event.drugId));
    const maxDose = drug?.maxDailyDose ?? 100;
    const percent = maxDose > 0 ? ((event.amount / maxDose) * 100).toFixed(1) : '0.0';

    rows.push([
      event.date,
      event.endDate ?? '',
      drug?.name ?? 'Unknown drug',
      event.route,
      String(event.amount),
      drug?.unit ?? 'mg',
      percent,
      event.notes ?? '',
    ]);
  }

  return rows.map(row => row.map(toCsvCell).join(',')).join('\n');
}

function toCsvCell(value) {
  const normalized = String(value ?? '');
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/"/g, '""')}"`;
}

function downloadFile(filename, contents, mimeType) {
  const blob = new Blob([contents], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

function renderTooltip(active, payload, drugLookup) {
  if (!active || !payload?.length) {
    return null;
  }

  const chartPoint = payload[0].payload;
  const visibleItems = payload
    .filter(item => Number(item.value) > 0)
    .sort((left, right) => Number(right.value) - Number(left.value));

  const itemsToRender = visibleItems.length ? visibleItems : payload.slice(0, 6);

  return h(
    'div',
    { className: 'tooltip-card' },
    h(
      'strong',
      null,
      chartPoint.date === chartPoint.endDate
        ? chartPoint.date
        : `${chartPoint.date} to ${chartPoint.endDate}`
    ),
    h(
      'div',
      { className: 'tooltip-list' },
      itemsToRender.slice(0, 8).map(item => {
        const drugId = String(item.dataKey).replace('series:', '');
        const drug = drugLookup.get(drugId);
        const totalDose = chartPoint[getDoseKey(drugId)] ?? 0;

        return h(
          'div',
          { className: 'tooltip-row', key: item.dataKey },
          h('span', { className: 'tooltip-swatch', style: { backgroundColor: item.color } }),
          h('span', { className: 'tooltip-name' }, drug?.name ?? item.name),
          h(
            'span',
            { className: 'tooltip-value' },
            `${Number(item.value).toFixed(1)}%`,
            totalDose > 0 && drug?.unit ? ` · ${Number(totalDose).toFixed(1)} ${drug.unit}` : ''
          )
        );
      })
    ),
    visibleItems.length > 8
      ? h('p', { className: 'tooltip-more' }, `+${visibleItems.length - 8} more active series`)
      : null
  );
}

function getAnchorDate(doses) {
  if (!doses.length) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  const latestDose = doses.reduce((latest, dose) => {
    const latestDate = dose.endDate ?? dose.date;
    const previousLatestDate = latest.endDate ?? latest.date;
    return latestDate > previousLatestDate ? dose : latest;
  }, doses[0]);

  return new Date(`${latestDose.endDate ?? latestDose.date}T12:00:00`);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function coerceDrugId(drugId) {
  const numeric = Number(drugId);
  return Number.isInteger(numeric) && `${numeric}` === `${drugId}` ? numeric : drugId;
}

createRoot(document.getElementById('root')).render(h(App));
