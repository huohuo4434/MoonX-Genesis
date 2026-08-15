import { listPublicResearchRecords } from "@/lib/data/research-access";
import { listResearchRecords } from "@/lib/data/research-records";
import { projectPublicAttribution } from "@/lib/presentation/public-attribution";

export async function listPublicResearchRecordsFromStore() {
  return projectPublicAttribution(await listPublicResearchRecords(listResearchRecords));
}
