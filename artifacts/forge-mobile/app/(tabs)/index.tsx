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
const DOWNLOAD_URL = "https://13moonforge.ai/download";

const QUICK_PROMPTS = [
  "What can you build for me?",
  "How does Flint fix computers?",
  "What is Site Forge?",
  "Tell me about the 13 Moons",
];

interface Message {
  id: string;
  role: "user" | "forge";
  text: string;
}

const INTRO: Message = {
  id: "0",
  role: "forge",
  text: "Hey — I'm Forge. Ask me anything about what we can do together, or get started with the free desktop installer at 13moonforge.ai.",
};

export default function ForgeChat() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const styles = makeStyles(colors, insets, isWeb);

  const [messages, setMessages] = useState<Message[]>([INTRO]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    setInput("");
    setShowPrompts(false);
    await Haptics.selectionAsync();

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: msg };
    const forgeId = (Date.now() + 1).toString();
    const forgeMsg: Message = { id: forgeId, role: "forge", text: "" };

    setMessages(prev => [forgeMsg, userMsg, ...prev]);
    setStreaming(true);

    const history = messages.map(m => ({
      role: m.role === "forge" ? "assistant" : "user",
      content: m.text,
    }));

    try {
      const res = await fetch(`${API_BASE}/api/landing-forge/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history }),
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
                prev.map(m => m.id === forgeId ? { ...m, text: accumulated } : m)
              );
            }
          } catch { /* partial chunk */ }
        }
      }
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === forgeId ? { ...m, text: "Something went wrong. Please try again." } : m)
      );
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages]);

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.forgeBubble]}>
        {!isUser && <Text style={styles.moonLabel}>FORGE</Text>}
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.forgeText]}>
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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (isWeb ? 67 : 12) }]}>
        <View style={styles.headerRow}>
          <View style={styles.orbContainer}>
            <View style={styles.orb} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>13 Moon Forge</Text>
            <Text style={styles.headerSub}>Your sovereign AI team</Text>
          </View>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => { Haptics.selectionAsync(); Linking.openURL(DOWNLOAD_URL); }}
            activeOpacity={0.8}
          >
            <Feather name="download" size={13} color={colors.primary} />
            <Text style={styles.downloadBtnText}>Get app</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
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
          ListFooterComponent={
            showPrompts ? (
              <View style={styles.prompts}>
                <Text style={styles.promptsLabel}>Ask me something</Text>
                {QUICK_PROMPTS.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={styles.promptChip}
                    onPress={() => send(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.promptChipText}>{p}</Text>
                    <Feather name="arrow-up-right" size={12} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
        />

        {/* Desktop download banner */}
        <TouchableOpacity
          style={styles.desktopBanner}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(DOWNLOAD_URL); }}
          activeOpacity={0.85}
        >
          <View style={styles.desktopBannerLeft}>
            <Feather name="monitor" size={14} color={colors.primary} />
            <Text style={styles.desktopBannerText}>
              Full platform on your computer — <Text style={styles.desktopBannerLink}>free download</Text>
            </Text>
          </View>
          <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + (isWeb ? 34 : 8) }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask Forge anything…"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || streaming}
            activeOpacity={0.7}
          >
            {streaming
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="send" size={16} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.card,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      paddingHorizontal: 16, paddingBottom: 12,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    orbContainer: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: "center", justifyContent: "center",
    },
    orb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary },
    headerTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: colors.foreground },
    headerSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground },
    downloadBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      borderWidth: 1, borderColor: `${colors.primary}55`,
      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
      backgroundColor: `${colors.primary}11`,
    },
    downloadBtnText: {
      fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.primary,
    },
    listContent: {
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    },
    bubble: {
      maxWidth: "80%", marginVertical: 4,
      borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 10,
    },
    forgeBubble: {
      alignSelf: "flex-start", backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.border,
    },
    userBubble: { alignSelf: "flex-end", backgroundColor: colors.primary },
    moonLabel: {
      fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.5,
      color: colors.primary, marginBottom: 4,
    },
    bubbleText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
    forgeText: { color: colors.foreground },
    userText: { color: "#fff" },
    typing: { color: colors.mutedForeground },
    prompts: { paddingTop: 16, gap: 8 },
    promptsLabel: {
      fontFamily: "Inter_500Medium", fontSize: 11, color: colors.mutedForeground,
      letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2,
    },
    promptChip: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 11,
    },
    promptChipText: {
      fontFamily: "Inter_400Regular", fontSize: 14, color: colors.foreground,
    },
    desktopBanner: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      marginHorizontal: 16, marginBottom: 8,
      backgroundColor: `${colors.primary}0f`,
      borderWidth: 1, borderColor: `${colors.primary}22`,
      borderRadius: colors.radius, paddingHorizontal: 12, paddingVertical: 9,
    },
    desktopBannerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    desktopBannerText: {
      fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, flex: 1,
    },
    desktopBannerLink: {
      fontFamily: "Inter_600SemiBold", color: colors.primary,
    },
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
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center", marginBottom: 2,
    },
    sendBtnDisabled: { opacity: 0.4 },
  });
}
