import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ChatInterface } from "@/components/chat-interface";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const document = await db.document.findUnique({
    where: { id },
  });

  if (!document || document.userId !== session.user.id) {
    notFound();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold">{document.filename}</h1>
      <p className="text-sm text-gray-500 mt-1">Status: {document.status}</p>

      <div className="mt-6">
        <ChatInterface documentId={document.id} />
      </div>
    </div>
  );
}