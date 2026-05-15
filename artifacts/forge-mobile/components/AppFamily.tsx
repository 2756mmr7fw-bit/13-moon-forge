import React from "react";
import { View, Text, StyleSheet, Pressable, Linking, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

type AppEntry = {
  id: string;
  name: string;
  tagline: string;
  url: string;
  icon: React.ComponentProps<typeof Feather>["name"];
};

const APPS: AppEntry[] = [
  { id: "forge",        name: "13 Moon Forge",            tagline: "AI dev platform — build and self-host apps.",            url: "https://13moonforge.ai",          icon: "zap" },
  { id: "tpts",         name: "The People's Town Square", tagline: "Delete-proof social. No algorithm. Real humans only.",   url: "https://thepeoplestownsquare.ai", icon: "users" },
  { id: "film-editor",  name: "13 Moon Film Editor",      tagline: "Browser-based film editor. AI-assisted.",                url: "https://13moonforge.ai/film-editor", icon: "film" },
  { id: "ezquill",      name: "EzQuill",                  tagline: "Clean writing tool. AI-assisted. No lock-in.",           url: "https://13moonforge.ai/ezquill",  icon: "feather" },
];

export function AppFamily({ currentAppId }: { currentAppId?: string }) {
  const colors = useColors();
  const styles = makeStyles(colors);

  async function open(url: string) {
    if (Platform.OS !== "web") {
      try { await Haptics.selectionAsync(); } catch {}
    }
    Linking.openURL(url);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="grid" size={14} color={colors.primary} />
        <Text style={styles.title}>The 13 Moon Network</Text>
      </View>
      <Text style={styles.blurb}>
        Sister apps in your ecosystem. Tap any to open it on the web.
      </Text>
      <View style={styles.list}>
        {APPS.map((app) => {
          const isCurrent = app.id === currentAppId;
          return (
            <Pressable
              key={app.id}
              onPress={() => !isCurrent && open(app.url)}
              style={({ pressed }) => [
                styles.row,
                isCurrent && styles.rowCurrent,
                pressed && !isCurrent && styles.rowPressed,
              ]}
              accessibilityRole="link"
              accessibilityLabel={`Open ${app.name}`}
            >
              <View style={styles.iconBox}>
                <Feather name={app.icon} size={16} color={colors.foreground} />
              </View>
              <View style={styles.textCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{app.name}</Text>
                  {isCurrent && <Text style={styles.youAreHere}>YOU ARE HERE</Text>}
                </View>
                <Text style={styles.tagline} numberOfLines={2}>{app.tagline}</Text>
              </View>
              {!isCurrent && <Feather name="external-link" size={14} color={colors.mutedForeground} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginTop: 8,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
    title: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground },
    blurb: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginBottom: 12, lineHeight: 17 },
    list: { gap: 8 },
    row: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: colors.background,
      borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
      padding: 12,
    },
    rowCurrent: { borderColor: colors.primary, borderWidth: 2 },
    rowPressed: { opacity: 0.6 },
    iconBox: {
      width: 32, height: 32, borderRadius: 8,
      backgroundColor: colors.muted,
      alignItems: "center", justifyContent: "center",
    },
    textCol: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    name: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground },
    youAreHere: { fontFamily: "Inter_700Bold", fontSize: 9, color: colors.primary, letterSpacing: 0.5 },
    tagline: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 2, lineHeight: 15 },
  });
}
