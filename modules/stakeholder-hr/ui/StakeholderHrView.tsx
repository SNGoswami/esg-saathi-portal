"use client";

import { DisclosureWorkspace } from "@/modules/calculators/ui/DisclosureWorkspace";
import {
  getStakeholderHrClientStatus,
  getStakeholderHrHistory,
  getStakeholderHrMsmeRecord,
  getStakeholderHrRecord,
  saveStakeholderHrReport,
} from "@/modules/stakeholder-hr/api/stakeholderHrApi";
import {
  emptyStakeholderHrForm,
  formFromStakeholderInputs,
  inputsFromStakeholderForm,
  STAKEHOLDER_HR_SECTIONS,
} from "@/modules/stakeholder-hr/domain/fieldSchema";

export default function StakeholderHrView({
  onNavigateToReport,
}: {
  onNavigateToReport?: (category: string, reportId: string) => void;
}) {
  return (
    <DisclosureWorkspace
      title="Stakeholder & HR"
      reportCategory="stakeholder-hr"
      sections={STAKEHOLDER_HR_SECTIONS}
      emptyForm={emptyStakeholderHrForm}
      formFromInputs={formFromStakeholderInputs}
      inputsFromForm={inputsFromStakeholderForm}
      onNavigateToReport={onNavigateToReport}
      processingDesc="Saving stakeholder and HR disclosures."
      successDesc="Your Stakeholder & HR report is ready in Reports."
      api={{
        save: saveStakeholderHrReport,
        history: getStakeholderHrHistory,
        getClientStatus: getStakeholderHrClientStatus,
        getRecord: (clientId, fiscalYear) => getStakeholderHrRecord(clientId, fiscalYear),
        getMsmeRecord: getStakeholderHrMsmeRecord,
      }}
    />
  );
}
