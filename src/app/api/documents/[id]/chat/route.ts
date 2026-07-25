import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { embedText } from "@/lib/embeddings";

const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: documentId } = await params;

  const document = await db.document.findUnique({
    where: { id: documentId },
  });

  if (!document || document.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { question } = await req.json();

  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  const queryEmbedding = await embedText(question);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const relevantChunks: { content: string; pageNumber: number }[] =
    await db.$queryRawUnsafe(
      `SELECT content, "pageNumber"
       FROM "Chunk"
       WHERE "documentId" = $1
       ORDER BY embedding <-> $2::vector
       LIMIT 5`,
      documentId,
      vectorLiteral
    );

  const context = relevantChunks
    .map((c, i) => `[${i + 1}] (page ${c.pageNumber}) ${c.content}`)
    .join("\n\n");

  const response = await nvidia.chat.completions.create({
    model: "meta/llama-3.1-70b-instruct",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `Answer using only this context. Cite sources as [1], [2] etc.\n\nContext:\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  const answerText = response.choices[0]?.message?.content ?? "";

  return NextResponse.json({ answer: answerText, sources: relevantChunks });
}