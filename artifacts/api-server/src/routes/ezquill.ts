import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and, count } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  ezquillDocumentsTable,
  ezquillFieldsTable,
  ezquillProfilesTable,
  ezquillSignaturesTable,
} from "@workspace/db";
import {
  CreateEzquillDocumentBody,
  UpdateEzquillDocumentBody,
  UpdateEzquillDocumentParams,
  GetEzquillDocumentParams,
  DeleteEzquillDocumentParams,
  CreateEzquillFieldBody,
  CreateEzquillFieldParams,
  UpdateEzquillFieldBody,
  UpdateEzquillFieldParams,
  DeleteEzquillFieldParams,
  ListEzquillFieldsParams,
  SignEzquillDocumentBody,
  SignEzquillDocumentParams,
  AutofillEzquillDocumentParams,
  SaveEzquillProfileBody,
  SaveEzquillSignatureBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getUserId(req: Request): string | null {
  const user = (req as Request & { user?: { id: string } }).user;
  return user?.id ?? null;
}

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

router.get("/ezquill/dashboard", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const docs = await db.select().from(ezquillDocumentsTable)
    .where(eq(ezquillDocumentsTable.userId, userId));

  const statusCounts = { draft: 0, pending: 0, signed: 0, completed: 0 };
  for (const d of docs) {
    const s = d.status as keyof typeof statusCounts;
    if (s in statusCounts) statusCounts[s]++;
  }

  const recentDocuments = docs
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  res.json({
    totalDocuments: docs.length,
    ...statusCounts,
    recentDocuments,
  });
});

router.get("/ezquill/documents", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const docs = await db.select().from(ezquillDocumentsTable)
    .where(eq(ezquillDocumentsTable.userId, userId))
    .orderBy(desc(ezquillDocumentsTable.updatedAt));
  res.json(docs);
});

router.post("/ezquill/documents", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = CreateEzquillDocumentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [doc] = await db.insert(ezquillDocumentsTable).values({
    userId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: "draft",
    pageCount: 1,
  }).returning();

  res.status(201).json(doc);
});

router.get("/ezquill/documents/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = GetEzquillDocumentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [doc] = await db.select().from(ezquillDocumentsTable)
    .where(and(eq(ezquillDocumentsTable.id, params.data.id), eq(ezquillDocumentsTable.userId, userId)));
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  res.json(doc);
});

router.patch("/ezquill/documents/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = UpdateEzquillDocumentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateEzquillDocumentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [doc] = await db.update(ezquillDocumentsTable)
    .set(parsed.data)
    .where(and(eq(ezquillDocumentsTable.id, params.data.id), eq(ezquillDocumentsTable.userId, userId)))
    .returning();
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  res.json(doc);
});

router.delete("/ezquill/documents/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = DeleteEzquillDocumentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [doc] = await db.delete(ezquillDocumentsTable)
    .where(and(eq(ezquillDocumentsTable.id, params.data.id), eq(ezquillDocumentsTable.userId, userId)))
    .returning();
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  res.sendStatus(204);
});

router.get("/ezquill/documents/:id/fields", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = ListEzquillFieldsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [doc] = await db.select().from(ezquillDocumentsTable)
    .where(and(eq(ezquillDocumentsTable.id, params.data.id), eq(ezquillDocumentsTable.userId, userId)));
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  const fields = await db.select().from(ezquillFieldsTable)
    .where(eq(ezquillFieldsTable.documentId, params.data.id))
    .orderBy(ezquillFieldsTable.order);
  res.json(fields);
});

router.post("/ezquill/documents/:id/fields", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = CreateEzquillFieldParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [doc] = await db.select().from(ezquillDocumentsTable)
    .where(and(eq(ezquillDocumentsTable.id, params.data.id), eq(ezquillDocumentsTable.userId, userId)));
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  const parsed = CreateEzquillFieldBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [field] = await db.insert(ezquillFieldsTable).values({
    documentId: params.data.id,
    label: parsed.data.label,
    fieldType: parsed.data.fieldType,
    value: parsed.data.value ?? null,
    placeholder: parsed.data.placeholder ?? null,
    page: parsed.data.page,
    x: parsed.data.x,
    y: parsed.data.y,
    width: parsed.data.width,
    height: parsed.data.height,
    required: parsed.data.required ?? false,
    order: parsed.data.order ?? 0,
  }).returning();

  res.status(201).json(field);
});

router.patch("/ezquill/documents/:id/fields/:fieldId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = UpdateEzquillFieldParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateEzquillFieldBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [doc] = await db.select().from(ezquillDocumentsTable)
    .where(and(eq(ezquillDocumentsTable.id, params.data.id), eq(ezquillDocumentsTable.userId, userId)));
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.label != null) updateData.label = parsed.data.label;
  if (parsed.data.value != null) updateData.value = parsed.data.value;
  if (parsed.data.placeholder != null) updateData.placeholder = parsed.data.placeholder;
  if (parsed.data.x != null) updateData.x = parsed.data.x;
  if (parsed.data.y != null) updateData.y = parsed.data.y;
  if (parsed.data.width != null) updateData.width = parsed.data.width;
  if (parsed.data.height != null) updateData.height = parsed.data.height;
  if (parsed.data.required != null) updateData.required = parsed.data.required;
  if (parsed.data.order != null) updateData.order = parsed.data.order;

  const [field] = await db.update(ezquillFieldsTable)
    .set(updateData)
    .where(and(eq(ezquillFieldsTable.id, params.data.fieldId), eq(ezquillFieldsTable.documentId, params.data.id)))
    .returning();
  if (!field) { res.status(404).json({ error: "Field not found" }); return; }
  res.json(field);
});

router.delete("/ezquill/documents/:id/fields/:fieldId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = DeleteEzquillFieldParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [doc] = await db.select().from(ezquillDocumentsTable)
    .where(and(eq(ezquillDocumentsTable.id, params.data.id), eq(ezquillDocumentsTable.userId, userId)));
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  const [field] = await db.delete(ezquillFieldsTable)
    .where(and(eq(ezquillFieldsTable.id, params.data.fieldId), eq(ezquillFieldsTable.documentId, params.data.id)))
    .returning();
  if (!field) { res.status(404).json({ error: "Field not found" }); return; }
  res.sendStatus(204);
});

router.post("/ezquill/documents/:id/sign", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = SignEzquillDocumentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = SignEzquillDocumentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [doc] = await db.select().from(ezquillDocumentsTable)
    .where(and(eq(ezquillDocumentsTable.id, params.data.id), eq(ezquillDocumentsTable.userId, userId)));
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  if (parsed.data.fieldId) {
    await db.update(ezquillFieldsTable)
      .set({ value: parsed.data.signatureDataUrl })
      .where(and(eq(ezquillFieldsTable.id, parsed.data.fieldId), eq(ezquillFieldsTable.documentId, params.data.id)));
  }

  const [updated] = await db.update(ezquillDocumentsTable)
    .set({ status: "signed", signedAt: new Date() })
    .where(eq(ezquillDocumentsTable.id, params.data.id))
    .returning();

  res.json(updated);
});

router.post("/ezquill/documents/:id/autofill", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const params = AutofillEzquillDocumentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [doc] = await db.select().from(ezquillDocumentsTable)
    .where(and(eq(ezquillDocumentsTable.id, params.data.id), eq(ezquillDocumentsTable.userId, userId)));
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  const [profile] = await db.select().from(ezquillProfilesTable)
    .where(eq(ezquillProfilesTable.userId, userId));

  const fields = await db.select().from(ezquillFieldsTable)
    .where(eq(ezquillFieldsTable.documentId, params.data.id));

  if (!profile) { res.json(fields); return; }

  const fieldMap: Record<string, string | null> = {
    name: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    address: profile.address ? [profile.address, profile.city, profile.state, profile.zip].filter(Boolean).join(", ") : null,
    date: new Date().toLocaleDateString(),
    text: null,
  };

  const updatedFields = await Promise.all(
    fields.map(async (field) => {
      const val = fieldMap[field.fieldType];
      if (val && !field.value) {
        const [updated] = await db.update(ezquillFieldsTable)
          .set({ value: val })
          .where(eq(ezquillFieldsTable.id, field.id))
          .returning();
        return updated;
      }
      return field;
    })
  );

  res.json(updatedFields);
});

router.get("/ezquill/profile", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  let [profile] = await db.select().from(ezquillProfilesTable)
    .where(eq(ezquillProfilesTable.userId, userId));

  if (!profile) {
    [profile] = await db.insert(ezquillProfilesTable).values({ userId }).returning();
  }
  res.json(profile);
});

router.put("/ezquill/profile", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = SaveEzquillProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const existing = await db.select().from(ezquillProfilesTable)
    .where(eq(ezquillProfilesTable.userId, userId));

  let profile;
  if (existing.length === 0) {
    [profile] = await db.insert(ezquillProfilesTable).values({ userId, ...parsed.data }).returning();
  } else {
    [profile] = await db.update(ezquillProfilesTable)
      .set(parsed.data)
      .where(eq(ezquillProfilesTable.userId, userId))
      .returning();
  }
  res.json(profile);
});

router.get("/ezquill/signature", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  let [sig] = await db.select().from(ezquillSignaturesTable)
    .where(eq(ezquillSignaturesTable.userId, userId));

  if (!sig) {
    [sig] = await db.insert(ezquillSignaturesTable).values({ userId }).returning();
  }
  res.json(sig);
});

router.put("/ezquill/signature", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = SaveEzquillSignatureBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const existing = await db.select().from(ezquillSignaturesTable)
    .where(eq(ezquillSignaturesTable.userId, userId));

  let sig;
  if (existing.length === 0) {
    [sig] = await db.insert(ezquillSignaturesTable).values({ userId, dataUrl: parsed.data.dataUrl }).returning();
  } else {
    [sig] = await db.update(ezquillSignaturesTable)
      .set({ dataUrl: parsed.data.dataUrl })
      .where(eq(ezquillSignaturesTable.userId, userId))
      .returning();
  }
  res.json(sig);
});

export default router;
