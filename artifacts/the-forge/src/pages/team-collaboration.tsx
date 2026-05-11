import { useState, useEffect } from "react";
import { Users, Plus, Mail, Trash2, Crown, Edit2, Eye, RefreshCw, AlertCircle, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@workspace/api-client-react";

type Role = "owner" | "editor" | "viewer";

interface TeamMember {
  id: number;
  email: string;
  role: Role;
  status: "pending" | "active";
  joinedAt: string;
}

const ROLE_CONFIG: Record<Role, { label: string; icon: typeof Crown; color: string; can: string[] }> = {
  owner:  { label: "Owner",  icon: Crown,  color: "text-yellow-600", can: ["Full access — can invite, remove, and edit everything"] },
  editor: { label: "Editor", icon: Edit2,  color: "text-blue-600",   can: ["Can view and edit all projects", "Cannot invite or remove members"] },
  viewer: { label: "Viewer", icon: Eye,    color: "text-muted-foreground", can: ["Read-only access to projects", "Cannot make changes"] },
};

export default function TeamCollaborationPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    const token = await getAuthToken();
    const res = await fetch("/api/team", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const json = await res.json() as TeamMember[];
      setMembers(json);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function invite() {
    if (!inviteEmail.trim()) { setError("Email is required"); return; }
    setInviting(true);
    setError(null);
    setSuccess(null);
    const token = await getAuthToken();
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const json = await res.json() as { member?: TeamMember; error?: string };
    if (!res.ok) {
      setError(json.error ?? "Failed to send invite");
    } else {
      if (json.member) setMembers(prev => [...prev, json.member!]);
      setInviteEmail("");
      setSuccess(`Invite sent to ${inviteEmail.trim()}`);
    }
    setInviting(false);
  }

  async function remove(id: number) {
    const token = await getAuthToken();
    await fetch(`/api/team/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setMembers(prev => prev.filter(m => m.id !== id));
  }

  async function changeRole(id: number, role: Role) {
    const token = await getAuthToken();
    await fetch(`/api/team/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Team & Collaboration
        </h1>
        <p className="text-sm text-muted-foreground">
          Invite people to collaborate on your Forge workspace. Control what they can see and do.
        </p>
      </div>

      {/* Invite form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Invite someone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 px-3 py-2 rounded-lg">
              <Check className="w-4 h-4 shrink-0" /> {success}
            </div>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="pl-9 text-sm"
                onKeyDown={e => e.key === "Enter" && invite()}
              />
            </div>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Role)}
              className="border border-input bg-background text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button onClick={invite} disabled={inviting} className="gap-1 shrink-0">
              {inviting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Invite
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ROLE_CONFIG) as Role[]).map(role => {
              const { label, can } = ROLE_CONFIG[role];
              return (
                <div key={role} className={`text-xs border rounded-lg p-2.5 space-y-1 ${inviteRole === role && role !== "owner" ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                  <p className="font-medium">{label}</p>
                  {can.map(c => <p key={c} className="text-muted-foreground">{c}</p>)}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Members list */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </h2>
        {members.length === 0 ? (
          <Card className="text-center py-10">
            <CardContent>
              <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No team members yet — invite someone above.</p>
            </CardContent>
          </Card>
        ) : (
          members.map(member => {
            const { label, icon: Icon, color } = ROLE_CONFIG[member.role];
            return (
              <Card key={member.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {member.email.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Icon className={`w-3 h-3 ${color}`} />
                      <span className={`text-xs ${color}`}>{label}</span>
                      {member.status === "pending" && (
                        <Badge variant="outline" className="text-xs">Invite pending</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {member.role !== "owner" && (
                      <select
                        value={member.role}
                        onChange={e => changeRole(member.id, e.target.value as Role)}
                        className="border border-input bg-background text-xs rounded-md px-2 py-1 focus:outline-none"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}
                    {member.role !== "owner" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(member.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
