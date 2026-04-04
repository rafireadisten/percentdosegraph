const MS_PER_DAY = 24 * 60 * 60 * 1000;
const API_BASE_PATH = resolveApiBasePath();
const AUTH_TOKEN_STORAGE_KEY = "percentdosegraph:static-auth-token";
const AUTH_ACCOUNT_STORAGE_KEY = "percentdosegraph:static-auth-account";

let drugReferenceLibrary = [];

const state = {
  settings: {
    medicationName: "Morphine",
    patientName: "Example Patient",
    medicationRoute: "PO",
    doseUnit: "mg/day",
    maxDose: 120,
    timeframe: "1y",
  },
  inference: {
    match: null,
    matches: [],
    isOverridden: false,
  },
  doseEvents: [],
  profiles: [],
  auth: {
    token: "",
    account: null,
    mode: "login",
  },
};

function resolveApiBasePath() {
  if (window.location.protocol === "file:") {
    return "http://localhost:3001/api";
  }

  if (window.location.hostname === "localhost" && window.location.port === "8080") {
    return "http://localhost:3001/api";
  }

  return `${window.location.origin}/api`;
}

const elements = {
  settingsForm: document.getElementById("settingsForm"),
  doseForm: document.getElementById("doseForm"),
  medicationName: document.getElementById("medicationName"),
  patientName: document.getElementById("patientName"),
  medicationRoute: document.getElementById("medicationRoute"),
  doseUnit: document.getElementById("doseUnit"),
  maxDose: document.getElementById("maxDose"),
  timeframe: document.getElementById("timeframe"),
  doseDate: document.getElementById("doseDate"),
  doseRoute: document.getElementById("doseRoute"),
  doseAmount: document.getElementById("doseAmount"),
  eventsTableBody: document.getElementById("eventsTableBody"),
  chartSubtitle: document.getElementById("chartSubtitle"),
  headlinePercent: document.getElementById("headlinePercent"),
  averagePercent: document.getElementById("averagePercent"),
  peakPercent: document.getElementById("peakPercent"),
  totalDose: document.getElementById("totalDose"),
  highDays: document.getElementById("highDays"),
  interpretationText: document.getElementById("interpretationText"),
  rangeText: document.getElementById("rangeText"),
  doseChart: document.getElementById("doseChart"),
  inferenceStatus: document.getElementById("inferenceStatus"),
  inferenceSummary: document.getElementById("inferenceSummary"),
  referenceList: document.getElementById("referenceList"),
  applyInferenceButton: document.getElementById("applyInferenceButton"),
  exportJsonButton: document.getElementById("exportJsonButton"),
  exportCsvButton: document.getElementById("exportCsvButton"),
  importJsonButton: document.getElementById("importJsonButton"),
  importFileInput: document.getElementById("importFileInput"),
  clearDataButton: document.getElementById("clearDataButton"),
  profileName: document.getElementById("profileName"),
  saveProfileButton: document.getElementById("saveProfileButton"),
  loadProfileButton: document.getElementById("loadProfileButton"),
  profileList: document.getElementById("profileList"),
  authForm: document.getElementById("authForm"),
  authNameLabel: document.getElementById("authNameLabel"),
  authName: document.getElementById("authName"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authSubmitButton: document.getElementById("authSubmitButton"),
  authToggleButton: document.getElementById("authToggleButton"),
  authLogoutButton: document.getElementById("authLogoutButton"),
  authStatusText: document.getElementById("authStatusText"),
  authMessage: document.getElementById("authMessage"),
};

restoreAuthSession();
syncFormFromState();
initialize();

elements.settingsForm.addEventListener("input", (event) => {
  const previousRoute = state.settings.medicationRoute;
  const previousDrug = state.settings.medicationName;

  state.settings.medicationName = elements.medicationName.value.trim() || "Medication";
  state.settings.patientName = elements.patientName.value.trim() || "Patient";
  state.settings.medicationRoute = elements.medicationRoute.value;
  state.settings.doseUnit = elements.doseUnit.value.trim() || "units/day";
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

elements.applyInferenceButton.addEventListener("click", () => {
  applyInferredMaxDose();
  render();
});

elements.exportJsonButton.addEventListener("click", () => {
  exportDataAsJson();
});

elements.exportCsvButton.addEventListener("click", () => {
  exportDataAsCsv();
});

elements.importJsonButton.addEventListener("click", () => {
  elements.importFileInput.click();
});

elements.importFileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (file) {
    await importDataFromJson(file);
  }
});

elements.clearDataButton.addEventListener("click", async () => {
  if (confirm("Are you sure you want to clear all dose events? This cannot be undone.")) {
    await clearDoseEvents();
  }
});

elements.saveProfileButton.addEventListener("click", async () => {
  await saveProfile();
});

elements.loadProfileButton.addEventListener("click", async () => {
  await loadProfiles();
});

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await handleAuthSubmit();
});

elements.authToggleButton.addEventListener("click", () => {
  state.auth.mode = state.auth.mode === "login" ? "register" : "login";
  renderAuthState();
});

elements.authLogoutButton.addEventListener("click", () => {
  clearAuthSession();
  renderAuthState();
  renderProfileList();
});

elements.doseForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const date = elements.doseDate.value;
  const route = elements.doseRoute.value;
  const amount = Number(elements.doseAmount.value);

  if (!date || Number.isNaN(amount) || amount < 0) {
    return;
  }

  const nextEvent = { date, route, amount };

  try {
    const created = await apiPost("/doses", nextEvent);
    state.doseEvents.push(normalizeDoseEvent(created));
  } catch (error) {
    console.warn("Saving dose locally because API create failed:", error);
    state.doseEvents.push({
      id: `local-${Date.now()}`,
      ...nextEvent,
    });
  }

  state.doseEvents.sort((a, b) => a.date.localeCompare(b.date));

  elements.doseForm.reset();
  elements.doseDate.value = formatDateInput(new Date());
  elements.doseRoute.value = state.settings.medicationRoute;
  render();
});

elements.eventsTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-index]");

  if (!button) {
    return;
  }

  const index = Number(button.dataset.index);
  const doseEvent = state.doseEvents[index];

  if (!doseEvent) {
    return;
  }

  if (!String(doseEvent.id).startsWith("local-") && !String(doseEvent.id).startsWith("seed-")) {
    try {
      await apiDelete(`/doses/${doseEvent.id}`);
    } catch (error) {
      console.warn("Removing dose locally because API delete failed:", error);
    }
  }

  state.doseEvents.splice(index, 1);
  render();
});

async function initialize() {
  await hydrateAuthSession();
  await loadDrugReferenceLibrary();
  await loadDoseEvents();
  await loadProfiles();
  refreshInference({ preserveManual: false });
  render();
}

async function loadDrugReferenceLibrary() {
  const candidatePaths = ["./drug-library.json", "../drug-library.json"];

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
      throw new Error("Unable to load drug-library.json from known paths");
    }

    drugReferenceLibrary = await response.json();
  } catch (error) {
    console.error(error);
    drugReferenceLibrary = [];
    elements.inferenceSummary.textContent =
      "Reference library failed to load. Inference is unavailable until drug-library.json is served correctly.";
  }
}

async function loadDoseEvents() {
  try {
    const apiDoses = await apiGet("/doses");
    state.doseEvents = apiDoses.map(normalizeDoseEvent).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.warn("Falling back to seeded dose events:", error);
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
}

function renderAuthState() {
  const isAuthenticated = Boolean(state.auth.token && state.auth.account);
  const mode = state.auth.mode;
  const account = state.auth.account;

  elements.authNameLabel.classList.toggle("hidden", mode !== "register" || isAuthenticated);
  elements.authToggleButton.classList.toggle("hidden", isAuthenticated);
  elements.authLogoutButton.classList.toggle("hidden", !isAuthenticated);
  elements.authSubmitButton.classList.toggle("hidden", isAuthenticated);
  elements.authEmail.disabled = isAuthenticated;
  elements.authPassword.disabled = isAuthenticated;
  elements.authName.disabled = isAuthenticated;
  elements.authSubmitButton.textContent = mode === "login" ? "Login" : "Register";
  elements.authToggleButton.textContent =
    mode === "login" ? "Need an account?" : "Have an account?";

  if (isAuthenticated) {
    elements.authStatusText.textContent = `Signed in as ${account.name || account.email}. Backend profile persistence is active.`;
  } else {
    elements.authStatusText.textContent =
      "Not signed in. Profiles will stay local until you authenticate.";
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
    elements.inferenceStatus.textContent = "No reference match";
    elements.inferenceStatus.className = "reference-pill";
    elements.inferenceSummary.textContent =
      "No built-in drug + route reference matched the current regimen. Enter the reference max dose manually.";
    elements.referenceList.innerHTML = "";
    return;
  }

  if (state.inference.isOverridden) {
    elements.inferenceStatus.textContent = "Manual override active";
    elements.inferenceStatus.className = "reference-pill overridden";
    elements.inferenceSummary.textContent =
      `Matched ${match.drug} ${match.route} at ${formatNumber(match.maxDose)} ${match.unit}, but the current max dose has been manually adjusted.`;
  } else {
    elements.inferenceStatus.textContent = "Auto-inferred reference applied";
    elements.inferenceStatus.className = "reference-pill matched";
    elements.inferenceSummary.textContent =
      `Using ${formatNumber(match.maxDose)} ${match.unit} for ${match.drug} ${match.route} from the built-in starter library.`;
  }

  elements.referenceList.innerHTML = state.inference.matches
    .map(
      (entry) => `
        <article class="reference-card">
          <h3>${entry.drug} ${entry.route}</h3>
          <p><strong>Reference max:</strong> ${formatNumber(entry.maxDose)} ${entry.unit}</p>
          <p><strong>Source:</strong> ${entry.source}</p>
          <p>${entry.note}</p>
        </article>
      `
    )
    .join("");
}

function renderEventsTable(filteredEvents) {
  const maxDose = state.settings.maxDose;

  if (!filteredEvents.length) {
    elements.eventsTableBody.innerHTML =
      `<tr><td colspan="5">No ${state.settings.medicationRoute} dose events in the current view yet.</td></tr>`;
    return;
  }

  elements.eventsTableBody.innerHTML = filteredEvents
    .map((event) => {
      const percent = ((event.amount / maxDose) * 100).toFixed(1);
      const index = state.doseEvents.indexOf(event);

      return `
        <tr>
          <td class="mono">${event.date}</td>
          <td>${event.route}</td>
          <td>${formatNumber(event.amount)} ${displayEventUnit()}</td>
          <td>${percent}%</td>
          <td><button class="table-action" data-index="${index}">Remove</button></td>
        </tr>
      `;
    })
    .join("");
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

  let riskBand = "well below";

  if (metrics.averagePercent >= 80) {
    riskBand = "near or above";
  } else if (metrics.averagePercent >= 50) {
    riskBand = "approaching";
  }

  const referenceText = state.inference.match
    ? `The current max dose is anchored to a listed reference entry for ${state.inference.match.drug} ${state.inference.match.route}${state.inference.isOverridden ? ", then manually adjusted" : ""}.`
    : "No reference entry was found, so the current max dose is fully manual.";

  elements.interpretationText.textContent =
    `${state.settings.medicationName} ${state.settings.medicationRoute} averaged ${metrics.averagePercent.toFixed(1)}% of the patient-specific maximum dose during the selected window, with a peak daily exposure of ${metrics.peakPercent.toFixed(1)}%. This pattern is ${riskBand} the defined ceiling on average, and ${metrics.daysAbove80} day(s) exceeded 80% of max. ${referenceText}`;
}

function renderChart(points) {
  const canvas = elements.doseChart;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 22, right: 22, bottom: 54, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxY = Math.max(100, ...points.map((point) => point.percentOfMax), 10);

  ctx.clearRect(0, 0, width, height);

  drawRoundedRect(ctx, 0, 0, width, height, 18, "#fffaf5");
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
  ctx.strokeStyle = "#0d7c66";
  ctx.stroke();

  ctx.lineTo(padding.left + xStep * (points.length - 1), padding.top + chartHeight);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.closePath();
  ctx.fillStyle = "rgba(13, 124, 102, 0.14)";
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
    ctx.fillStyle = point.percentOfMax >= 80 ? "#bc6c25" : "#0d7c66";
    ctx.fill();

    ctx.fillStyle = "#69594b";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(shortDate(point.date), x, padding.top + chartHeight + 22);
  });
}

function drawGrid(ctx, padding, chartWidth, chartHeight, maxY) {
  const rows = 5;

  for (let row = 0; row <= rows; row += 1) {
    const y = padding.top + (chartHeight / rows) * row;
    const value = maxY - (maxY / rows) * row;

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.strokeStyle = "rgba(67, 48, 28, 0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#69594b";
    ctx.font = "12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${value.toFixed(0)}%`, padding.left - 10, y + 4);
  }

  const dangerY = padding.top + chartHeight - (80 / maxY) * chartHeight;
  ctx.beginPath();
  ctx.moveTo(padding.left, dangerY);
  ctx.lineTo(padding.left + chartWidth, dangerY);
  ctx.strokeStyle = "rgba(188, 108, 37, 0.55)";
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
    case "1d":
      break;
    case "7d":
      startDate.setDate(startDate.getDate() - 6);
      break;
    case "1y":
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setDate(startDate.getDate() + 1);
      break;
    case "2y":
      startDate.setFullYear(startDate.getFullYear() - 2);
      startDate.setDate(startDate.getDate() + 1);
      break;
    case "3y":
      startDate.setFullYear(startDate.getFullYear() - 3);
      startDate.setDate(startDate.getDate() + 1);
      break;
    case "5y":
      startDate.setFullYear(startDate.getFullYear() - 5);
      startDate.setDate(startDate.getDate() + 1);
      break;
    case "10y":
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

  events.forEach((event) => {
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
  const averagePercent =
    points.reduce((sum, point) => sum + point.percentOfMax, 0) / points.length;
  const peakPercent = Math.max(...points.map((point) => point.percentOfMax));
  const daysAbove80 = points.filter((point) => point.percentOfMax >= 80).length;

  return {
    averagePercent,
    peakPercent,
    totalDose,
    daysAbove80,
  };
}

function getFilteredEvents() {
  return state.doseEvents.filter((event) => event.route === state.settings.medicationRoute);
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

  return drugReferenceLibrary.filter((entry) => {
    if (entry.route !== route) {
      return false;
    }

    const names = [entry.drug, ...(entry.aliases || [])].map(normalizeDrugName);
    return names.includes(normalizedName);
  });
}

function normalizeDrugName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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

function displayEventUnit() {
  return state.settings.doseUnit.replace("/day", "");
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function shortDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value);
}

function exportDataAsJson() {
  const data = {
    settings: state.settings,
    doseEvents: state.doseEvents.map(({ id, ...event }) => ({ ...event })),
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `percent-dose-data-${formatDateInput(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportDataAsCsv() {
  const headers = ["Date", "Route", "Dose", "Percent of Max"];
  const rows = state.doseEvents
    .filter((event) => event.route === state.settings.medicationRoute)
    .map((event) => {
      const percent = ((event.amount / state.settings.maxDose) * 100).toFixed(1);
      return [event.date, event.route, event.amount, percent];
    });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((field) => `"${field}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
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
      alert("Invalid file format. Please select a valid export file.");
      return;
    }

    state.settings = { ...state.settings, ...data.settings };
    state.doseEvents = data.doseEvents.map(normalizeDoseEvent);
    state.inference.isOverridden = true;
    render();
    alert("Data imported successfully!");
  } catch (error) {
    alert(`Error reading file: ${error.message}`);
  }
}

async function loadProfiles() {
  try {
    const apiPath =
      state.auth.account?.id
        ? `/accounts/${state.auth.account.id}/profiles`
        : "/profiles";
    const apiProfiles = await apiGet(apiPath);
    state.profiles = apiProfiles.map(normalizeProfile);
  } catch (error) {
    console.warn("Falling back to profiles.json:", error);
    try {
      const response = await fetch("./profiles.json");
      if (!response.ok) {
        throw new Error(`Unable to load profiles.json (${response.status})`);
      }
      const fallbackProfiles = await response.json();
      state.profiles = fallbackProfiles.map(normalizeProfile);
    } catch (fallbackError) {
      console.error("Error loading profiles:", fallbackError);
      state.profiles = [];
    }
  }

  renderProfileList();
}

async function saveProfile() {
  const profileName = elements.profileName.value.trim();
  if (!profileName) {
    alert("Please enter a profile name.");
    return;
  }

  const profilePayload = {
    name: profileName,
    payload: {
      settings: { ...state.settings },
      doseEvents: state.doseEvents.map(({ id, ...event }) => ({ ...event })),
    },
  };

  try {
    const createdProfile = await apiPost(
      state.auth.account?.id
        ? `/accounts/${state.auth.account.id}/profiles`
        : "/profiles",
      profilePayload
    );
    state.profiles.push(normalizeProfile(createdProfile));
  } catch (error) {
    console.warn("Saving profile locally because API create failed:", error);
    state.profiles.push(
      normalizeProfile({
        id: `local-${Date.now()}`,
        name: profileName,
        payload: profilePayload.payload,
        createdAt: new Date().toISOString(),
      })
    );
  }

  renderProfileList();
  elements.profileName.value = "";
}

function renderProfileList() {
  if (!state.profiles.length) {
    elements.profileList.innerHTML = '<p class="empty-state">No saved profiles yet.</p>';
    return;
  }

  elements.profileList.innerHTML = state.profiles
    .map((profile) => `
      <div class="profile-item">
        <div class="profile-info">
          <h4>${profile.name}</h4>
          <p>${profile.settings.medicationName} (${profile.settings.medicationRoute}) - ${profile.doseEvents.length} dose events</p>
        </div>
        <div class="profile-actions">
          <button class="table-action" onclick="loadProfile('${profile.id}')">Load</button>
          <button class="table-action" onclick="deleteProfile('${profile.id}')" style="background: rgba(180, 35, 24, 0.08); color: var(--danger); border-color: rgba(180, 35, 24, 0.18);">Delete</button>
        </div>
      </div>
    `)
    .join("");
}

function loadProfile(profileId) {
  const profile = state.profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    alert("Profile not found.");
    return;
  }

  if (confirm(`Load profile "${profile.name}"? This will replace current settings and dose events.`)) {
    state.settings = { ...profile.settings };
    state.doseEvents = profile.doseEvents.map(normalizeDoseEvent);
    state.inference.isOverridden = true;
    render();
  }
}

async function deleteProfile(profileId) {
  const profile = state.profiles.find((entry) => entry.id === profileId);
  if (!profile) {
    return;
  }

  if (!confirm(`Delete profile "${profile.name}"? This cannot be undone.`)) {
    return;
  }

  if (!String(profile.id).startsWith("local-")) {
    try {
      await apiDelete(`/profiles/${profile.id}`);
    } catch (error) {
      console.warn("Deleting profile locally because API delete failed:", error);
    }
  }

  state.profiles = state.profiles.filter((entry) => entry.id !== profileId);
  renderProfileList();
}

window.loadProfile = loadProfile;
window.deleteProfile = deleteProfile;

async function clearDoseEvents() {
  const persistedEvents = state.doseEvents.filter(
    (event) => !String(event.id).startsWith("local-") && !String(event.id).startsWith("seed-")
  );

  try {
    await Promise.all(persistedEvents.map((event) => apiDelete(`/doses/${event.id}`)));
  } catch (error) {
    console.warn("Clearing doses locally because API delete failed:", error);
  }

  state.doseEvents = [];
  render();
}

function normalizeDoseEvent(event) {
  return {
    id: event.id ?? `local-${event.date}-${event.route}-${event.amount}`,
    date: event.date,
    route: event.route,
    amount: Number(event.amount),
    notes: event.notes ?? "",
  };
}

function normalizeProfile(profile) {
  const payload = profile.payload ?? {};
  const settings = payload.settings ?? profile.settings ?? { ...state.settings };
  const doseEvents = payload.doseEvents ?? profile.doseEvents ?? [];

  return {
    id: String(profile.id),
    name: profile.name,
    settings,
    doseEvents: doseEvents.map(normalizeDoseEvent),
    createdAt: profile.createdAt ?? new Date().toISOString(),
  };
}

async function hydrateAuthSession() {
  if (!state.auth.token) {
    renderAuthState();
    return;
  }

  try {
    const payload = await apiGet("/auth/me");
    state.auth.account = payload.account;
    persistAuthSession(state.auth.token, payload.account);
  } catch (error) {
    console.warn("Clearing stale static auth session:", error);
    clearAuthSession();
  }

  renderAuthState();
}

async function handleAuthSubmit() {
  const mode = state.auth.mode;
  const email = elements.authEmail.value.trim().toLowerCase();
  const password = elements.authPassword.value;
  const name = elements.authName.value.trim();

  if (!email || !password || (mode === "register" && !name)) {
    setAuthMessage("Complete the required account fields first.", "error");
    return;
  }

  if (mode === "register" && password.length < 8) {
    setAuthMessage("Passwords need at least 8 characters.", "error");
    return;
  }

  elements.authSubmitButton.disabled = true;
  setAuthMessage(mode === "login" ? "Signing in..." : "Creating your account...");

  try {
    const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
    const payload =
      mode === "login"
        ? { email, password }
        : { name, email, password };
    const authPayload = await apiPost(endpoint, payload, { skipAuth: true });

    state.auth.token = authPayload.token;
    state.auth.account = authPayload.account;
    persistAuthSession(authPayload.token, authPayload.account);
    elements.authPassword.value = "";
    if (mode === "register") {
      elements.authName.value = "";
      state.auth.mode = "login";
    }

    setAuthMessage("Signed in. Backend profile persistence is ready.", "success");
    renderAuthState();
    await loadProfiles();
  } catch (error) {
    setAuthMessage(error.message || "Authentication failed.", "error");
  } finally {
    elements.authSubmitButton.disabled = false;
  }
}

function setAuthMessage(message, tone = "") {
  elements.authMessage.textContent = message;
  elements.authMessage.className = `auth-message${tone ? ` ${tone}` : ""}`;
}

function restoreAuthSession() {
  try {
    state.auth.token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
    const rawAccount = window.localStorage.getItem(AUTH_ACCOUNT_STORAGE_KEY);
    state.auth.account = rawAccount ? JSON.parse(rawAccount) : null;
  } catch {
    state.auth.token = "";
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

  state.auth.token = "";
  state.auth.account = null;
  setAuthMessage("Signed out.");
}

async function apiGet(path, options) {
  const response = await fetch(buildApiUrl(path), {
    headers: buildApiHeaders(options),
  });
  return readApiResponse(response);
}

async function apiPost(path, body, options) {
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers: buildApiHeaders(options),
    body: JSON.stringify(body),
  });

  return readApiResponse(response);
}

async function apiDelete(path, options) {
  const response = await fetch(buildApiUrl(path), {
    method: "DELETE",
    headers: buildApiHeaders(options),
  });

  return readApiResponse(response);
}

function buildApiHeaders(options = {}) {
  const headers = {};
  if (!options.noJson) {
    headers["Content-Type"] = "application/json";
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
    { daysAgo: 4, route: "PO", amount: 62 },
    { daysAgo: 9, route: "PO", amount: 70 },
    { daysAgo: 15, route: "IV", amount: 24 },
    { daysAgo: 28, route: "PO", amount: 88 },
    { daysAgo: 44, route: "PO", amount: 82 },
    { daysAgo: 76, route: "PO", amount: 96 },
    { daysAgo: 120, route: "PO", amount: 68 },
    { daysAgo: 180, route: "PO", amount: 90 },
    { daysAgo: 240, route: "PO", amount: 74 },
    { daysAgo: 300, route: "IV", amount: 20 },
    { daysAgo: 344, route: "PO", amount: 60 },
  ];

  samples.forEach((sample) => {
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
