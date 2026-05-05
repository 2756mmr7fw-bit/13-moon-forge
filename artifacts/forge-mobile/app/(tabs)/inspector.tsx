import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl, TextInput,
  Alert, Linking, Clipboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { useColors } from "@/hooks/useColors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const TOKEN_KEY = "forge:cli-token";

interface InspectorApp {
  id: string;
  name: string;
  url: string;
  username?: string;
  pages: string[];
  description?: string;
}

interface ReportSummary {
  id: string;
  appId: string;
  appName: string;
  appUrl: string;
  inspectedAt: string;
  pagesChecked: number;
  errorCount: number;
  warnCount: number;
  source: string;
  quillDoc?: string;
}

interface Finding {
  type: string;
  message: string;
  page?: string;
  detail?: string;
}

type Screen = "home" | "report" | "token-setup";

// ── Token setup screen ─────────────────────────────────────────────────────────

function TokenSetup({ onSaved }: { onSaved: (token: string) => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [token, setToken] = useState("");
  const styles = makeStyles(colors, insets, isWeb);

  const save = async () => {
    const t = token.trim();
    if (!t) return;
    await SecureStore.setItemAsync(TOKEN_KEY, t).catch(() => {});
    onSaved(t);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (isWeb ? 67 : 12) }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: "#1a2b1a" }]}>
            <Feather name="search" size={18} color="#4ade80" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Forge Inspector</Text>
            <Text style={styles.headerSub}>One-time setup needed</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connect to your Forge account</Text>
          <Text style={styles.cardDesc}>
            Your CLI token gives the mobile app access to your saved apps and inspection reports.
            Get it from the Inspector page on your computer.
          </Text>
          <TouchableOpacity
            style={[styles.outlineBtn, { marginTop: 8 }]}
            onPress={() => Linking.openURL("https://13moonforge.ai/app-inspector")}
            activeOpacity={0.8}
          >
            <Feather name="external-link" size={13} color="#4ade80" />
            <Text style={[styles.outlineBtnText, { color: "#4ade80" }]}>Get your token</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Paste your CLI token</Text>
          <TextInput
            style={styles.tokenInput}
            placeholder="forge_..."
            placeholderTextColor={colors.mutedForeground}
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          <TouchableOpacity
            style={[styles.solidBtn, !token.trim() && styles.disabledBtn]}
            onPress={save}
            disabled={!token.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.solidBtnText}>Connect</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Report detail screen ───────────────────────────────────────────────────────

function ReportDetail({
  report, onBack, colors, insets,
}: {
  report: ReportSummary;
  onBack: () => void;
  colors: ReturnType<typeof useColors>;
  insets: { top: number; bottom: number };
}) {
  const isWeb = Platform.OS === "web";
  const styles = makeStyles(colors, insets, isWeb);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuill, setShowQuill] = useState(false);
  const cliToken = useRef<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then(t => { cliToken.current = t; });
  }, []);

  useEffect(() => {
    if (!report) return;
    fetch(`${API_BASE}/api/inspector/cli-reports/${report.id}`, {
      headers: cliToken.current ? { Authorization: `Bearer ${cliToken.current}` } : {},
    })
      .then(r => r.json())
      .then(d => {
        if (d.report?.findings) setFindings(d.report.findings as Finding[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [report]);

  const getTypeIcon = (type: string) => {
    if (type === "error") return { name: "x-circle" as const, color: "#f87171" };
    if (type === "warn") return { name: "alert-triangle" as const, color: "#fbbf24" };
    if (type === "ok") return { name: "check-circle" as const, color: "#4ade80" };
    return { name: "info" as const, color: colors.mutedForeground };
  };

  const copyCliCommand = () => {
    const cmd = `node forge.js recheck`;
    Clipboard.setString(cmd);
    Haptics.selectionAsync();
    Alert.alert("Copied!", `Run on your computer:\n${cmd}`);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (isWeb ? 67 : 12) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{report.appName}</Text>
            <Text style={styles.headerSub}>
              {new Date(report.inspectedAt).toLocaleDateString()} · {report.pagesChecked} page{report.pagesChecked !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Summary pills */}
        <View style={styles.pillRow}>
          {report.errorCount > 0 && (
            <View style={[styles.pill, { backgroundColor: "#7f1d1d33", borderColor: "#f8717144" }]}>
              <Feather name="x-circle" size={11} color="#f87171" />
              <Text style={[styles.pillText, { color: "#f87171" }]}>{report.errorCount} error{report.errorCount !== 1 ? "s" : ""}</Text>
            </View>
          )}
          {report.warnCount > 0 && (
            <View style={[styles.pill, { backgroundColor: "#78350f33", borderColor: "#fbbf2444" }]}>
              <Feather name="alert-triangle" size={11} color="#fbbf24" />
              <Text style={[styles.pillText, { color: "#fbbf24" }]}>{report.warnCount} warning{report.warnCount !== 1 ? "s" : ""}</Text>
            </View>
          )}
          {report.errorCount === 0 && report.warnCount === 0 && (
            <View style={[styles.pill, { backgroundColor: "#14532d33", borderColor: "#4ade8044" }]}>
              <Feather name="check-circle" size={11} color="#4ade80" />
              <Text style={[styles.pillText, { color: "#4ade80" }]}>All clear</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quill doc toggle */}
        {report.quillDoc && (
          <TouchableOpacity
            style={[styles.card, { borderColor: "#38bdf822" }]}
            onPress={() => setShowQuill(v => !v)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Feather name="edit-3" size={15} color="#38bdf8" />
              <Text style={[styles.cardTitle, { color: "#38bdf8", flex: 1 }]}>Quill's Issue Report</Text>
              <Feather name={showQuill ? "chevron-up" : "chevron-down"} size={15} color={colors.mutedForeground} />
            </View>
            {showQuill && (
              <Text style={[styles.cardDesc, { marginTop: 10, lineHeight: 20 }]}>{report.quillDoc}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Recheck CTA */}
        {(report.errorCount > 0 || report.warnCount > 0) && (
          <TouchableOpacity
            style={[styles.card, { borderColor: colors.primary + "33" }]}
            onPress={copyCliCommand}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Feather name="refresh-cw" size={15} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.primary }]}>Ready to recheck?</Text>
                <Text style={styles.cardDesc}>After fixing the issues, run this on your computer to verify:</Text>
                <View style={styles.codeBlock}>
                  <Text style={styles.codeText}>node forge.js recheck</Text>
                  <Feather name="copy" size={12} color={colors.mutedForeground} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Findings */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={{ gap: 8 }}>
            {findings
              .filter(f => f.type !== "step")
              .map((f, i) => {
                const { name: iconName, color } = getTypeIcon(f.type);
                return (
                  <View key={i} style={[styles.findingRow, { borderColor: color + "33" }]}>
                    <Feather name={iconName} size={14} color={color} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      {f.page && (
                        <Text style={styles.findingPage}>{f.page}</Text>
                      )}
                      <Text style={styles.findingMsg}>{f.message}</Text>
                      {f.detail && (
                        <Text style={styles.findingDetail} numberOfLines={3}>{f.detail}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Main Inspector screen ─────────────────────────────────────────────────────

export default function InspectorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const styles = makeStyles(colors, insets, isWeb);

  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [apps, setApps] = useState<InspectorApp[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedReport, setSelectedReport] = useState<ReportSummary | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then(t => {
        setToken(t);
        setTokenLoading(false);
      })
      .catch(() => setTokenLoading(false));
  }, []);

  const fetchData = useCallback(async (tok: string) => {
    setLoading(true);
    try {
      const [appsRes, reportsRes] = await Promise.all([
        fetch(`${API_BASE}/api/inspector/cli-apps`, {
          headers: { Authorization: `Bearer ${tok}` },
        }),
        fetch(`${API_BASE}/api/inspector/cli-reports`, {
          headers: { Authorization: `Bearer ${tok}` },
        }),
      ]);
      const [appsData, reportsData] = await Promise.all([appsRes.json(), reportsRes.json()]);
      if (appsData.apps) setApps(appsData.apps);
      if (reportsData.reports) setReports(reportsData.reports);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchData(token);
  }, [token, fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (token) await fetchData(token);
    setRefreshing(false);
  };

  const handleTokenSaved = (tok: string) => {
    setToken(tok);
    setScreen("home");
  };

  if (tokenLoading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!token || screen === "token-setup") {
    return <TokenSetup onSaved={handleTokenSaved} />;
  }

  if (screen === "report" && selectedReport) {
    return (
      <ReportDetail
        report={selectedReport}
        onBack={() => { setScreen("home"); setSelectedReport(null); }}
        colors={colors}
        insets={insets}
      />
    );
  }

  const getLatestReport = (appId: string) =>
    reports.filter(r => r.appId === appId).sort((a, b) =>
      new Date(b.inspectedAt).getTime() - new Date(a.inspectedAt).getTime()
    )[0];

  const copyInspectCommand = (app: InspectorApp) => {
    const pages = app.pages.length ? ` --pages ${app.pages.join(",")}` : "";
    const user = app.username ? ` --username ${app.username}` : "";
    const cmd = `node forge.js inspect "${app.name}"`;
    Clipboard.setString(cmd);
    Haptics.selectionAsync();
    Alert.alert("Copied!", `Run on your computer:\n${cmd}`);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (isWeb ? 67 : 12) }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: "#0f172a" }]}>
            <Feather name="search" size={18} color="#38bdf8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Forge Inspector</Text>
            <Text style={styles.headerSub}>Browser-based app QA from your computer</Text>
          </View>
          <TouchableOpacity
            onPress={() => setScreen("token-setup")}
            style={{ padding: 6 }}
          >
            <Feather name="settings" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : apps.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="search" size={32} color={colors.mutedForeground} style={{ opacity: 0.4, marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No apps yet</Text>
            <Text style={styles.emptyDesc}>
              Add your apps at 13moonforge.ai/app-inspector, then run the CLI to start inspecting.
            </Text>
            <TouchableOpacity
              style={[styles.solidBtn, { marginTop: 16 }]}
              onPress={() => Linking.openURL("https://13moonforge.ai/app-inspector")}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.solidBtnText}>Add apps on web</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Your Apps</Text>
            {apps.map(app => {
              const latest = getLatestReport(app.id);
              const hasErrors = (latest?.errorCount ?? 0) > 0;
              const hasWarns = (latest?.warnCount ?? 0) > 0;
              const allClear = latest && !hasErrors && !hasWarns;

              return (
                <View key={app.id} style={styles.appCard}>
                  <TouchableOpacity
                    onPress={() => {
                      if (latest) { setSelectedReport(latest); setScreen("report"); }
                    }}
                    disabled={!latest}
                    activeOpacity={latest ? 0.7 : 1}
                  >
                    <View style={styles.appCardHeader}>
                      <View style={styles.appInfo}>
                        <Text style={styles.appName}>{app.name}</Text>
                        <Text style={styles.appUrl} numberOfLines={1}>{app.url}</Text>
                      </View>
                      <View style={styles.appStatusBadge}>
                        {!latest && (
                          <View style={[styles.statusDot, { backgroundColor: colors.border }]} />
                        )}
                        {hasErrors && <Feather name="x-circle" size={16} color="#f87171" />}
                        {!hasErrors && hasWarns && <Feather name="alert-triangle" size={16} color="#fbbf24" />}
                        {allClear && <Feather name="check-circle" size={16} color="#4ade80" />}
                        {latest && <Feather name="chevron-right" size={14} color={colors.mutedForeground} />}
                      </View>
                    </View>

                    {latest && (
                      <View style={styles.appLastRun}>
                        <Text style={styles.appLastRunText}>
                          Last run {new Date(latest.inspectedAt).toLocaleDateString()} · {latest.pagesChecked} pages
                        </Text>
                        {hasErrors && (
                          <Text style={[styles.appLastRunText, { color: "#f87171" }]}>
                            {latest.errorCount} error{latest.errorCount !== 1 ? "s" : ""}
                            {latest.warnCount > 0 ? `, ${latest.warnCount} warning${latest.warnCount !== 1 ? "s" : ""}` : ""}
                          </Text>
                        )}
                        {!hasErrors && hasWarns && (
                          <Text style={[styles.appLastRunText, { color: "#fbbf24" }]}>
                            {latest.warnCount} warning{latest.warnCount !== 1 ? "s" : ""}
                          </Text>
                        )}
                        {allClear && (
                          <Text style={[styles.appLastRunText, { color: "#4ade80" }]}>All clear</Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* CLI run button */}
                  <TouchableOpacity
                    style={styles.cliRunBtn}
                    onPress={() => copyInspectCommand(app)}
                    activeOpacity={0.7}
                  >
                    <Feather name="terminal" size={12} color={colors.mutedForeground} />
                    <Text style={styles.cliRunText}>Copy inspect command</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* Recent reports */}
            {reports.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Recent Reports</Text>
                {reports.slice(0, 5).map(report => (
                  <TouchableOpacity
                    key={report.id}
                    style={styles.reportRow}
                    onPress={() => { setSelectedReport(report); setScreen("report"); Haptics.selectionAsync(); }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportName}>{report.appName}</Text>
                      <Text style={styles.reportDate}>{new Date(report.inspectedAt).toLocaleString()}</Text>
                    </View>
                    <View style={styles.reportPills}>
                      {report.errorCount > 0 && (
                        <View style={[styles.miniPill, { backgroundColor: "#f8717122" }]}>
                          <Text style={[styles.miniPillText, { color: "#f87171" }]}>{report.errorCount}✗</Text>
                        </View>
                      )}
                      {report.warnCount > 0 && (
                        <View style={[styles.miniPill, { backgroundColor: "#fbbf2422" }]}>
                          <Text style={[styles.miniPillText, { color: "#fbbf24" }]}>{report.warnCount}⚠</Text>
                        </View>
                      )}
                      {report.errorCount === 0 && report.warnCount === 0 && (
                        <View style={[styles.miniPill, { backgroundColor: "#4ade8022" }]}>
                          <Text style={[styles.miniPillText, { color: "#4ade80" }]}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Run all command */}
            {apps.length > 1 && (
              <TouchableOpacity
                style={[styles.card, { borderColor: colors.primary + "22", marginTop: 16 }]}
                onPress={() => {
                  const names = apps.map(a => a.name).join(", ");
                  const cmd = `node forge.js inspect "${names}"`;
                  Clipboard.setString(cmd);
                  Haptics.selectionAsync();
                  Alert.alert("Copied!", `Paste on your computer:\n\n${cmd}\n\nForge will inspect all ${apps.length} apps in sequence.`);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <Feather name="play" size={15} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.primary }]}>Inspect all apps</Text>
                    <Text style={styles.cardDesc}>
                      Copy the command to run all {apps.length} apps in sequence. Forge will work through them one at a time.
                    </Text>
                  </View>
                  <Feather name="copy" size={13} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.card,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      paddingHorizontal: 16, paddingBottom: 12, gap: 8,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: colors.foreground },
    headerSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
    backBtn: { padding: 4, marginRight: 4 },
    pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
    pill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
    pillText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
    listContent: { padding: 16, gap: 12 },
    sectionLabel: {
      fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.8,
      color: colors.mutedForeground, textTransform: "uppercase", marginBottom: 4,
    },
    card: {
      backgroundColor: colors.card, borderRadius: colors.radius + 2,
      borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8,
    },
    cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginBottom: 2 },
    cardDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
    codeBlock: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      backgroundColor: colors.muted, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8,
    },
    codeText: { fontFamily: "Inter_500Medium", fontSize: 12, color: colors.foreground, flex: 1 },
    appCard: {
      backgroundColor: colors.card, borderRadius: colors.radius + 2,
      borderWidth: 1, borderColor: colors.border, overflow: "hidden",
    },
    appCardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
    appInfo: { flex: 1 },
    appName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.foreground },
    appUrl: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
    appStatusBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    appLastRun: {
      paddingHorizontal: 14, paddingBottom: 10,
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    appLastRunText: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground },
    cliRunBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      borderTopWidth: 1, borderTopColor: colors.border,
      paddingHorizontal: 14, paddingVertical: 9,
    },
    cliRunText: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground },
    reportRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    reportName: { fontFamily: "Inter_500Medium", fontSize: 13, color: colors.foreground },
    reportDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
    reportPills: { flexDirection: "row", gap: 4 },
    miniPill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    miniPillText: { fontFamily: "Inter_700Bold", fontSize: 10 },
    emptyState: {
      alignItems: "center", paddingTop: 40, paddingHorizontal: 24,
    },
    emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground },
    emptyDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, textAlign: "center", lineHeight: 20, marginTop: 8 },
    label: { fontFamily: "Inter_500Medium", fontSize: 12, color: colors.mutedForeground, marginBottom: 6 },
    tokenInput: {
      backgroundColor: colors.input, borderRadius: colors.radius,
      paddingHorizontal: 14, paddingVertical: 12,
      fontFamily: "Inter_400Regular", fontSize: 13, color: colors.foreground, minHeight: 60,
    },
    solidBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, backgroundColor: colors.primary,
      borderRadius: colors.radius, paddingVertical: 12, marginTop: 10,
    },
    solidBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
    disabledBtn: { opacity: 0.4 },
    outlineBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      borderRadius: colors.radius, borderWidth: 1, borderColor: "#4ade8044",
      paddingHorizontal: 12, paddingVertical: 8,
    },
    outlineBtnText: { fontFamily: "Inter_500Medium", fontSize: 12 },
    findingRow: {
      flexDirection: "row", gap: 10,
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, padding: 12,
    },
    findingPage: { fontFamily: "Inter_500Medium", fontSize: 10, color: colors.mutedForeground, marginBottom: 2 },
    findingMsg: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.foreground, lineHeight: 18 },
    findingDetail: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 4, lineHeight: 16 },
  });
}
