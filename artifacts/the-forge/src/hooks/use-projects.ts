import { useState, useCallback } from "react";

export type MoonKey = "forge" | "sage" | "scout" | "quill" | "ledger" | "grit" | "herald";

export interface Project {
  id: string;
  name: string;
  description: string;
  phase: "planning" | "building" | "testing" | "launched";
  crew: MoonKey[];
  createdAt: number;
  updatedAt: number;
  brief?: string;
}

const STORAGE_KEY = "forge:projects";

function load(): Project[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Project[]; }
  catch { return []; }
}

function save(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(load);

  const createProject = useCallback((name: string, description: string, crew: MoonKey[]): Project => {
    const project: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name, description, crew,
      phase: "planning",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [project, ...load()];
    save(next);
    setProjects(next);
    return project;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    const next = load().map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p);
    save(next);
    setProjects(next);
  }, []);

  const deleteProject = useCallback((id: string) => {
    const next = load().filter(p => p.id !== id);
    save(next);
    setProjects(next);
  }, []);

  const getProject = useCallback((id: string) => load().find(p => p.id === id), []);

  return { projects, createProject, updateProject, deleteProject, getProject };
}

// ── Ledger entries ─────────────────────────────────────────────────────────────

export type LedgerType = "time" | "cost";

export interface LedgerEntry {
  id: string;
  projectId: string;
  type: LedgerType;
  label: string;
  amount: number;
  unit: string;
  date: number;
  note?: string;
}

const LEDGER_KEY = "forge:ledger";

function loadLedger(): LedgerEntry[] {
  try { return JSON.parse(localStorage.getItem(LEDGER_KEY) ?? "[]") as LedgerEntry[]; }
  catch { return []; }
}

function saveLedger(entries: LedgerEntry[]) {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(entries));
}

export function useLedger(projectId?: string) {
  const [allEntries, setAllEntries] = useState<LedgerEntry[]>(loadLedger);
  const entries = projectId ? allEntries.filter(e => e.projectId === projectId) : allEntries;

  const addEntry = useCallback((entry: Omit<LedgerEntry, "id" | "date">) => {
    const newEntry: LedgerEntry = {
      ...entry,
      id: `led_${Date.now()}`,
      date: Date.now(),
    };
    const next = [newEntry, ...loadLedger()];
    saveLedger(next);
    setAllEntries(next);
    return newEntry;
  }, []);

  const deleteEntry = useCallback((id: string) => {
    const next = loadLedger().filter(e => e.id !== id);
    saveLedger(next);
    setAllEntries(next);
  }, []);

  const totalTime = entries.filter(e => e.type === "time").reduce((s, e) => s + e.amount, 0);
  const totalCost = entries.filter(e => e.type === "cost").reduce((s, e) => s + e.amount, 0);

  return { entries, addEntry, deleteEntry, totalTime, totalCost };
}

// ── Moon chat history ──────────────────────────────────────────────────────────

export interface ChatMessage { role: "user" | "assistant"; content: string; }

export function loadMoonHistory(moon: string, projectId?: string): ChatMessage[] {
  const key = `forge:moon:${moon}${projectId ? `:${projectId}` : ""}`;
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as ChatMessage[]; }
  catch { return []; }
}

export function saveMoonHistory(moon: string, messages: ChatMessage[], projectId?: string) {
  const key = `forge:moon:${moon}${projectId ? `:${projectId}` : ""}`;
  localStorage.setItem(key, JSON.stringify(messages.slice(-60)));
}
