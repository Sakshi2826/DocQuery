import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { UploadForm } from "@/components/upload-form";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const documents = await db.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-gray-600">Logged in as {session.user?.email}</p>

      <div className="mt-8">
        <UploadForm />
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-medium mb-4">Your documents</h2>

        {documents.length === 0 ? (
          <p className="text-sm text-gray-400 rounded-lg border border-dashed p-6 text-center">
            No documents yet. Upload your first PDF above to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium text-sm">{doc.filename}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={doc.status} />
                  {doc.status === "ready" && (
                    <Link
                      href={`/documents/${doc.id}`}
                      className="text-sm text-blue-600 underline"
                    >
                      Open
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    processing: "bg-yellow-100 text-yellow-700",
    ready: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}