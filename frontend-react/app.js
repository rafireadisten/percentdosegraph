import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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
  YAxis
} from "recharts";

const h = React.createElement;
const MAX_VISIBLE_DRUGS = 20;
const API_BASE_PATH = resolveApiBasePath();
const ROUTE_OPTIONS = ["PO", "IV", "IM", "SC", "SL", "PR", "TD", "Other"];
const TIMEFRAME_OPTIONS = [
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
  { value: "1y", label: "1 year", days: 365 },
  { value: "2y", label: "2 years", days: 365 * 2 },
  { value: "5y", label: "5 years", days: 365 * 5 }
];
const CHART_COLORS = [
  "#0d8f78",
  "#bf4f29",
  "#2956bf",
  "#7e5bef",
  "#986f0b",
  "#c93d71",
  "#2c7a7b",
  "#805ad5",
  "#c05621",
  "#276749",
  "#2b6cb0",
  "#97266d",
  "#4a5568",
  "#d69e2e",
  "#2f855a",
  "#dd6b20",
  "#3182ce",
  "#b83280",
  "#22543d",
  "#744210"
];

function App() {
  const [drugs, setDrugs] = useState([]);
  const [doses, setDoses] = useState([]);
  const [selectedDrugIds, setSelectedDrugIds] = useState([]);
  const [route, setRoute] = useState("PO");
  const [timeframe, setTimeframe] = useState("1y");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [entryDrugId, setEntryDrugId] = useState("");
  const [entryDate, setEntryDate] = useState(formatDateKey(new Date()));
  const [entryEndDate, setEntryEndDate] = useState("");
  const [entryRoute, setEntryRoute] = useState("PO");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [entryStatus, setEntryStatus] = useState("");
  const [entryError, setEntryError] = useState("");

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
        setSelectedDrugIds(
          normalizedDrugs
            .slice(0, Math.min(5, normalizedDrugs.length))
            .map((drug) => drug.id)
        );
        setEntryDrugId(String(defaultDrugId ?? ""));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown loading error");
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
      setSearchError("");
      setSearchLoading(false);
      return undefined;
    }

    const localMatches = searchCatalogLocally(drugs, term, selectedDrugIds);
    setSearchResults(localMatches);
    setSearchLoading(term.length >= 2);
    setSearchError("");

    if (term.length < 2) {
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const remoteMatches = await searchUsDrugCatalog(term);

        if (cancelled) {
          return;
        }

        setDrugs((current) => mergeDrugCatalog(current, remoteMatches));
        setSearchResults(mergeSearchResults(localMatches, remoteMatches, selectedDrugIds));
      } catch (searchFailure) {
        if (!cancelled) {
          setSearchError(
            searchFailure instanceof Error
              ? searchFailure.message
              : "Unable to search the U.S. drug catalog right now."
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

    const candidateDrugId = selectedDrugIds[0] ?? drugs[0]?.id ?? "";

    if (!entryDrugId || !drugs.some((drug) => drug.id === entryDrugId)) {
      setEntryDrugId(String(candidateDrugId));
    }
  }, [drugs, entryDrugId, selectedDrugIds]);

  const drugLookup = useMemo(() => {
    return new Map(drugs.map((drug) => [drug.id, drug]));
  }, [drugs]);

  const selectedDrugs = useMemo(() => {
    return selectedDrugIds
      .map((drugId) => drugLookup.get(drugId))
      .filter(Boolean)
      .slice(0, MAX_VISIBLE_DRUGS);
  }, [drugLookup, selectedDrugIds]);

  const range = useMemo(() => buildRange(doses, timeframe), [doses, timeframe]);
  const filteredEvents = useMemo(() => {
    return getFilteredEvents(doses, selectedDrugIds, route, range.startDate, range.endDate)
      .sort((left, right) => right.date.localeCompare(left.date));
  }, [doses, range.endDate, range.startDate, route, selectedDrugIds]);

  const chartData = useMemo(() => {
    return buildChartData(filteredEvents, selectedDrugs, range.startDate, range.endDate);
  }, [filteredEvents, range.endDate, range.startDate, selectedDrugs]);

  const summary = useMemo(() => summarizeChart(chartData, filteredEvents, selectedDrugs), [
    chartData,
    filteredEvents,
    selectedDrugs
  ]);

  function handleAddDrug(drug) {
    setDrugs((current) => mergeDrugCatalog(current, [drug]));
    setSelectedDrugIds((current) => {
      if (current.includes(drug.id)) {
        return current;
      }

      if (current.length >= MAX_VISIBLE_DRUGS) {
        return current;
      }

      return [...current, drug.id];
    });
  }

  function handleRemoveDrug(drugId) {
    setSelectedDrugIds((current) => current.filter((id) => id !== drugId));
  }

  function handleMaxDoseChange(drugId, nextValue) {
    setDrugs((current) =>
      current.map((drug) => {
        if (drug.id !== drugId) {
          return drug;
        }

        const parsed = Number(nextValue);
        return {
          ...drug,
          maxDailyDose: Number.isFinite(parsed) && parsed > 0 ? parsed : drug.maxDailyDose
        };
      })
    );
  }

  async function handleDoseEntrySubmit(event) {
    event.preventDefault();

    const amount = Number(entryAmount);
    if (!entryDrugId) {
      setEntryError("Choose a drug before logging a dose.");
      setEntryStatus("");
      return;
    }

    if (!entryDate) {
      setEntryError("Choose a dose date.");
      setEntryStatus("");
      return;
    }

    if (entryEndDate && entryEndDate < entryDate) {
      setEntryError("Dose end date must be the same as or after the start date.");
      setEntryStatus("");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setEntryError("Enter a dose amount greater than zero.");
      setEntryStatus("");
      return;
    }

    const payload = {
      drugId: coerceDrugId(entryDrugId),
      date: entryDate,
      endDate: entryEndDate || undefined,
      route: entryRoute,
      amount,
      notes: entryNotes.trim()
    };

    try {
      const created = await apiPost("/doses", payload);
      setDoses((current) => mergeDoseEvents(current, [normalizeDoseRecord(created, current.length, entryDrugId)]));
      setEntryStatus("Dose saved to the local API and added to the chart.");
    } catch (saveError) {
      console.warn("Saving dose locally because API create failed:", saveError);
      const localDose = normalizeDoseRecord(
        {
          id: `local-${entryDrugId}-${entryDate}-${entryRoute}-${amount}`,
          ...payload
        },
        doses.length,
        entryDrugId
      );
      setDoses((current) => mergeDoseEvents(current, [localDose]));
      setEntryStatus("Dose saved locally in the browser session and added to the chart.");
    }

    setSelectedDrugIds((current) => {
      if (current.includes(entryDrugId) || current.length >= MAX_VISIBLE_DRUGS) {
        return current;
      }

      return [...current, entryDrugId];
    });
    setRoute(entryRoute);
    setEntryAmount("");
    setEntryEndDate("");
    setEntryNotes("");
    setEntryError("");
  }

  const canAddMore = selectedDrugIds.length < MAX_VISIBLE_DRUGS;

  return h(
    "div",
    { className: "shell" },
    h(
      "div",
      { className: "topbar" },
      h("a", { className: "home-link", href: "../index.html" }, "Back to home"),
      h("span", { className: "badge" }, "Reactive Type")
    ),
    h(
      "section",
      { className: "hero" },
      h(
        "article",
        { className: "hero-panel" },
        h("p", { className: "badge" }, "React + Recharts"),
        h("h1", null, "Multi-drug comparison charting for U.S. medication search."),
        h(
          "p",
          null,
          "Plot up to 20 medications at once, compare each against its own ceiling, and expand the selector with official FDA-listed U.S. drug names when you need more than the bundled sample library."
        )
      ),
      h(
        "article",
        { className: "hero-panel" },
        h("p", { className: "metric-label" }, "Plotted drugs"),
        h("p", { className: "big-number" }, `${selectedDrugs.length}/${MAX_VISIBLE_DRUGS}`),
        h(
          "p",
          null,
          `${summary.activeDrugCount} selected drug(s) have data in the current ${route} view. Peak exposure across the chart is ${summary.peakPercent.toFixed(1)}%.`
        )
      )
    ),
    h(
      "section",
      { className: "layout" },
      h(
        "aside",
        { className: "panel controls selector-panel" },
        h(
          "div",
          null,
          h("h2", null, "Drug selector"),
          h(
            "p",
            null,
            "Search the bundled sample library instantly and, when available, expand into the official FDA NDC directory for broader U.S. coverage."
          )
        ),
        h(
          "div",
          { className: "field" },
          h("label", { htmlFor: "drugSearch" }, "Find a medication"),
          h("input", {
            id: "drugSearch",
            className: "search-input",
            type: "search",
            placeholder: "Search brand or generic name",
            value: searchTerm,
            onChange: (event) => setSearchTerm(event.target.value)
          })
        ),
        h(
          "p",
          { className: "helper" },
          `You can compare up to ${MAX_VISIBLE_DRUGS} drugs at once. Search official FDA-listed names online, or use the local sample library offline.`
        ),
        h(
          "div",
          { className: "results-header" },
          h("strong", null, "Search results"),
          h(
            "span",
            { className: "metric-label" },
            searchLoading ? "Searching FDA catalog..." : `${searchResults.length} shown`
          )
        ),
        h(
          "div",
          { className: "search-results" },
          searchResults.length
            ? searchResults.map((drug) =>
                h(
                  "div",
                  { className: "result-row", key: drug.id },
                  h(
                    "div",
                    { className: "result-copy" },
                    h("strong", null, drug.name),
                    h(
                      "p",
                      null,
                      buildDrugResultCaption(drug)
                    )
                  ),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "pill-button",
                      disabled: !canAddMore && !selectedDrugIds.includes(drug.id),
                      onClick: () => handleAddDrug(drug)
                    },
                    selectedDrugIds.includes(drug.id) ? "Added" : "Add"
                  )
                )
              )
            : h(
                "div",
                { className: "empty small-empty" },
                searchTerm
                  ? "No matches yet. Try a broader search term."
                  : "Start typing to search the bundled library and the FDA-backed catalog."
              )
        ),
        searchError ? h("p", { className: "helper error-text" }, searchError) : null,
        h(
          "div",
          { className: "field" },
          h("label", { htmlFor: "route" }, "Route"),
          h(
            "select",
            {
              id: "route",
              value: route,
              onChange: (event) => setRoute(event.target.value)
            },
            ROUTE_OPTIONS.map((option) => h("option", { key: option, value: option }, option))
          )
        ),
        h(
          "form",
          { className: "dose-entry-form", onSubmit: handleDoseEntrySubmit },
          h(
            "div",
            null,
            h("h2", null, "Log dose"),
            h(
              "p",
              null,
              "Add a drug-specific dose event with its own date, route, and amount so the chart updates immediately."
            )
          ),
          h(
            "div",
            { className: "field" },
            h("label", { htmlFor: "entryDrug" }, "Drug"),
            h(
              "select",
              {
                id: "entryDrug",
                value: entryDrugId,
                onChange: (event) => setEntryDrugId(event.target.value)
              },
              drugs.map((drug) => h("option", { key: drug.id, value: drug.id }, drug.name))
            )
          ),
          h(
            "div",
            { className: "entry-grid" },
            h(
              "div",
              { className: "field" },
              h("label", { htmlFor: "entryDate" }, "Dose date"),
              h("input", {
                id: "entryDate",
                type: "date",
                value: entryDate,
                onChange: (event) => setEntryDate(event.target.value)
              })
            ),
            h(
              "div",
              { className: "field" },
              h("label", { htmlFor: "entryEndDate" }, "Dose end date"),
              h("input", {
                id: "entryEndDate",
                type: "date",
                value: entryEndDate,
                min: entryDate,
                onChange: (event) => setEntryEndDate(event.target.value)
              })
            ),
            h(
              "div",
              { className: "field" },
              h("label", { htmlFor: "entryRoute" }, "Dose route"),
              h(
                "select",
                {
                  id: "entryRoute",
                  value: entryRoute,
                  onChange: (event) => setEntryRoute(event.target.value)
                },
                ROUTE_OPTIONS.map((option) => h("option", { key: option, value: option }, option))
              )
            )
          ),
          h(
            "div",
            { className: "entry-grid two-up" },
            h(
              "div",
              { className: "field" },
              h("label", { htmlFor: "entryAmount" }, "Dose amount"),
              h("input", {
                id: "entryAmount",
                type: "number",
                min: "0.1",
                step: "0.1",
                placeholder: "e.g. 25",
                value: entryAmount,
                onChange: (event) => setEntryAmount(event.target.value)
              })
            ),
            h(
              "div",
              { className: "field" },
              h("label", { htmlFor: "entryNotes" }, "Notes"),
              h("input", {
                id: "entryNotes",
                type: "text",
                placeholder: "Optional note",
                value: entryNotes,
                onChange: (event) => setEntryNotes(event.target.value)
              })
            )
          ),
          h(
            "button",
            { type: "submit", className: "primary-button" },
            "Add Dose Entry"
          ),
          entryStatus ? h("p", { className: "helper success-text" }, entryStatus) : null,
          entryError ? h("p", { className: "helper error-text" }, entryError) : null
        ),
        h(
          "div",
          { className: "field" },
          h("label", { htmlFor: "timeframe" }, "Timeframe"),
          h(
            "select",
            {
              id: "timeframe",
              value: timeframe,
              onChange: (event) => setTimeframe(event.target.value)
            },
            TIMEFRAME_OPTIONS.map((option) =>
              h("option", { key: option.value, value: option.value }, option.label)
            )
          )
        ),
        h(
          "div",
          { className: "selected-drug-list" },
          h(
            "div",
            { className: "results-header" },
            h("strong", null, "Selected drugs"),
            h(
              "span",
              { className: "metric-label" },
              `${selectedDrugs.length}/${MAX_VISIBLE_DRUGS}`
            )
          ),
          selectedDrugs.length
            ? selectedDrugs.map((drug) =>
                h(
                  "div",
                  { className: "selected-drug", key: drug.id },
                  h(
                    "div",
                    { className: "selected-drug-copy" },
                    h("strong", null, drug.name),
                    h("p", null, buildDrugResultCaption(drug))
                  ),
                  h(
                    "div",
                    { className: "selected-drug-meta" },
                    h(
                      "label",
                      { className: "small-label" },
                      "Max/day",
                      h("input", {
                        type: "number",
                        min: "0.1",
                        step: "0.1",
                        value: drug.maxDailyDose ?? "",
                        onChange: (event) => handleMaxDoseChange(drug.id, event.target.value)
                      })
                    ),
                    h(
                      "button",
                      {
                        type: "button",
                        className: "remove-button",
                        onClick: () => handleRemoveDrug(drug.id)
                      },
                      "Remove"
                    )
                  )
                )
              )
            : h("div", { className: "empty small-empty" }, "Add a few medications to start comparing lines.")
        )
      ),
      h(
        "div",
        null,
        h(
          "section",
          { className: "panel" },
          h(
            "div",
            { className: "panel-copy" },
            h("h2", null, "Comparison chart"),
            h(
              "p",
              null,
              `${formatDisplayDate(range.startDate)} through ${formatDisplayDate(range.endDate)}. ${summary.rangeNarrative}`
            )
          ),
          h(
            "div",
            { className: "metrics" },
            h(
              "article",
              { className: "metric" },
              h("span", { className: "metric-label" }, "Selected drugs"),
              h("strong", null, selectedDrugs.length)
            ),
            h(
              "article",
              { className: "metric" },
              h("span", { className: "metric-label" }, "Drugs with data"),
              h("strong", null, summary.activeDrugCount)
            ),
            h(
              "article",
              { className: "metric" },
              h("span", { className: "metric-label" }, "Peak percent"),
              h("strong", null, `${summary.peakPercent.toFixed(1)}%`)
            ),
            h(
              "article",
              { className: "metric" },
              h("span", { className: "metric-label" }, "Dose events"),
              h("strong", null, summary.eventCount)
            )
          ),
          h(
            "div",
            { className: "chart-panel tall-chart" },
            loading
              ? h("div", { className: "empty" }, "Loading chart data...")
              : error
                ? h("div", { className: "empty" }, error)
                : !selectedDrugs.length
                  ? h("div", { className: "empty" }, "Select one or more drugs to render the chart.")
                  : h(
                      ResponsiveContainer,
                      { width: "100%", height: "100%" },
                      h(
                        LineChart,
                        {
                          data: chartData,
                          margin: { top: 12, right: 18, left: 0, bottom: 12 }
                        },
                        h(CartesianGrid, {
                          stroke: "rgba(33, 49, 58, 0.12)",
                          strokeDasharray: "4 4"
                        }),
                        h(XAxis, {
                          dataKey: "label",
                          tickLine: false,
                          axisLine: false,
                          minTickGap: 24
                        }),
                        h(YAxis, {
                          tickLine: false,
                          axisLine: false,
                          width: 56,
                          domain: [0, (dataMax) => Math.max(100, Math.ceil(dataMax / 10) * 10)],
                          tickFormatter: (value) => `${value}%`
                        }),
                        h(Tooltip, {
                          content: ({ active, payload }) => renderTooltip(active, payload, drugLookup)
                        }),
                        h(Legend, {
                          verticalAlign: "top",
                          height: 36,
                          wrapperStyle: {
                            fontSize: "12px"
                          }
                        }),
                        h(ReferenceLine, {
                          y: 50,
                          stroke: "rgba(33, 49, 58, 0.18)",
                          strokeDasharray: "4 4"
                        }),
                        h(ReferenceLine, {
                          y: 80,
                          stroke: "var(--danger)",
                          strokeDasharray: "5 5"
                        }),
                        h(ReferenceLine, {
                          y: 100,
                          stroke: "rgba(191, 79, 41, 0.45)",
                          strokeDasharray: "3 3"
                        }),
                        selectedDrugs.map((drug, index) =>
                          h(Line, {
                            key: drug.id,
                            type: "monotone",
                            dataKey: getSeriesKey(drug.id),
                            name: drug.name,
                            stroke: CHART_COLORS[index % CHART_COLORS.length],
                            strokeWidth: index < 6 ? 2.4 : 1.8,
                            dot: false,
                            connectNulls: true,
                            isAnimationActive: false
                          })
                        ),
                        chartData.length > 20
                          ? h(Brush, {
                              dataKey: "label",
                              height: 28,
                              stroke: "var(--line)"
                            })
                          : null
                      )
                    )
          ),
          h(
            "div",
            { className: "insights" },
            h(
              "article",
              { className: "insight-card" },
              h("span", { className: "metric-label" }, "Range density"),
              h("strong", null, `${summary.eventCount} events`),
              h("p", null, `${summary.activeDayCount} day(s) in the range contain at least one selected-drug event.`)
            ),
            h(
              "article",
              { className: "insight-card" },
              h("span", { className: "metric-label" }, "Legend load"),
              h("strong", null, `${selectedDrugs.length} lines`),
              h("p", null, selectedDrugs.length > 12 ? "The palette is recycling colors after the 20th line budget, so trim the list if you want a cleaner view." : "You still have room to add more medications before reaching the 20-line comparison cap.")
            ),
            h(
              "article",
              { className: "insight-card insight-copy" },
              h("span", { className: "metric-label" }, "Interpretation"),
              h(
                "p",
                null,
                selectedDrugs.length
                  ? `Each line is normalized against that drug's own editable daily ceiling, which makes cross-drug comparison possible even when the units differ. Use the per-drug Max/day inputs to tune those ceilings before drawing conclusions.`
                  : "Add a few drugs from the selector to compare percent-of-max trends on the same chart."
              )
            )
          )
        ),
        h(
          "section",
          { className: "panel" },
          h("h2", null, "Visible dose events"),
          h(
            "p",
            null,
            `Showing the most recent ${Math.min(filteredEvents.length, 20)} event(s) for the selected drugs on route ${route}.`
          ),
          h(
            "div",
            { className: "table-wrap" },
            h(
              "table",
              { className: "table" },
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  h("th", null, "Date"),
                  h("th", null, "End"),
                  h("th", null, "Drug"),
                  h("th", null, "Route"),
                  h("th", null, "Dose"),
                  h("th", null, "% Max")
                )
              ),
              h(
                "tbody",
                null,
                filteredEvents.length
                  ? filteredEvents.slice(0, 20).map((event) => {
                      const drug = drugLookup.get(event.drugId);
                      const maxDose = drug?.maxDailyDose ?? 100;
                      const unit = drug?.unit ?? "mg";
                      const percent = maxDose > 0 ? (event.amount / maxDose) * 100 : 0;

                      return h(
                        "tr",
                        { key: event.id },
                        h("td", null, event.date),
                        h("td", null, event.endDate ?? "—"),
                        h("td", null, drug?.name ?? "Unknown drug"),
                        h("td", null, event.route),
                        h("td", null, `${event.amount.toFixed(1)} ${unit}`),
                        h("td", null, `${percent.toFixed(1)}%`)
                      );
                    })
                  : h(
                      "tr",
                      null,
                      h(
                        "td",
                        { colSpan: 6 },
                        "No dose events match the current route and selected drug set."
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
  if (window.location.protocol === "file:") {
    return "http://localhost:3001/api";
  }

  if (window.location.hostname === "localhost" && window.location.port === "8080") {
    return "http://localhost:3001/api";
  }

  return `${window.location.origin}/api`;
}

function normalizeDrugRecord(drug, index) {
  return {
    id: String(drug.id ?? `local-${index + 1}`),
    name: drug.name ?? drug.brandName ?? drug.genericName ?? `Drug ${index + 1}`,
    genericName: drug.genericName ?? "",
    brandName: drug.brandName ?? drug.name ?? "",
    drugClass: drug.drugClass ?? "",
    dosageForm: drug.dosageForm ?? "",
    source: drug.source ?? "Bundled sample library",
    unit: drug.unit ?? "mg",
    maxDailyDose:
      Number.isFinite(Number(drug.maxDailyDose)) && Number(drug.maxDailyDose) > 0
        ? Number(drug.maxDailyDose)
        : 100
  };
}

function normalizeDoseRecord(dose, index, defaultDrugId) {
  return {
    id: String(dose.id ?? `dose-${index + 1}`),
    drugId: String(dose.drugId ?? defaultDrugId),
    date: dose.date,
    endDate: dose.endDate || dose.date,
    route: dose.route ?? "PO",
    amount: Number(dose.amount ?? 0),
    notes: dose.notes ?? ""
  };
}

function addSeededComparisonDoses(doses, drugs) {
  const normalizedDoses = Array.isArray(doses) ? doses.slice() : [];
  const distinctDrugIds = new Set(
    normalizedDoses
      .map((dose) => dose.drugId)
      .filter((drugId) => drugId !== undefined && drugId !== null)
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
  const anchor = new Date("2024-03-30T12:00:00");
  const ratios = [0.34, 0.48, 0.62, 0.41];

  return ratios.map((ratio, eventIndex) => {
    const eventDate = new Date(anchor);
    eventDate.setDate(anchor.getDate() - (drugIndex * 3 + eventIndex * 16));

    return {
      id: `seed-${drug.id}-${eventIndex}`,
      drugId: drug.id,
      date: formatDateKey(eventDate),
      endDate: formatDateKey(eventDate),
      route: "PO",
      amount: Number((maxDose * (ratio + ((drugIndex + eventIndex) % 3) * 0.06)).toFixed(1)),
      notes: "Bundled comparison sample"
    };
  });
}

function mergeDoseEvents(current, next) {
  const seen = new Set(current.map((dose) => `${dose.drugId ?? "none"}:${dose.date}:${dose.route}:${dose.amount}`));
  const merged = current.slice();

  for (const dose of next) {
    const key = `${dose.drugId ?? "none"}:${dose.date}:${dose.route}:${dose.amount}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(dose);
  }

  return merged;
}

function buildRange(doses, timeframe) {
  const endDate = getAnchorDate(doses);
  const selected = TIMEFRAME_OPTIONS.find((option) => option.value === timeframe);
  const totalDays = selected?.days ?? 365;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (totalDays - 1));

  return { startDate, endDate, totalDays };
}

function getFilteredEvents(doses, selectedDrugIds, route, startDate, endDate) {
  const selected = new Set(selectedDrugIds.map(String));
  const startKey = formatDateKey(startDate);
  const endKey = formatDateKey(endDate);

  return doses.filter((dose) => {
    const eventEndDate = dose.endDate ?? dose.date;
    return (
      selected.has(String(dose.drugId)) &&
      dose.route === route &&
      dose.date <= endKey &&
      eventEndDate >= startKey
    );
  });
}

function buildChartData(events, selectedDrugs, startDate, endDate) {
  const byDrugAndDate = new Map();

  for (const event of events) {
    const eventStart = new Date(`${event.date}T12:00:00`);
    const eventEnd = new Date(`${(event.endDate ?? event.date)}T12:00:00`);
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
      activeCount: 0
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
      activeCount: Math.max(...bucketPoints.map((point) => point.activeCount))
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
        ...chartData.flatMap((point) =>
          selectedDrugs.map((drug) => Number(point[getSeriesKey(drug.id)] ?? 0))
        )
      )
    : 0;
  const activeDrugIds = new Set(filteredEvents.map((event) => String(event.drugId)));
  const activeDayCount = chartData.filter((point) => point.activeCount > 0).length;

  return {
    eventCount: filteredEvents.length,
    activeDrugCount: activeDrugIds.size,
    activeDayCount,
    peakPercent,
    rangeNarrative:
      activeDayCount > 0
        ? `${activeDayCount} day(s) in this range contain at least one dose event for the selected set.`
        : "No dose events land in this route and date range yet."
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
    const doses = await apiGet("/doses");
    return doses;
  } catch (error) {
    console.warn("Falling back to local dose samples:", error);
    const response = await fetch("../data/doses.json");
    if (!response.ok) {
      throw new Error("Failed to load dose data");
    }
    return response.json();
  }
}

async function loadDrugs() {
  try {
    const drugs = await apiGet("/drugs");
    return drugs;
  } catch (error) {
    console.warn("Falling back to local drug samples:", error);
    const response = await fetch("../data/drugs.json");
    if (!response.ok) {
      throw new Error("Failed to load drug data");
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
    console.warn("Falling back to direct openFDA search:", apiError);
    return searchOpenFdaDirect(query);
  }
}

async function searchOpenFdaDirect(query) {
  const token = query.trim().replace(/"/g, "");
  const search = token.includes(" ")
    ? `finished:true AND "${token}"`
    : `finished:true AND ${token}*`;
  const url = `https://api.fda.gov/drug/ndc.json?search=${encodeURIComponent(search)}&limit=20`;
  const payload = await fetchJson(url);

  return (payload.results ?? []).map((record, index) =>
    normalizeDrugRecord({
      id: `direct-${record.product_ndc ?? record.product_id ?? record.spl_id ?? index}`,
      name: record.brand_name || record.generic_name || "Unnamed FDA listing",
      genericName: record.generic_name ?? "",
      brandName: record.brand_name ?? "",
      dosageForm: record.dosage_form ?? "",
      source: "openFDA NDC"
    })
  );
}

async function apiGet(path) {
  return fetchJson(`${API_BASE_PATH}${path}`);
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE_PATH}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

function mergeDrugCatalog(current, incoming) {
  const byId = new Map(current.map((drug) => [drug.id, drug]));

  for (const drug of incoming) {
    const normalized = normalizeDrugRecord(drug, byId.size + 1);
    byId.set(normalized.id, {
      ...(byId.get(normalized.id) ?? {}),
      ...normalized
    });
  }

  return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function mergeSearchResults(localMatches, remoteMatches, selectedDrugIds) {
  return mergeDrugCatalog(localMatches, remoteMatches).filter(
    (drug) => !selectedDrugIds.includes(drug.id)
  );
}

function searchCatalogLocally(drugs, term, selectedDrugIds) {
  const query = term.trim().toLowerCase();

  return drugs
    .filter((drug) => !selectedDrugIds.includes(drug.id))
    .filter((drug) => {
      return [drug.name, drug.genericName, drug.brandName, drug.drugClass]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    })
    .slice(0, 20);
}

function buildDrugResultCaption(drug) {
  const parts = [drug.genericName, drug.drugClass, drug.dosageForm, drug.source].filter(Boolean);
  return parts.join(" · ") || "No extra metadata";
}

function renderTooltip(active, payload, drugLookup) {
  if (!active || !payload?.length) {
    return null;
  }

  const chartPoint = payload[0].payload;
  const visibleItems = payload
    .filter((item) => Number(item.value) > 0)
    .sort((left, right) => Number(right.value) - Number(left.value));

  const itemsToRender = visibleItems.length ? visibleItems : payload.slice(0, 6);

  return h(
    "div",
    { className: "tooltip-card" },
    h("strong", null, chartPoint.date === chartPoint.endDate ? chartPoint.date : `${chartPoint.date} to ${chartPoint.endDate}`),
    h(
      "div",
      { className: "tooltip-list" },
      itemsToRender.slice(0, 8).map((item) => {
        const drugId = String(item.dataKey).replace("series:", "");
        const drug = drugLookup.get(drugId);
        const totalDose = chartPoint[getDoseKey(drugId)] ?? 0;

        return h(
          "div",
          { className: "tooltip-row", key: item.dataKey },
          h("span", { className: "tooltip-swatch", style: { backgroundColor: item.color } }),
          h(
            "span",
            { className: "tooltip-name" },
            drug?.name ?? item.name
          ),
          h(
            "span",
            { className: "tooltip-value" },
            `${Number(item.value).toFixed(1)}%`,
            totalDose > 0 && drug?.unit ? ` · ${Number(totalDose).toFixed(1)} ${drug.unit}` : ""
          )
        );
      })
    ),
    visibleItems.length > 8
      ? h("p", { className: "tooltip-more" }, `+${visibleItems.length - 8} more active series`)
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
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function coerceDrugId(drugId) {
  const numeric = Number(drugId);
  return Number.isInteger(numeric) && `${numeric}` === `${drugId}` ? numeric : drugId;
}

createRoot(document.getElementById("root")).render(h(App));
