import React from "react";
import {
  View, Text, StyleSheet, ScrollView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const MOONS = [
  {
    name: "Forge",
    role: "Builder",
    icon: "zap" as const,
    colorKey: "forge" as const,
    desc: "Your main AI teammate. Talks through ideas, writes code, plans projects, and connects you to the right specialist.",
    tools: ["Chat", "Brainstorm", "Code Forge", "Site Forge"],
  },
  {
    name: "Hawk",
    role: "Watcher",
    icon: "eye" as const,
    colorKey: "hawk" as const,
    desc: "Watches your project from above. Monitors activity, answers quick questions about your code or codebase.",
    tools: ["Ask Hawk", "Monitor"],
  },
  {
    name: "Quill",
    role: "Scribe",
    icon: "edit-3" as const,
    colorKey: "quill" as const,
    desc: "Writes and refines. Documentation, summaries, emails, copy — clear and without fluff.",
    tools: ["Write", "Summarize", "Draft"],
  },
  {
    name: "Creed",
    role: "Counsel",
    icon: "shield" as const,
    colorKey: "creed" as const,
    desc: "Translates legal, policy, and terms documents into plain English. Knows what to watch out for.",
    tools: ["Legal Explainer", "Policy Review"],
  },
  {
    name: "Sage",
    role: "Teacher",
    icon: "book-open" as const,
    colorKey: "sage" as const,
    desc: "Step-by-step teacher for anything you want to learn — tech, business, or life skills. No jargon.",
    tools: ["Learn with Sage"],
  },
  {
    name: "Flint",
    role: "Fixer",
    icon: "tool" as const,
    colorKey: "flint" as const,
    desc: "Diagnoses your computer problem, gives a verdict, then walks you through fixing it step by step — or tells you honestly when you need a professional.",
    tools: ["Computer Fix", "Diagnose"],
  },
];

export default function MoonsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const styles = makeStyles(colors, insets, isWeb);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (isWeb ? 67 : 12) }]}>
        <Text style={styles.headerTitle}>Forge's Team</Text>
        <Text style={styles.headerSub}>Six specialists. One sovereign workspace.</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {MOONS.map(moon => {
          const moonColor = colors[moon.colorKey];
          return (
            <View key={moon.name} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: `${moonColor}22` }]}>
                  <Feather name={moon.icon} size={20} color={moonColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.moonName}>{moon.name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: `${moonColor}22`, borderColor: `${moonColor}44` }]}>
                      <Text style={[styles.roleText, { color: moonColor }]}>{moon.role}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={styles.desc}>{moon.desc}</Text>

              <View style={styles.toolsRow}>
                {moon.tools.map(tool => (
                  <View key={tool} style={[styles.toolChip, { borderColor: colors.border }]}>
                    <Text style={styles.toolText}>{tool}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <View style={[styles.footerNote, { marginBottom: insets.bottom + (isWeb ? 34 : 20) + 60 }]}>
          <Text style={styles.footerText}>
            More Moons are coming. Each one built for a different part of your sovereign tech life.
          </Text>
        </View>
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
      paddingHorizontal: 20, paddingBottom: 14,
    },
    headerTitle: {
      fontFamily: "Inter_700Bold", fontSize: 22, color: colors.foreground,
    },
    headerSub: {
      fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 2,
    },
    list: { padding: 16, gap: 12 },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 2,
      borderWidth: 1, borderColor: colors.border,
      padding: 16, gap: 10,
    },
    cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    iconBox: {
      width: 40, height: 40, borderRadius: 10,
      alignItems: "center", justifyContent: "center",
    },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    moonName: {
      fontFamily: "Inter_700Bold", fontSize: 16, color: colors.foreground,
    },
    roleBadge: {
      borderRadius: 20, borderWidth: 1,
      paddingHorizontal: 8, paddingVertical: 2,
    },
    roleText: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.5 },
    desc: {
      fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, lineHeight: 20,
    },
    toolsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    toolChip: {
      borderRadius: 6, borderWidth: 1,
      paddingHorizontal: 8, paddingVertical: 3,
    },
    toolText: {
      fontFamily: "Inter_500Medium", fontSize: 11, color: colors.mutedForeground,
    },
    footerNote: {
      marginTop: 4,
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      padding: 14,
    },
    footerText: {
      fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground,
      textAlign: "center", lineHeight: 18,
    },
  });
}
