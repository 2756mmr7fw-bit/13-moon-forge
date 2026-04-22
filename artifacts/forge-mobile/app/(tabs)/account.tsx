import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const DOWNLOAD_URL = "https://13moonforge.ai/download";
const TOWNSQ_URL = "https://thepeoplestownsq.com";
const APP_URL = "https://13moonforge.ai";

const WHY_DESKTOP = [
  { icon: "monitor" as const, label: "Site Forge", sub: "Build and manage websites" },
  { icon: "tool" as const, label: "Remote Computer Fix", sub: "Flint connects to your machine" },
  { icon: "cpu" as const, label: "Full AI Team", sub: "All 6 Moons, unlimited sessions" },
  { icon: "folder" as const, label: "Local file access", sub: "Work with files on your computer" },
];

const PLANS = [
  { label: "Free", price: "$0", msgs: "10 messages · basic features", badge: null },
  { label: "Forge Basic", price: "$7/mo", msgs: "150 messages / month", badge: "Most popular" },
  { label: "Forge Pro", price: "$17/mo", msgs: "500 messages / month", badge: "Power builders" },
  { label: "Forge Host", price: "$5/mo", msgs: "Self-host only", badge: null },
];

const LINKS = [
  { label: "Manage subscription", icon: "credit-card" as const, url: TOWNSQ_URL },
  { label: "Computer Fix ($19)", icon: "tool" as const, url: `${APP_URL}/fix` },
  { label: "Site Forge", icon: "globe" as const, url: `${APP_URL}/site-forge` },
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
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero — Desktop Download */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>FREE DOWNLOAD</Text>
          </View>
          <Text style={styles.heroTitle}>Get the full Forge{"\n"}on your computer.</Text>
          <Text style={styles.heroSub}>
            The mobile app is your front door. The desktop installer is where you actually live — site building, remote fix, the complete AI team.
          </Text>

          <View style={styles.heroFeatures}>
            {WHY_DESKTOP.map(f => (
              <View key={f.label} style={styles.heroFeatureRow}>
                <View style={styles.heroFeatureIcon}>
                  <Feather name={f.icon} size={14} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.heroFeatureLabel}>{f.label}</Text>
                  <Text style={styles.heroFeatureSub}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.heroBtn}
            onPress={() => openLink(DOWNLOAD_URL)}
            activeOpacity={0.85}
          >
            <Feather name="download" size={16} color="#fff" />
            <Text style={styles.heroBtnText}>Download free at 13moonforge.ai</Text>
          </TouchableOpacity>
          <Text style={styles.heroNote}>No credit card. No trial. Just download.</Text>
        </View>

        {/* Plans */}
        <Text style={styles.sectionLabel}>Plans</Text>
        {PLANS.map(plan => (
          <View key={plan.label} style={styles.planRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.planName}>{plan.label}</Text>
                {plan.badge && (
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planMsgs}>{plan.msgs}</Text>
            </View>
            <Text style={styles.planPrice}>{plan.price}</Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.subscribeBtn}
          onPress={() => openLink(TOWNSQ_URL)}
          activeOpacity={0.85}
        >
          <Feather name="external-link" size={14} color="#fff" />
          <Text style={styles.subscribeBtnText}>Subscribe at thepeoplestownsq.com</Text>
        </TouchableOpacity>

        <View style={styles.taxNote}>
          <Feather name="info" size={12} color={colors.mutedForeground} />
          <Text style={styles.taxNoteText}>
            We bill outside the app store so 100% of your subscription funds your tools — not Apple or Google's 30% tax.
          </Text>
        </View>

        {/* Links */}
        <Text style={styles.sectionLabel}>Quick links</Text>
        <View style={styles.linkGroup}>
          {LINKS.map((link, i) => (
            <TouchableOpacity
              key={link.label}
              style={[styles.linkRow, i === LINKS.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => openLink(link.url)}
              activeOpacity={0.7}
            >
              <Feather name={link.icon} size={15} color={colors.mutedForeground} />
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Feather name="chevron-right" size={13} color={colors.border} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: insets.bottom + (isWeb ? 34 : 20) + 70 }} />
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
    scroll: { padding: 16, gap: 8 },

    heroCard: {
      backgroundColor: "#1a0d05",
      borderRadius: 16, borderWidth: 1, borderColor: `${colors.primary}33`,
      padding: 20, gap: 14, marginBottom: 8,
    },
    heroBadge: {
      alignSelf: "flex-start",
      backgroundColor: `${colors.primary}22`,
      borderRadius: 20, borderWidth: 1, borderColor: `${colors.primary}44`,
      paddingHorizontal: 10, paddingVertical: 3,
    },
    heroBadgeText: {
      fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.5, color: colors.primary,
    },
    heroTitle: {
      fontFamily: "Inter_700Bold", fontSize: 26, color: colors.foreground, lineHeight: 34,
    },
    heroSub: {
      fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, lineHeight: 20,
    },
    heroFeatures: { gap: 10 },
    heroFeatureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    heroFeatureIcon: {
      width: 28, height: 28, borderRadius: 8,
      backgroundColor: `${colors.primary}15`,
      alignItems: "center", justifyContent: "center",
    },
    heroFeatureLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground },
    heroFeatureSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
    heroBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14,
    },
    heroBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
    heroNote: {
      fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, textAlign: "center",
    },

    sectionLabel: {
      fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.2,
      color: colors.mutedForeground, marginTop: 12, marginBottom: 4, textTransform: "uppercase",
    },
    planRow: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    planName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground },
    planBadge: {
      backgroundColor: `${colors.primary}22`, borderRadius: 10,
      paddingHorizontal: 6, paddingVertical: 2,
    },
    planBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: colors.primary, letterSpacing: 0.5 },
    planMsgs: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
    planPrice: { fontFamily: "Inter_700Bold", fontSize: 15, color: colors.primary },
    subscribeBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.secondary, borderRadius: colors.radius, borderWidth: 1,
      borderColor: colors.border, padding: 13, marginTop: 4,
    },
    subscribeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground },
    taxNote: {
      flexDirection: "row", gap: 8, alignItems: "flex-start",
      padding: 12, borderRadius: colors.radius, backgroundColor: colors.muted,
    },
    taxNoteText: {
      fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, lineHeight: 17, flex: 1,
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
  });
}
