"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { listClients, type Client } from "@/modules/clients/api/clientsApi";
import { getWorkforceClientStatus, getWorkforceRecord } from "@/modules/workforce/api/workforceApi";
import type { WorkforceClientStatus, WorkforceReportResponse, WorkforceInputs } from "@/modules/workforce/domain/types";

export type WorkforceRecordHandlers = {
  applyForm: (inputs?: WorkforceInputs) => void;
  setResult: (record: WorkforceReportResponse | null) => void;
};

export function useWorkforceClientBootstrap(
  enabled: boolean,
  fiscalYear: string,
  handlersRef: RefObject<WorkforceRecordHandlers | null>,
) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [clientStatus, setClientStatus] = useState<WorkforceClientStatus[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [recordLoading, setRecordLoading] = useState(false);
  const clientsFetchedRef = useRef(false);

  const refreshStatus = useCallback(async () => {
    if (!enabled || !fiscalYear) return;
    try {
      setClientStatus(await getWorkforceClientStatus(fiscalYear));
    } catch {
      setClientStatus([]);
    }
  }, [enabled, fiscalYear]);

  useEffect(() => {
    if (!enabled || !fiscalYear) {
      if (!enabled) clientsFetchedRef.current = false;
      return;
    }

    let cancelled = false;
    void getWorkforceClientStatus(fiscalYear)
      .then((rows) => {
        if (!cancelled) setClientStatus(rows);
      })
      .catch(() => {
        if (!cancelled) setClientStatus([]);
      });

    if (clientsFetchedRef.current) {
      return () => {
        cancelled = true;
      };
    }
    clientsFetchedRef.current = true;

    void listClients(0, 100)
      .then((res) => {
        if (cancelled) return;
        setClients(res.content);
        setClientId((prev) => prev || res.content[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled) setClients([]);
      })
      .finally(() => {
        if (!cancelled) setClientsLoading(false);
      });

    queueMicrotask(() => {
      if (!cancelled) setClientsLoading(true);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, fiscalYear]);

  useEffect(() => {
    if (!enabled || !clientId || !fiscalYear) return;

    let cancelled = false;

    const applyRecord = (record: WorkforceReportResponse | null) => {
      const handlers = handlersRef.current;
      if (!handlers) return;
      if (record) {
        handlers.applyForm(record.inputs);
        handlers.setResult(record);
      } else {
        handlers.applyForm(undefined);
        handlers.setResult(null);
      }
    };

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setRecordLoading(true);
      try {
        const record = await getWorkforceRecord(clientId, fiscalYear);
        if (!cancelled) applyRecord(record);
      } catch {
        if (!cancelled) {
          handlersRef.current?.applyForm(undefined);
          handlersRef.current?.setResult(null);
        }
      } finally {
        if (!cancelled) setRecordLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, clientId, fiscalYear, handlersRef]);

  return {
    clients,
    clientId,
    setClientId,
    clientStatus,
    clientsLoading,
    recordLoading,
    refreshStatus,
  };
}
