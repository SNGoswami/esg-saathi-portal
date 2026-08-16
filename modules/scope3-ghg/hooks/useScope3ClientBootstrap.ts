"use client";



import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { listClients, type Client } from "@/modules/clients/api/clientsApi";

import { calcCacheKey, readCalculatorCache } from "@/modules/calculators/cache/calculatorCache";

import { getScope3ClientStatus, getScope3Record } from "@/modules/scope3-ghg/api/scope3Api";

import type { Scope3ClientStatus, Scope3SummaryResponse } from "@/modules/scope3-ghg/domain/types";



export type Scope3RecordHandlers = {

  setSummary: (summary: Scope3SummaryResponse | null) => void;

};



export function useScope3ClientBootstrap(

  enabled: boolean,

  fiscalYear: string,

  handlersRef: RefObject<Scope3RecordHandlers | null>,

) {

  const [clients, setClients] = useState<Client[]>([]);

  const [clientId, setClientId] = useState("");

  const [clientStatus, setClientStatus] = useState<Scope3ClientStatus[]>([]);

  const [clientsLoading, setClientsLoading] = useState(false);

  const [recordLoading, setRecordLoading] = useState(false);

  const clientsFetchedRef = useRef(false);



  const refreshStatus = useCallback(async () => {

    if (!enabled || !fiscalYear) return;

    try {

      setClientStatus(await getScope3ClientStatus(fiscalYear));

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

    void getScope3ClientStatus(fiscalYear)

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

    const recordKey = calcCacheKey("scope3", "record", clientId, fiscalYear);

    const cached = readCalculatorCache<Scope3SummaryResponse | null>(recordKey);

    const hadCache = cached !== null;

    if (hadCache) {

      handlersRef.current?.setSummary(cached);

    }



    void (async () => {

      if (!hadCache) {

        await Promise.resolve();

        if (cancelled) return;

        setRecordLoading(true);

      }

      try {

        const record = await getScope3Record(clientId, fiscalYear);

        if (!cancelled) handlersRef.current?.setSummary(record);

      } catch {

        if (!cancelled) handlersRef.current?.setSummary(null);

      } finally {

        if (!cancelled && !hadCache) setRecordLoading(false);

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

