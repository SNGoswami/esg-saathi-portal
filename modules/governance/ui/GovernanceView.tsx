"use client";

import { DisclosureWorkspace } from "@/modules/calculators/ui/DisclosureWorkspace";
import {
  getGovernanceClientStatus,
  getGovernanceHistory,
  getGovernanceMsmeRecord,
  getGovernanceRecord,
  saveGovernanceReport,
} from "@/modules/governance/api/governanceApi";
import {
  emptyGovernanceForm,
  formFromGovernanceInputs,
  GOVERNANCE_SECTIONS,
  inputsFromGovernanceForm,
  policyMatrixFromInputs,
} from "@/modules/governance/domain/fieldSchema";
import { emptyPolicyMatrix } from "@/modules/governance/domain/types";
import { PolicyMatrixEditor } from "@/modules/governance/ui/PolicyMatrixEditor";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole } from "@/modules/platform/rbac/roles";

export default function GovernanceView({
  onNavigateToReport,
}: {
  onNavigateToReport?: (category: string, reportId: string) => void;
}) {
  const role = normalizeRole(useAuth().user?.role);
  const isMsme = role === "msme";

  return (
    <DisclosureWorkspace
      title={isMsme ? "Selective" : "Governance"}
      reportCategory="governance"
      sections={GOVERNANCE_SECTIONS}
      emptyForm={emptyGovernanceForm}
      formFromInputs={formFromGovernanceInputs}
      inputsFromForm={inputsFromGovernanceForm}
      policyMatrixFromInputs={policyMatrixFromInputs}
      renderPolicyMatrix={({ rows, onChange, readOnly }) => (
        <PolicyMatrixEditor rows={rows.length ? rows : emptyPolicyMatrix()} onChange={onChange} readOnly={readOnly} />
      )}
      onNavigateToReport={onNavigateToReport}
      processingDesc="Saving governance disclosures and computing metrics."
      successDesc="Your Governance report is ready in Reports."
      api={{
        save: saveGovernanceReport,
        history: getGovernanceHistory,
        getClientStatus: getGovernanceClientStatus,
        getRecord: (clientId, fiscalYear) => getGovernanceRecord(clientId, fiscalYear),
        getMsmeRecord: getGovernanceMsmeRecord,
      }}
    />
  );
}
