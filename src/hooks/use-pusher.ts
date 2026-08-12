"use client";

import { useEffect, useState } from "react";
import Pusher from "pusher-js";

export function usePusher(channelName: string, eventName: string, onEvent: (data: any) => void) {
  const [pusherClient, setPusherClient] = useState<Pusher | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_APP_KEY) {
      console.warn("Thiếu NEXT_PUBLIC_PUSHER_APP_KEY");
      return;
    }

    // Khởi tạo Pusher ở Client
    const client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
    });

    setPusherClient(client);

    // Subscribe vào channel
    const channel = client.subscribe(channelName);
    channel.bind(eventName, (data: any) => {
      onEvent(data);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      client.disconnect();
    };
  }, [channelName, eventName, onEvent]);

  return pusherClient;
}
