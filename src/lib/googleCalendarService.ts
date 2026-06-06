import { toast } from "sonner";

export const googleCalendarService = {
  isInitialized(): boolean {
    return false;
  },

  getConnectedEmail(): string | null {
    return null;
  },

  async getAccessToken(): Promise<string | null> {
    return null;
  },

  async connect(): Promise<{ email: string; token: string }> {
    toast.error("Integração com Google Agenda desativada por completo.");
    throw new Error("Integração desativada");
  },

  disconnect() {
    // No-op
  },

  async createEvent(event: {
    title: string;
    description: string;
    date: string;
    time: string;
    participants: string;
    location?: string;
  }): Promise<string | null> {
    return null;
  },

  async updateEvent(
    googleEventId: string,
    event: {
      title: string;
      description: string;
      date: string;
      time: string;
      participants: string;
      location?: string;
    }
  ): Promise<boolean> {
    return true;
  },

  async deleteEvent(googleEventId: string): Promise<boolean> {
    return true;
  }
};
