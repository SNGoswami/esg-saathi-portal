"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import { listClients, type Client } from "@/modules/clients/api/clientsApi";

import { getNzeClientStatus } from "@/modules/net-zero/api/nzeApi";

import type { NzeClientStatus } from "@/modules/net-zero/domain/types";



export function useNzeClientBootstrap(enabled: boolean) {

  const [clients, setClients] = useState<Client[]>([]);

  const [clientId, setClientId] = useState("");

  const [clientStatus, setClientStatus] = useState<NzeClientStatus[]>([]);

  const [clientsLoading, setClientsLoading] = useState(false);

  const clientsFetchedRef = useRef(false);



  const refreshStatus = useCallback(async () => {

    if (!enabled) return;

    try {

      setClientStatus(await getNzeClientStatus());

    } catch {

      setClientStatus([]);

    }

  }, [enabled]);



  useEffect(() => {

    if (!enabled) {

      clientsFetchedRef.current = false;

      return;

    }



    let cancelled = false;

    void getNzeClientStatus()

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

  }, [enabled]);



  return { clients, clientId, setClientId, clientStatus, clientsLoading, refreshStatus };

}

