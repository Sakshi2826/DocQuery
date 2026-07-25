import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { extractText, getDocumentProxy } from "unpdf";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chunkText } from "@/lib/chunking";
import { embedText } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(file.name, buffer, {
    access: "public",
    addRandomSuffix: true,
  });

  const document = await db.document.create({
    data: {
      userId: session.user.id,
      filename: file.name,
      storagePath: blob.url,
      status: "processing",
    },
  });

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });

    const chunks = chunkText(text);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);
      const vectorLiteral = `[${embedding.join(",")}]`;

      await db.$executeRawUnsafe(
        `INSERT INTO "Chunk" (id, "documentId", content, "pageNumber", embedding)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector)`,
        document.id,
        chunks[i],
        i,
        vectorLiteral
      );
    }

    await db.document.update({
      where: { id: document.id },
      data: { status: "ready" },
    });
  } catch (err) {
    console.error("Upload processing error:", err);
    await db.document.update({
      where: { id: document.id },
      data: { status: "failed" },
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ document });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await db.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}