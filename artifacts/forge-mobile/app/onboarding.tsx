import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, Platform, Linking, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");
const DOWNLOAD_URL = "https://13moonforge.ai/download";

const SLIDES = [
  {
    id: "1",
    icon: "zap" as const,
    iconColor: "#e8611a",
    title: "Your sovereign\nAI team.",
    body: "13 Moon Forge gives you six AI specialists — not a generic chatbot. Each one built for a specific job. All working together for you.",
    cta: null,
  },
  {
    id: "2",
    icon: "users" as const,
    iconColor: "#a78bfa",
    title: "Six Moons.\nOne platform.",
    body: "Forge builds. Hawk watches. Quill writes. Creed explains legal. Sage teaches. Flint fixes your computer. No subscription required to understand what went wrong — he tells you first.",
    cta: null,
  },
  {
    id: "3",
    icon: "monitor" as const,
    iconColor: "#38bdf8",
    title: "Phone is the\nfront door.",
    body: "This app lets you chat, check your team, and manage your account anywhere. The full platform — site building, remote computer fix, everything — lives on the free desktop app.",
    cta: null,
  },
  {
    id: "4",
    icon: "download" as const,
    iconColor: "#4ade80",
    title: "Free to download.\nNo catch.",
    body: "The installer is free. No credit card, no trial. Get started today and upgrade when you're ready — on your terms, not Apple's.",
    cta: DOWNLOAD_URL,
  },
];

export const ONBOARDING_KEY = "forge_onboarding_v1";

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const styles = makeStyles(colors, insets, isWeb);

  function next() {
    Haptics.selectionAsync();
    if (index < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
    }
  }

  async function finish() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem(ONBOARDING_KEY, "done");
    router.replace("/(tabs)");
  }

  async function openDownload() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(DOWNLOAD_URL);
  }

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  return (
    <View style={styles.container}>
      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={[styles.skip, { top: insets.top + (isWeb ? 67 : 16) }]} onPress={finish}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconRing, { borderColor: `${item.iconColor}44`, backgroundColor: `${item.iconColor}11` }]}>
              <Feather name={item.icon} size={48} color={item.iconColor} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
        onMomentumScrollEnd={e => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(newIndex);
        }}
        scrollEventThrottle={16}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === index
                ? { width: 24, backgroundColor: colors.primary }
                : { width: 6, backgroundColor: colors.border },
            ]}
          />
        ))}
      </View>

      {/* CTA buttons */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + (isWeb ? 34 : 16) }]}>
        {isLast ? (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={openDownload} activeOpacity={0.85}>
              <Feather name="download" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Get the free installer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={finish} activeOpacity={0.7}>
              <Text style={styles.ghostBtnText}>Enter the app</Text>
              <Feather name="arrow-right" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>Next</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }, isWeb: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    skip: {
      position: "absolute",
      right: 24,
      zIndex: 10,
      paddingVertical: 6,
      paddingHorizontal: 2,
    },
    skipText: {
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      color: colors.mutedForeground,
    },
    slide: {
      width,
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 36,
      paddingTop: insets.top + (isWeb ? 67 : 80),
      paddingBottom: 40,
      gap: 24,
    },
    iconRing: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    title: {
      fontFamily: "Inter_700Bold",
      fontSize: 34,
      color: colors.foreground,
      textAlign: "center",
      lineHeight: 42,
    },
    body: {
      fontFamily: "Inter_400Regular",
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 25,
    },
    dots: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingBottom: 24,
    },
    dot: {
      height: 6,
      borderRadius: 3,
    },
    actions: {
      paddingHorizontal: 24,
      gap: 10,
      paddingTop: 4,
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
    },
    primaryBtnText: {
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: "#fff",
    },
    nextBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
    },
    nextBtnText: {
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: "#fff",
    },
    ghostBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
    },
    ghostBtnText: {
      fontFamily: "Inter_500Medium",
      fontSize: 15,
      color: colors.mutedForeground,
    },
  });
}
