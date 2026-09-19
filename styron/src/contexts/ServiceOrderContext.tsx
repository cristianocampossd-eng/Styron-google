import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useApp } from "./AppContext";
import { toast } from "sonner";
import { playBeepSound } from "@/lib/utils";

export type OSStatus = "sent" | "received" | "in_progress" | "awaiting_adjustment" | "completed" | "archived";
export type OSPriority = "low" | "medium" | "high" | "urgent";

export interface OSAttachment {
  id: string;
  name: string;
  type: "image" | "video" | "file" | "link";
  url: string;
}

export interface OSComment {
  id: string;
  author: string;
  authorId?: string;
  text: string;
  date: Date;
  imageUrl?: string;
  videoUrl?: string;
}

export interface OSTimelineEntry {
  id: string;
  action: string;
  user: string;
  date: Date;
  details?: string;
}

const safeParseDate = (date: any) => {
  if (date instanceof Date) return date;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const safeInsertAttachment = async (payload: {
  service_order_id: string;
  file_url: string;
  file_type: string;
  file_name?: string;
}) => {
  // Try inserting with file_name first
  const { error } = await supabase.from("service_order_attachments").insert(payload as any);
  
  if (error && (error.code === "PGRST204" || error.message?.includes("file_name"))) {
    console.warn("file_name column not found in database schema cache. Retrying without file_name...");
    const { file_name, ...payloadWithoutFileName } = payload;
    return await supabase.from("service_order_attachments").insert(payloadWithoutFileName as any);
  }
  
  return { error };
};

export interface DeadlineExtensionRequest {
  requestedDate: Date;
  justification: string;
  status: "pending" | "approved" | "rejected";
  dateRequested: Date;
}

export interface ServiceOrder {
  id: string;
  number: string;
  projectId: string;
  title: string;
  description: string;
  priority: OSPriority;
  status: OSStatus;
  creator: string;
  responsible: string;
  createdAt: Date;
  updatedAt: Date;
  attachments: OSAttachment[];
  comments: OSComment[];
  timeline: OSTimelineEntry[];
  dueDate?: Date;
  deadlineExtensionRequest?: DeadlineExtensionRequest;
}

const parseObservation = (obs: string | null) => {
  if (!obs) return { description: "", comments: [], timeline: [] };
  try {
    const parsed = JSON.parse(obs);
    if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
      return {
        description: parsed.text,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
        deadlineExtensionRequest: parsed.extensionRequest ? {
          ...parsed.extensionRequest,
          requestedDate: new Date(parsed.extensionRequest.requestedDate),
          dateRequested: new Date(parsed.extensionRequest.dateRequested)
        } : undefined,
        comments: Array.isArray(parsed.comments) ? parsed.comments.map((c: any) => ({...c, date: safeParseDate(c.date)})) : [],
        timeline: Array.isArray(parsed.timeline) ? parsed.timeline.map((t: any) => ({
          ...t, 
          action: t.action || t.description || "Ação realizada", 
          date: safeParseDate(t.date)
        })) : [],
      };
    }
  } catch (e) {
    // Ignore, fallback to plain text
  }
  return { description: obs, comments: [], timeline: [] };
};

const stringifyObservation = (desc: string, dueDate?: Date, extReq?: DeadlineExtensionRequest, comments: OSComment[] = [], timeline: OSTimelineEntry[] = []) => {
  return JSON.stringify({
    text: desc,
    dueDate: dueDate ? dueDate.toISOString() : undefined,
    extensionRequest: extReq ? {
      ...extReq,
      requestedDate: extReq.requestedDate.toISOString(),
      dateRequested: extReq.dateRequested.toISOString(),
    } : undefined,
    comments,
    timeline,
  });
};

export interface OSNotification {
  id: string;
  osId: string;
  message: string;
  date: Date;
  read: boolean;
  user: string;
}

export const osStatusLabels: Record<OSStatus, string> = {
  sent: "Enviado",
  received: "Recebida",
  in_progress: "Em execução",
  awaiting_adjustment: "Aguardando ajuste",
  completed: "Concluído",
  archived: "Arquivado",
};

export const osStatusColors: Record<OSStatus, string> = {
  sent: "bg-blue-100 text-blue-700",
  received: "bg-purple-100 text-purple-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  awaiting_adjustment: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
};

export const osPriorityLabels: Record<OSPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export const osPriorityColors: Record<OSPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const CURRENT_USER_FALLBACK = "Usuário";

interface ServiceOrderContextType {
  orders: ServiceOrder[];
  notifications: OSNotification[];
  currentUser: string;
  createOrder: (data: { 
    projectId: string; 
    responsible: string; 
    priority: OSPriority; 
    title: string; 
    description: string; 
    dueDate?: Date; 
    attachments?: File[];
    externalLinks?: { name: string; url: string }[];
  }) => Promise<string | undefined>;
  updateStatus: (osId: string, status: OSStatus) => void;
  reassign: (osId: string, newResponsible: string) => void;
  addComment: (osId: string, text: string, imageUrl?: string, videoUrl?: string) => Promise<void>;
  editComment: (osId: string, commentId: string, newText: string) => Promise<void>;
  addAttachment: (osId: string, files: File[]) => Promise<void>;
  deleteAttachment: (osId: string, attachmentId: string) => Promise<void>;
  addExternalLink: (osId: string, name: string, url: string) => Promise<void>;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  archiveOrder: (osId: string) => void;
  requestMoreTime: (osId: string, newDate: Date, justification: string) => void;
  respondTimeRequest: (osId: string, status: "approved" | "rejected", modifiedDate?: Date) => void;
  updateOrder: (osId: string, data: {
    projectId: string;
    responsible: string;
    priority: OSPriority;
    title: string;
    description: string;
    dueDate?: Date;
  }) => Promise<void>;
}

const ServiceOrderContext = createContext<ServiceOrderContextType | null>(null);

export function ServiceOrderProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { projects, profiles, useLocalFallback } = useApp();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [notifications, setNotifications] = useState<OSNotification[]>([]);
  const currentUser = profile?.name || user?.email || CURRENT_USER_FALLBACK;
  const currentUserId = user?.id || "";
  
  const getProfileName = (id: string) => profiles.find((p) => p.id === id)?.name || id;

  const loadFromLocalStorage = useCallback(() => {
    let localOS = localStorage.getItem("styron_prod_service_orders");
    if (!localOS) {
      const initialOS = [
        {
          id: "os1",
          number: "OS-001",
          projectId: "p1",
          title: "Revisão Orçamento Inicial",
          description: "Necessário revisar os itens de orçamento para aquisição de matérias primas.",
          priority: "high",
          status: "in_progress",
          creator: "usr-1",
          responsible: "usr-2",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attachments: [],
          comments: [],
          timeline: [
            { id: "tl1", action: "Ordem de serviço criada", user: "Ana Silva", date: new Date().toISOString() }
          ]
        }
      ];
      localOS = JSON.stringify(initialOS);
      localStorage.setItem("styron_prod_service_orders", localOS);
    }

    const parsed = JSON.parse(localOS).map((o: any) => ({
      ...o,
      createdAt: new Date(o.createdAt),
      updatedAt: new Date(o.updatedAt),
      dueDate: o.dueDate ? new Date(o.dueDate) : undefined,
      deadlineExtensionRequest: o.deadlineExtensionRequest ? {
        ...o.deadlineExtensionRequest,
        requestedDate: new Date(o.deadlineExtensionRequest.requestedDate),
        dateRequested: new Date(o.deadlineExtensionRequest.dateRequested)
      } : undefined,
      timeline: (o.timeline || []).map((t: any) => ({ ...t, date: new Date(t.date) })),
      comments: (o.comments || []).map((c: any) => ({ ...c, date: new Date(c.date) })),
    }));
    setOrders(parsed);

    let localOSNotifs = localStorage.getItem("styron_prod_os_notifications") || "[]";
    setNotifications(JSON.parse(localOSNotifs).map((n: any) => ({
      ...n,
      date: new Date(n.date)
    })));
  }, []);

  // Sync to localstorage if fallback active
  useEffect(() => {
    if (useLocalFallback) {
      localStorage.setItem("styron_prod_service_orders", JSON.stringify(orders));
    }
  }, [orders, useLocalFallback]);

  useEffect(() => {
    if (useLocalFallback) {
      localStorage.setItem("styron_prod_os_notifications", JSON.stringify(notifications));
    }
  }, [notifications, useLocalFallback]);

  useEffect(() => {
    if (!user) return;
    if (useLocalFallback) {
      loadFromLocalStorage();
      return;
    }

    loadOrders();
    loadOSNotifications();

    const channel = supabase
      .channel("service-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_orders" }, () => loadOrders())
      .subscribe();

    const channelNotifs = supabase
      .channel("os-notifications-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        loadOSNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channelNotifs);
    };
  }, [user, useLocalFallback]);

  async function loadOrders() {
    try {
      const { data: ordersData } = await supabase.from("service_orders").select("*").order("created_at", { ascending: false });
      if (!ordersData) return;

      const { data: attachmentsData } = await supabase.from("service_order_attachments").select("*");
      const attachmentsGrouped = (attachmentsData || []).reduce((acc: any, item: any) => {
        if (!acc[item.service_order_id]) {
          acc[item.service_order_id] = [];
        }
        acc[item.service_order_id].push(item);
        return acc;
      }, {});

      setOrders(
        ordersData.map((o: any) => {
          const parsedObs = parseObservation(o.observation);
          const orderAttachments = attachmentsGrouped[o.id] || [];
          return {
            id: o.id,
            number: o.os_code,
            projectId: o.project_id,
            title: o.title || "",
            description: parsedObs.description,
            dueDate: parsedObs.dueDate,
            deadlineExtensionRequest: parsedObs.deadlineExtensionRequest,
            priority: o.priority as OSPriority,
            status: o.status as OSStatus,
            creator: o.created_by,
            responsible: o.assigned_to,
            createdAt: new Date(o.created_at),
            updatedAt: new Date(o.updated_at),
            attachments: orderAttachments.map((a: any) => {
              const type = a.file_type === 'link' ? 'link' : 
                          (a.file_type?.startsWith('image/') ? 'image' : 
                          (a.file_type?.startsWith('video/') ? 'video' : 'file'));
              return {
                id: a.id,
                name: a.file_name || a.file_url.split('/').pop() || 'Arquivo',
                url: a.file_url,
                type: type as any
              };
            }),
            comments: parsedObs.comments || [],
            timeline: parsedObs.timeline || [],
          };
        })
      );
    } catch (e) {
      console.error("Erro ao carregar Ordens de Serviço do Firebase:", e);
    }
  }

  async function loadOSNotifications() {
    try {
      if (!user) return;
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "os")
        .order("created_at", { ascending: false });
      if (data) {
        setNotifications(
          data.map((n: any) => ({
            id: n.id,
            osId: n.link || "",
            message: n.message,
            date: new Date(n.created_at),
            read: n.read,
            user: currentUser,
          }))
        );
      }
    } catch (e) {
      console.error("Erro ao carregar notificações de OS do Supabase:", e);
    }
  }

  useEffect(() => {
    // Check overdue OSs daily logic
    if (orders.length > 0 && currentUserId) {
      const todayStr = new Date().toISOString().split('T')[0];
      const checkKey = `lastOverdueCheck_${currentUserId}`;
      const lastCheck = localStorage.getItem(checkKey);

      if (lastCheck !== todayStr) {
        const overdueOrders = orders.filter(o => 
          o.dueDate && 
          o.dueDate.getTime() < new Date().getTime() &&
          !['completed', 'archived'].includes(o.status) &&
          (o.responsible === currentUserId || o.creator === currentUserId)
        );

        overdueOrders.forEach(async (o) => {
          await supabase.from("notifications").insert({
            user_id: currentUserId,
            type: "os",
            title: "OS Atrasada - Necessita Atenção",
            message: `A Ordem de Serviço "${o.title}" (Prazo: ${o.dueDate?.toLocaleDateString()}) encontra-se em atraso!`,
            link: o.id,
          });
        });

        if (overdueOrders.length > 0) {
          loadOSNotifications(); // Reload to show immediately
        }

        localStorage.setItem(checkKey, todayStr);
      }
    }
  }, [orders, currentUserId]);

  const createOrder = useCallback(
    async (data: { 
      projectId: string; 
      responsible: string; 
      priority: OSPriority; 
      title: string; 
      description: string; 
      dueDate?: Date; 
      attachments?: File[];
      externalLinks?: { name: string; url: string }[];
    }) => {
      console.log("CreateOrder called with attachments count:", data.attachments?.length);
      if (useLocalFallback) {
        const newId = `os-${Date.now()}`;
        const newNo = `OS-${String(orders.length + 1).padStart(3, "0")}`;
        
        const fileAtts = (data.attachments || []).map((file, idx) => ({
          id: `at-${Date.now()}-${idx}`,
          name: file.name,
          url: URL.createObjectURL(file),
          type: (file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file") as any
        }));

        const linkAtts = (data.externalLinks || []).map((link, idx) => ({
          id: `link-${Date.now()}-${idx}`,
          name: link.name || 'Link Externo',
          url: link.url,
          type: "link" as any
        }));

        const newOS: ServiceOrder = {
          id: newId,
          number: newNo,
          projectId: data.projectId,
          title: data.title,
          description: data.description,
          priority: data.priority,
          status: "sent",
          creator: currentUserId || "usr-1",
          responsible: data.responsible,
          createdAt: new Date(),
          updatedAt: new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          attachments: [...fileAtts, ...linkAtts],
          comments: [],
          timeline: [
            { id: `tl-${Date.now()}`, action: "Ordem de Serviço criada", user: currentUser, date: new Date() }
          ]
        };

        setOrders((prev) => [newOS, ...prev]);

        const newNotif: OSNotification = {
          id: `notif-${Date.now()}`,
          osId: newId,
          message: `Nova OS: ${data.title}`,
          date: new Date(),
          read: false,
          user: currentUser
        };
        setNotifications((prev) => [newNotif, ...prev]);
        playBeepSound();
        return newId;
      }

      const obsPayload = stringifyObservation(data.description, data.dueDate);
      const { data: inserted, error } = await supabase.from("service_orders").insert({
        project_id: data.projectId,
        created_by: currentUserId,
        assigned_to: data.responsible,
        priority: data.priority,
        title: data.title,
        observation: obsPayload,
        status: "sent",
        os_code: "",
      }).select().single();
      if (error) {
        console.error("Erro ao criar OS:", error);
        toast.error("Erro ao criar OS no banco.");
        return;
      }

      // Create timeline event for creation
      await supabase.from("service_orders").update({
        observation: stringifyObservation(data.description, data.dueDate, undefined, [], [{ 
          id: crypto.randomUUID(), 
          date: new Date(), 
          action: "Ordem de Serviço criada", 
          user: currentUser
        }])
      }).eq("id", inserted.id);

      if (data.attachments && data.attachments.length > 0) {
        let allSuccess = true;
        for (let file of data.attachments) {
          console.log("Processing file:", file.name, file.size);
          if (file.size > 500 * 1024 * 1024) {
            toast.error(`Arquivo ${file.name} é muito grande. O limite é 500MB.`);
            allSuccess = false;
            continue;
          }
          const ext = file.name.split('.').pop() || '';
          const path = `os-attachments/${inserted.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("company-assets").upload(path, file, {
            upsert: true
          });
          if (uploadError) {
            console.error("Erro upload:", uploadError);
            if (uploadError.message.includes('exceeded the maximum allowed size')) {
              toast.error(`Arquivo ${file.name} excede o limite do Supabase (50MB no plano gratuito).`);
            } else {
              toast.error(`Falha no upload do arquivo ${file.name}: ${uploadError.message}`);
            }
            allSuccess = false;
            continue;
          }
          
          const { data: pubData } = supabase.storage.from("company-assets").getPublicUrl(path);
          const { error: dbError } = await safeInsertAttachment({
            service_order_id: inserted.id,
            file_url: pubData.publicUrl,
            file_type: file.type || ext,
            file_name: file.name
          });
          if (dbError) {
            console.error("Erro banco anexo:", dbError);
            toast.error(`Falha ao registrar ${file.name} no banco`);
          }
        }
      }

      if (data.externalLinks && data.externalLinks.length > 0) {
        for (let link of data.externalLinks) {
          if (!link.url) continue;
          const { error: dbError } = await safeInsertAttachment({
            service_order_id: inserted.id,
            file_url: link.url,
            file_type: "link",
            file_name: link.name || "Link Externo"
          });
          if (dbError) {
            console.error("Erro ao salvar link:", dbError);
          }
        }
      }
      
      // Create notification for assigned user
      await supabase.from("notifications").insert({
        user_id: data.responsible,
        type: "os",
        title: "Nova OS recebida",
        message: `Nova OS: ${data.title}`,
        link: inserted.id,
      });
      await loadOrders();
      await loadOSNotifications();
      return inserted.id;
    },
    [currentUserId, orders, useLocalFallback, currentUser]
  );

  const updateStatus = useCallback((osId: string, status: OSStatus) => {
    if (useLocalFallback) {
      setOrders((prev) => prev.map((o) => {
        if (o.id !== osId) return o;
        return {
          ...o,
          status,
          updatedAt: new Date(),
          timeline: [...o.timeline, {
            id: `tl-${Date.now()}`,
            action: `Status alterado`,
            user: currentUser,
            date: new Date(),
            details: `Status alterado para: ${osStatusLabels[status]}`
          }]
        };
      }));
      return;
    }

    (async () => {
      const os = orders.find(o => o.id === osId);
      if (!os) return;
      
      let newTimeline = [...os.timeline, { id: crypto.randomUUID(), date: new Date(), action: `Status alterado`, user: currentUser, details: `Status alterado para: ${osStatusLabels[status]}` }];
      const obsPayload = stringifyObservation(os.description, os.dueDate, os.deadlineExtensionRequest, os.comments, newTimeline);
      
      await supabase.from("service_orders").update({ status, observation: obsPayload }).eq("id", osId);
      
      if (['completed', 'archived'].includes(status)) {
        await supabase.from("notifications").insert({
          user_id: [os.creator, os.responsible].find(id => id && id !== currentUserId) || os.responsible,
          type: "os",
          title: `OS ${status === 'completed' ? 'concluída' : 'arquivada'}`,
          message: `A Ordem de Serviço "${os.title}" foi ${status === 'completed' ? 'concluída' : 'arquivada'}.`,
          link: os.id,
        });
      }
      
      await loadOrders();
    })();
  }, [orders, currentUserId, useLocalFallback, currentUser]);

  const reassign = useCallback((osId: string, newResponsible: string) => {
    if (useLocalFallback) {
      setOrders((prev) => prev.map((o) => {
        if (o.id !== osId) return o;
        return {
          ...o,
          responsible: newResponsible,
          updatedAt: new Date(),
          timeline: [...o.timeline, {
            id: `tl-${Date.now()}`,
            action: `OS reatribuída`,
            user: currentUser,
            date: new Date(),
            details: `atribuída a ${getProfileName(newResponsible)}`
          }]
        };
      }));

      const newNotif: OSNotification = {
        id: `notif-${Date.now()}`,
        osId,
        message: "Uma OS foi reatribuída para você",
        date: new Date(),
        read: false,
        user: currentUser
      };
      setNotifications((prev) => [newNotif, ...prev]);
      playBeepSound();
      return;
    }

    (async () => {
      const os = orders.find(o => o.id === osId);
      if (!os) return;
      
      let newTimeline = [...os.timeline, { id: crypto.randomUUID(), date: new Date(), action: `OS reatribuída`, user: currentUser, details: `atribuída a ${getProfileName(newResponsible)}` }];
      const obsPayload = stringifyObservation(os.description, os.dueDate, os.deadlineExtensionRequest, os.comments, newTimeline);
      
      await supabase.from("service_orders").update({ assigned_to: newResponsible, observation: obsPayload }).eq("id", osId);
      await supabase.from("notifications").insert({
        user_id: newResponsible,
        type: "os",
        title: "OS reatribuída",
        message: "Uma OS foi reatribuída para você",
        link: osId,
      });
      await loadOrders();
    })();
  }, [orders, currentUserId, useLocalFallback, currentUser, profiles]);

  const addComment = useCallback(async (osId: string, text: string, imageUrl?: string, videoUrl?: string) => {
    if (useLocalFallback) {
      const newComment: OSComment = { id: `cm-${Date.now()}`, author: currentUser, authorId: currentUserId, text, date: new Date(), imageUrl, videoUrl };
      
      setOrders((prev) => prev.map((o) => {
        if (o.id !== osId) return o;
        return {
          ...o,
          comments: [...o.comments, newComment],
          updatedAt: new Date()
        };
      }));

      const os = orders.find((o) => o.id === osId);
      if (os) {
        const recipients = new Set<string>();
        if (os.creator && os.creator !== currentUserId) recipients.add(os.creator);
        if (os.responsible && os.responsible !== currentUserId) recipients.add(os.responsible);

        const newNotifs = Array.from(recipients).map((id) => ({
          id: `notif-${Date.now()}-${id}`,
          osId,
          message: `${currentUser} enviou uma mensagem na OS #${os.number}`,
          date: new Date(),
          read: false,
          user: currentUser
        }));
        setNotifications((prev) => [...newNotifs, ...prev]);
        if (newNotifs.length > 0) {
          playBeepSound();
        }
      }
      return;
    }

    const os = orders.find(o => o.id === osId);
    if (!os) return;
    const newComment: OSComment = { id: `cm-${Date.now()}`, author: currentUser, authorId: currentUserId, text, date: new Date(), imageUrl, videoUrl };
    const obsPayload = stringifyObservation(os.description, os.dueDate, os.deadlineExtensionRequest, [...os.comments, newComment], os.timeline);
    await supabase.from("service_orders").update({ observation: obsPayload }).eq("id", osId);

    // Notification to all involved parties except the author
    const recipients = new Set<string>();
    if (os.creator && os.creator !== currentUserId) {
      recipients.add(os.creator);
    }
    if (os.responsible && os.responsible !== currentUserId) {
      recipients.add(os.responsible);
    }

    for (const recipientId of recipients) {
      await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "os",
        title: "Nova mensagem na OS",
        message: `${currentUser} enviou uma mensagem na OS #${os.number}`,
        link: os.id
      });
    }
    await loadOrders();
    await loadOSNotifications();
  }, [orders, currentUser, currentUserId, useLocalFallback]);

  const editComment = useCallback(async (osId: string, commentId: string, newText: string) => {
    const os = orders.find((o) => o.id === osId);
    if (!os) return;

    const comment = os.comments.find((c) => c.id === commentId);
    if (!comment) return;

    const isMe = comment.authorId === currentUserId || comment.author === currentUser;
    if (!isMe) {
      toast.error("Somente o autor da mensagem pode editá-la.");
      return;
    }

    const commentDate = new Date(comment.date);
    const tenMinutesInMs = 10 * 60 * 1000;
    if (Date.now() - commentDate.getTime() > tenMinutesInMs) {
      toast.error("Você só pode editar mensagens enviadas nos últimos 10 minutos.");
      return;
    }

    const originalDateFormatted = format(commentDate, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    const currentDateFormatted = format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    
    const newTimelineEntry: OSTimelineEntry = {
      id: crypto.randomUUID(),
      action: "Mensagem editada no chat",
      user: currentUser,
      date: new Date(),
      details: `Texto anterior (${originalDateFormatted}): "${comment.text}"\nTexto novo (${currentDateFormatted}): "${newText.trim()}"`
    };

    if (useLocalFallback) {
      setOrders((prev) => prev.map((o) => {
        if (o.id !== osId) return o;
        return {
          ...o,
          comments: o.comments.map((c) => c.id === commentId ? { ...c, text: newText.trim() } : c),
          timeline: [...o.timeline, newTimelineEntry],
          updatedAt: new Date()
        };
      }));
      toast.success("Mensagem editada com sucesso!");
      return;
    }

    const updatedComments = os.comments.map((c) => c.id === commentId ? { ...c, text: newText.trim() } : c);
    const updatedTimeline = [...os.timeline, newTimelineEntry];
    const obsPayload = stringifyObservation(os.description, os.dueDate, os.deadlineExtensionRequest, updatedComments, updatedTimeline);
    
    const { error: dbError } = await supabase.from("service_orders").update({ observation: obsPayload }).eq("id", osId);
    if (dbError) {
      console.error("Erro ao editar comentário na OS:", dbError);
      toast.error(`Falha ao editar mensagem: ${dbError.message}`);
      return;
    }

    await loadOrders();
    toast.success("Mensagem editada com sucesso!");
  }, [orders, currentUser, currentUserId, useLocalFallback, loadOrders]);

  const markNotificationRead = useCallback((notifId: string) => {
    if (useLocalFallback) {
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
      return;
    }
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
    supabase.from("notifications").update({ read: true }).eq("id", notifId).then();
  }, [useLocalFallback]);

  const markAllNotificationsRead = useCallback(() => {
    if (useLocalFallback) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (currentUserId) {
      supabase.from("notifications").update({ read: true }).eq("user_id", currentUserId).eq("type", "os").then();
    }
  }, [useLocalFallback, currentUserId]);

  const requestMoreTime = useCallback(async (osId: string, newDate: Date, justification: string) => {
    if (useLocalFallback) {
      setOrders((prev) => prev.map((o) => {
        if (o.id !== osId) return o;
        const req: DeadlineExtensionRequest = {
          requestedDate: newDate,
          justification,
          status: "pending",
          dateRequested: new Date()
        };
        return {
          ...o,
          deadlineExtensionRequest: req,
          updatedAt: new Date(),
          timeline: [...o.timeline, {
            id: `tl-${Date.now()}`,
            action: `Prazo solicitado`,
            user: currentUser,
            date: new Date(),
            details: `Solicitado novo prazo para ${newDate.toLocaleDateString()}`
          }]
        };
      }));
      return;
    }

    const os = orders.find(o => o.id === osId);
    if (!os) return;
    const req: DeadlineExtensionRequest = {
      requestedDate: newDate,
      justification,
      status: "pending",
      dateRequested: new Date()
    };
    
    let newTimeline = [...os.timeline, { id: crypto.randomUUID(), date: new Date(), action: `Prazo solicitado`, user: currentUser, details: `Solicitado novo prazo para ${newDate.toLocaleDateString()}` }];
    const obsPayload = stringifyObservation(os.description, os.dueDate, req, os.comments, newTimeline);
    
    await supabase.from("service_orders").update({ observation: obsPayload }).eq("id", osId);
    await supabase.from("notifications").insert({
      user_id: os.creator,
      type: "os",
      title: "Solicitação de prazo",
      message: `OS ${os.title}: Novo prazo solicitado`,
      link: os.id,
    });
  }, [orders, currentUserId, useLocalFallback, currentUser]);

  const respondTimeRequest = useCallback(async (osId: string, status: "approved" | "rejected", modifiedDate?: Date) => {
    if (useLocalFallback) {
      setOrders((prev) => prev.map((o) => {
        if (o.id !== osId) return o;
        const newDueDate = status === "approved" ? (modifiedDate || o.deadlineExtensionRequest?.requestedDate || o.dueDate) : o.dueDate;
        return {
          ...o,
          dueDate: newDueDate,
          deadlineExtensionRequest: o.deadlineExtensionRequest ? { ...o.deadlineExtensionRequest, status } : undefined,
          updatedAt: new Date(),
          timeline: [...o.timeline, {
            id: `tl-${Date.now()}`,
            action: `Solicitação de prazo ${status === 'approved' ? 'aprovada' : 'rejeitada'}`,
            user: currentUser,
            date: new Date()
          }]
        };
      }));
      return;
    }

    const os = orders.find(o => o.id === osId);
    if (!os || !os.deadlineExtensionRequest) return;
    
    const newDueDate = status === "approved" ? (modifiedDate || os.deadlineExtensionRequest.requestedDate) : os.dueDate;
    
    let newTimeline = [...os.timeline, { id: crypto.randomUUID(), date: new Date(), action: `Solicitação de prazo ${status === 'approved' ? 'aprovada' : 'rejeitada'}`, user: currentUser }];
    const obsPayload = stringifyObservation(os.description, newDueDate, {
      ...os.deadlineExtensionRequest,
      status
    }, os.comments, newTimeline);
    
    await supabase.from("service_orders").update({ observation: obsPayload }).eq("id", osId);
    await supabase.from("notifications").insert({
      user_id: os.responsible,
      type: "os",
      title: `Prazo ${status === "approved" ? "aprovado" : "rejeitado"}`,
      message: `OS ${os.title}: Sua solicitação de prazo foi ${status === "approved" ? "aprovada" : "rejeitada"}`,
      link: os.id,
    });
  }, [orders, currentUserId, useLocalFallback, currentUser]);

  const addAttachment = useCallback(async (osId: string, files: File[]) => {
    if (useLocalFallback) {
      if (!files || files.length === 0) return;
      setOrders((prev) => prev.map((o) => {
        if (o.id !== osId) return o;
        const newAtts = files.map((f, idx) => ({
          id: `at-${Date.now()}-${idx}`,
          name: f.name,
          url: URL.createObjectURL(f),
          type: (f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : "file") as any
        }));
        return {
          ...o,
          attachments: [...o.attachments, ...newAtts],
          updatedAt: new Date(),
          timeline: [...o.timeline, {
            id: `tl-${Date.now()}`,
            action: `Upload de anexo`,
            user: currentUser,
            date: new Date(),
            details: `${files.length} arquivo(s) anexado(s)`
          }]
        };
      }));
      return;
    }

    if (!files || files.length === 0) return;
    
    const os = orders.find(o => o.id === osId);
    if (!os) return;

    let successCount = 0;
    for (let file of files) {
      if (file.size > 500 * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} é muito grande. O limite é 500MB.`);
        continue;
      }
      const ext = file.name.split('.').pop() || '';
      const path = `os-attachments/${os.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("company-assets").upload(path, file, {
        upsert: true
      });
      if (uploadError) {
        console.error("Erro ao fazer upload do anexo:", uploadError);
        toast.error(`Falha no upload do arquivo ${file.name}: ${uploadError.message}`);
        continue;
      }
      
      const { data: pubData } = supabase.storage.from("company-assets").getPublicUrl(path);
      const { error: dbError } = await safeInsertAttachment({
        service_order_id: os.id,
        file_url: pubData.publicUrl,
        file_type: file.type || ext,
        file_name: file.name
      });
      if (dbError) {
        console.error("Erro ao vincular anexo à OS:", dbError);
        toast.error(`Falha ao registrar ${file.name} no banco`);
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      let newTimeline = [...os.timeline, { id: crypto.randomUUID(), date: new Date(), action: `Upload de anexo`, user: currentUser, details: `${successCount} arquivo(s) anexado(s)` }];
      const obsPayload = stringifyObservation(os.description, os.dueDate, os.deadlineExtensionRequest, os.comments, newTimeline);
      await supabase.from("service_orders").update({ observation: obsPayload }).eq("id", os.id);
      await loadOrders();
      toast.success(`${successCount} anexos enviados com sucesso!`);
    }
  }, [orders, currentUserId, useLocalFallback, currentUser]);

  const deleteAttachment = useCallback(async (osId: string, attachmentId: string) => {
    if (useLocalFallback) {
      setOrders((prev) => prev.map((o) => {
        if (o.id !== osId) return o;
        return {
          ...o,
          attachments: o.attachments.filter(a => a.id !== attachmentId),
          updatedAt: new Date(),
          timeline: [...o.timeline, {
             id: `tl-${Date.now()}`,
             action: `Anexo removido`,
             user: currentUser,
             date: new Date()
          }]
        };
      }));
      return;
    }

    // Optimistic update
    setOrders((prev) => prev.map((o) => {
      if (o.id !== osId) return o;
      return {
        ...o,
        attachments: o.attachments.filter(a => a.id !== attachmentId),
        updatedAt: new Date()
      };
    }));

    const { error: dbError, data: deletedData } = await supabase
      .from("service_order_attachments")
      .delete()
      .eq("id", attachmentId)
      .select();

    if (dbError) {
      console.error("Erro ao deletar anexo:", dbError);
      toast.error(`Falha ao excluir anexo: ${dbError.message}`);
      // Revert in case of error
      await loadOrders();
      return;
    }
    
    if (!deletedData || deletedData.length === 0) {
      console.warn("Nenhum anexo foi deletado no banco de dados. RLS possivelmente bloqueando ou registro inexistente.");
      toast.error(
        "A exclusão não foi autorizada pelo seu banco de dados (RLS). " +
        "Certifique-se de executar as novas migrações SQL no painel do Supabase para ativar a exclusão de anexos."
      );
      await loadOrders(); // Revert from optimistic update
      return;
    }
    
    console.log("Anexo deletado com sucesso do banco.");
    toast.success("Anexo removido com sucesso!");
    await loadOrders();
  }, [orders, currentUser, useLocalFallback, loadOrders]);

  const addExternalLink = useCallback(async (osId: string, name: string, url: string) => {
    if (useLocalFallback) {
      setOrders((prev) => prev.map((o) => {
        if (o.id !== osId) return o;
        const newLink: OSAttachment = {
          id: `at-${Date.now()}`,
          name: name || 'Link Externo',
          url,
          type: "link"
        };
        return {
          ...o,
          attachments: [...o.attachments, newLink],
          updatedAt: new Date(),
          timeline: [...o.timeline, {
            id: `tl-${Date.now()}`,
            action: `Link adicionado`,
            user: currentUser,
            date: new Date(),
            details: `Link: ${name}`
          }]
        };
      }));
      return;
    }

    const os = orders.find(o => o.id === osId);
    if (!os) return;

    const { error: dbError } = await safeInsertAttachment({
      service_order_id: osId,
      file_url: url,
      file_type: "link",
      file_name: name
    });

    if (dbError) {
      console.error("Erro ao adicionar link (detalhado):", dbError);
      toast.error(`Erro ao salvar link no banco: ${dbError.message}`);
      return;
    }

    let newTimeline = [...os.timeline, { id: crypto.randomUUID(), date: new Date(), action: `Link adicionado`, user: currentUser, details: `Link: ${name}` }];
    const obsPayload = stringifyObservation(os.description, os.dueDate, os.deadlineExtensionRequest, os.comments, newTimeline);
    await supabase.from("service_orders").update({ observation: obsPayload }).eq("id", os.id);
    
    await loadOrders();
    toast.success("Link adicionado com sucesso!");
  }, [orders, currentUserId, useLocalFallback, currentUser, loadOrders]);

  const updateOrder = useCallback(async (osId: string, data: {
    projectId: string;
    responsible: string;
    priority: OSPriority;
    title: string;
    description: string;
    dueDate?: Date;
  }) => {
    const os = orders.find((o) => o.id === osId);
    if (!os) {
      toast.error("Ordem de Serviço não encontrada.");
      return;
    }

    const changes: string[] = [];

    if (data.title !== os.title) {
      changes.push(`Título: de "${os.title}" para "${data.title}"`);
    }

    if (data.projectId !== os.projectId) {
      const oldProj = projects.find((p) => p.id === os.projectId)?.name || os.projectId;
      const newProj = projects.find((p) => p.id === data.projectId)?.name || data.projectId;
      changes.push(`Projeto: de "${oldProj}" para "${newProj}"`);
    }

    if (data.responsible !== os.responsible) {
      const oldResp = getProfileName(os.responsible);
      const newResp = getProfileName(data.responsible);
      changes.push(`Responsável: de "${oldResp}" para "${newResp}"`);
    }

    if (data.priority !== os.priority) {
      const oldPriorityLabel = osPriorityLabels[os.priority] || os.priority;
      const newPriorityLabel = osPriorityLabels[data.priority] || data.priority;
      changes.push(`Prioridade: de "${oldPriorityLabel}" para "${newPriorityLabel}"`);
    }

    if (data.description !== os.description) {
      changes.push(`Descrição/Observação editada`);
    }

    const oldDueStr = os.dueDate ? format(os.dueDate, "dd/MM/yyyy") : "Sem prazo";
    const newDueStr = data.dueDate ? format(data.dueDate, "dd/MM/yyyy") : "Sem prazo";
    if (oldDueStr !== newDueStr) {
      changes.push(`Prazo de entrega: de "${oldDueStr}" para "${newDueStr}"`);
    }

    if (changes.length === 0) {
      toast.info("Nenhuma alteração detectada.");
      return;
    }

    const updatedTimelineEntry = {
      id: crypto.randomUUID(),
      action: "Ordem de Serviço editada",
      user: currentUser,
      date: new Date(),
      details: changes.join("\n"),
    };

    const newTimeline = [...os.timeline, updatedTimelineEntry];

    if (useLocalFallback) {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== osId) return o;
          return {
            ...o,
            title: data.title,
            projectId: data.projectId,
            responsible: data.responsible,
            priority: data.priority,
            description: data.description,
            dueDate: data.dueDate,
            updatedAt: new Date(),
            timeline: newTimeline,
          };
        })
      );
      toast.success("Ordem de Serviço editada localmente!");
      return;
    }

    try {
      const obsPayload = stringifyObservation(
        data.description,
        data.dueDate,
        os.deadlineExtensionRequest,
        os.comments,
        newTimeline
      );

      const { error: dbError } = await supabase
        .from("service_orders")
        .update({
          title: data.title,
          project_id: data.projectId,
          assigned_to: data.responsible,
          priority: data.priority,
          observation: obsPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", osId);

      if (dbError) {
        console.error("Erro ao atualizar OS no Supabase:", dbError);
        toast.error(`Erro ao atualizar OS no banco: ${dbError.message}`);
        return;
      }

      if (data.responsible !== os.responsible) {
        await supabase.from("notifications").insert({
          user_id: data.responsible,
          type: "os",
          title: "OS reatribuída",
          message: `A OS "${data.title}" foi reatribuída a você.`,
          link: osId,
        });
      }

      await loadOrders();
      toast.success("Ordem de Serviço atualizada com sucesso!");
    } catch (err: any) {
      console.error("Erro geral no updateOrder:", err);
      toast.error(`Ocorreu um erro: ${err.message || err}`);
    }
  }, [orders, currentUser, projects, useLocalFallback, loadOrders, getProfileName]);

  const archiveOrder = useCallback((osId: string) => {
    updateStatus(osId, "archived");
  }, [updateStatus]);

  return (
    <ServiceOrderContext.Provider
      value={{ orders, notifications, currentUser, createOrder, updateStatus, reassign, addComment, editComment, addAttachment, deleteAttachment, addExternalLink, markNotificationRead, markAllNotificationsRead, archiveOrder, requestMoreTime, respondTimeRequest, updateOrder }}
    >
      {children}
    </ServiceOrderContext.Provider>
  );
}

export function useServiceOrders() {
  const ctx = useContext(ServiceOrderContext);
  if (!ctx) throw new Error("useServiceOrders must be used within ServiceOrderProvider");
  return ctx;
}