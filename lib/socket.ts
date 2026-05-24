"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1")
  .replace(/\/api\/v1\/?$/, "")
  .replace(/\/+$/, "");

let sharedSocket: Socket | null = null;

const getSocket = () => {
  if (sharedSocket) return sharedSocket;
  sharedSocket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
  });
  return sharedSocket;
};

type InboxHandlers = {
  onNewMessage?: (payload: any) => void;
  onMessageRead?: (payload: any) => void;
  onNewConversation?: (payload: any) => void;
};

export function useInboxSocket(activeChatId: string | null, handlers: InboxHandlers) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?._id;
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    const join = () => socket.emit("join-user-room", { _id: userId });
    if (socket.connected) join();
    socket.on("connect", join);

    const onNewMessage = (payload: any) => handlersRef.current.onNewMessage?.(payload);
    const onMessageRead = (payload: any) => handlersRef.current.onMessageRead?.(payload);
    const onNewConversation = (payload: any) =>
      handlersRef.current.onNewConversation?.(payload);

    socket.on("inbox:new-message", onNewMessage);
    socket.on("inbox:read", onMessageRead);
    socket.on("inbox:new-conversation", onNewConversation);

    return () => {
      socket.off("connect", join);
      socket.off("inbox:new-message", onNewMessage);
      socket.off("inbox:read", onMessageRead);
      socket.off("inbox:new-conversation", onNewConversation);
    };
  }, [userId]);

  useEffect(() => {
    if (!activeChatId) return;
    const socket = getSocket();
    const join = () => socket.emit("join-chat", { _id: activeChatId });
    if (socket.connected) join();
    socket.on("connect", join);
    return () => {
      socket.emit("leave-chat", activeChatId);
      socket.off("connect", join);
    };
  }, [activeChatId]);
}

export function useSocketEvent<T = any>(event: string, handler: (payload: T) => void) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?._id;
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    const join = () => socket.emit("join-user-room", { _id: userId });
    if (socket.connected) join();
    socket.on("connect", join);
    const wrapped = (payload: T) => handlerRef.current(payload);
    socket.on(event, wrapped);
    return () => {
      socket.off("connect", join);
      socket.off(event, wrapped);
    };
  }, [userId, event]);
}
