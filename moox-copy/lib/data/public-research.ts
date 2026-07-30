import { listPublicResearchRecords } from "@/lib/data/research-access";
import { listResearchRecords } from "@/lib/data/research-records";

export async function listPublicResearchRecordsFromStore() {
  return listPublicResearchRecords(listResearchRecords);
}
