import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const domainsTable = pgTable("domains", {
  id:               serial("id").primaryKey(),
  userId:           text("user_id").notNull(),
  domain:           text("domain").notNull(),
  registrar:        text("registrar"),
  expiresAt:        timestamp("expires_at"),
  connectedAppId:   text("connected_app_id"),
  connectedAppName: text("connected_app_name"),
  connectedAppUrl:  text("connected_app_url"),
  dnsStatus:        text("dns_status").notNull().default("unknown"),
  sslStatus:        text("ssl_status").notNull().default("unknown"),
  resolvedIp:       text("resolved_ip"),
  expectedIp:       text("expected_ip"),
  notes:            text("notes"),
  lastCheckedAt:    timestamp("last_checked_at"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("domains_user_id_idx").on(t.userId),
]);
