export type ConsultationListRow = {
  id: string;
  kind: string;
  status: string;
  missing_fields: string[];
  created_at: string;
};

/** A failed or malformed read is never an empty consultation queue. */
export async function readConsultationList(signal: AbortSignal): Promise<ConsultationListRow[]> {
  const response = await fetch("/api/admin/consultations", { cache: "no-store", signal });
  if (!response.ok) throw new Error("CONSULTATION_LIST_UNAVAILABLE");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("requests" in body) || !Array.isArray(body.requests)) {
    throw new Error("CONSULTATION_LIST_INVALID");
  }
  if (!body.requests.every((row) => row && typeof row.id === "string" &&
    typeof row.kind === "string" && typeof row.status === "string" &&
    typeof row.created_at === "string")) throw new Error("CONSULTATION_LIST_INVALID");
  return body.requests;
}
