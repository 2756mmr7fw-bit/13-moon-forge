import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const APP_URL = "https://13moonforge.ai";
const TOWNSQ_URL = "https://thepeoplestownsq.com";

const PLANS = [
  { label: "Free", price: "$0", msgs: "10 messages", note: "No card required" },
  { label: "Forge Basic", price: "$7/mo", msgs: "150 messages", note: "Most popular" },
  { label: "Forge Pro", price: "$17/mo", msgs: "500 messages", note: "Power builders" },
  { label: "Forge Host", price: "$5/mo", msgs: "Self-host only", note: "No AI included" },
];

const LINKS = [
  { label: "Manage subscription", icon: "credit-card" as const, url: TOWNSQ_URL },
  { label: "Full desktop app", icon: "monitor" as const, url: APP_URL },
  { label: "Computer Fix ($19)", icon: "tool" as const, url: `${APP_URL}/fix` },
  { label: "Site Forge", icon: "globe" as const, url: `${APP_URL}/site-forge` },
  { label: "Download installers", icon: "download" as const, url: `${APP_URL}/download` },
  { label: "The People's Town Square", icon: "users" as const, url: TOWNSQ_URL },
];

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const styles = makeStyles(colors, insets, isWeb);

  function openLink(url: string) {
    Haptics.selectionAsync();
    Linking.openURL(url);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (isWeb ? 67 : 12) }]}>
        <Text style={styles.headerTitle}>Account</Text>
        <Text style={styles.headerSub}>Subscriptions are managed on thepeoplestownsq.com</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Subscription plans */}
        <Text style={styles.sectionLabel}>Plans</Text>
        {PLANS.map(plan => (
          <View key={plan.label} style={styles.planCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>{plan.label}</Text>
              <Text style={styles.planMsgs}>{plan.msgs}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.planPrice}>{plan.price}</Text>
              <Text style={styles.planNote}>{plan.note}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.subscribeBtn}
          onPress={() => openLink(TOWNSQ_URL)}
          activeOpacity={0.8}
        >
          <Feather name="external-link" size={14} color="#fff" />
          <Text style={styles.subscribeBtnText}>Subscribe at thepeoplestownsq.com</Text>
        </TouchableOpacity>

        <View style={styles.appleNote}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <Text style={styles.appleNoteText}>
            Subscriptions are handled outside the app store — you keep 100% of the value, no platform tax.
            Log in with the same account and your plan unlocks automatically.
          </Text>
        </View>

        {/* Links */}
        <Text style={styles.sectionLabel}>Open in browser</Text>
        <View style={styles.linkGroup}>
          {LINKS.map(link => (
            <TouchableOpacity
              key={link.label}
              style={styles.linkRow}
              onPress={() => openLink(link.url)}
              activeOpacity={0.7}
            >
              <Feather name={link.icon} size={16} color={colors.mutedForeground} />
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Feather name="chevron-right" size={14} color={colors.border} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sovereignty note */}
        <View style={[styles.sovereignBox, { marginBottom: insets.bottom + (isWeb ? 34 : 20) + 70 }]}>
          <Text style={styles.sovereignTitle}>Why no in-app payment?</Text>
          <Text style={styles.sovereignText}>
            Apple and Google charge 15–30% on every subscription processed through their systems.
            We route billing through The People's Town Square so every dollar you pay goes toward
            building better tools — not platform taxes. Your login carries your subscription across
            every 13 Moon Forge device automatically.
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
      backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
      paddingHorizontal: 20, paddingBottom: 14,
    },
    headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: colors.foreground },
    headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    scroll: { padding: 16, gap: 8 },
    sectionLabel: {
      fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1,
      color: colors.mutedForeground, marginTop: 8, marginBottom: 4, textTransform: "uppercase",
    },
    planCard: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    planName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground },
    planMsgs: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
    planPrice: { fontFamily: "Inter_700Bold", fontSize: 15, color: colors.primary },
    planNote: { fontFamily: "Inter_400Regular", fontSize: 10, color: colors.mutedForeground, marginTop: 1 },
    subscribeBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.primary, borderRadius: colors.radius, padding: 14, marginTop: 4,
    },
    subscribeBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
    appleNote: {
      flexDirection: "row", gap: 8, alignItems: "flex-start",
      backgroundColor: colors.muted, borderRadius: colors.radius,
      padding: 12, marginTop: 4,
    },
    appleNoteText: {
      fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground,
      lineHeight: 18, flex: 1,
    },
    linkGroup: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border, overflow: "hidden",
    },
    linkRow: {
      flexDirection: "row", alignItems: "center", gap: 12,
      paddingHorizontal: 14, paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    linkLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground },
    sovereignBox: {
      marginTop: 12,
      backgroundColor: "#1c1208",
      borderRadius: colors.radius, borderWidth: 1, borderColor: "#3d2a1022",
      padding: 16,
    },
    sovereignTitle: {
      fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.primary, marginBottom: 6,
    },
    sovereignText: {
      fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, lineHeight: 19,
    },
  });
}
