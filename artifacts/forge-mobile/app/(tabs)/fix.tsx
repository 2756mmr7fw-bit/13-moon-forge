import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Platform,
  KeyboardAvoidingView, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { useColors } from "@/hooks/useColors";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const SUBSCRIBE_URL = "https://thepeoplestownsq.com";

interface Message {
  id: string;
  role: "user" | "flint";
  text: string;
}

type Phase = "diagnose" | "verdict-fix" | "verdict-doctor";

const INTRO: Message = {
  id: "0",
  role: "flint",
  text: "I'm Flint. Tell me what's going on with your computer — I'll ask a couple of targeted questions before giving you my honest verdict. No charge until I say I can fix it.",
};

export default function FixScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const styles = makeStyles(colors, insets, isWeb);

  const [messages, setMessages] = useState<Message[]>([INTRO]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [phase, setPhase] = useState<Phase>("diagnose");

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    await Haptics.selectionAsync();

    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    const flintId = (Date.now() + 1).toString();
    const flintMsg: Message = { id: flintId, role: "flint", text: "" };

    setMessages(prev => [flintMsg, userMsg, ...prev]);
    setStreaming(true);

    const history = messages.map(m => ({
      role: m.role === "flint" ? "assistant" : "user",
      content: m.text,
    }));

    try {
      const res = await fetch(`${API_BASE}/api/fix/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split("\n\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim();
          if (d === "[DONE]") break;
          try {
            const parsed = JSON.parse(d) as { choices?: { delta?: { content?: string } }[] };
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              accumulated += delta;
              setMessages(prev =>
                prev.map(m => m.id === flintId ? { ...m, text: accumulated } : m)
              );
            }
          } catch { /* partial */ }
        }
      }

      if (accumulated.includes("✓ I can fix this")) {
        setPhase("verdict-fix");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (accumulated.includes("✗ You need a computer doctor")) {
        setPhase("verdict-doctor");
      }
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === flintId ? { ...m, text: "Something went wrong. Please try again." } : m)
      );
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages]);

  function reset() {
    setMessages([INTRO]);
    setPhase("diagnose");
    setInput("");
  }

  function openPayment() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`${API_BASE.replace("https://", "https://")}/fix`);
  }

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.flintBubble]}>
        {!isUser && <Text style={styles.moonLabel}>FLINT</Text>}
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.flintText]}>
          {item.text}
          {!isUser && item.text === "" && streaming && (
            <Text style={styles.typing}>  ···</Text>
          )}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (isWeb ? 67 : 12) }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: "#3b0c0c" }]}>
            <Feather name="tool" size={18} color={colors.flint} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Computer Fix</Text>
            <Text style={styles.headerSub}>Flint diagnoses first — no charge until he can fix it</Text>
          </View>
        </View>

        {phase === "verdict-fix" && (
          <View style={styles.verdictBannerGood}>
            <Feather name="check-circle" size={14} color="#4ade80" />
            <Text style={styles.verdictTextGood}>Flint can fix this — $19 one-time</Text>
            <TouchableOpacity style={styles.payBtn} onPress={openPayment} activeOpacity={0.8}>
              <Text style={styles.payBtnText}>Pay on website</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === "verdict-doctor" && (
          <View style={styles.verdictBannerWarn}>
            <Feather name="alert-triangle" size={14} color="#fbbf24" />
            <Text style={styles.verdictTextWarn}>Needs physical repair — no charge</Text>
            <TouchableOpacity onPress={reset}>
              <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        {phase === "diagnose" && (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + (isWeb ? 34 : 8) }]}>
            <TextInput
              style={styles.input}
              placeholder="Describe what's happening…"
              placeholderTextColor={colors.mutedForeground}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              returnKeyType="send"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.flint }, (!input.trim() || streaming) && styles.sendDisabled]}
              onPress={send}
              disabled={!input.trim() || streaming}
              activeOpacity={0.7}
            >
              {streaming
                ? <ActivityIndicator size="small" color="#fff" />
                : <Feather name="send" size={16} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        )}

        {phase !== "diagnose" && (
          <View style={[styles.footerActions, { paddingBottom: insets.bottom + (isWeb ? 34 : 8) }]}>
            <TouchableOpacity style={styles.ghostBtn} onPress={reset} activeOpacity={0.7}>
              <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
              <Text style={styles.ghostBtnText}>New problem</Text>
            </TouchableOpacity>
            {phase === "verdict-fix" && (
              <TouchableOpacity style={[styles.solidBtn, { backgroundColor: "#16a34a" }]} onPress={openPayment} activeOpacity={0.8}>
                <Feather name="external-link" size={13} color="#fff" />
                <Text style={styles.solidBtnText}>Open payment page</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 10,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    iconBox: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: "center", justifyContent: "center",
    },
    headerTitle: {
      fontFamily: "Inter_700Bold", fontSize: 17, color: colors.foreground,
    },
    headerSub: {
      fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 1,
    },
    verdictBannerGood: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: "#14532d22",
      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
      borderWidth: 1, borderColor: "#16a34a44",
    },
    verdictTextGood: {
      fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#4ade80", flex: 1,
    },
    payBtn: {
      backgroundColor: "#16a34a", borderRadius: 6,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    payBtnText: {
      fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff",
    },
    verdictBannerWarn: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: "#78350f22",
      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
      borderWidth: 1, borderColor: "#d9770644",
    },
    verdictTextWarn: {
      fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fbbf24", flex: 1,
    },
    listContent: {
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    },
    bubble: {
      maxWidth: "82%", marginVertical: 4,
      borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 10,
    },
    flintBubble: {
      alignSelf: "flex-start", backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.border,
    },
    userBubble: { alignSelf: "flex-end", backgroundColor: colors.primary },
    moonLabel: {
      fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.5,
      color: colors.flint, marginBottom: 4,
    },
    bubbleText: {
      fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22,
    },
    flintText: { color: colors.foreground },
    userText: { color: "#fff" },
    typing: { color: colors.mutedForeground },
    inputBar: {
      flexDirection: "row", alignItems: "flex-end", gap: 10,
      paddingHorizontal: 16, paddingTop: 10,
      backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
    },
    input: {
      flex: 1, backgroundColor: colors.input,
      borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 10,
      fontFamily: "Inter_400Regular", fontSize: 15, color: colors.foreground, maxHeight: 120,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: "center", justifyContent: "center", marginBottom: 2,
    },
    sendDisabled: { opacity: 0.4 },
    footerActions: {
      flexDirection: "row", gap: 10, padding: 16,
      backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
    },
    ghostBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border,
    },
    ghostBtnText: {
      fontFamily: "Inter_500Medium", fontSize: 13, color: colors.mutedForeground,
    },
    solidBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, paddingVertical: 10, borderRadius: colors.radius,
    },
    solidBtnText: {
      fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff",
    },
  });
}
