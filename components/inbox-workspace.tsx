"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { inboxApi, mailApi } from "@/lib/api";
import { useInboxSocket } from "@/lib/socket";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatTime, getInitials, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  Download,
  Edit,
  File,
  FileText,
  Image,
  Mail,
  MessageSquare,
  MoreVertical,
  Music,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  Smile,
  StickyNote,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";

type InboxWorkspaceProps = {
  dashboardKey: string;
  subtitle: string;
  recipientSearchPlaceholder: string;
  emptyConversationText: string;
  taskHref?: string;
};

type PinItem = {
  id: string;
  conversationId: string;
  type: "message" | "note";
  body: string;
  createdAt: string;
  authorName?: string;
};

type FilterTab = "all" | "unread" | "groups";

const EMOJI_CATEGORIES = [
  {
    id: "smileys", label: "Smileys & People", icon: "😊",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤧","🥵","🥶","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾","👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🤲","🤝","🙏","✍️","💪","🦾","👀","👄","💋","💅","🧠","🫀","🫁"],
  },
  {
    id: "animals", label: "Animals & Nature", icon: "🐶",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🦋","🐛","🐌","🐞","🐜","🦗","🦟","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🦭","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🐈","🐓","🦃","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦦","🦥","🐁","🐀","🐿️","🦔","🌵","🎄","🌲","🌳","🌴","🌱","🌿","☘️","🍀","🎍","🎋","🍃","🍂","🍁","🍄","🌾","💐","🌷","🌹","🥀","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌟","⭐","🌠","☀️","🌤️","⛅","🌈","☁️","⛈️","🌩️","🌧️","⛄","❄️","🔥","💧","🌊","🌋","🌍","🌏"],
  },
  {
    id: "food", label: "Food & Drink", icon: "🍕",
    emojis: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍑","🍒","🍍","🥭","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🧄","🧅","🥔","🍠","🥜","🌰","🍞","🥐","🥖","🫓","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🫔","🌮","🌯","🥙","🧆","🥘","🍲","🥗","🍿","🧂","🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣","🍤","🍥","🥮","🍡","🥟","🥠","🥡","🦀","🦞","🦐","🦑","🦪","🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","☕","🫖","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾","🧊","🥄","🍴","🍽️","🥢","🧁"],
  },
  {
    id: "activities", label: "Activities", icon: "⚽",
    emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎯","🪆","🎮","🎲","♟️","🎭","🎨","🖼️","🎪","🎠","🎡","🎢","💃","🕺","🎬","🎤","🎧","🎼","🎵","🎶","🎹","🥁","🪘","🎸","🎷","🎺","🎻","🪕","🎙️","🎚️","🎛️","📻","🏆","🥇","🥈","🥉","🏅","🎖️","🏵️","🎗️","🎫","🎟️","🎪","🤼","🤸","🤺","🏇","⛷️","🏂","🪂","🏋️","🤼","🤸","🤺","🤾","🏌️","🏄","🚣","🧗","🚵","🚴","🧘","🛌","🧖"],
  },
  {
    id: "travel", label: "Travel & Places", icon: "✈️",
    emojis: ["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🚚","🚛","🚜","🏗️","🚲","🛵","🏍️","🛺","🚁","🛸","🚀","🛳️","🚢","🛥️","🚤","⛵","🛶","✈️","🛫","🛬","🪂","💺","🚂","🚃","🚄","🚅","🚆","🚇","🚈","🚉","🚊","🚞","🚝","🚋","🚠","🚡","🚟","🛰️","🚀","⛽","🚧","⚓","🗿","🗼","🗽","⛪","🕌","🕍","⛩️","🕋","🏰","🏯","🏟️","🎡","🎢","🎠","⛲","⛺","🌁","🌃","🌆","🌇","🌉","🎑","🏖️","🏝️","🏜️","🏔️","⛰️","🌋","🗻","🏕️","🏗️","🏘️","🏙️","🌐","🗺️","🧭","🌅","🌄","🌠","🎇","🎆","🌇","🌆","🗾","🏞️","🌌","🌉","🌁"],
  },
  {
    id: "objects", label: "Objects", icon: "💡",
    emojis: ["💡","🔦","🕯️","🪔","🧱","🪟","🪞","🛋️","🪑","🚪","🛏️","🛁","🪤","🧹","🧺","🧻","🪣","🧼","🫧","🪥","🧴","🧷","🧲","🧰","🪛","🔧","🔩","⚙️","🗜️","🔗","⛓️","🪝","🔨","⛏️","🪚","🔑","🗝️","🔐","🔒","🔓","🏺","🧿","📿","💎","💍","👑","🎩","🧢","👒","🪖","⛑️","🪄","🎀","🎁","🎈","🎉","🎊","🎋","🎍","🎑","🧧","🎎","🎏","🎐","📦","📫","📬","📭","📮","📯","📢","📣","📻","📺","📷","📸","🔭","🔬","🩺","💊","🩹","🩺","🩻","🧬","🔬","🔭","🛡️","🪖","🔫","💣","🪤","🗡️","⚔️","🛡️","🪃","🏹","🔱","🚬","⚗️","🔮","🧿","📿","🪬","💈","⚙️","🔧","🪜","🧲","🔑"],
  },
  {
    id: "symbols", label: "Symbols", icon: "❤️",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☯️","✡️","🕎","☪️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🔯","♀️","♂️","⚧️","✖️","➕","➖","➗","♾️","💲","💱","™️","©️","®️","〰️","➰","➿","🔚","🔙","🔛","🔜","🔝","🔀","🔁","🔂","▶️","⏸️","⏹️","⏺️","⏭️","⏮️","⏩","⏪","⏫","⏬","🔃","🔄","🎦","🔅","🔆","📶","📳","📴","📵","📴","🚫","⛔","🚳","🚭","🚯","🚰","🚱","🔞","💯","🔃","✅","❌","❎","💠","🔷","🔶","🔹","🔸","🔺","🔻","🔲","🔳","▪️","▫️","◾","◽","◼️","◻️","⬛","⬜"],
  },
];

const EMOJI_CATEGORY_ICONS: Record<string, string> = {
  smileys: "😊",
  animals: "🐶",
  food: "🍕",
  activities: "⚽",
  travel: "✈️",
  objects: "💡",
  symbols: "❤️",
};

const getOtherParticipant = (conversation: any, currentUserId?: string) => {
  if (!conversation) return null;
  return (conversation.participants || []).find(
    (participant: any) => String(participant._id) !== String(currentUserId)
  );
};

const getConversationName = (conversation: any, currentUserId?: string) => {
  if (conversation?.groupName) return conversation.groupName;
  return getOtherParticipant(conversation, currentUserId)?.name || "Conversation";
};

const formatLastTime = (value?: string | Date | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return formatTime(date);
  }
  return formatDate(date);
};

const getFileLabel = (message: any) => {
  if (message?.fileName) return message.fileName;
  if (!message?.fileUrl) return "Attachment";
  try {
    return decodeURIComponent(String(message.fileUrl).split("/").pop() || "Attachment");
  } catch {
    return "Attachment";
  }
};

const getFileTypeStyle = (name: string) => {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return { bg: "bg-red-500/20", text: "text-red-400" };
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return { bg: "bg-yellow-500/20", text: "text-yellow-400" };
  if (["doc", "docx", "odt"].includes(ext)) return { bg: "bg-blue-500/20", text: "text-blue-400" };
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return { bg: "bg-green-500/20", text: "text-green-400" };
  return { bg: "bg-blue-600/15", text: "text-blue-300" };
};

const getFileTypeLabel = (name: string) => {
  return (name.split(".").pop() || "file").toUpperCase();
};

const isImageFile = (message: any) => {
  if (message.fileType?.startsWith("image/")) return true;
  const ext = (getFileLabel(message).split(".").pop() || "").toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
};

const isVideoFile = (message: any) => {
  if (message.fileType?.startsWith("video/")) return true;
  const ext = (getFileLabel(message).split(".").pop() || "").toLowerCase();
  return ["mp4", "mov", "avi", "webm", "mkv"].includes(ext);
};;

function usePersistentState<T>(key: string, fallback: T) {
  const [state, setState] = useState<T>(fallback);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        setState(JSON.parse(raw));
      }
    } catch {
      window.localStorage.removeItem(key);
    }
  }, [key]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}

export function InboxWorkspace({
  dashboardKey,
  subtitle,
  recipientSearchPlaceholder,
  emptyConversationText,
  taskHref,
}: InboxWorkspaceProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?._id;

  const [activeTab, setActiveTab] = useState<"chat" | "email">("chat");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [emailFolder, setEmailFolder] = useState<"inbox" | "sent">("inbox");
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailAttachment, setMailAttachment] = useState<File | null>(null);
  const [chatAttachment, setChatAttachment] = useState<File | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [pinnedDialogOpen, setPinnedDialogOpen] = useState(false);
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [deleteChatConfirmOpen, setDeleteChatConfirmOpen] = useState(false);

  const [pinnedItems, setPinnedItems] = usePersistentState<PinItem[]>(
    `${dashboardKey}:inbox:pinned`,
    []
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: conversationsResponse, isLoading: conversationsLoading } = useQuery({
    queryKey: ["inbox-conversations"],
    queryFn: () => inboxApi.getChats().then((response) => response.data),
    enabled: activeTab === "chat",
  });

  const conversations: any[] = useMemo(
    () => conversationsResponse?.data || [],
    [conversationsResponse?.data]
  );

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (filterTab === "unread" && !conversation.unreadCount) return false;
      if (filterTab === "groups" && !conversation.isGroup) return false;
      if (!term) return true;
      const name = getConversationName(conversation, currentUserId).toLowerCase();
      const lastMessage = String(conversation.lastMessage || "").toLowerCase();
      return name.includes(term) || lastMessage.includes(term);
    });
  }, [conversations, currentUserId, search, filterTab]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    if (!selectedId && filteredConversations.length > 0) {
      setSelectedId(String(filteredConversations[0]._id));
    }
  }, [activeTab, filteredConversations, selectedId]);

  const selectedConversation = conversations.find(
    (conversation) => String(conversation._id) === selectedId
  );

  const { data: threadResponse, isLoading: threadLoading } = useQuery({
    queryKey: ["inbox-conversation", selectedId],
    enabled: activeTab === "chat" && Boolean(selectedId) && !String(selectedId).startsWith("pending-"),
    queryFn: () =>
      inboxApi.getChatById(String(selectedId)).then((response) => response.data),
  });

  const thread = threadResponse?.data;
  const messages: any[] = thread?.messages || (selectedConversation as any)?.messages || [];
  const recipient = getOtherParticipant(selectedConversation, currentUserId);

  const { data: mailsResponse, isLoading: mailsLoading } = useQuery({
    queryKey: ["mail-list", emailFolder],
    enabled: activeTab === "email",
    queryFn: () =>
      mailApi.getAll({ type: emailFolder, limit: 25 }).then((response) => response.data),
  });

  const mails: any[] = mailsResponse?.data?.mails || [];
  const selectedMail = mails.find((mail) => String(mail._id) === String(selectedMailId)) || mails[0] || null;

  useEffect(() => {
    if (activeTab !== "email") return;
    if (selectedMail && String(selectedMailId) !== String(selectedMail._id)) {
      setSelectedMailId(String(selectedMail._id));
    }
  }, [activeTab, selectedMail, selectedMailId]);

  useEffect(() => {
    if (recipient?.email) {
      setMailTo(recipient.email);
    }
  }, [recipient?.email]);

  const sendMutation = useMutation({
    mutationFn: () => {
      if (chatAttachment) {
        const payload = new FormData();
        payload.append("recipientId", String(recipient?._id));
        payload.append("content", draft.trim());
        payload.append("file", chatAttachment);
        return inboxApi.sendMessage(payload);
      }
      return inboxApi.sendMessage({
        recipientId: String(recipient?._id),
        content: draft.trim(),
      });
    },
    onSuccess: (response) => {
      const realId = response.data?.data?.conversationId;
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      if (realId) {
        setSelectedId(String(realId));
        queryClient.invalidateQueries({ queryKey: ["inbox-conversation", String(realId)] });
      }
      setDraft("");
      setChatAttachment(null);
      if (chatFileInputRef.current) chatFileInputRef.current.value = "";
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to send"),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => inboxApi.markRead(id),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      inboxApi.deleteMessage(conversationId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversation", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Message deleted");
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to delete message"),
  });

  const editMessageMutation = useMutation({
    mutationFn: ({ conversationId, messageId, content }: { conversationId: string; messageId: string; content: string }) =>
      inboxApi.editMessage(conversationId, messageId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversation", selectedId] });
      setEditingMessageId(null);
      setEditDraft("");
      toast.success("Message updated");
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to edit message"),
  });

  const deleteChatMutation = useMutation({
    mutationFn: (id: string) => inboxApi.deleteChat(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      setSelectedId(null);
      setDeleteChatConfirmOpen(false);
      toast.success("Conversation deleted");
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to delete conversation"),
  });

  const sendMailMutation = useMutation({
    mutationFn: () => {
      const payload = new FormData();
      payload.append("to", mailTo.trim());
      payload.append("subject", mailSubject.trim());
      payload.append("body", mailBody.trim());
      if (mailAttachment) {
        payload.append("attachments", mailAttachment);
      }
      return mailApi.create(payload);
    },
    onSuccess: () => {
      toast.success("Email sent");
      setMailDialogOpen(false);
      setMailSubject("");
      setMailBody("");
      setMailAttachment(null);
      queryClient.invalidateQueries({ queryKey: ["mail-list"] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to send email"),
  });

  useEffect(() => {
    if (!selectedId || !thread || String(selectedId).startsWith("pending-")) return;
    const unread = (thread.messages || []).some(
      (message: any) =>
        String(message.sender_id) !== String(currentUserId) && !message.isRead
    );
    if (unread) {
      markReadMutation.mutate(selectedId, {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, thread?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useInboxSocket(activeTab === "chat" ? selectedId : null, {
    onNewMessage: (payload: any) => {
      const conversationId = String(payload.conversationId);
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      if (selectedId && conversationId === selectedId) {
        queryClient.setQueryData(
          ["inbox-conversation", selectedId],
          (current: any) => {
            if (!current?.data) return current;
            const exists = current.data.messages?.some(
              (m: any) => String(m._id) === String(payload.message?._id)
            );
            if (exists) return current;
            return {
              ...current,
              data: {
                ...current.data,
                messages: [...(current.data.messages || []), payload.message],
                lastMessage: payload.lastMessage,
                lastMessageAt: payload.lastMessageAt,
              },
            };
          }
        );
      }
    },
    onMessageRead: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: ["inbox-conversation", selectedId] });
      }
    },
    onNewConversation: () =>
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] }),
  });

  const canSend =
    Boolean(recipient?._id) &&
    (draft.trim().length > 0 || Boolean(chatAttachment)) &&
    !sendMutation.isPending;

  const sharedFiles = useMemo(
    () =>
      messages
        .filter((message) => message.fileUrl)
        .map((message) => ({
          id: String(message._id),
          url: message.fileUrl,
          name: getFileLabel(message),
          type: message.fileType || "file",
          createdAt: message.sentAt || message.createdAt,
        })),
    [messages]
  );

  const pinnedForConversation = useMemo(
    () =>
      pinnedItems.filter(
        (item) => item.conversationId === String(selectedConversation?._id || selectedId || "")
      ),
    [pinnedItems, selectedConversation?._id, selectedId]
  );

  const messagesWithSeparators = useMemo(() => {
    const items: Array<{ kind: "separator" | "newMessages" | "message"; label?: string; data?: any }> = [];
    let lastDateKey = "";
    let newMessagesInserted = false;

    for (const msg of messages) {
      const date = new Date(msg.sentAt || msg.createdAt);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const dateKey = date.toDateString();

      if (dateKey !== lastDateKey) {
        items.push({ kind: "separator", label: isToday ? "Today" : formatDate(date) });
        lastDateKey = dateKey;
      }

      const isMe = String(msg.sender_id) === String(currentUserId);
      if (!isMe && !msg.isRead && !newMessagesInserted) {
        items.push({ kind: "newMessages", label: "New Messages" });
        newMessagesInserted = true;
      }

      items.push({ kind: "message", data: msg });
    }

    return items;
  }, [messages, currentUserId]);

  const handleStartConversation = (peer: any) => {
    setComposerOpen(false);
    setActiveTab("chat");
    const existing = conversations.find((conversation) => {
      if (conversation.isGroup) return false;
      return (conversation.participants || []).some(
        (participant: any) => String(participant._id) === String(peer._id)
      );
    });

    if (existing) {
      setSelectedId(String(existing._id));
      return;
    }

    const placeholderId = `pending-${peer._id}`;
    queryClient.setQueryData(["inbox-conversations"], (current: any) => {
      const list = current?.data || [];
      if (list.some((c: any) => String(c._id) === placeholderId)) return current;
      const placeholder = {
        _id: placeholderId,
        participants: [
          { _id: currentUserId, name: session?.user?.name },
          peer,
        ],
        messages: [],
        lastMessage: "",
        lastMessageAt: null,
        unreadCount: 0,
        isGroup: false,
        __pending: true,
      };
      return { ...(current || {}), data: [placeholder, ...list] };
    });
    setSelectedId(placeholderId);
  };

  const handlePinnedToggle = (message: any) => {
    if (!selectedConversation?._id) return;
    const messageId = String(message._id);
    const conversationId = String(selectedConversation._id);
    const exists = pinnedItems.some(
      (item) => item.type === "message" && item.id === messageId
    );
    if (exists) {
      setPinnedItems((current) => current.filter((item) => item.id !== messageId));
      return;
    }
    setPinnedItems((current) => [
      {
        id: messageId,
        conversationId,
        type: "message",
        body: message.content || getFileLabel(message),
        createdAt: message.sentAt || message.createdAt || new Date().toISOString(),
        authorName:
          String(message.sender_id) === String(currentUserId)
            ? "You"
            : recipient?.name || "Contact",
      },
      ...current,
    ]);
  };

  const handleSaveNote = () => {
    if (!selectedConversation?._id || !noteDraft.trim()) return;
    setPinnedItems((current) => [
      {
        id: `note-${Date.now()}`,
        conversationId: String(selectedConversation._id),
        type: "note",
        body: noteDraft.trim(),
        createdAt: new Date().toISOString(),
        authorName: "You",
      },
      ...current,
    ]);
    setNoteDraft("");
    setNoteDialogOpen(false);
    toast.success("Note saved");
  };

  const startMeeting = () => {
    window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
  };

  const navigateToTask = () => {
    if (!taskHref) {
      toast.info("Task page is not configured for this dashboard.");
      return;
    }
    router.push(taskHref);
  };

  const navigateToCalendar = () => {
    router.push("/calendar");
  };

  const renderContactPanel = () => (
    <div className="hidden w-72 shrink-0 flex-col space-y-3 overflow-y-auto bg-[#0a1628] p-4 xl:flex">
      <h3 className="text-sm font-semibold text-gray-200">Contact Details</h3>
      {recipient ? (
        <>
          <div className="rounded-2xl border border-[#1e2d40] bg-[#0b1422] p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative shrink-0">
                <Avatar className="h-14 w-14">
                  {recipient.profileImage?.url ? (
                    <AvatarImage src={recipient.profileImage.url} alt={recipient.name} />
                  ) : (
                    <AvatarFallback className="text-sm">{getInitials(recipient.name || "U")}</AvatarFallback>
                  )}
                </Avatar>
                <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[#0b1422] bg-green-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-100 text-sm">{recipient.name}</p>
                <p className="text-xs text-green-400">Online</p>
                <p className="text-xs text-gray-400">{recipient.role?.replace(/_/g, " ")}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <ActionIcon label="Start Meeting" icon={Video} onClick={startMeeting} />
              <ActionIcon label="Create Task" icon={FileText} onClick={navigateToTask} />
              <ActionIcon label="Schedule" icon={CalendarDays} onClick={navigateToCalendar} />
              <ActionIcon label="Add Note" icon={StickyNote} onClick={() => setNoteDialogOpen(true)} />
            </div>
          </div>

          <div className="rounded-2xl border border-[#1e2d40] bg-[#0b1422] p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-100">About</h4>
            <InfoRow label="Email">{recipient.email || "—"}</InfoRow>
            <InfoRow label="Phone">{recipient.phoneNumber || "—"}</InfoRow>
            <InfoRow label="Department">{recipient.role?.replace(/_/g, " ") || "—"}</InfoRow>
            <InfoRow label="Employee Since">
              {recipient.createdAt ? formatDate(recipient.createdAt) : "—"}
            </InfoRow>
          </div>

          <div className="rounded-2xl border border-[#1e2d40] bg-[#0b1422] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-100">Shared Files</h4>
              <button
                type="button"
                onClick={() => setFilesDialogOpen(true)}
                className="text-[11px] text-blue-400 hover:text-blue-300"
              >
                View all
              </button>
            </div>
            <div className="space-y-2">
              {sharedFiles.length === 0 ? (
                <p className="text-xs text-gray-500">No files shared yet.</p>
              ) : (
                sharedFiles.slice(0, 3).map((file) => {
                  const style = getFileTypeStyle(file.name);
                  const ext = getFileTypeLabel(file.name);
                  return (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-[#182233] px-3 py-2 text-sm hover:border-blue-500/60"
                    >
                      <div className={`rounded-lg ${style.bg} p-2 ${style.text}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-gray-100">{file.name}</p>
                        <p className="text-[11px] text-gray-500">{ext} • {timeAgo(file.createdAt)}</p>
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#1e2d40] bg-[#0b1422] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-100">Pinned Messages</h4>
              <button
                type="button"
                onClick={() => setPinnedDialogOpen(true)}
                className="text-[11px] text-blue-400 hover:text-blue-300"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {pinnedForConversation.length === 0 ? (
                <p className="text-xs text-gray-500">No pinned items yet.</p>
              ) : (
                pinnedForConversation.slice(0, 2).map((item) => (
                  <div key={item.id} className="rounded-xl border border-[#182233] p-3">
                    <div className="flex items-start gap-2 mb-1">
                      <Pin className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                      <p className="line-clamp-2 text-sm text-gray-100">{item.body}</p>
                    </div>
                    <p className="text-[11px] text-gray-500 pl-5">
                      Pinned by {item.authorName || "You"} • {formatDate(item.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-500">
          Select a conversation to see contact details.
        </p>
      )}
    </div>
  );

  return (
    <div>
      <Header title="Inbox" subtitle={subtitle} />

      {/* Tabs row — inside content, below header */}
      <div className="flex items-center justify-end gap-2 border-b border-[#1e2d40] bg-[#070f1c] px-4 py-2 sm:px-6">
        <div className="flex items-center rounded-xl border border-[#1e2d40] bg-[#0a1628] p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "chat" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chats
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "email" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </button>
        </div>
        <Button size="sm" onClick={() => (activeTab === "chat" ? setComposerOpen(true) : setMailDialogOpen(true))}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {activeTab === "chat" ? "New Conversation" : "Compose Email"}
        </Button>
      </div>

      <div className="p-3 sm:p-4 lg:p-6">
        {activeTab === "chat" ? (
          <div
            className="flex overflow-hidden rounded-xl border border-[#1e2d40]"
            style={{ height: "calc(100vh - 200px)", minHeight: 520 }}
          >
            {/* Conversations List */}
            <div
              className={`${mobileView === "list" ? "flex" : "hidden"} w-72 shrink-0 flex-col border-r border-[#1e2d40] bg-[#0a1628] lg:flex`}
            >
              <div className="border-b border-[#1e2d40] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-200">Conversations</h3>
                  <button
                    onClick={() => setComposerOpen(true)}
                    className="rounded-lg p-1 text-gray-500 hover:bg-[#1e2d40] hover:text-gray-300"
                    aria-label="New conversation"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search conversations..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <div className="flex gap-1">
                  {(["all", "unread", "groups"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFilterTab(tab)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-colors ${
                        filterTab === tab
                          ? "bg-[#1e2d40] text-white"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {tab === "all" ? "All" : tab === "unread" ? "Unread" : "Groups"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversationsLoading ? (
                  <div className="space-y-3 p-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-14 w-full" />
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500">
                    {filterTab !== "all"
                      ? `No ${filterTab} conversations.`
                      : emptyConversationText}
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const peer = getOtherParticipant(conversation, currentUserId);
                    const isSelected = String(selectedId) === String(conversation._id);
                    return (
                      <button
                        key={conversation._id}
                        onClick={() => {
                          setSelectedId(String(conversation._id));
                          setMobileView("chat");
                        }}
                        className={`flex w-full items-center gap-3 border-b border-[#1e2d40] px-4 py-3 text-left transition-colors ${
                          isSelected ? "bg-blue-600/10" : "hover:bg-[#0d1a2d]"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-9 w-9">
                            {peer?.profileImage?.url ? (
                              <AvatarImage src={peer.profileImage.url} alt={peer.name} />
                            ) : (
                              <AvatarFallback className="text-xs">
                                {getInitials(getConversationName(conversation, currentUserId))}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-xs font-medium text-gray-200">
                              {getConversationName(conversation, currentUserId)}
                            </p>
                            <span className="ml-1 shrink-0 text-[10px] text-gray-500">
                              {formatLastTime(conversation.lastMessageAt)}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-gray-500">
                            {conversation.lastMessage || "No messages yet"}
                          </p>
                        </div>
                        {conversation.unreadCount > 0 ? (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] text-white">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat View */}
            <div
              className={`${mobileView === "chat" ? "flex" : "hidden"} min-w-0 flex-1 flex-col border-r border-[#1e2d40] bg-[#070f1c] lg:flex`}
            >
              <div className="flex items-center justify-between border-b border-[#1e2d40] px-4 py-3">
                {selectedConversation ? (
                  <>
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setMobileView("list")}
                        className="-ml-1 rounded-lg p-1.5 text-gray-300 hover:bg-[#1e2d40] lg:hidden"
                        aria-label="Back"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <div className="relative shrink-0">
                        <Avatar className="h-9 w-9">
                          {recipient?.profileImage?.url ? (
                            <AvatarImage src={recipient.profileImage.url} alt={recipient.name} />
                          ) : (
                            <AvatarFallback className="text-xs">
                              {getInitials(getConversationName(selectedConversation, currentUserId))}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#070f1c] bg-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">
                          {getConversationName(selectedConversation, currentUserId)}
                        </p>
                        <p className="text-[10px] text-green-400">Online</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={startMeeting}
                        className="hidden items-center gap-1.5 rounded-lg border border-[#1e2d40] bg-[#0a1628] px-3 py-1.5 text-xs text-gray-300 hover:border-blue-500 hover:text-white sm:flex"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Start Meeting
                      </button>
                      <QuickIconButton icon={Users} label="Participants" onClick={() => setComposerOpen(true)} />
                      <QuickIconButton icon={Search} label="Search" onClick={() => searchInputRef.current?.focus()} />
                      <div className="relative">
                        <QuickIconButton icon={MoreVertical} label="More options" onClick={() => setHeaderMenuOpen((v) => !v)} />
                        {headerMenuOpen ? (
                          <div className="absolute right-0 top-10 z-30 min-w-44 rounded-xl border border-[#1e2d40] bg-[#0a1628] p-1 shadow-xl">
                            <button
                              type="button"
                              onClick={() => { setDeleteChatConfirmOpen(true); setHeaderMenuOpen(false); }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 transition-colors hover:bg-[#1e2d40]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Conversation
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Select a conversation</p>
                )}
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto px-5 py-4">
                {!selectedConversation ? (
                  <p className="text-center text-xs text-gray-500 mt-10">
                    Pick a conversation or start a new one.
                  </p>
                ) : threadLoading && !(selectedConversation as any).__pending ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 mt-10">
                    No messages yet. Send the first one below.
                  </p>
                ) : (
                  messagesWithSeparators.map((item, idx) => {
                    if (item.kind === "separator") {
                      return (
                        <div key={`sep-${idx}`} className="flex items-center gap-3 py-3">
                          <div className="flex-1 border-t border-[#1e2d40]" />
                          <span className="text-[11px] text-gray-500">{item.label}</span>
                          <div className="flex-1 border-t border-[#1e2d40]" />
                        </div>
                      );
                    }
                    if (item.kind === "newMessages") {
                      return (
                        <div key={`new-${idx}`} className="flex items-center gap-3 py-3">
                          <div className="flex-1 border-t border-blue-500/30" />
                          <span className="rounded-full bg-blue-600/20 px-3 py-0.5 text-[11px] text-blue-400">
                            New Messages
                          </span>
                          <div className="flex-1 border-t border-blue-500/30" />
                        </div>
                      );
                    }

                    const message = item.data;
                    const isMe = String(message.sender_id) === String(currentUserId);
                    const isPinned = pinnedForConversation.some((pin) => pin.id === String(message._id));
                    const isEditing = editingMessageId === String(message._id);
                    const showMenu = messageMenuId === String(message._id);
                    return (
                      <div
                        key={message._id}
                        className={`group flex ${isMe ? "justify-end" : "items-end gap-2"} py-0.5`}
                        onClick={() => { if (showMenu) setMessageMenuId(null); }}
                      >
                        {!isMe ? (
                          <Avatar className="h-7 w-7 shrink-0 mb-1">
                            {recipient?.profileImage?.url ? (
                              <AvatarImage src={recipient.profileImage.url} alt="" />
                            ) : (
                              <AvatarFallback className="text-[9px]">
                                {getInitials(recipient?.name || "")}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        ) : null}
                        <div className="relative max-w-[72%]">
                          {/* Hover "..." actions button */}
                          <div className={`absolute -top-3 ${isMe ? "right-0" : "left-0"} z-20`}>
                            <div className="relative hidden group-hover:block">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setMessageMenuId(showMenu ? null : String(message._id)); }}
                                className="rounded-full border border-[#26354b] bg-[#091321] px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                              >
                                •••
                              </button>
                              {showMenu ? (
                                <div
                                  className={`absolute top-6 z-30 min-w-36 rounded-xl border border-[#1e2d40] bg-[#0a1628] p-1 shadow-2xl ${isMe ? "right-0" : "left-0"}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => { handlePinnedToggle(message); setMessageMenuId(null); }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-[#1e2d40]"
                                  >
                                    {isPinned ? <PinOff className="h-3.5 w-3.5 text-amber-400" /> : <Pin className="h-3.5 w-3.5 text-amber-400" />}
                                    {isPinned ? "Unpin" : "Pin"}
                                  </button>
                                  {isMe && !message.fileUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => { setEditingMessageId(String(message._id)); setEditDraft(message.content || ""); setMessageMenuId(null); }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-[#1e2d40]"
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-blue-400" />
                                      Edit
                                    </button>
                                  ) : null}
                                  {isMe ? (
                                    <button
                                      type="button"
                                      onClick={() => { if (selectedId) deleteMessageMutation.mutate({ conversationId: selectedId, messageId: String(message._id) }); setMessageMenuId(null); }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400 transition-colors hover:bg-[#1e2d40]"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey && editDraft.trim() && selectedId) {
                                    e.preventDefault();
                                    editMessageMutation.mutate({ conversationId: selectedId, messageId: String(message._id), content: editDraft.trim() });
                                  }
                                  if (e.key === "Escape") { setEditingMessageId(null); setEditDraft(""); }
                                }}
                                className="rounded-xl border border-blue-500/60 bg-[#0d1a2d] px-3 py-2 text-sm text-gray-100 outline-none w-full"
                              />
                              <button
                                type="button"
                                onClick={() => { if (editDraft.trim() && selectedId) editMessageMutation.mutate({ conversationId: selectedId, messageId: String(message._id), content: editDraft.trim() }); }}
                                disabled={!editDraft.trim() || editMessageMutation.isPending}
                                className="shrink-0 rounded-full bg-blue-600 p-1.5 text-white hover:bg-blue-500 disabled:opacity-50"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingMessageId(null); setEditDraft(""); }}
                                className="shrink-0 rounded-full border border-[#1e2d40] p-1.5 text-gray-400 hover:text-white"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className={`rounded-2xl px-4 py-3 ${
                                isMe
                                  ? "rounded-br-sm bg-blue-600 text-white"
                                  : "rounded-bl-sm bg-[#1e2d40] text-gray-200"
                              }`}
                            >
                              {message.content ? (
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                              ) : null}
                              {message.fileUrl ? (
                                isImageFile(message) ? (
                                  <div className="group/img relative mt-2">
                                    <img
                                      src={message.fileUrl}
                                      alt={getFileLabel(message)}
                                      className="max-w-[240px] rounded-xl object-cover"
                                    />
                                    <a
                                      href={message.fileUrl}
                                      download
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 opacity-0 transition group-hover/img:opacity-100"
                                    >
                                      <Download className="h-3.5 w-3.5 text-white" />
                                    </a>
                                  </div>
                                ) : isVideoFile(message) ? (
                                  <div className="group/vid relative mt-2">
                                    <video
                                      src={message.fileUrl}
                                      controls
                                      className="max-w-[280px] rounded-xl"
                                    />
                                    <a
                                      href={message.fileUrl}
                                      download
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 opacity-0 transition group-hover/vid:opacity-100"
                                    >
                                      <Download className="h-3.5 w-3.5 text-white" />
                                    </a>
                                  </div>
                                ) : (
                                  <div
                                    className={`mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                                      isMe
                                        ? "border-blue-400/40 bg-blue-500/10 text-white"
                                        : "border-[#31445e] bg-[#0b1422] text-gray-100"
                                    }`}
                                  >
                                    <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                                    <span className="min-w-0 flex-1 truncate">{getFileLabel(message)}</span>
                                    <a
                                      href={message.fileUrl}
                                      download
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="shrink-0 rounded-full p-1 hover:bg-white/10"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                )
                              ) : null}
                              <div className={`mt-1.5 flex items-center gap-1 ${isMe ? "justify-end" : ""}`}>
                                {message.isEdited ? (
                                  <span className={`text-[10px] italic ${isMe ? "text-blue-200/60" : "text-gray-600"}`}>edited</span>
                                ) : null}
                                <span className={`text-[10px] ${isMe ? "text-blue-200" : "text-gray-500"}`}>
                                  {formatTime(new Date(message.sentAt || message.createdAt))}
                                </span>
                                {isMe ? (
                                  message.isRead ? (
                                    <CheckCheck className="h-3 w-3 text-blue-200" />
                                  ) : (
                                    <Check className="h-3 w-3 text-blue-200/60" />
                                  )
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-[#1e2d40] px-4 py-3">
                {chatAttachment ? (
                  <div className="mb-3 flex items-center justify-between rounded-xl border border-[#1e2d40] bg-[#0a1628] px-3 py-2 text-xs text-gray-300">
                    <div className="flex items-center gap-2 min-w-0">
                      {chatAttachment.type.startsWith("image/") ? (
                        <Image className="h-3.5 w-3.5 shrink-0 text-green-400" />
                      ) : chatAttachment.type.startsWith("video/") ? (
                        <Video className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                      ) : chatAttachment.type.startsWith("audio/") ? (
                        <Music className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                      )}
                      <span className="truncate">{chatAttachment.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setChatAttachment(null);
                        if (chatFileInputRef.current) chatFileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  {/* Unified attachment input */}
                  <input
                    ref={chatFileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      setChatAttachment(event.target.files?.[0] || null);
                      setAttachOpen(false);
                    }}
                  />

                  {/* Attachment button with dropdown */}
                  <div className="relative">
                    <QuickIconButton
                      icon={Paperclip}
                      label="Attach"
                      onClick={() => setAttachOpen((v) => !v)}
                    />
                    {attachOpen ? (
                      <div className="absolute bottom-12 left-0 z-20 min-w-44 rounded-xl border border-[#1e2d40] bg-[#0a1628] p-1 shadow-xl">
                        <AttachOption
                          icon={Image}
                          label="Image"
                          description="JPG, PNG, GIF, WEBP"
                          color="text-green-400"
                          onClick={() => {
                            if (chatFileInputRef.current) {
                              chatFileInputRef.current.accept = "image/*";
                              chatFileInputRef.current.click();
                            }
                            setAttachOpen(false);
                          }}
                        />
                        <AttachOption
                          icon={Video}
                          label="Video"
                          description="MP4, MOV, AVI"
                          color="text-purple-400"
                          onClick={() => {
                            if (chatFileInputRef.current) {
                              chatFileInputRef.current.accept = "video/*";
                              chatFileInputRef.current.click();
                            }
                            setAttachOpen(false);
                          }}
                        />
                        <AttachOption
                          icon={Music}
                          label="Audio"
                          description="MP3, WAV, M4A"
                          color="text-yellow-400"
                          onClick={() => {
                            if (chatFileInputRef.current) {
                              chatFileInputRef.current.accept = "audio/*";
                              chatFileInputRef.current.click();
                            }
                            setAttachOpen(false);
                          }}
                        />
                        <AttachOption
                          icon={FileText}
                          label="Document"
                          description="PDF, DOCX, XLSX, TXT"
                          color="text-blue-400"
                          onClick={() => {
                            if (chatFileInputRef.current) {
                              chatFileInputRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";
                              chatFileInputRef.current.click();
                            }
                            setAttachOpen(false);
                          }}
                        />
                        <AttachOption
                          icon={File}
                          label="Any File"
                          description="All file types"
                          color="text-gray-400"
                          onClick={() => {
                            if (chatFileInputRef.current) {
                              chatFileInputRef.current.accept = "*";
                              chatFileInputRef.current.click();
                            }
                            setAttachOpen(false);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Emoji picker */}
                  <div className="relative">
                    <QuickIconButton icon={Smile} label="Emoji" onClick={() => setEmojiOpen((v) => !v)} />
                    {emojiOpen ? (
                      <EmojiPicker
                        onSelect={(emoji) => setDraft((v) => `${v}${emoji}`)}
                        onDelete={() => setDraft((v) => v.slice(0, -2) || v.slice(0, -1))}
                        onClose={() => setEmojiOpen(false)}
                      />
                    ) : null}
                  </div>

                  <Input
                    placeholder={recipient ? "Type a message..." : "Select a conversation first"}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && canSend) {
                        event.preventDefault();
                        sendMutation.mutate();
                      }
                    }}
                    disabled={!recipient}
                    className="flex-1 bg-[#0d1a2d] border-[#1e2d40] text-sm placeholder:text-gray-500"
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full bg-blue-600 hover:bg-blue-500"
                    disabled={!canSend}
                    onClick={() => sendMutation.mutate()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Contact Details Panel */}
            {renderContactPanel()}
          </div>
        ) : (
          <div
            className="flex overflow-hidden rounded-xl border border-[#1e2d40]"
            style={{ height: "calc(100vh - 200px)", minHeight: 520 }}
          >
            <div className="flex w-72 shrink-0 flex-col border-r border-[#1e2d40] bg-[#0a1628]">
              <div className="border-b border-[#1e2d40] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-200">Email</h3>
                  <Button size="sm" onClick={() => setMailDialogOpen(true)}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Compose
                  </Button>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEmailFolder("inbox")}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                      emailFolder === "inbox" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Inbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailFolder("sent")}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                      emailFolder === "sent" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Sent
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {mailsLoading ? (
                  <div className="space-y-3 p-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                ) : mails.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500">No emails found.</div>
                ) : (
                  mails.map((mail) => {
                    const actor =
                      emailFolder === "inbox" ? mail.from?.name : mail.to?.[0]?.name || mail.toEmails?.[0];
                    return (
                      <button
                        key={mail._id}
                        type="button"
                        onClick={() => setSelectedMailId(String(mail._id))}
                        className={`block w-full border-b border-[#1e2d40] px-4 py-3 text-left transition-colors ${
                          String(selectedMail?._id) === String(mail._id)
                            ? "bg-blue-600/10"
                            : "hover:bg-[#0d1a2d]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-gray-100">{actor || "Email"}</p>
                          <span className="text-[10px] text-gray-500">{formatLastTime(mail.createdAt)}</span>
                        </div>
                        <p className="truncate text-xs text-gray-400">{mail.subject || "(No subject)"}</p>
                        <p className="truncate text-[11px] text-gray-500">{mail.body || "No body"}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col border-r border-[#1e2d40] bg-[#070f1c]">
              <div className="border-b border-[#1e2d40] px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-100">
                      {selectedMail?.subject || "Select an email"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedMail
                        ? `From ${selectedMail.from?.name || selectedMail.from?.email || "Unknown"}`
                        : "Email details will appear here."}
                    </p>
                  </div>
                  {selectedMail ? (
                    <Button size="sm" variant="outline" onClick={() => setMailDialogOpen(true)}>
                      Reply
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {!selectedMail ? (
                  <p className="text-sm text-gray-500">Pick an email from the list or compose a new one.</p>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-[#1e2d40] bg-[#0a1628] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-100">
                            {selectedMail.from?.name || selectedMail.from?.email || "Unknown sender"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {selectedMail.toEmails?.join(", ") || recipient?.email || ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            mailApi.toggleStar(String(selectedMail._id)).then(() =>
                              queryClient.invalidateQueries({ queryKey: ["mail-list"] })
                            )
                          }
                          className="rounded-full border border-[#1e2d40] p-2 text-gray-300 hover:text-yellow-300"
                        >
                          <Pin className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-gray-200">{selectedMail.body || "No message body."}</p>
                    </div>
                    <div className="rounded-2xl border border-[#1e2d40] bg-[#0a1628] p-4">
                      <h4 className="mb-3 text-sm font-semibold text-gray-100">Attachments</h4>
                      {selectedMail.attachments?.length ? (
                        <div className="space-y-2">
                          {selectedMail.attachments.map((file: any, index: number) => (
                            <a
                              key={`${selectedMail._id}-${index}`}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 rounded-xl border border-[#1e2d40] px-3 py-2 hover:border-blue-500/60"
                            >
                              <Paperclip className="h-4 w-4 text-blue-300" />
                              <span className="truncate text-sm text-gray-100">{file.fileName || "Attachment"}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">No attachments.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {renderContactPanel()}
          </div>
        )}
      </div>

      <NewConversationDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onSelectPeer={handleStartConversation}
        searchPlaceholder={recipientSearchPlaceholder}
      />

      <ComposeMailDialog
        open={mailDialogOpen}
        onOpenChange={setMailDialogOpen}
        to={mailTo}
        setTo={setMailTo}
        subject={mailSubject}
        setSubject={setMailSubject}
        body={mailBody}
        setBody={setMailBody}
        attachment={mailAttachment}
        setAttachment={setMailAttachment}
        attachmentInputRef={attachmentInputRef}
        imageInputRef={imageInputRef}
        isSending={sendMailMutation.isPending}
        onSend={() => sendMailMutation.mutate()}
      />

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            rows={5}
            className="w-full rounded-xl border border-[#1e2d40] bg-[#0a1628] px-3 py-2 text-sm text-gray-100 outline-none"
            placeholder="Write a private note about this contact..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNote} disabled={!noteDraft.trim()}>Save Note</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={filesDialogOpen} onOpenChange={setFilesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Shared Files</DialogTitle>
          </DialogHeader>
          <div className="max-h-105 space-y-2 overflow-y-auto">
            {sharedFiles.length === 0 ? (
              <p className="text-sm text-gray-500">No shared files yet.</p>
            ) : (
              sharedFiles.map((file) => {
                const style = getFileTypeStyle(file.name);
                const ext = getFileTypeLabel(file.name);
                return (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-[#1e2d40] px-3 py-3 hover:border-blue-500/60"
                  >
                    <div className={`rounded-lg ${style.bg} p-2 ${style.text}`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-100">{file.name}</p>
                      <p className="text-xs text-gray-500">{ext} • {formatDate(file.createdAt)}</p>
                    </div>
                  </a>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pinnedDialogOpen} onOpenChange={setPinnedDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pinned Messages</DialogTitle>
          </DialogHeader>
          <div className="max-h-105 space-y-3 overflow-y-auto">
            {pinnedForConversation.length === 0 ? (
              <p className="text-sm text-gray-500">No pinned items yet.</p>
            ) : (
              pinnedForConversation.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#1e2d40] p-3">
                  <div className="flex items-start gap-2 mb-1">
                    <Pin className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-100">{item.body}</p>
                  </div>
                  <p className="text-xs text-gray-500 pl-5">
                    {item.type === "note" ? "Note" : "Pinned"} by {item.authorName || "You"} • {formatDate(item.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteChatConfirmOpen} onOpenChange={setDeleteChatConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Are you sure you want to delete this entire conversation? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteChatConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={() => { if (selectedId) deleteChatMutation.mutate(selectedId); }}
              disabled={deleteChatMutation.isPending}
            >
              {deleteChatMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickIconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-full border border-[#1e2d40] bg-[#0a1628] p-2 text-gray-400 transition hover:border-blue-500/60 hover:text-white"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function EmojiPicker({
  onSelect,
  onDelete,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("smileys");

  const displayEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) =>
        e.includes(search.trim())
      )
    : EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.emojis ?? [];

  const categoryLabel = EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "";

  return (
    <div className="absolute bottom-14 left-0 z-30 w-80 overflow-hidden rounded-2xl border border-[#1e2d40] bg-[#0a1628] shadow-2xl">
      {/* Search + delete row */}
      <div className="flex items-center gap-2 border-b border-[#1e2d40] px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-gray-500" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji..."
          className="flex-1 bg-transparent text-xs text-gray-200 outline-none placeholder:text-gray-500"
        />
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          className="rounded-lg p-1 text-gray-500 hover:bg-[#1e2d40] hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="rounded-lg p-1 text-gray-500 hover:bg-[#1e2d40] hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Category label */}
      {!search.trim() && (
        <p className="px-3 pt-2 text-[11px] font-semibold text-gray-400">{categoryLabel}</p>
      )}

      {/* Emoji grid */}
      <div className="h-56 overflow-y-auto p-2">
        {displayEmojis.length === 0 ? (
          <p className="mt-8 text-center text-xs text-gray-500">No emojis found</p>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {displayEmojis.map((emoji, idx) => (
              <button
                key={`${emoji}-${idx}`}
                type="button"
                onClick={() => onSelect(emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-[#1e2d40]"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex items-center justify-around border-t border-[#1e2d40] px-1 py-1.5">
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setActiveCategory(cat.id);
              setSearch("");
            }}
            title={cat.label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors ${
              activeCategory === cat.id && !search
                ? "bg-blue-600/20 ring-1 ring-blue-500/40"
                : "hover:bg-[#1e2d40]"
            }`}
          >
            {cat.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function AttachOption({
  icon: Icon,
  label,
  description,
  color,
  onClick,
}: {
  icon: any;
  label: string;
  description: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#1e2d40]"
    >
      <div className={`shrink-0 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-200">{label}</p>
        <p className="text-[10px] text-gray-500">{description}</p>
      </div>
    </button>
  );
}

function ActionIcon({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-[#182233] p-2 text-gray-300 hover:border-blue-500/60 hover:text-white transition-colors"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#26354b] bg-[#0d1a2d]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-[9px] leading-tight text-center">{label}</span>
    </button>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-[#1e2d40] py-2 text-xs last:border-0">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="max-w-40 truncate text-right text-gray-200">{children}</span>
    </div>
  );
}

function NewConversationDialog({
  open,
  onOpenChange,
  onSelectPeer,
  searchPlaceholder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPeer: (peer: any) => void;
  searchPlaceholder: string;
}) {
  const [query, setQuery] = useState("");

  const { data: recipientsResponse, isLoading } = useQuery({
    queryKey: ["inbox-recipients", query],
    queryFn: () =>
      inboxApi
        .getRecipients(query ? { q: query } : undefined)
        .then((response) => response.data),
    enabled: open,
  });

  const recipients: any[] = recipientsResponse?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <div className="max-h-100 space-y-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))
          ) : recipients.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500">No available recipients found.</p>
          ) : (
            recipients.map((person) => (
              <button
                key={person._id}
                onClick={() => onSelectPeer(person)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[#1e2d40]"
              >
                <Avatar className="h-8 w-8">
                  {person.profileImage?.url ? (
                    <AvatarImage src={person.profileImage.url} alt={person.name} />
                  ) : (
                    <AvatarFallback className="text-xs">
                      {getInitials(person.name || "U")}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-200">{person.name}</p>
                  <p className="truncate text-[11px] text-gray-500">
                    {person.partner?.businessName || person.email}
                  </p>
                </div>
                {person.role ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {person.role.replace(/_/g, " ")}
                  </Badge>
                ) : null}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ComposeMailDialog({
  open,
  onOpenChange,
  to,
  setTo,
  subject,
  setSubject,
  body,
  setBody,
  attachment,
  setAttachment,
  attachmentInputRef,
  imageInputRef,
  isSending,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  to: string;
  setTo: (value: string) => void;
  subject: string;
  setSubject: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  attachment: File | null;
  setAttachment: (file: File | null) => void;
  attachmentInputRef: React.RefObject<HTMLInputElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  isSending: boolean;
  onSend: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">To</label>
              <Input value={to} onChange={(event) => setTo(event.target.value)} placeholder="recipient@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Subject</label>
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Message</label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={8}
              className="w-full rounded-xl border border-[#1e2d40] bg-[#0a1628] px-3 py-2 text-sm text-gray-100 outline-none"
              placeholder="Write your email..."
            />
          </div>
          <input
            ref={attachmentInputRef}
            type="file"
            className="hidden"
            onChange={(event) => setAttachment(event.target.files?.[0] || null)}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => setAttachment(event.target.files?.[0] || null)}
          />
          <div className="flex items-center justify-between rounded-xl border border-[#1e2d40] bg-[#0a1628] px-3 py-2">
            <div className="flex items-center gap-2">
              <QuickIconButton icon={Paperclip} label="Attach file" onClick={() => attachmentInputRef.current?.click()} />
              <QuickIconButton icon={Image} label="Attach image" onClick={() => imageInputRef.current?.click()} />
            </div>
            {attachment ? (
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <span className="max-w-55 truncate">{attachment.name}</span>
                <button type="button" onClick={() => setAttachment(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-500">No attachment selected</span>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onSend} disabled={isSending || !to.trim()}>
              {isSending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
