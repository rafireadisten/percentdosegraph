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
const ROUTE_OPTIONS = ['PO', 'IV', 'IM', 'SC', 'SL', 'PR', 'INH', 'TD', 'Other'];
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
const LAST_WORKSPACE_STORAGE_KEY = 'percentdosegraph:react-last-workspace';
const AUTH_TOKEN_STORAGE_KEY = 'percentdosegraph:auth-token';
const AUTH_ACCOUNT_STORAGE_KEY = 'percentdosegraph:auth-account';
const LEGAL_ACK_STORAGE_KEY = 'percentdosegraph:legal-acknowledgements';
const COMMON_DOSE_UNITS = ['mg', 'mcg', 'g', 'mEq', 'mL', 'units', 'IU', 'drops'];
const CHART_COLORS = [
  '#0f5a2d',
  '#2956bf',
  '#6b7a12',
  '#6ea8ff',
  '#7e5bef',
  '#c43d3d',
  '#b794f4',
  '#f28b82',
  '#bf5a17',
  '#c58b00',
  '#f6ad55',
  '#0d8f78',
  '#1f6feb',
  '#8f9f2b',
  '#8ecdfc',
  '#9f7aea',
  '#d93025',
  '#d6bcfa',
  '#f4a7a1',
  '#d97706',
  '#b99600',
];

function normalizeDoseUnit(unit) {
  const normalized = String(unit ?? '').trim();
  return normalized || 'mg';
}

function getPreferredDoseUnit(drug) {
  return normalizeDoseUnit(drug?.unit);
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function isCardiovascularDrug(drug) {
  const normalizedClass = String(drug?.drugClass ?? '').toLowerCase();

  return (
    normalizedClass.includes('cardio') ||
    normalizedClass.includes('statin') ||
    normalizedClass.includes('ace') ||
    normalizedClass.includes('arb') ||
    normalizedClass.includes('beta') ||
    normalizedClass.includes('calcium') ||
    normalizedClass.includes('diuretic')
  );
}

function createRandomMedicationSchedule(drug, startDate, endDate) {
  const segments = [];
  let currentDate = new Date(startDate);
  const maxDose = drug.maxDailyDose;
  
  // Create 2-4 dose segments
  const segmentCount = Math.floor(Math.random() * 3) + 2;
  
  for (let i = 0; i < segmentCount; i++) {
    const dose = Math.floor(Math.random() * maxDose * 0.8) + maxDose * 0.1; // 10-90% of max
    const percentOfMax = (dose / maxDose) * 100;
    
    let segmentEndDate;
    if (i === segmentCount - 1) {
      // Last segment goes to end
      segmentEndDate = new Date(endDate);
    } else {
      // Random duration for intermediate segments (1-12 months)
      const monthsToAdd = Math.floor(Math.random() * 12) + 1;
      segmentEndDate = new Date(currentDate);
      segmentEndDate.setMonth(segmentEndDate.getMonth() + monthsToAdd);
      if (segmentEndDate > endDate) segmentEndDate = new Date(endDate);
    }
    
    segments.push({
      startDate: new Date(currentDate),
      endDate: segmentEndDate,
      dose: Math.round(dose * 10) / 10, // Round to 1 decimal
      percentOfMax: Math.round(percentOfMax),
      label: `Dose ${i + 1}`,
      status: i === segmentCount - 1 ? 'ongoing' : 'discontinued'
    });
    
    currentDate = new Date(segmentEndDate);
    currentDate.setDate(currentDate.getDate() + 1);
    if (currentDate > endDate) break;
  }
  
  return segments;
}

function generateRandomMedGrafProfile(drugs) {
  // Use cardiovascular drugs if available, otherwise fallback drugs
  const cardiovascularDrugs = drugs.filter(isCardiovascularDrug);
  
  const sourceDrugs = cardiovascularDrugs.length >= 3 ? cardiovascularDrugs : [
    {
      id: 'fallback-atorvastatin',
      name: 'Atorvastatin',
      drugClass: 'Statin',
      maxDailyDose: 80,
      routeMaxDoses: { PO: 80 },
      unit: 'mg',
      notes: 'Fallback cardiovascular demo entry.',
    },
    {
      id: 'fallback-losartan',
      name: 'Losartan',
      drugClass: 'ARB',
      maxDailyDose: 100,
      routeMaxDoses: { PO: 100 },
      unit: 'mg',
      notes: 'Fallback cardiovascular demo entry.',
    },
    {
      id: 'fallback-lisinopril',
      name: 'Lisinopril',
      drugClass: 'ACE inhibitor',
      maxDailyDose: 40,
      routeMaxDoses: { PO: 40 },
      unit: 'mg',
      notes: 'Fallback cardiovascular demo entry.',
    },
    {
      id: 'fallback-hydrochlorothiazide',
      name: 'Hydrochlorothiazide',
      drugClass: 'Thiazide diuretic',
      maxDailyDose: 50,
      routeMaxDoses: { PO: 50 },
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

  const monthCount = 37; // 3 years + 1 month
  const regimens = selectedDrugs.map(drug => createRandomMedicationSchedule(drug, startDate, endDate));

  const points = Array.from({ length: monthCount }, (_, index) => {
    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + index);

    const values = regimens.map((segments, regimenIndex) => {
      const activeSegment = segments.find(segment => {
        const segmentStart = formatDateKey(segment.startDate);
        const segmentEnd = formatDateKey(segment.endDate);
        const currentKey = formatDateKey(currentDate);
        return currentKey >= segmentStart && currentKey <= segmentEnd;
      });
      if (!activeSegment) {
        return 0;
      }

      return (activeSegment.dose / selectedDrugs[regimenIndex].maxDailyDose) * 100;
    });

    return {
      date: formatDateKey(currentDate),
      label: formatShortDate(currentDate),
      ...values.reduce((acc, value, idx) => {
        acc[`drug${idx}`] = Number(value.toFixed(2));
        return acc;
      }, {})
    };
  });

  return {
    drugs: selectedDrugs,
    points,
    regimens,
    startDate,
    endDate: new Date(points[points.length - 1].date)
  };
}

function App() {
  const workspaceDefaults = loadWorkspaceFromStorage();
  const sessionDefaults = loadAuthSessionFromStorage();
  const legalDefaults = loadLegalAcknowledgementsFromStorage();
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
  const [entryDoseUnit, setEntryDoseUnit] = useState('mg');
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
  const [hoveredLineDrugId, setHoveredLineDrugId] = useState(null);
  const [compareBarOpen, setCompareBarOpen] = useState(false);
  const [compareBarTerm, setCompareBarTerm] = useState('');
  // MARKER: PDG-GRAPH-INTERACTION-2026-04-20
  const [selectedChartBucket, setSelectedChartBucket] = useState(null);
  const [maxDoseDrafts, setMaxDoseDrafts] = useState({});

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
  const [authNotice, setAuthNotice] = useState('');
  const [legalAcknowledgements, setLegalAcknowledgements] = useState({
    acceptedEula: Boolean(legalDefaults.acceptedEula),
    acceptedHipaaNotice: Boolean(legalDefaults.acceptedHipaaNotice),
    acceptedBaaRepresentation: Boolean(legalDefaults.acceptedBaaRepresentation),
  });

  // Random profile generator state
  const [randomProfile, setRandomProfile] = useState(null);
  const [generatingRandom, setGeneratingRandom] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    saveProfilesToStorage(profiles);
  }, [profiles]);

  useEffect(() => {
    saveMedicationEntriesToStorage(medicationEntries);
  }, [medicationEntries]);

  useEffect(() => {
    saveLegalAcknowledgementsToStorage(legalAcknowledgements);
  }, [legalAcknowledgements]);

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
    if (loading || !authReady) {
      return;
    }

    saveLastWorkspaceToStorage(
      buildWorkspaceExportPayload({
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
      })
    );
  }, [
    authReady,
    doses,
    drugs,
    loading,
    medicationEntries,
    patientName,
    patientNotes,
    profiles,
    route,
    selectedDrugIds,
    timeframe,
    workspaceLabel,
  ]);

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
        const storedWorkspace = loadLastWorkspaceFromStorage();
        const [nextDrugs, nextDoses] = await Promise.all([loadDrugs(), loadDoses()]);

        if (cancelled) {
          return;
        }

        const normalizedDrugs = nextDrugs.map(normalizeDrugRecord);
        const seededDoses = addSeededComparisonDoses(nextDoses, normalizedDrugs);
        const storedDrugs = Array.isArray(storedWorkspace?.drugs)
          ? storedWorkspace.drugs.map(normalizeDrugRecord)
          : [];
        const mergedDrugs = mergeDrugCatalog(normalizedDrugs, storedDrugs);
        const defaultDrugId = mergedDrugs[0]?.id ?? normalizedDrugs[0]?.id ?? null;
        const normalizedDoses = seededDoses.map((dose, index) =>
          normalizeDoseRecord(dose, index, defaultDrugId)
        );
        const restoredMedicationEntries = Array.isArray(storedWorkspace?.medicationEntries)
          ? storedWorkspace.medicationEntries.map(normalizeMedicationEntry)
          : medicationEntries;
        const restoredDoses = Array.isArray(storedWorkspace?.doses)
          ? storedWorkspace.doses.map((dose, index) =>
              normalizeDoseRecord(dose, index, defaultDrugId)
            )
          : normalizedDoses;
        const restoredSelectedDrugIds = Array.isArray(storedWorkspace?.selectedDrugIds)
          ? storedWorkspace.selectedDrugIds.map(String).slice(0, MAX_VISIBLE_DRUGS)
          : getInitialSelectedDrugIds(mergedDrugs, restoredMedicationEntries);
        const defaultSelection = restoredSelectedDrugIds[0] ?? defaultDrugId ?? '';

        setDrugs(mergedDrugs);
        setDoses(restoredDoses);
        setMedicationEntries(restoredMedicationEntries);
        setSelectedDrugIds(restoredSelectedDrugIds);
        if (storedWorkspace) {
          setRoute(storedWorkspace.route ?? workspaceDefaults.route ?? 'PO');
          setTimeframe(storedWorkspace.timeframe ?? workspaceDefaults.timeframe ?? '1y');
          setPatientName(storedWorkspace.patientName ?? workspaceDefaults.patientName ?? 'Example Patient');
          setWorkspaceLabel(
            storedWorkspace.workspaceLabel ??
              workspaceDefaults.workspaceLabel ??
              'Current medication timeline'
          );
          setPatientNotes(storedWorkspace.patientNotes ?? workspaceDefaults.patientNotes ?? '');
          if (Array.isArray(storedWorkspace.profiles)) {
            setProfiles(normalizeStoredProfiles(storedWorkspace.profiles));
          }
        }
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

  useEffect(() => {
    if (editingDoseId) {
      return;
    }

    const selectedDrug = drugs.find(drug => String(drug.id) === String(entryDrugId));
    setEntryDoseUnit(getPreferredDoseUnit(selectedDrug));
  }, [drugs, editingDoseId, entryDrugId]);

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

  const hoveredLineDefinition = useMemo(() => {
    if (!hoveredLineDrugId) {
      return null;
    }

    const drug = drugLookup.get(String(hoveredLineDrugId));
    if (!drug) {
      return null;
    }

    return buildLineDefinition(drug, {
      timeframe,
      route,
      range,
      filteredEvents,
      medicationEntries,
    });
  }, [drugLookup, filteredEvents, hoveredLineDrugId, medicationEntries, range, route, timeframe]);

  const selectedChartEvents = useMemo(() => {
    if (!selectedChartBucket?.date || !selectedChartBucket?.endDate) {
      return [];
    }

    const bucketStart = selectedChartBucket.date;
    const bucketEnd = selectedChartBucket.endDate;

    return filteredEvents.filter(event => {
      if (selectedChartBucket.drugId && String(event.drugId) !== String(selectedChartBucket.drugId)) {
        return false;
      }

      const eventEndDate = event.resolvedEndDate ?? event.endDate ?? event.date;
      return rangesOverlap(event.date, eventEndDate, bucketStart, bucketEnd);
    });
  }, [filteredEvents, selectedChartBucket]);

  const timeframeLabel =
    TIMEFRAME_OPTIONS.find(option => option.value === timeframe)?.label ?? timeframe;
  const selectedDrugSummary = selectedDrugs.length
    ? selectedDrugs.slice(0, 3).map(drug => drug.name).join(', ')
    : medicationEntries.length
      ? `${medicationEntries.length} medication entr${medicationEntries.length === 1 ? 'y' : 'ies'}`
      : 'No medications selected';
  const workspaceMaxDose = selectedDrugs[0]?.maxDailyDose ?? null;
  const workspaceMaxDoseLabel = workspaceMaxDose
    ? `${workspaceMaxDose} ${selectedDrugs[0]?.unit ?? 'mg'}/day`
    : 'Not set yet';
  const workspaceMaxDoseDetail = selectedDrugs.length > 1
    ? 'Per-drug ceilings are tracked independently in the dynamic workspace'
    : selectedDrugs[0]
      ? `Reference ceiling for ${selectedDrugs[0].name}`
      : 'Manual or inferred max dose';

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

  function handleMaxDoseDraftChange(drugId, nextValue) {
    setMaxDoseDrafts(current => ({
      ...current,
      [String(drugId)]: nextValue,
    }));
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

  function commitMaxDoseChange(drugId) {
    const draftValue = maxDoseDrafts[String(drugId)];
    const drug = drugs.find(item => item.id === String(drugId));

    if (!drug) {
      return;
    }

    if (draftValue === undefined) {
      handleMaxDoseChange(drugId, String(drug.maxDailyDose ?? ''));
      return;
    }

    handleMaxDoseChange(drugId, draftValue);
    setMaxDoseDrafts(current => {
      const nextDrafts = { ...current };
      delete nextDrafts[String(drugId)];
      return nextDrafts;
    });
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
    if (
      !requireComplianceAcknowledgements(
        'saving synced or local profiles',
        setProfileStatus,
        setProfileStatus
      ) ||
      !requireDeidentifiedPatientLabel('saving a profile', setProfileStatus, setProfileStatus)
    ) {
      return;
    }

    if (!selectedDrugIds.length && !medicationEntries.length) {
      setProfileStatus('Add medications before saving a medication list profile.');
      return;
    }

    const existingProfile = activeProfileId
      ? profiles.find(profile => profile.id === activeProfileId)
      : null;
    const profileCreation = canCreateAnotherProfileForUser(user, profiles, existingProfile);
    if (!profileCreation.allowed) {
      setProfileStatus(
        `${profileCreation.tier} users can save up to ${
          Number.isFinite(profileCreation.limit) ? profileCreation.limit : 'unlimited'
        } profiles. Delete an old profile before creating a new one.`
      );
      return;
    }

    const existingLabel = existingProfile?.label ?? existingProfile?.name;
    const id = existingProfile?.id ?? generateProfileId(
      {
        selectedDrugIds,
        route,
        timeframe,
        drugNames: selectedDrugs.map(drug => drug.name),
      },
      profiles.length + 1
    );
    const label = profileName.trim() || existingLabel || generateSequentialProfileLabel(profiles);
    const draftProfile = {
      id,
      patientId: existingProfile?.patientId ?? String(id),
      label,
      selectedDrugIds,
      drugStates: buildProfileDrugStates(drugs, selectedDrugIds, medicationEntries),
      doses: buildProfileDoseEvents(doses, selectedDrugIds, medicationEntries),
      medicationEntries,
      patientName,
      workspaceLabel,
      patientNotes,
      route,
      timeframe,
      savedListDate: formatDateKey(new Date()),
      createdAt: existingProfile?.createdAt ?? new Date().toISOString(),
    };

    try {
      const saved = await saveProfileToApi(draftProfile, profiles, user, authToken);
      const normalizedProfile = normalizeStoredProfiles([saved])[0];
      setProfiles(current => upsertProfile(current, normalizedProfile));
      setActiveProfileId(normalizedProfile.id);
      setProfileStatus(
        `Saved ${normalizedProfile.label} with ${medicationEntries.length} medication entries and ${(normalizedProfile.doses ?? []).length} dose events.`
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
    setDoses((profile.doses ?? []).map((dose, index) => normalizeDoseRecord(dose, index)));
    setPatientName(profile.patientName ?? 'Example Patient');
    setWorkspaceLabel(profile.workspaceLabel ?? profile.label ?? 'Current medication timeline');
    setPatientNotes(profile.patientNotes ?? '');
    setRoute(profile.route);
    setTimeframe(profile.timeframe);
    setActiveProfileId(profile.id);
    setProfileStatus(
      `Opened ${profile.label} from ${profile.savedListDate ?? 'a previous save'} and replaced the current dose timeline with ${(profile.doses ?? []).length} saved dose events.`
    );
    setWorkspaceStatus('');
  }

  function handleMergeProfile(profile) {
    setDrugs(current => mergeDrugCatalog(current, profile.drugStates ?? []));
    setMedicationEntries(current =>
      mergeMedicationEntries(current, profile.medicationEntries ?? [])
    );
    setDoses(current =>
      mergeDoseEvents(
        current,
        (profile.doses ?? []).map((dose, index) => normalizeDoseRecord(dose, index))
      )
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
    setProfileStatus(
      `Added medications and ${(profile.doses ?? []).length} saved dose events from ${profile.label} into the current list.`
    );
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
    const selectedDrug = drugLookup.get(String(dose.drugId));
    setEditingDoseId(dose.id);
    setEntryDrugId(String(dose.drugId));
    setEntryDate(dose.date);
    setEntryEndDate(dose.endDate ?? '');
    setEntryRoute(dose.route);
    setEntryAmount(String(dose.amount));
    setEntryDoseUnit(normalizeDoseUnit(dose.doseUnit ?? selectedDrug?.unit));
    setEntryNotes(dose.notes ?? '');
    setEntryStatus('Editing an existing dose event.');
    setEntryError('');
  }

  function handleCancelDoseEdit() {
    const selectedDrug = drugLookup.get(String(entryDrugId));
    setEditingDoseId(null);
    setEntryDate(formatDateKey(new Date()));
    setEntryEndDate('');
    setEntryAmount('');
    setEntryDoseUnit(getPreferredDoseUnit(selectedDrug));
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

  function handleChartClick(state) {
    const activePayload = state?.activePayload;
    const activeLabel = state?.activeLabel;

    if (!Array.isArray(activePayload) || !activePayload.length || !activeLabel) {
      return;
    }

    const clickedSeries = activePayload.find(item => String(item?.dataKey ?? '').startsWith('series:'));
    const clickedPoint = clickedSeries?.payload ?? activePayload[0]?.payload;

    if (!clickedSeries || !clickedPoint?.date) {
      return;
    }

    const drugId = String(clickedSeries.dataKey).replace('series:', '');
    const drug = drugLookup.get(drugId);
    const matchingEvents = filteredEvents.filter(event => {
      if (String(event.drugId) !== drugId) {
        return false;
      }

      const eventEndDate = event.resolvedEndDate ?? event.endDate ?? event.date;
      return rangesOverlap(event.date, eventEndDate, clickedPoint.date, clickedPoint.endDate ?? clickedPoint.date);
    });

    setSelectedChartBucket({
      drugId,
      drugName: drug?.name ?? clickedSeries.name ?? 'Selected drug',
      label: activeLabel,
      date: clickedPoint.date,
      endDate: clickedPoint.endDate ?? clickedPoint.date,
      percent: Number(clickedSeries.value ?? 0),
      doseAmount: Number(clickedPoint[getDoseKey(drugId)] ?? 0),
      eventCount: matchingEvents.length,
    });
    setWorkspaceStatus(
      matchingEvents.length
        ? `Selected ${matchingEvents.length} plotted dose event(s) for ${drug?.name ?? 'the chosen drug'} from ${clickedPoint.date} to ${clickedPoint.endDate ?? clickedPoint.date}.`
        : `Selected the plotted ${drug?.name ?? 'drug'} point for ${clickedPoint.date}.`
    );
  }

  async function handleDoseEntrySubmit(event) {
    event.preventDefault();
    const submitter = event.nativeEvent?.submitter;
    const saveAndAddAnother = submitter?.dataset?.submitMode === 'save-add-another';

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
      doseUnit: normalizeDoseUnit(entryDoseUnit),
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
    setEntryNotes('');

    if (!saveAndAddAnother) {
      setEntryEndDate('');
    }

    if (saveAndAddAnother) {
      setEntryDate(formatDateKey(new Date()));
      setEntryEndDate('');
      setEntryStatus('Dose segment saved. Continue adding another segment.');
    }

    setEntryError('');
    setWorkspaceStatus('');
  }

  function handleExportJson() {
    if (
      !requireComplianceAcknowledgements(
        'exporting workspace data',
        setWorkspaceStatus,
        setWorkspaceStatus
      ) ||
      !requireDeidentifiedPatientLabel(
        'exporting workspace data',
        setWorkspaceStatus,
        setWorkspaceStatus
      )
    ) {
      return;
    }

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
    if (
      !requireComplianceAcknowledgements(
        'exporting dose-event data',
        setWorkspaceStatus,
        setWorkspaceStatus
      ) ||
      !requireDeidentifiedPatientLabel(
        'exporting dose-event data',
        setWorkspaceStatus,
        setWorkspaceStatus
      )
    ) {
      return;
    }

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
    if (
      !requireComplianceAcknowledgements(
        'importing workspace data',
        setWorkspaceStatus,
        setWorkspaceStatus
      )
    ) {
      return;
    }

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

  function handleGenerateRandomProfile() {
    setGeneratingRandom(true);
    try {
      const profile = generateRandomMedGrafProfile(drugs);
      setRandomProfile(profile);
    } catch (error) {
      console.error('Failed to generate random profile:', error);
    } finally {
      setGeneratingRandom(false);
    }
  }

  // Auth functions
  async function handleAuth() {
    if (
      !requireComplianceAcknowledgements('using account sync', setAuthError, setAuthError) ||
      !requireDeidentifiedPatientLabel(
        'using account sync with patient-linked data',
        setAuthError,
        setAuthError
      )
    ) {
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthNotice('');

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

      if (data.token) {
        persistAuthSession(data.token, data.account);
        setAuthToken(data.token);
        setUser(data.account);
        setIsAuthenticated(true);
      } else {
        clearAuthSession();
        setAuthToken('');
        setUser(null);
        setIsAuthenticated(false);
      }

      if (data.requiresEmailConfirmation) {
        setAuthNotice(data.message || 'Check your email to confirm the account, then sign in.');
      } else {
        setAuthNotice('');
      }

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
    setAuthNotice('');
    setProfiles(normalizeStoredProfiles(loadProfilesFromStorage()));
    setActiveProfileId(null);
    setProfileStatus('Signed out. Local browser profiles are still available.');
  }

  // Check for token on mount
  useEffect(() => {
    if (sessionDefaults.account) {
      setUser(sessionDefaults.account);
    }
  }, []);

  const canAddMore = selectedDrugIds.length < MAX_VISIBLE_DRUGS;
  const hasAcceptedComplianceRequirements =
    legalAcknowledgements.acceptedEula &&
    legalAcknowledgements.acceptedHipaaNotice &&
    legalAcknowledgements.acceptedBaaRepresentation;
  const patientIdentifierWarning = getDirectIdentifierWarning(patientName);

  function updateLegalAcknowledgement(key, checked) {
    setLegalAcknowledgements(current => ({
      ...current,
      [key]: checked,
    }));
  }

  function requireComplianceAcknowledgements(actionLabel, setStatus, setFailure) {
    if (hasAcceptedComplianceRequirements) {
      return true;
    }

    const message =
      `Account sync is blocked until you check all three legal boxes below: EULA, HIPAA notice, and BAA acknowledgement.`;
    setFailure?.(message);
    setStatus?.('');
    return false;
  }

  function requireDeidentifiedPatientLabel(actionLabel, setStatus, setFailure) {
    if (!patientIdentifierWarning) {
      return true;
    }

    const message =
      `${patientIdentifierWarning} Replace the patient label with something de-identified like "RD-001" or "Example Patient" before ${actionLabel}.`;
    setFailure?.(message);
    setStatus?.('');
    return false;
  }

  if (!authReady) {
    return h('div', { className: 'auth-container' }, h('p', null, 'Restoring session...'));
  }

  return h(
    'div',
    { className: 'app-shell' },
    h(
      'div',
      { className: 'menu-shell' },
      h(
        'button',
        {
          id: 'globalMenuButton',
          type: 'button',
          className: 'menu-button',
          'aria-expanded': menuOpen,
          'aria-controls': 'globalMenuDrawer',
          onClick: () => setMenuOpen(current => !current),
        },
        'Menu'
      ),
      h(
        'nav',
        {
          id: 'globalMenuDrawer',
          className: `menu-drawer${menuOpen ? '' : ' hidden'}`,
          'aria-label': 'Universal navigation',
        },
        h('p', { className: 'menu-label' }, 'DoseGraph'),
        h('a', { href: '../index.html' }, 'Landing page'),
        h('a', { href: '../about.html' }, 'About'),
        h('a', { href: '../updates.html' }, 'Updates'),
        h('a', { href: '../frontend-static/' }, 'Static version'),
        h('a', { href: './' }, 'Dynamic version'),
        h('a', { href: 'mailto:rafi@readisten.com' }, 'Contact developers / engineers'),
        h('a', { href: '../accounts.html' }, 'Accounts & profiles management')
      )
    ),
    h(
      'section',
      { className: 'hero' },
      h(
        'article',
        { className: 'hero-copy' },
        h('p', { className: 'eyebrow' }, 'DoseGraph Dynamic'),
        h('h1', null, 'Use the dynamic DoseGraph workspace with the static workspace as the core mold.'),
        h(
          'p',
          { className: 'hero-text' },
          'Enter the medication, patient label, route, reference max dose, and dose dates in one place. This dynamic page follows the static workspace layout first, then layers in saved profiles, account sync, and import/export tools.'
        )
      ),
      h(
        'article',
        { className: 'hero-card' },
        h('p', { className: 'card-label' }, 'Dynamic workspace'),
        h('p', { className: 'card-value' }, `${selectedDrugs.length}`),
        h(
          'p',
          { className: 'card-caption' },
          `${summary.activeDrugCount} selected drug(s) with data in the current ${route} view${isAuthenticated ? ' and account sync available.' : ' in guest or signed-in mode.'}`
        ),
        patientNotes ? h('p', { className: 'workspace-detail hero-card-note' }, patientNotes) : null
      )
    ),
    h(
      'div',
      { className: 'workspace-heading' },
      h('p', { className: 'eyebrow' }, 'Workspace snapshot'),
      h(
        'p',
        { className: 'workspace-heading-copy' },
        isAuthenticated
          ? `Signed in as ${user?.name || user?.email}. The dynamic workspace keeps the static graphing flow while adding synced profiles.`
          : 'Guest mode stays available here too. You can graph first and sign in later if you want synced profiles.'
      )
    ),
    h(
      'section',
      { className: 'workspace-strip', 'aria-label': 'Current workspace overview' },
      h(
        'article',
        { className: 'workspace-card' },
        h('p', { className: 'card-label' }, 'Patient + Drugs'),
        h('strong', null, patientName || 'Example Patient'),
        h('p', { className: 'workspace-detail' }, selectedDrugSummary)
      ),
      h(
        'article',
        { className: 'workspace-card' },
        h('p', { className: 'card-label' }, 'Route + Window'),
        h('strong', null, route),
        h('p', { className: 'workspace-detail' }, timeframeLabel)
      ),
      h(
        'article',
        { className: 'workspace-card' },
        h('p', { className: 'card-label' }, 'Reference Ceiling'),
        h('strong', null, workspaceMaxDoseLabel),
        h('p', { className: 'workspace-detail' }, workspaceMaxDoseDetail)
      ),
      h(
        'article',
        { className: 'workspace-card' },
        h('p', { className: 'card-label' }, 'Dose Segments'),
        h('strong', null, `${summary.eventCount} in view`),
        h(
          'p',
          { className: 'workspace-detail' },
          filteredEvents[0]
            ? `Most recent event ${filteredEvents[0].date}`
            : 'No dose segments yet'
        )
      )
    ),
    h(
      'section',
      { className: 'layout' },
      h(
        'aside',
        { className: 'panel controls-panel selector-panel' },
        h(
          'div',
          { className: 'panel-header' },
          h('p', { className: 'section-kicker' }, 'Step 1'),
          h('h2', null, 'Step 1 · Configure the regimen'),
          h(
            'p',
            null,
            'Set the patient context and the ceiling used to normalize every dose to % max, while keeping the search flow available for the bundled sample library and FDA-backed catalog.'
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
            { className: 'panel-header compact' },
            h('p', { className: 'section-kicker' }, 'Workspace'),
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
              disabled: Boolean(activeProfileId),
              onChange: event => setPatientName(event.target.value),
            }),
            patientIdentifierWarning
              ? h('p', { className: 'helper error-text' }, patientIdentifierWarning)
              : h(
                  'p',
                  { className: 'helper' },
                  'Use a de-identified chart label such as initials, an internal study code, or a medical record alias. Exact first and last names should not be used.'
                ),
            activeProfileId
              ? h(
                  'p',
                  { className: 'helper' },
                  'Patient assignment is fixed for the current profile. Create a new profile to track a different patient.'
                )
              : null
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
            { className: 'panel-header compact' },
            h('p', { className: 'section-kicker' }, 'Step 2'),
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
          h('button', { type: 'submit', className: 'primary-button' }, 'Save Medication List Entry'),
          listStatus ? h('p', { className: 'helper success-text' }, listStatus) : null,
          listError ? h('p', { className: 'helper error-text' }, listError) : null
        ),
        h(
          'form',
          { className: 'dose-entry-form', onSubmit: handleDoseEntrySubmit },
          h(
            'div',
            { className: 'panel-header compact' },
            h('p', { className: 'section-kicker' }, 'Step 3'),
            h('h2', null, 'Add and edit doses'),
            h(
              'p',
              null,
              'Add dose segments with a date, optional end date, route, and amount so the graph updates immediately and stays closer to the static dose-entry workflow.'
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
              h('label', { htmlFor: 'entryDoseUnit' }, 'Dose unit'),
              h('input', {
                id: 'entryDoseUnit',
                type: 'text',
                list: 'entryDoseUnitOptions',
                value: entryDoseUnit,
                onChange: event => setEntryDoseUnit(event.target.value),
              }),
              h(
                'datalist',
                { id: 'entryDoseUnitOptions' },
                COMMON_DOSE_UNITS.map(unit => h('option', { key: unit, value: unit }))
              )
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
            'div',
            { className: 'dose-form-actions' },
            h(
              'button',
              { type: 'submit', className: 'primary-button' },
              editingDoseId ? 'Update Dose Segment' : 'Save Dose Segment'
            ),
            !editingDoseId
              ? h(
                  'button',
                  {
                    type: 'submit',
                    className: 'secondary-button',
                    'data-submit-mode': 'save-add-another',
                  },
                  'Save & Add Another'
                )
              : null
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
          h('p', { className: 'metric-label' }, 'Profile save'),
          h(
            'button',
            {
              type: 'button',
              className: 'primary-button',
              onClick: handleSaveProfile,
              disabled: !selectedDrugs.length && !medicationEntries.length,
            },
            activeProfileId ? 'Save profile updates' : 'Save med list profile'
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
          h(
            'div',
            { className: 'panel-header compact' },
            h('p', { className: 'section-kicker' }, 'Step 5'),
            h('h2', null, 'Data tools')
          ),
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
          h(
            'div',
            { className: 'panel-header compact' },
            h('p', { className: 'section-kicker' }, 'Step 6'),
            h('h2', null, 'Saved graph profiles')
          ),
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
                      `${profile.patientName ?? 'Patient'} · ${getSelectedDrugIdsFromProfile(profile).length} medication(s) · ${(profile.doses ?? []).length} dose event(s) · ${profile.route} · ${TIMEFRAME_OPTIONS.find(option => option.value === profile.timeframe)?.label ?? profile.timeframe}`
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
                        type: 'text',
                        inputMode: 'decimal',
                        value: maxDoseDrafts[String(row.drugId)] ?? String(row.maxDailyDose ?? ''),
                        onChange: event => handleMaxDoseDraftChange(row.drugId, event.target.value),
                        onBlur: () => commitMaxDoseChange(row.drugId),
                        onKeyDown: event => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitMaxDoseChange(row.drugId);
                          }
                        },
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
            { className: 'workspace-panel auth-panel-shell' },
            h(
              'div',
              { className: 'panel-header compact' },
              h('p', { className: 'section-kicker' }, 'Step 7'),
              h(
                'h2',
                null,
                isAuthenticated
                  ? 'Account sync and legal checklist'
                  : 'Account registration and sign-in'
              )
            ),
            h(
              'p',
              null,
              isAuthenticated
                ? 'Your saved medication-list profiles can sync with the backend while local browser storage remains available as a fallback.'
                : 'Register or sign in here when you want saved profiles and backend sync. Guest mode still lets you use the graph and basic medication entry tools.'
            ),
            isAuthenticated
              ? [
                  h(
                    'div',
                    { className: 'auth-inline-status', key: 'auth-status' },
                    h(
                      'p',
                      { className: 'helper' },
                      `Currently signed in as ${user?.name || user?.email}.`
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'pill-button secondary-button',
                        onClick: handleLogout,
                      },
                      'Logout'
                    )
                  ),
                  h(
                    'div',
                    { className: 'account-data-grid', key: 'account-data' },
                    buildAccountDataRows(user).map(row =>
                      h(
                        'div',
                        { className: 'account-data-row', key: row.label },
                        h('span', { className: 'metric-label' }, row.label),
                        h('strong', null, row.value)
                      )
                    )
                  ),
                ]
              : h(
                  'div',
                  { className: 'auth-form auth-inline-form' },
                  authError ? h('div', { className: 'error' }, authError) : null,
                  authNotice ? h('p', { className: 'helper success-text' }, authNotice) : null,
                  h(
                    'div',
                    { className: 'notice-card legal-copy auth-legal-reminder' },
                    h('strong', null, 'Before creating or using a synced account'),
                    h(
                      'p',
                      null,
                      'Review the legal checklist below. Do not use direct patient names, and only use identifiable health data when your organization has approved that use.'
                    )
                  ),
                  h(
                    'p',
                    { className: 'helper auth-preflight-hint' },
                    'Login only works after two things are true: the patient label is de-identified, and all three legal checkboxes below are accepted.'
                  ),
                  authMode === 'register'
                    ? h('input', {
                        type: 'text',
                        placeholder: 'Name',
                        value: authName,
                        onChange: e => setAuthName(e.target.value),
                      })
                    : null,
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
                    'div',
                    { className: 'auth-inline-actions' },
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: handleAuth,
                        disabled: authLoading,
                      },
                      authLoading ? 'Loading...' : authMode === 'login' ? 'Login' : 'Register'
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'secondary-button',
                        onClick: () => setAuthMode(authMode === 'login' ? 'register' : 'login'),
                      },
                      authMode === 'login' ? 'Need an account?' : 'Have an account?'
                    )
                  )
                ),
            h(
              'div',
              { className: 'compliance-panel' },
              h('p', { className: 'metric-label' }, 'Legal checklist'),
              h(
                'p',
                { className: 'helper' },
                'Review and accept these notices before using account sync, imports, exports, or saved profiles that may contain patient-linked context.'
              ),
              h(
                'label',
                { className: 'checkbox-row' },
                h('input', {
                  type: 'checkbox',
                  checked: legalAcknowledgements.acceptedEula,
                  onChange: event => updateLegalAcknowledgement('acceptedEula', event.target.checked),
                }),
                h(
                  'span',
                  null,
                  'I accept the EULA and understand commercial deployment requires an appropriate commercial license or internal approval.'
                )
              ),
              h(
                'label',
                { className: 'checkbox-row' },
                h('input', {
                  type: 'checkbox',
                  checked: legalAcknowledgements.acceptedHipaaNotice,
                  onChange: event =>
                    updateLegalAcknowledgement('acceptedHipaaNotice', event.target.checked),
                }),
                h(
                  'span',
                  null,
                  'I acknowledge the HIPAA notice: directly identifying patient data should be anonymized, and exact first and last names should not be used in this workspace.'
                )
              ),
              h(
                'label',
                { className: 'checkbox-row' },
                h('input', {
                  type: 'checkbox',
                  checked: legalAcknowledgements.acceptedBaaRepresentation,
                  onChange: event =>
                    updateLegalAcknowledgement('acceptedBaaRepresentation', event.target.checked),
                }),
                h(
                  'span',
                  null,
                  'I represent that any required BAA or equivalent authorization for identifiable health data has been reviewed and approved before account sync or sharing.'
                )
              ),
              h(
                'div',
                { className: 'notice-card legal-copy' },
                h('strong', null, 'HIPAA notice'),
                h(
                  'p',
                  null,
                  'This product can display and store user-entered clinical context. Treat exported files, synced profiles, and printed reports as sensitive content, and de-identify data before use unless your organization has approved identifiable use.'
                )
              ),
              h(
                'div',
                {
                  className: `notice-card ${hasAcceptedComplianceRequirements ? 'notice-success' : 'notice-warning'}`,
                },
                h(
                  'strong',
                  null,
                  hasAcceptedComplianceRequirements
                    ? 'Compliance notices accepted'
                    : 'Compliance notices still require acknowledgement'
                ),
                h(
                  'p',
                  null,
                  hasAcceptedComplianceRequirements
                    ? 'Account sync, imports, exports, and profile saves are enabled.'
                    : 'Until all three notices are accepted, account sync, imports, exports, and profile saves stay blocked.'
                )
              )
            )
          ),
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
            h('p', { className: 'section-kicker' }, 'Step 4'),
            h('h2', null, 'Review the trend'),
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
            { className: 'chart-panel tall-chart line-hover-chart-panel' },
            hoveredLineDefinition
              ? h(
                  'aside',
                  { className: 'line-hover-card', 'aria-live': 'polite' },
                  h('p', { className: 'line-hover-eyebrow' }, 'Hovered plot line'),
                  h('strong', null, hoveredLineDefinition.drugName),
                  h(
                    'dl',
                    { className: 'line-hover-definition' },
                    h('dt', null, 'Dose'),
                    h('dd', null, hoveredLineDefinition.doseText),
                    h('dt', null, 'Time frame'),
                    h('dd', null, hoveredLineDefinition.timeframeText)
                  )
                )
              : null,
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
                          onClick: handleChartClick,
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
                        // MARKER: PDG-80PCT-DISABLED-2026-04-20 — re-enable block below to restore 80% max dose reference line
                        // h(ReferenceLine, {
                        //   y: 80,
                        //   stroke: 'var(--danger)',
                        //   strokeDasharray: '5 5',
                        // }),
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
                            onMouseEnter: () => setHoveredLineDrugId(String(drug.id)),
                            onMouseLeave: () => setHoveredLineDrugId(current =>
                              current === String(drug.id) ? null : current
                            ),
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
            { className: 'chart-legend', 'aria-label': 'Active comparison legend' },
            selectedDrugs.map((drug, index) =>
              h(
                'span',
                { className: 'legend-chip', key: `legend-${drug.id}` },
                h('span', {
                  className: 'legend-swatch',
                  style: { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] },
                }),
                h('span', null, drug.name),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'table-action secondary compact-button',
                    onClick: () => handleToggleDrugSelection(drug.id),
                  },
                  'Remove'
                )
              )
            )
          ),
          h(
            'div',
            { className: 'graph-toolbar' },
            h(
              'button',
              {
                type: 'button',
                className: 'secondary-button',
                disabled: !canAddMore && !compareBarOpen,
                onClick: () => {
                  setCompareBarOpen(current => !current);
                  if (compareBarOpen) {
                    setCompareBarTerm('');
                  }
                },
              },
              compareBarOpen ? 'Hide Add Drug Panel' : 'Add Drug To Graph'
            )
          ),
          compareBarOpen
            ? h(
                'section',
                { className: 'add-drug-panel', 'aria-label': 'Add drug to graph' },
                h(
                  'div',
                  { className: 'panel-header compact' },
                  h('p', { className: 'section-kicker' }, 'Graph Add'),
                  h('h3', null, 'Add another drug series'),
                  h(
                    'p',
                    null,
                    'Add a new medication line to the current graph with the same static Add Drug To Graph flow, using the existing dynamic medication library.'
                  )
                ),
                h(
                  'div',
                  { className: 'field' },
                  h('label', { htmlFor: 'compareBarSearch' }, 'Medication'),
                  h('input', {
                    id: 'compareBarSearch',
                    autoFocus: true,
                    className: 'search-input',
                    type: 'search',
                    placeholder: 'Search medication to add to graph',
                    value: compareBarTerm,
                    onChange: event => setCompareBarTerm(event.target.value),
                  })
                ),
                compareBarTerm.length >= 2
                  ? h(
                      'div',
                      { className: 'search-results add-drug-panel-results' },
                      drugs
                        .filter(
                          d =>
                            d.name.toLowerCase().includes(compareBarTerm.toLowerCase()) &&
                            !selectedDrugIds.includes(d.id)
                        )
                        .slice(0, 8)
                        .map(d =>
                          h(
                            'div',
                            { className: 'result-row', key: `compare-${d.id}` },
                            h(
                              'div',
                              { className: 'result-copy' },
                              h('strong', null, d.name),
                              h('p', null, buildDrugResultCaption(d))
                            ),
                            h(
                              'button',
                              {
                                type: 'button',
                                className: 'pill-button',
                                onClick: () => {
                                  handleAddDrug(d);
                                  setCompareBarOpen(false);
                                  setCompareBarTerm('');
                                },
                              },
                              'Add To Graph'
                            )
                          )
                        )
                    )
                  : h(
                      'p',
                      { className: 'helper' },
                      'Type at least two letters to search the existing medication library and add another plotted drug.'
                    ),
                compareBarTerm.length >= 2 &&
                !drugs.some(
                  d =>
                    d.name.toLowerCase().includes(compareBarTerm.toLowerCase()) &&
                    !selectedDrugIds.includes(d.id)
                )
                  ? h(
                      'div',
                      { className: 'empty small-empty' },
                      'No additional medication matches were found for this graph search.'
                    )
                  : null
              )
            : null,
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
          ,
          h(
            'section',
            { className: 'panel' },
            h('h2', null, 'Graph interaction'),
            h(
              'p',
              null,
              'This graph is rendered as F(x) = y where x is time and y is the selected medication dose expressed as % of max daily dose. Click any plotted line segment to inspect the underlying dose event(s) and jump into editing.'
            ),
            selectedChartBucket
              ? h(
                  React.Fragment,
                  null,
                  h(
                    'p',
                    { className: 'helper' },
                    `${selectedChartBucket.drugName} · ${selectedChartBucket.label} · ${selectedChartBucket.percent.toFixed(1)}% max dose · ${selectedChartBucket.doseAmount.toFixed(1)} total visible units across ${selectedChartBucket.date === selectedChartBucket.endDate ? selectedChartBucket.date : `${selectedChartBucket.date} to ${selectedChartBucket.endDate}`}`
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
                          h('th', null, 'Dose'),
                          h('th', null, '% Max'),
                          h('th', null, 'Notes'),
                          h('th', null, 'Actions')
                        )
                      ),
                      h(
                        'tbody',
                        null,
                        selectedChartEvents.length
                          ? selectedChartEvents.map(event => {
                              const drug = drugLookup.get(event.drugId);
                              const maxDose = drug?.maxDailyDose ?? 100;
                              const percent = maxDose > 0 ? (event.amount / maxDose) * 100 : 0;
                              return h(
                                'tr',
                                { key: `chart-selection-${event.id}` },
                                h('td', null, event.date),
                                h('td', null, event.endDate ?? event.resolvedEndDate ?? '—'),
                                h(
                                  'td',
                                  null,
                                  `${event.amount.toFixed(1)} ${event.doseUnit ?? drug?.unit ?? 'mg'}`
                                ),
                                h('td', null, `${percent.toFixed(1)}%`),
                                h('td', null, event.notes || '—'),
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
                                { colSpan: 6 },
                                'This plotted bucket does not map cleanly to a single editable event. Try a shorter timeframe for more granular point selection.'
                              )
                            )
                      )
                    )
                  )
                )
              : h(
                  'div',
                  { className: 'empty small-empty' },
                  'Click a plotted line segment to review and edit the dose events behind that point.'
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
                      const unit = event.doseUnit ?? drug?.unit ?? 'mg';
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
      ),
      h(
        'section',
        { className: 'panel' },
        h('h2', null, 'Demo tools · Random MedGraf Generator'),
        h(
          'p',
          null,
          'Generate a three-drug cardiovascular profile with stepwise dose changes over three years. The chart plots % max daily dose against calendar dates.'
        ),
        h(
          'div',
          { className: 'field' },
          h(
            'button',
            {
              type: 'button',
              className: 'primary-button',
              onClick: handleGenerateRandomProfile,
              disabled: generatingRandom,
            },
            generatingRandom ? 'Generating...' : 'Generate Random Profile'
          )
        ),
        randomProfile
          ? h(
              'div',
              { className: 'random-profile-container' },
              h(
                'div',
                { className: 'random-profile-meta' },
                h(
                  'p',
                  null,
                  `${formatDisplayDate(randomProfile.startDate)} through ${formatDisplayDate(randomProfile.endDate)} · ${randomProfile.drugs.length} cardiovascular medications`
                )
              ),
              h(
                'div',
                { className: 'random-profile-chart' },
                h(
                  ResponsiveContainer,
                  { width: '100%', height: 300 },
                  h(
                    LineChart,
                    {
                      data: randomProfile.points,
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
                      minTickGap: 50,
                    }),
                    h(YAxis, {
                      tickLine: false,
                      axisLine: false,
                      width: 56,
                      domain: [0, 100],
                      tickFormatter: value => `${value}%`,
                    }),
                    h(Tooltip, {
                      content: ({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return h(
                          'div',
                          { className: 'tooltip' },
                          h('p', null, label),
                          ...payload.map((entry, index) =>
                            h(
                              'p',
                              {
                                key: index,
                                style: { color: entry.color },
                              },
                              `${entry.name}: ${entry.value}%`
                            )
                          )
                        );
                      },
                    }),
                    h(Legend, {
                      verticalAlign: 'top',
                      height: 36,
                      wrapperStyle: { fontSize: '12px' },
                    }),
                    h(ReferenceLine, {
                      y: 50,
                      stroke: 'rgba(33, 49, 58, 0.18)',
                      strokeDasharray: '4 4',
                    }),
                    // MARKER: PDG-80PCT-DISABLED-2026-04-20 — re-enable block below to restore 80% max dose reference line (preview chart)
                    // h(ReferenceLine, {
                    //   y: 80,
                    //   stroke: 'var(--danger)',
                    //   strokeDasharray: '5 5',
                    // }),
                    h(ReferenceLine, {
                      y: 100,
                      stroke: 'rgba(191, 79, 41, 0.45)',
                      strokeDasharray: '3 3',
                    }),
                    randomProfile.drugs.map((drug, index) =>
                      h(Line, {
                        key: drug.id,
                        type: 'monotone',
                        dataKey: `drug${index}`,
                        name: drug.name,
                        stroke: CHART_COLORS[index % CHART_COLORS.length],
                        strokeWidth: 2.4,
                        dot: false,
                        connectNulls: true,
                        isAnimationActive: false,
                      })
                    )
                  )
                )
              ),
              h(
                'div',
                { className: 'random-profile-summary' },
                randomProfile.drugs.map((drug, index) =>
                  h(
                    'article',
                    { key: drug.id, className: 'generator-drug-card' },
                    h('p', { className: 'card-label' }, drug.drugClass),
                    h('h3', null, drug.name),
                    h(
                      'p',
                      null,
                      h('strong', null, 'Reference max daily dose:'),
                      ` ${drug.maxDailyDose} ${drug.unit}`
                    ),
                    h('p', null, drug.notes || 'Generated synthetic regimen for demonstration.'),
                    h(
                      'div',
                      { className: 'generator-regimen' },
                      randomProfile.regimens[index].map((segment, segIndex) =>
                        h(
                          'p',
                          { key: segIndex },
                          h(
                            'strong',
                            null,
                            `${segment.label} ${segment.dose} ${drug.unit}/day`
                          ),
                          `: ${formatDisplayDate(segment.startDate)} to `,
                          segment.status === 'ongoing'
                            ? 'present and continuing'
                            : formatDisplayDate(segment.endDate),
                          ` (${segment.percentOfMax}% max)`
                        )
                      ),
                      randomProfile.regimens[index].some(segment => segment.status === 'discontinued')
                        ? h(
                            'p',
                            null,
                            h('strong', null, 'Discontinued:'),
                            ` ${formatDisplayDate(
                              randomProfile.regimens[index][
                                randomProfile.regimens[index].length - 1
                              ].endDate
                            )}`
                          )
                        : null
                    )
                  )
                )
              )
            )
          : null
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
    routeMaxDoses: drug.routeMaxDoses ?? {},
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
    endDate: dose.endDate ?? '',
    route: dose.route ?? 'PO',
    amount: Number(dose.amount ?? 0),
    doseUnit: normalizeDoseUnit(dose.doseUnit ?? dose.unit),
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
    patientId: String(profile.patientId ?? profile.id ?? `profile-${index + 1}`),
    label: profile.label ?? profile.name ?? `Profile ${index + 1}`,
    selectedDrugIds: Array.isArray(profile.selectedDrugIds)
      ? profile.selectedDrugIds.map(String)
      : [],
    medicationEntries: Array.isArray(profile.medicationEntries)
      ? profile.medicationEntries.map(normalizeMedicationEntry)
      : [],
    doses: Array.isArray(profile.doses)
      ? profile.doses.map((dose, doseIndex) => normalizeDoseRecord(dose, doseIndex))
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

  return [];
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

function buildProfileDoseEvents(doses, selectedDrugIds, medicationEntries) {
  const selected = new Set(selectedDrugIds.map(String));

  for (const entry of medicationEntries ?? []) {
    if (entry?.drugId) {
      selected.add(String(entry.drugId));
    }
  }

  return (doses ?? [])
    .filter(dose => selected.has(String(dose.drugId)))
    .map((dose, index) => normalizeDoseRecord(dose, index));
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
  const timelineDoses = resolveDoseTimeline(doses, endKey);

  return timelineDoses.filter(dose => {
    const eventEndDate = dose.resolvedEndDate ?? dose.endDate ?? dose.date;
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
  const route = events.length > 0 ? events[0].route : 'PO'; // All events have same route from filtering
  const byDrugAndDate = new Map();

  for (const event of events) {
    const eventStart = new Date(`${event.date}T12:00:00`);
    const eventEnd = new Date(`${event.resolvedEndDate ?? event.endDate ?? event.date}T12:00:00`);
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
      const routeSpecificMax = drug.routeMaxDoses?.[route] ?? drug.maxDailyDose;
      const percent = routeSpecificMax > 0 ? (amount / routeSpecificMax) * 100 : 0;
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

function resolveDoseTimeline(doses, fallbackEndDate) {
  const normalizedDoses = Array.isArray(doses)
    ? doses.map((dose, index) => normalizeDoseRecord(dose, index))
    : [];
  const grouped = new Map();

  for (const dose of normalizedDoses) {
    const key = `${dose.drugId}:${dose.route}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(dose);
  }

  const resolved = [];

  for (const entries of grouped.values()) {
    const sortedEntries = entries
      .slice()
      .sort((left, right) =>
        String(left.date).localeCompare(String(right.date)) ||
        String(left.id).localeCompare(String(right.id))
      );

    for (let index = 0; index < sortedEntries.length; index += 1) {
      const dose = sortedEntries[index];
      const nextDose = sortedEntries[index + 1];
      const explicitEndDate = dose.endDate || '';
      let resolvedEndDate = explicitEndDate || dose.date;

      if (!explicitEndDate) {
        if (nextDose?.date) {
          resolvedEndDate = getPreviousDateKey(nextDose.date, dose.date);
        } else {
          resolvedEndDate = fallbackEndDate || dose.date;
        }
      }

      resolved.push({
        ...dose,
        ordinal: index + 1,
        resolvedEndDate: resolvedEndDate < dose.date ? dose.date : resolvedEndDate,
      });
    }
  }

  return resolved;
}

function getPreviousDateKey(dateKey, minimumDateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() - 1);
  const previousDateKey = formatDateKey(date);
  return previousDateKey < minimumDateKey ? minimumDateKey : previousDateKey;
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

function loadLegalAcknowledgementsFromStorage() {
  try {
    const raw = window.localStorage.getItem(LEGAL_ACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
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

function saveLegalAcknowledgementsToStorage(acknowledgements) {
  try {
    window.localStorage.setItem(LEGAL_ACK_STORAGE_KEY, JSON.stringify(acknowledgements));
  } catch {
    // ignore storage errors
  }
}

function loadLastWorkspaceFromStorage() {
  try {
    const raw = window.localStorage.getItem(LAST_WORKSPACE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLastWorkspaceToStorage(workspace) {
  try {
    window.localStorage.setItem(LAST_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
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
    doses: profile.payload?.doses ?? profile.payload?.graphState?.doses ?? [],
    medicationEntries: profile.payload?.medicationEntries ?? [],
    patientId: String(profile.payload?.patientId ?? profile.id),
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
      ...(isNumericIdentifier(profile.id)
        ? { patientId: String(profile.id) }
        : {}),
      label: profile.label,
      selectedDrugIds: profile.selectedDrugIds,
      drugStates: profile.drugStates ?? [],
      doses: profile.doses ?? [],
      medicationEntries: profile.medicationEntries,
      graphState: {
        version: 1,
        selectedDrugIds: profile.selectedDrugIds,
        drugStates: profile.drugStates ?? [],
        doses: profile.doses ?? [],
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

function buildAccountDataRows(account) {
  if (!account) {
    return [];
  }

  return [
    { label: 'Account ID', value: String(account.id ?? 'Unknown') },
    { label: 'Display name', value: account.name ?? 'Not set' },
    { label: 'Email', value: account.email ?? 'Not set' },
    { label: 'Role', value: account.role ?? 'user' },
    { label: 'Status', value: account.isActive === false ? 'Inactive' : 'Active' },
  ];
}

function getDirectIdentifierWarning(value) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return '';
  }

  if (looksLikeFullName(normalized)) {
    return 'Potential direct identifier detected: this patient label looks like an exact first-and-last name.';
  }

  return '';
}

function looksLikeFullName(value) {
  if (/@/.test(value) || /\d/.test(value)) {
    return false;
  }

  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length !== 2) {
    return false;
  }

  return tokens.every(token => /^[A-Z][a-z'-]{1,}$/.test(token));
}

function buildDoseEventsCsv(filteredEvents, drugLookup) {
  const rows = [['date', 'end_date', 'drug', 'route', 'amount', 'unit', 'percent_max', 'notes']];

  for (const event of filteredEvents) {
    const drug = drugLookup.get(String(event.drugId));
    const maxDose = drug?.maxDailyDose ?? 100;
    const percent = maxDose > 0 ? ((event.amount / maxDose) * 100).toFixed(1) : '0.0';
    const unit = normalizeDoseUnit(event.doseUnit ?? drug?.unit);

    rows.push([
      event.date,
      event.endDate ?? '',
      drug?.name ?? 'Unknown drug',
      event.route,
      String(event.amount),
      unit,
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

function buildLineDefinition(drug, context) {
  const timeframeLabel =
    TIMEFRAME_OPTIONS.find(option => option.value === context.timeframe)?.label ?? context.timeframe;
  const routeEntries = context.medicationEntries.filter(
    entry => String(entry.drugId) === String(drug.id) && entry.route === context.route
  );
  const routeEvents = context.filteredEvents.filter(
    event => String(event.drugId) === String(drug.id) && event.route === context.route
  );
  const visibleAmounts = routeEvents
    .map(event => Number(event.amount))
    .filter(amount => Number.isFinite(amount) && amount > 0);
  const visibleDoseRange = visibleAmounts.length
    ? `${Math.min(...visibleAmounts).toFixed(1)} to ${Math.max(...visibleAmounts).toFixed(1)} ${drug.unit}`
    : null;
  const medicationWindow = routeEntries.length
    ? routeEntries
        .map(entry =>
          entry.endDate && entry.endDate !== entry.startDate
            ? `${entry.startDate} to ${entry.endDate}`
            : entry.startDate
        )
        .join('; ')
    : null;

  return {
    drugName: drug.name,
    doseText: visibleDoseRange
      ? `Visible doses span ${visibleDoseRange} on ${context.route}; percentages are normalized to ${drug.maxDailyDose} ${drug.unit}/day.`
      : `Percentages are normalized to ${drug.maxDailyDose} ${drug.unit}/day for ${context.route}.`,
    timeframeText: medicationWindow
      ? `${timeframeLabel} chart window (${context.range.startDate} to ${context.range.endDate}); medication list window: ${medicationWindow}.`
      : `${timeframeLabel} chart window (${context.range.startDate} to ${context.range.endDate}).`,
  };
}

function getAnchorDate(doses) {
  if (!doses.length) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);
  const resolvedDoses = resolveDoseTimeline(doses, todayKey);

  const latestDose = resolvedDoses.reduce((latest, dose) => {
    const latestDate = dose.resolvedEndDate ?? dose.endDate ?? dose.date;
    const previousLatestDate =
      latest.resolvedEndDate ?? latest.endDate ?? latest.date;
    return latestDate > previousLatestDate ? dose : latest;
  }, resolvedDoses[0]);

  return new Date(`${latestDose.resolvedEndDate ?? latestDose.endDate ?? latestDose.date}T12:00:00`);
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

function getProfileLimitForUser(user) {
  if (user?.role === 'admin' || user?.role === 'developer' || user?.role === 'system') {
    return Number.POSITIVE_INFINITY;
  }

  if (user?.id) {
    return 20;
  }

  return 5;
}

function getProfileTierLabelForUser(user) {
  if (user?.role === 'admin' || user?.role === 'developer' || user?.role === 'system') {
    return 'Developer';
  }

  if (user?.id) {
    return 'Clinician';
  }

  return 'Patient';
}

function canCreateAnotherProfileForUser(user, profiles, existingProfile) {
  if (existingProfile) {
    return {
      allowed: true,
      limit: getProfileLimitForUser(user),
      tier: getProfileTierLabelForUser(user),
    };
  }

  const limit = getProfileLimitForUser(user);
  return {
    allowed: profiles.length < limit,
    limit,
    tier: getProfileTierLabelForUser(user),
  };
}

createRoot(document.getElementById('root')).render(h(App));
