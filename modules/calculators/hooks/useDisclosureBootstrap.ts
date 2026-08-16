"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { listClients, type Client } from "@/modules/clients/api/clientsApi";
import type {
  DisclosureClientStatus,
  DisclosureReportResponse,
} from "@/modules/calculators/domain/disclosureTypes";

export type DisclosureRecordHandlers<TInputs> = {
  applyInputs: (inputs?: TInputs) => void;
  setResult: (record: DisclosureReportResponse<TInputs> | null) => void;
};

type DisclosureApi<TInputs> = {
  getClientStatus: (fy: string) => Promise<DisclosureClientStatus[]>;
  getRecord: (clientId: string, fiscalYear: string) => Promise<DisclosureReportResponse<TInputs> | null>;
  getMsmeRecord?: (fiscalYear: string) => Promise<DisclosureReportResponse<TInputs> | null>;
};

export function useDisclosureBootstrap<TInputs>(
  cachePrefix: string,
  api: DisclosureApi<TInputs>,
  enabled: boolean,
  isMsme: boolean,
  fiscalYear: string,
  handlersRef: RefObject<DisclosureRecordHandlers<TInputs> | null>,
) {
  void cachePrefix;
  const apiRef = useRef(api);
  apiRef.current = api;

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [clientStatus, setClientStatus] = useState<DisclosureClientStatus[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [recordLoading, setRecordLoading] = useState(false);
  const clientsFetchedRef = useRef(false);

  const refreshStatus = useCallback(async () => {
    if (!enabled || !fiscalYear) return;
    try {
      setClientStatus(await apiRef.current.getClientStatus(fiscalYear));
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
    void apiRef.current.getClientStatus(fiscalYear)
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
    if (!fiscalYear) return;
    if (!isMsme && (!enabled || !clientId)) return;
    if (isMsme && !apiRef.current.getMsmeRecord) return;

    let cancelled = false;

    const applyRecord = (record: DisclosureReportResponse<TInputs> | null) => {
      const handlers = handlersRef.current;
      if (!handlers) return;
      if (record?.inputs) {
        handlers.applyInputs(record.inputs);
        handlers.setResult(record);
      } else {
        handlers.applyInputs(undefined);
        handlers.setResult(null);
      }
    };

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setRecordLoading(true);
      try {
        const record = isMsme
          ? await apiRef.current.getMsmeRecord!(fiscalYear)
          : await apiRef.current.getRecord(clientId, fiscalYear);
        if (!cancelled) applyRecord(record);
      } catch {
        if (!cancelled) {
          handlersRef.current?.applyInputs(undefined);
          handlersRef.current?.setResult(null);
        }
      } finally {
        if (!cancelled) setRecordLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, isMsme, clientId, fiscalYear, handlersRef]);

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
