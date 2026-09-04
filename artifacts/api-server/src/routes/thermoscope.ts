import { Router, type IRouter } from "express";
import {
  AskCopilotBody,
  GenerateReportBody,
  GetAnalyticsQueryParams,
  GetAnalyticsResponse,
  GetDashboardSummaryResponse,
  GetFireParams,
  GetFireResponse,
  GetFiresQueryParams,
  GetFiresResponse,
  GetIncidentContextParams,
  GetIncidentContextResponse,
  GetIncidentHistoryParams,
  GetIncidentHistoryResponse,
  GetIncidentParams,
  GetIncidentResponse,
  GetIncidentsQueryParams,
  GetIncidentsResponse,
  GetPersistentSourcesResponse,
  GetAlertsResponse,
  SearchIncidentsQueryParams,
  SearchIncidentsResponse,
  GetSystemStatusResponse,
  UpdateAlertStatusBody,
  UpdateAlertStatusParams,
  AskCopilotResponse,
  ClassifyObservationBody,
  ClassifyObservationResponse,
  AnalyzeObservationBody,
  AnalyzeObservationResponse,
  GenerateReportResponse,
} from "@workspace/api-zod";

type Scenario =
  | "industrial"
  | "persistent"
  | "agricultural"
  | "wildfire"
  | "uncertain"
  | "background";
type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
type Classification =
  | "INDUSTRIAL_FIRE"
  | "PERSISTENT_THERMAL_SOURCE"
  | "VEGETATION_WILDFIRE"
  | "AGRICULTURAL_BURNING"
  | "OTHER_UNCERTAIN";
type AlertStatus = "NEW" | "INVESTIGATING" | "ACKNOWLEDGED" | "RESOLVED";

type Observation = {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  brightness: number;
  frp: number;
  confidence: string;
  satellite: string;
  instrument: string;
  dayNight: string;
  source: string;
  scenario: Scenario;
};

type ContextFeature = {
  featureType: string;
  featureName: string;
  distanceKm: number;
  source: string;
};

type HistoryPoint = {
  timestamp: string;
  brightness: number;
  frp: number;
  dayNight: string;
};

type Breakdown = {
  thermal: number;
  firmsConfidence: number;
  persistence: number;
  industrialProximity: number;
  populationProximity: number;
  clusterDensity: number;
  nightActivity: number;
  final: number;
};

type Contribution = {
  label: string;
  detail: string;
  positive: boolean;
};

type Incident = {
  id: string;
  observationId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  classification: Classification;
  classificationLabel: string;
  confidence: number;
  riskScore: number;
  riskLevel: RiskLevel;
  persistenceLevel: string;
  persistenceScore: number;
  status: string;
  locationName: string;
  scenario: string;
};

const router: IRouter = Router();
const BASE_DATE = Date.UTC(2026, 8, 4, 10, 0, 0);
const MODEL_VERSION = "Prototype v1";

const scenarioNames: Record<Scenario, string> = {
  industrial: "Jamnagar Refinery Corridor",
  persistent: "Navi Mumbai Industrial Belt",
  agricultural: "Warangal Agricultural Fringe",
  wildfire: "Aravalli Forest Edge",
  uncertain: "New Delhi Periphery",
  background: "India observation grid",
};

const classificationLabels: Record<Classification, string> = {
  INDUSTRIAL_FIRE: "Likely Industrial Fire",
  PERSISTENT_THERMAL_SOURCE: "Persistent Thermal Source",
  VEGETATION_WILDFIRE: "Vegetation / Wildfire",
  AGRICULTURAL_BURNING: "Agricultural Burning",
  OTHER_UNCERTAIN: "Other / Uncertain",
};

const scenarioAnchors: Record<Exclude<Scenario, "background">, [number, number]> = {
  industrial: [22.307, 70.802],
  persistent: [19.076, 73.011],
  agricultural: [17.998, 79.603],
  wildfire: [23.614, 73.42],
  uncertain: [28.615, 77.208],
};

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function isoHoursAgo(hours: number) {
  return new Date(BASE_DATE - hours * 60 * 60 * 1000).toISOString();
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function addObservation(
  list: Observation[],
  id: number,
  scenario: Scenario,
  latitude: number,
  longitude: number,
  hoursAgo: number,
  brightness: number,
  frp: number,
  confidence: string,
  dayNight: string,
) {
  list.push({
    id: `FIRMS-${String(id).padStart(3, "0")}`,
    latitude: round(latitude, 5),
    longitude: round(longitude, 5),
    timestamp: isoHoursAgo(hoursAgo),
    brightness: round(brightness, 1),
    frp: round(frp, 1),
    confidence,
    satellite: id % 3 === 0 ? "NOAA-20" : id % 3 === 1 ? "Suomi NPP" : "NOAA-21",
    instrument: "VIIRS",
    dayNight,
    source: "NASA FIRMS",
    scenario,
  });
}

function buildObservations() {
  const data: Observation[] = [];
  let id = 1;
  const [industrialLat, industrialLon] = scenarioAnchors.industrial;
  for (let i = 0; i < 9; i += 1) {
    addObservation(
      data,
      id++,
      "industrial",
      industrialLat + (i % 3) * 0.002 - 0.002,
      industrialLon + (i % 4) * 0.0015 - 0.0015,
      5 + i * 14,
      392 + (i % 4) * 9,
      71 + (i % 3) * 14,
      "high",
      i % 4 === 0 ? "D" : "N",
    );
  }
  const [persistentLat, persistentLon] = scenarioAnchors.persistent;
  for (let i = 0; i < 14; i += 1) {
    addObservation(
      data,
      id++,
      "persistent",
      persistentLat + Math.sin(i) * 0.0017,
      persistentLon + Math.cos(i) * 0.0016,
      12 + i * 10,
      348 + (i % 5) * 6,
      34 + (i % 4) * 4,
      i % 5 === 0 ? "nominal" : "high",
      i % 3 === 0 ? "D" : "N",
    );
  }
  const [agriLat, agriLon] = scenarioAnchors.agricultural;
  for (let i = 0; i < 7; i += 1) {
    addObservation(
      data,
      id++,
      "agricultural",
      agriLat + i * 0.006,
      agriLon + i * 0.004,
      8 + i * 3,
      317 + (i % 3) * 8,
      18 + (i % 2) * 7,
      "nominal",
      i % 2 === 0 ? "D" : "N",
    );
  }
  const [wildfireLat, wildfireLon] = scenarioAnchors.wildfire;
  for (let i = 0; i < 13; i += 1) {
    addObservation(
      data,
      id++,
      "wildfire",
      wildfireLat + Math.sin(i * 1.4) * 0.018 + i * 0.0012,
      wildfireLon + Math.cos(i * 1.1) * 0.02,
      9 + i * 7,
      332 + (i % 6) * 7,
      29 + (i % 5) * 8,
      i % 4 === 0 ? "nominal" : "high",
      i % 4 === 0 ? "D" : "N",
    );
  }
  const [uncertainLat, uncertainLon] = scenarioAnchors.uncertain;
  addObservation(data, id++, "uncertain", uncertainLat, uncertainLon, 2, 304, 7, "low", "D");

  const random = seeded(162);
  const regions: Array<[number, number]> = [
    [21.15, 79.09],
    [25.59, 85.14],
    [12.97, 77.59],
    [30.73, 76.78],
    [15.49, 73.82],
    [26.91, 75.79],
    [11.02, 76.96],
    [22.57, 88.36],
  ];
  for (let i = 0; i < 170; i += 1) {
    const [lat, lon] = regions[i % regions.length];
    const confidence = random() > 0.72 ? "nominal" : random() > 0.09 ? "high" : "low";
    addObservation(
      data,
      id++,
      "background",
      lat + (random() - 0.5) * 0.52,
      lon + (random() - 0.5) * 0.58,
      3 + Math.floor(random() * 164),
      302 + random() * 58,
      7 + random() * 27,
      confidence,
      random() > 0.57 ? "D" : "N",
    );
  }
  return data;
}

const observations = buildObservations();

const statusByAlert = new Map<string, AlertStatus>([
  ["ALT-001", "NEW"],
  ["ALT-002", "INVESTIGATING"],
  ["ALT-003", "ACKNOWLEDGED"],
]);

function confidenceScore(confidence: string) {
  return confidence === "high" ? 94 : confidence === "nominal" ? 68 : 31;
}

function getContext(scenario: Scenario): ContextFeature[] {
  const shared: ContextFeature[] = [
    { featureType: "road", featureName: "Major road", distanceKm: 0.3, source: "OSM DEMO" },
    { featureType: "settlement", featureName: "Residential area", distanceKm: 1.2, source: "OSM DEMO" },
  ];
  if (scenario === "industrial" || scenario === "persistent") {
    return [
      { featureType: "factory", featureName: "Factory", distanceKm: scenario === "industrial" ? 0.4 : 0.7, source: "OSM DEMO" },
      { featureType: "power", featureName: "Power plant", distanceKm: scenario === "industrial" ? 0.8 : 1.1, source: "OSM DEMO" },
      ...shared,
      { featureType: "forest", featureName: "Forest", distanceKm: 4.1, source: "OSM DEMO" },
    ];
  }
  if (scenario === "agricultural") {
    return [
      { featureType: "agriculture", featureName: "Agricultural area", distanceKm: 0.2, source: "OSM DEMO" },
      ...shared.map((feature) => ({ ...feature, distanceKm: feature.distanceKm + 0.9 })),
      { featureType: "factory", featureName: "Factory", distanceKm: 8.6, source: "OSM DEMO" },
    ];
  }
  if (scenario === "wildfire") {
    return [
      { featureType: "forest", featureName: "Forest / vegetation", distanceKm: 0.1, source: "OSM DEMO" },
      { featureType: "settlement", featureName: "Settlement", distanceKm: 3.8, source: "OSM DEMO" },
      { featureType: "road", featureName: "Major road", distanceKm: 1.6, source: "OSM DEMO" },
      { featureType: "water", featureName: "Water body", distanceKm: 5.2, source: "OSM DEMO" },
    ];
  }
  return [
    { featureType: "settlement", featureName: "Residential area", distanceKm: 2.8, source: "OSM DEMO" },
    { featureType: "road", featureName: "Major road", distanceKm: 1.4, source: "OSM DEMO" },
    { featureType: "forest", featureName: "Forest", distanceKm: 10.4, source: "OSM DEMO" },
  ];
}

function getClusterObservations(observation: Observation) {
  if (observation.scenario === "wildfire") {
    return observations.filter((item) => item.scenario === "wildfire");
  }
  if (observation.scenario === "background") {
    return [observation];
  }
  return observations.filter((item) => item.scenario === observation.scenario);
}

function getClassification(observation: Observation): {
  classification: Classification;
  label: string;
  confidence: number;
} {
  if (observation.scenario === "industrial") {
    return { classification: "INDUSTRIAL_FIRE", label: classificationLabels.INDUSTRIAL_FIRE, confidence: 92 };
  }
  if (observation.scenario === "persistent") {
    return { classification: "PERSISTENT_THERMAL_SOURCE", label: classificationLabels.PERSISTENT_THERMAL_SOURCE, confidence: 87 };
  }
  if (observation.scenario === "agricultural") {
    return { classification: "AGRICULTURAL_BURNING", label: classificationLabels.AGRICULTURAL_BURNING, confidence: 79 };
  }
  if (observation.scenario === "wildfire") {
    return { classification: "VEGETATION_WILDFIRE", label: classificationLabels.VEGETATION_WILDFIRE, confidence: 84 };
  }
  return { classification: "OTHER_UNCERTAIN", label: classificationLabels.OTHER_UNCERTAIN, confidence: 42 };
}

function getPersistence(observation: Observation) {
  const cluster = getClusterObservations(observation);
  const activeDays = new Set(cluster.map((item) => item.timestamp.slice(0, 10))).size;
  const score = clamp(
    Math.round((activeDays / 7) * 72 + Math.min(cluster.length, 14) * 1.4),
  );
  const level = score >= 75 ? "CRITICAL" : score >= 52 ? "HIGH" : score >= 27 ? "MEDIUM" : "LOW";
  return {
    cluster,
    activeDays,
    score,
    level,
    first: cluster.reduce((a, b) => (a.timestamp < b.timestamp ? a : b)),
    last: cluster.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)),
  };
}

function calculateBreakdown(observation: Observation): Breakdown {
  const context = getContext(observation.scenario);
  const persistence = getPersistence(observation);
  const factory = context.find((feature) => feature.featureType === "factory");
  const settlement = context.find((feature) => feature.featureType === "settlement");
  const thermal = clamp(Math.round(((observation.brightness - 295) / 115) * 100));
  const industrialProximity = factory
    ? clamp(Math.round(100 - factory.distanceKm * 14))
    : 10;
  const populationProximity = settlement
    ? clamp(Math.round(100 - settlement.distanceKm * 20))
    : 10;
  const clusterDensity = clamp(Math.round(persistence.cluster.length * 5.7));
  const nightActivity =
    persistence.cluster.filter((item) => item.dayNight === "N").length /
    persistence.cluster.length *
    100;
  const final = Math.round(
    0.25 * thermal +
      0.15 * confidenceScore(observation.confidence) +
      0.25 * persistence.score +
      0.15 * industrialProximity +
      0.1 * populationProximity +
      0.05 * clusterDensity +
      0.05 * nightActivity,
  );
  return {
    thermal,
    firmsConfidence: confidenceScore(observation.confidence),
    persistence: persistence.score,
    industrialProximity,
    populationProximity,
    clusterDensity,
    nightActivity: Math.round(nightActivity),
    final: clamp(final),
  };
}

function riskLevel(score: number): RiskLevel {
  return score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "MODERATE" : "LOW";
}

function getIncident(observation: Observation): Incident {
  const classification = getClassification(observation);
  const persistence = getPersistence(observation);
  const breakdown = calculateBreakdown(observation);
  return {
    id: `TH-${observation.id.replace("FIRMS-", "")}`,
    observationId: observation.id,
    latitude: observation.latitude,
    longitude: observation.longitude,
    timestamp: observation.timestamp,
    classification: classification.classification,
    classificationLabel: classification.label,
    confidence: classification.confidence,
    riskScore: breakdown.final,
    riskLevel: riskLevel(breakdown.final),
    persistenceLevel: persistence.level,
    persistenceScore: persistence.score,
    status: breakdown.final >= 75 ? "REQUIRES HUMAN VERIFICATION" : "MONITORING",
    locationName: scenarioNames[observation.scenario],
    scenario: observation.scenario,
  };
}

function getIncidentDetail(incidentId: string) {
  const observation = observations.find(
    (item) => getIncident(item).id === incidentId || item.id === incidentId,
  );
  if (!observation) return undefined;
  const incident = getIncident(observation);
  const context = getContext(observation.scenario);
  const persistence = getPersistence(observation);
  const breakdown = calculateBreakdown(observation);
  const classification = getClassification(observation);
  const contributions: Contribution[] = [
    {
      label: "Thermal intensity",
      detail: `${observation.brightness.toFixed(1)} K brightness / ${observation.frp.toFixed(1)} MW FRP`,
      positive: observation.brightness > 350,
    },
    {
      label: "FIRMS confidence",
      detail: `${observation.confidence} confidence from VIIRS`,
      positive: observation.confidence !== "low",
    },
    {
      label: "Repeated observations",
      detail: `${persistence.cluster.length} detections across ${persistence.activeDays} active days`,
      positive: persistence.cluster.length > 1,
    },
    {
      label: "Industrial facility nearby",
      detail: context.find((item) => item.featureType === "factory")
        ? `${context.find((item) => item.featureType === "factory")?.distanceKm.toFixed(1)} km to nearest factory`
        : "No industrial facility within the local context window",
      positive: Boolean(context.find((item) => item.featureType === "factory" && item.distanceKm < 2)),
    },
    {
      label: "Night-time activity",
      detail: `${Math.round(breakdown.nightActivity)}% of cluster detections at night`,
      positive: breakdown.nightActivity > 45,
    },
  ];
  let explanation = `This anomaly is classified as ${classification.label.toLowerCase()} because it shows ${observation.brightness > 350 ? "high thermal intensity" : "moderate thermal intensity"} and ${observation.confidence} FIRMS confidence.`;
  if (persistence.cluster.length > 1) {
    explanation += ` It has repeated detections across ${persistence.activeDays} active days.`;
  }
  if (context.find((item) => item.featureType === "factory" && item.distanceKm < 2)) {
    explanation += " A nearby industrial facility increases the industrial likelihood.";
  }
  if (breakdown.nightActivity > 45) {
    explanation += " Night-time activity adds to the operational concern.";
  }
  return {
    ...incident,
    observation,
    explanation,
    contributions,
    breakdown,
    context,
    history: persistence.cluster
      .slice()
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((item): HistoryPoint => ({
        timestamp: item.timestamp,
        brightness: item.brightness,
        frp: item.frp,
        dayNight: item.dayNight,
      })),
    modelVersion: MODEL_VERSION,
  };
}

function getAllIncidents() {
  return observations.map(getIncident).sort((a, b) => b.riskScore - a.riskScore);
}

function buildAlerts() {
  return getAllIncidents()
    .filter((incident) => incident.riskScore >= 50)
    .slice(0, 12)
    .map((incident, index) => ({
      id: `ALT-${String(index + 1).padStart(3, "0")}`,
      incidentId: incident.id,
      createdAt: incident.timestamp,
      locationName: incident.locationName,
      classificationLabel: incident.classificationLabel,
      confidence: incident.confidence,
      riskScore: incident.riskScore,
      riskLevel: incident.riskLevel,
      persistenceLevel: incident.persistenceLevel,
      severity: incident.riskLevel,
      title: `${incident.riskLevel} thermal anomaly detected`,
      message: `${incident.classificationLabel} near ${incident.locationName}. Requires human verification.`,
      status: statusByAlert.get(`ALT-${String(index + 1).padStart(3, "0")}`) ?? "NEW",
    }));
}

function ensureString(value: unknown) {
  return typeof value === "string" ? value : "";
}

router.get("/dashboard/summary", (_req, res) => {
  const incidents = getAllIncidents();
  const data = {
    activeAnomalies: observations.length,
    likelyIndustrialFires: incidents.filter((item) => item.classification === "INDUSTRIAL_FIRE").length,
    persistentSources: new Set(
      observations
        .filter((item) => ["industrial", "persistent"].includes(item.scenario))
        .map((item) => item.scenario),
    ).size,
    criticalIncidents: incidents.filter((item) => item.riskLevel === "CRITICAL").length,
    highIncidents: incidents.filter((item) => item.riskLevel === "HIGH").length,
    newAlerts: buildAlerts().filter((alert) => alert.status === "NEW").length,
    avgRiskScore: round(incidents.reduce((sum, item) => sum + item.riskScore, 0) / incidents.length, 1),
    lastUpdate: new Date(BASE_DATE).toISOString(),
    incidents: incidents.slice(0, 6),
  };
  res.json(GetDashboardSummaryResponse.parse(data));
});

router.get("/fires", (req, res) => {
  const query = GetFiresQueryParams.parse(req.query);
  const filtered = observations.filter((observation) => {
    if (query.confidence && observation.confidence !== query.confidence) return false;
    if (query.satellite && observation.satellite !== query.satellite) return false;
    if (query.dayNight && observation.dayNight !== query.dayNight) return false;
    if (query.date && !observation.timestamp.startsWith(query.date)) return false;
    return true;
  });
  res.json(GetFiresResponse.parse(filtered));
});

router.get("/fires/:id", (req, res) => {
  const params = GetFireParams.parse(req.params);
  const observation = observations.find((item) => item.id === params.id);
  if (!observation) {
    res.status(404).json({ error: "Thermal observation not found" });
    return;
  }
  res.json(GetFireResponse.parse(observation));
});

router.get("/incidents", (req, res) => {
  const query = GetIncidentsQueryParams.parse(req.query);
  const data = getAllIncidents().filter((incident) => {
    if (query.riskLevel && incident.riskLevel !== query.riskLevel) return false;
    if (query.classification && !incident.classification.toLowerCase().includes(query.classification.toLowerCase()) && !incident.classificationLabel.toLowerCase().includes(query.classification.toLowerCase())) return false;
    return true;
  });
  res.json(GetIncidentsResponse.parse(data));
});

router.get("/incidents/:id", (req, res) => {
  const params = GetIncidentParams.parse(req.params);
  const detail = getIncidentDetail(params.id);
  if (!detail) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json(GetIncidentResponse.parse(detail));
});

router.get("/incidents/:id/context", (req, res) => {
  const params = GetIncidentContextParams.parse(req.params);
  const detail = getIncidentDetail(params.id);
  if (!detail) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json(GetIncidentContextResponse.parse(detail.context));
});

router.get("/incidents/:id/history", (req, res) => {
  const params = GetIncidentHistoryParams.parse(req.params);
  const detail = getIncidentDetail(params.id);
  if (!detail) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json(GetIncidentHistoryResponse.parse(detail.history));
});

router.get("/persistent-sources", (_req, res) => {
  const data = (["industrial", "persistent"] as Scenario[]).map((scenario, index) => {
    const cluster = observations.filter((item) => item.scenario === scenario);
    const first = cluster.reduce((a, b) => (a.timestamp < b.timestamp ? a : b));
    const last = cluster.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
    const persistence = getPersistence(first);
    const incident = getIncident(last);
    return {
      id: `SRC-${String(index + 1).padStart(3, "0")}`,
      latitude: first.latitude,
      longitude: first.longitude,
      locationName: scenarioNames[scenario],
      firstDetected: first.timestamp,
      lastDetected: last.timestamp,
      detectionCount: cluster.length,
      activeDays: persistence.activeDays,
      averageBrightness: round(cluster.reduce((sum, item) => sum + item.brightness, 0) / cluster.length, 1),
      maximumBrightness: Math.max(...cluster.map((item) => item.brightness)),
      persistenceScore: persistence.score,
      riskScore: incident.riskScore,
      classification: incident.classification,
      classificationLabel: incident.classificationLabel,
    };
  });
  res.json(GetPersistentSourcesResponse.parse(data));
});

router.get("/alerts", (_req, res) => {
  res.json(GetAlertsResponse.parse(buildAlerts()));
});

router.patch("/alerts/:id", (req, res) => {
  const params = UpdateAlertStatusParams.parse(req.params);
  const body = UpdateAlertStatusBody.parse(req.body);
  const alerts = buildAlerts();
  const alert = alerts.find((item) => item.id === params.id);
  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  statusByAlert.set(alert.id, body.status as AlertStatus);
  res.json(GetAlertsResponse.element.parse({ ...alert, status: body.status }));
});

router.get("/analytics", (req, res) => {
  const query = GetAnalyticsQueryParams.parse(req.query);
  const days = query.range === "24h" ? 1 : query.range === "30d" ? 10 : 7;
  const trend = Array.from({ length: days }, (_, index) => {
    const date = new Date(BASE_DATE - (days - index - 1) * 24 * 60 * 60 * 1000);
    const day = date.toISOString().slice(0, 10);
    const dayObservations = observations.filter((item) => item.timestamp.startsWith(day));
    return {
      date: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      anomalies: dayObservations.length,
      industrial: dayObservations.filter((item) => item.scenario === "industrial").length,
      persistent: dayObservations.filter((item) => item.scenario === "persistent").length,
      wildfire: dayObservations.filter((item) => item.scenario === "wildfire").length,
      agricultural: dayObservations.filter((item) => item.scenario === "agricultural").length,
    };
  });
  const incidents = getAllIncidents();
  const distribution = (["CRITICAL", "HIGH", "MODERATE", "LOW"] as RiskLevel[]).map((name) => ({
    name,
    value: incidents.filter((item) => item.riskLevel === name).length,
  }));
  const dayNight = ["D", "N"].map((name) => ({
    name: name === "D" ? "Day" : "Night",
    value: observations.filter((item) => item.dayNight === name).length,
  }));
  const satellite = ["Suomi NPP", "NOAA-20", "NOAA-21"].map((name) => ({
    name,
    value: observations.filter((item) => item.satellite === name).length,
  }));
  res.json(
    GetAnalyticsResponse.parse({
      range: query.range ?? "7d",
      trend,
      riskDistribution: distribution,
      dayNight,
      satellite,
    }),
  );
});

router.get("/system-status", (_req, res) => {
  res.json(
    GetSystemStatusResponse.parse({
      firms: "DEMO",
      osm: "DEMO",
      classification: "OPERATIONAL",
      persistence: "OPERATIONAL",
      risk: "OPERATIONAL",
      database: "CONNECTED",
      dataMode: "DEMO",
      modelVersion: MODEL_VERSION,
      lastUpdate: new Date(BASE_DATE).toISOString(),
    }),
  );
});

router.get("/search", (req, res) => {
  const query = SearchIncidentsQueryParams.parse(req.query);
  const needle = query.q.toLowerCase();
  const incidentResults = getAllIncidents()
    .filter((incident) =>
      [incident.id, incident.locationName, incident.classificationLabel, incident.latitude.toFixed(3), incident.longitude.toFixed(3)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    )
    .slice(0, 8)
    .map((incident) => ({
      id: incident.id,
      type: "incident",
      title: incident.id,
      subtitle: `${incident.classificationLabel} · ${incident.locationName}`,
      riskLevel: incident.riskLevel,
    }));
  res.json(SearchIncidentsResponse.parse(incidentResults));
});

router.post("/copilot", (req, res) => {
  const body = AskCopilotBody.parse(req.body);
  const question = body.question.toLowerCase();
  const allIncidents = getAllIncidents();
  const selected = body.incidentId ? getIncidentDetail(body.incidentId) : undefined;
  let answer = "I don't have enough information in the current dataset.";
  let evidence: string[] = [];
  let relatedIncidentIds: string[] = [];

  if (selected && (question.includes("why") || question.includes("risk"))) {
    answer = `${selected.id} is ${selected.riskLevel.toLowerCase()} risk at ${selected.breakdown.final}/100. ${selected.explanation}`;
    evidence = selected.contributions.filter((item) => item.positive).map((item) => `${item.label}: ${item.detail}`);
    relatedIncidentIds = [selected.id];
  } else if (question.includes("highest") || question.includes("industrial")) {
    const industrial = allIncidents.filter((item) => item.classification === "INDUSTRIAL_FIRE").slice(0, 5);
    answer = industrial.length
      ? `The highest-risk likely industrial fire is ${industrial[0].id} at ${industrial[0].locationName}, scored ${industrial[0].riskScore}/100 (${industrial[0].riskLevel}).`
      : "No likely industrial fires are present in the current dataset.";
    evidence = industrial.map((item) => `${item.id} · ${item.riskScore}/100 · ${item.locationName}`);
    relatedIncidentIds = industrial.map((item) => item.id);
  } else if (question.includes("persistent") || question.includes("more than 3")) {
    const sources = getAllIncidents().filter((item) => item.persistenceLevel === "HIGH" || item.persistenceLevel === "CRITICAL");
    answer = `${sources.length} analyzed incidents are linked to high or critical persistence. The strongest signal is ${sources[0]?.id ?? "not available"}.`;
    evidence = sources.slice(0, 5).map((item) => `${item.id} · ${item.persistenceScore}% persistence · ${item.locationName}`);
    relatedIncidentIds = sources.slice(0, 5).map((item) => item.id);
  } else if (question.includes("today") || question.includes("summarize")) {
    const recent = observations.filter((item) => item.timestamp >= isoHoursAgo(24));
    answer = `The current demo window contains ${recent.length} thermal anomalies in the last 24 hours, including ${recent.filter((item) => item.scenario === "industrial").length} industrial scenario signals and ${recent.filter((item) => item.scenario === "wildfire").length} vegetation/wildfire signals.`;
    evidence = [`${recent.length} observations in the last 24 hours`, `${recent.filter((item) => item.dayNight === "N").length} night-time observations`, `${recent.filter((item) => item.confidence === "high").length} high-confidence observations`];
  }
  res.json(AskCopilotResponse.parse({ answer, evidence, relatedIncidentIds }));
});

router.post("/classify", (req, res) => {
  const body = ClassifyObservationBody.parse(req.body);
  const observation = observations.find((item) => item.id === body.observationId);
  if (!observation) {
    res.status(404).json({ error: "Thermal observation not found" });
    return;
  }
  const detail = getIncidentDetail(getIncident(observation).id);
  if (!detail) {
    res.status(404).json({ error: "Classification could not be created" });
    return;
  }
  res.json(
    ClassifyObservationResponse.parse({
      classification: detail.classification,
      classificationLabel: detail.classificationLabel,
      confidence: detail.confidence,
      modelVersion: detail.modelVersion,
      featureContributions: detail.contributions,
    }),
  );
});

router.post("/analyze", (req, res) => {
  const body = AnalyzeObservationBody.parse(req.body);
  const observation = observations.find((item) => item.id === body.observationId);
  if (!observation) {
    res.status(404).json({ error: "Thermal observation not found" });
    return;
  }
  const detail = getIncidentDetail(getIncident(observation).id);
  if (!detail) {
    res.status(404).json({ error: "Analysis could not be created" });
    return;
  }
  res.json(AnalyzeObservationResponse.parse(detail));
});

router.post("/reports", (req, res) => {
  const body = GenerateReportBody.parse(req.body);
  const incident = getIncidentDetail(body.incidentId);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json(
    GenerateReportResponse.parse({
      title: `Thermoscope Incident Report · ${incident.id}`,
      generatedAt: new Date(BASE_DATE).toISOString(),
      incident,
    }),
  );
});

export default router;