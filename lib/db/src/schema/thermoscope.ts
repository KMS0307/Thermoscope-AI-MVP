import { jsonb, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const thermalObservationsTable = pgTable("thermal_observations", {
  id: serial("id").primaryKey(),
  observationId: text("observation_id").notNull().unique(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  brightness: numeric("brightness").notNull(),
  frp: numeric("frp").notNull(),
  confidence: text("confidence").notNull(),
  satellite: text("satellite").notNull(),
  instrument: text("instrument").notNull(),
  dayNight: text("day_night").notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  incidentId: text("incident_id").notNull().unique(),
  observationId: text("observation_id").notNull(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  classification: text("classification").notNull(),
  confidence: numeric("confidence").notNull(),
  riskScore: numeric("risk_score").notNull(),
  riskLevel: text("risk_level").notNull(),
  persistenceLevel: text("persistence_level").notNull(),
  status: text("status").notNull(),
  explanation: text("explanation").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const persistentSourcesTable = pgTable("persistent_sources", {
  id: serial("id").primaryKey(),
  sourceId: text("source_id").notNull().unique(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  firstDetected: timestamp("first_detected", { withTimezone: true }).notNull(),
  lastDetected: timestamp("last_detected", { withTimezone: true }).notNull(),
  detectionCount: numeric("detection_count").notNull(),
  activeDays: numeric("active_days").notNull(),
  averageBrightness: numeric("average_brightness").notNull(),
  maximumBrightness: numeric("maximum_brightness").notNull(),
  persistenceScore: numeric("persistence_score").notNull(),
  riskScore: numeric("risk_score").notNull(),
  classification: text("classification").notNull(),
});

export const geospatialContextTable = pgTable("geospatial_context", {
  id: serial("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  featureType: text("feature_type").notNull(),
  featureName: text("feature_name").notNull(),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  distanceKm: numeric("distance_km").notNull(),
  source: text("source").notNull(),
});

export const classificationsTable = pgTable("classifications", {
  id: serial("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  predictedClass: text("predicted_class").notNull(),
  confidence: numeric("confidence").notNull(),
  modelVersion: text("model_version").notNull(),
  featureContributions: jsonb("feature_contributions").notNull(),
  explanation: text("explanation").notNull(),
});

export const riskScoresTable = pgTable("risk_scores", {
  id: serial("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  thermalScore: numeric("thermal_score").notNull(),
  confidenceScore: numeric("confidence_score").notNull(),
  persistenceScore: numeric("persistence_score").notNull(),
  industrialScore: numeric("industrial_score").notNull(),
  populationScore: numeric("population_score").notNull(),
  densityScore: numeric("density_score").notNull(),
  nightScore: numeric("night_score").notNull(),
  finalScore: numeric("final_score").notNull(),
  riskLevel: text("risk_level").notNull(),
});

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  alertId: text("alert_id").notNull().unique(),
  incidentId: text("incident_id").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertThermalObservationSchema = createInsertSchema(thermalObservationsTable).omit({ id: true, createdAt: true });
export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({ id: true, createdAt: true });
export type InsertThermalObservation = z.infer<typeof insertThermalObservationSchema>;
export type ThermalObservationRow = typeof thermalObservationsTable.$inferSelect;
export type IncidentRow = typeof incidentsTable.$inferSelect;