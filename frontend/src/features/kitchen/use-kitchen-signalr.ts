"use client";

import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { config } from "@/lib/config";
import { readSession } from "@/lib/auth/storage";
import type { KitchenEvent } from "@/types/kitchen";

type Props = {
  branchId: string | null;
  onEvent?: (event: KitchenEvent) => void;
};

export function useKitchenSignalR({ branchId, onEvent }: Props) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const session = readSession();
    if (!branchId || !session?.accessToken) return;

    let isSubscribed = true;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${config.signalRUrl ?? config.apiUrl}/hubs/kitchen`, {
        accessTokenFactory: () => readSession()?.accessToken ?? "",
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.None)
      .build();

    connectionRef.current = connection;

    const handleKitchenEvent = (evt: KitchenEvent, evtName: string) => {
      if (onEventRef.current) {
        onEventRef.current({ ...evt, eventName: evt.eventName || evtName });
      }
    };

    const events = [
      "KitchenOrderCreated",
      "NewOrderCreated",
      "OrderReadyForServing",
      "KitchenOrderAccepted",
      "KitchenOrderPreparing",
      "KitchenOrderReady",
      "KitchenOrderCompleted",
      "KitchenOrderCancelled",
    ];

    events.forEach((evtName) => {
      connection.on(evtName, (evt: KitchenEvent) => handleKitchenEvent(evt, evtName));
    });

    connection.onreconnecting(() => {
      if (isSubscribed) setIsConnected(false);
    });

    connection.onreconnected(async () => {
      if (isSubscribed) {
        setIsConnected(true);
        try {
          await connection.invoke("JoinBranch", branchId);
        } catch (e) {
          console.warn("Error re-joining branch group:", e);
        }
      }
    });

    connection.onclose(() => {
      if (isSubscribed) setIsConnected(false);
    });

    async function startConnection() {
      try {
        await connection.start();
        if (isSubscribed) {
          setIsConnected(true);
          setConnectionError(null);
          await connection.invoke("JoinBranch", branchId);
        }
      } catch (err: unknown) {
        if (isSubscribed) {
          setIsConnected(false);
          const errorMsg = err instanceof Error ? err.message : "Không thể kết nối máy chủ thời gian thực.";
          setConnectionError(errorMsg);
        }
      }
    }

    startConnection();

    return () => {
      isSubscribed = false;
      if (connectionRef.current) {
        try {
          connectionRef.current.invoke("LeaveBranch", branchId).catch(() => {});
          connectionRef.current.stop().catch(() => {});
        } catch {
          // ignore
        }
        connectionRef.current = null;
      }
    };
  }, [branchId]);

  return { isConnected, connectionError };
}
