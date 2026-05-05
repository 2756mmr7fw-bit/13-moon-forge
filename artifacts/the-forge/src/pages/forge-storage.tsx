import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  HardDrive, Plus, Trash2, Eye, EyeOff, Copy, Check,
  Loader2, X, Code2, Globe, Key,
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Bucket {
  id: number;
  name: string;
  status: string;
  endpoint: string | null;
  publicUrl: string | null;
  region: string;
  sizeBytes: number;
  createdAt: string;
}

interface Credentials {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  publicUrl: string;
  region: string;
  sdkConfig: Record<string, string | boolean>;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-zinc-500 hover:text-white p-1 transition-colors">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

export default function ForgeStorage() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [creds, setCreds] = useState<Record<number, Credentials>>({});
  const [showCreds, setShowCreds] = useState<number | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const fetchBuckets = useCallback(async () => {
    const r = await fetch(`${API}/api/storage/buckets`, { credentials: "include" });
    if (r.ok) setBuckets(await r.json().then(d => d.buckets ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { fetchBuckets(); }, [fetchBuckets]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const r = await fetch(`${API}/api/storage/buckets`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (r.ok) {
        const data = await r.json();
        setBuckets(prev => [data.bucket, ...prev]);
        setNewName("");
        setShowAdd(false);
      }
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API}/api/storage/buckets/${id}`, { method: "DELETE", credentials: "include" });
    setBuckets(prev => prev.filter(b => b.id !== id));
    if (showCreds === id) setShowCreds(null);
  };

  const handleShowCreds = async (id: number) => {
    if (showCreds === id) { setShowCreds(null); return; }
    if (!creds[id]) {
      const r = await fetch(`${API}/api/storage/buckets/${id}/credentials`, { credentials: "include" });
      if (r.ok) {
        const data = await r.json() as Credentials;
        setCreds(prev => ({ ...prev, [id]: data }));
      }
    }
    setShowCreds(id);
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <HardDrive size={22} className="text-orange-400" />
          <div>
            <h1 className="text-xl font-bold">Object Storage</h1>
            <p className="text-xs text-zinc-500">S3-compatible storage. Store files, images, videos. No AWS needed.</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs gap-1">
          <Plus size={13} /> New Bucket
        </Button>
      </div>

      {/* SDK snippet */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 mb-6">
        <p className="text-[11px] font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Use any S3-compatible SDK</p>
        <div className="bg-black rounded-lg border border-zinc-800 p-3 font-mono text-[11px] text-zinc-400 overflow-x-auto">
          <span className="text-orange-400">import</span> {`{ S3Client, PutObjectCommand } from "@aws-sdk/client-s3";`}<br />
          <br />
          <span className="text-orange-400">const</span> {`client = `}<span className="text-orange-400">new</span> {`S3Client({`}<br />
          {`  endpoint: "YOUR_ENDPOINT",`}<br />
          {`  credentials: { accessKeyId: "ACCESS_KEY", secretAccessKey: "SECRET_KEY" },`}<br />
          {`  region: "us-east-1", forcePathStyle: true,`}<br />
          {`});`}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-zinc-500" />
        </div>
      ) : buckets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
          <HardDrive size={28} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-400 mb-1">No storage buckets yet</p>
          <p className="text-xs text-zinc-600 mb-4">Create a bucket and get S3-compatible credentials instantly.</p>
          <Button onClick={() => setShowAdd(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8">
            <Plus size={13} className="mr-1" /> Create Bucket
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {buckets.map(bucket => (
            <div key={bucket.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <HardDrive size={16} className={
                    bucket.status === "ready" ? "text-green-400" :
                    bucket.status === "provisioning" ? "text-orange-400 animate-pulse" : "text-zinc-500"
                  } />
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{bucket.name}</p>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono",
                      bucket.status === "ready" ? "bg-green-500/10 text-green-400" :
                      bucket.status === "provisioning" ? "bg-orange-500/10 text-orange-400" :
                      "bg-zinc-700 text-zinc-400"
                    )}>{bucket.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleShowCreds(bucket.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                    <Key size={11} /> {showCreds === bucket.id ? "Hide" : "Credentials"}
                  </button>
                  <button onClick={() => handleDelete(bucket.id)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 rounded transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {bucket.publicUrl && (
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 mb-2">
                  <Globe size={11} className="text-orange-400" />
                  <span className="font-mono truncate">{bucket.publicUrl}</span>
                  <CopyBtn text={bucket.publicUrl} />
                </div>
              )}

              {showCreds === bucket.id && creds[bucket.id] && (
                <div className="mt-3 space-y-2 rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Credentials</p>
                  {([
                    ["Endpoint",   creds[bucket.id].endpoint],
                    ["Access Key", creds[bucket.id].accessKey],
                    ["Region",     creds[bucket.id].region],
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-zinc-600 w-20">{label}</span>
                      <span className="text-[11px] font-mono text-zinc-300 flex-1 truncate">{val}</span>
                      <CopyBtn text={val} />
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-600 w-20">Secret Key</span>
                    <span className="text-[11px] font-mono text-zinc-300 flex-1 truncate">
                      {showSecret ? creds[bucket.id].secretKey : "••••••••••••••••••••••"}
                    </span>
                    <button onClick={() => setShowSecret(s => !s)} className="text-zinc-500 hover:text-white p-1">
                      {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <CopyBtn text={creds[bucket.id].secretKey} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-bold text-white">Create Bucket</h2>
              <button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Bucket name</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="my-bucket" className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm" />
                <p className="text-[11px] text-zinc-600 mt-1">Lowercase, letters, numbers, hyphens only.</p>
              </div>
              <Button onClick={handleCreate} disabled={adding || !newName.trim()}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                {adding ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                Create Bucket
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
