import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const userAgent = req.headers.get("user-agent") || "";
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("site_visits").insert({
      page: String(body.page || "/").slice(0, 500),
      referrer: body.referrer ? String(body.referrer).slice(0, 1000) : null,
      user_agent: userAgent.slice(0, 500),
      device_type: isMobile ? "mobile" : "desktop",
      session_id: body.session_id ? String(body.session_id).slice(0, 100) : null,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
