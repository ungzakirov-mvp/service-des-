import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useVisitTracker() {
  useEffect(() => {
    const sessionId =
      sessionStorage.getItem("novum-session") ||
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("novum-session", sessionId);

    supabase.functions.invoke("track-visit", {
      body: {
        page: window.location.pathname,
        referrer: document.referrer || null,
        session_id: sessionId,
      },
    }).catch(() => {});
  }, []);
}
