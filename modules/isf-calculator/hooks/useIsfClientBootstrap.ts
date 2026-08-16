"use client";



import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { listClients, type Client } from "@/modules/clients/api/clientsApi";

import { getIsfClientStatus, getIsfRecord } from "@/modules/isf-calculator/api/isfApi";

import type {

  IsfCalculationResponse,

  IsfClientStatus,

  IsfSavedInputs,

} from "@/modules/isf-calculator/domain/types";



export type IsfRecordHandlers = {

  applyInputs: (inputs?: IsfSavedInputs) => void;

  setResult: (record: IsfCalculationResponse | null) => void;

};



/**

 * Professional-role client workspace: list, status, and per-client saved record.

 */

export function useIsfClientBootstrap(

  enabled: boolean,

  fiscalYear: string,

  handlersRef: RefObject<IsfRecordHandlers | null>,

) {

  const [clients, setClients] = useState<Client[]>([]);

  const [clientId, setClientId] = useState("");

  const [clientStatus, setClientStatus] = useState<IsfClientStatus[]>([]);

  const [clientsLoading, setClientsLoading] = useState(false);

  const [recordLoading, setRecordLoading] = useState(false);

  const clientsFetchedRef = useRef(false);



  const refreshStatus = useCallback(async () => {

    if (!enabled || !fiscalYear) return;

    try {

      setClientStatus(await getIsfClientStatus(fiscalYear));

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

    void getIsfClientStatus(fiscalYear)

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



    const applyRecord = (record: IsfCalculationResponse | null) => {

      const handlers = handlersRef.current;

      if (!handlers) return;

      if (record) {

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

        const record = await getIsfRecord(clientId, fiscalYear);

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

