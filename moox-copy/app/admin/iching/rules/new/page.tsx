import { MasterRuleFormClient } from "@/components/iching/MasterRuleFormClient";

export default function AdminIchingRulesNewPage() {
  return (
    <div className="p-0">
      <MasterRuleFormClient mode="create" initial={{}} />
    </div>
  );
}

