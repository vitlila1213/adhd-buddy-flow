import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const userId = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const APP_URL = "https://www.meucerebrodebolso.site";

    if (error) {
      console.error("Google OAuth error:", error);
      return Response.redirect(`${APP_URL}/?gcal_status=error&reason=${error}`, 302);
    }

    if (!code || !userId) {
      return Response.redirect(`${APP_URL}/?gcal_status=error&reason=missing_params`, 302);
    }

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Token exchange response status:", tokenResponse.status);

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return Response.redirect(`${APP_URL}/?gcal_status=error&reason=token_exchange_failed`, 302);
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Store tokens using service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: upsertError } = await supabase
      .from("user_integrations")
      .upsert({
        user_id: userId,
        provider: "google_calendar",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: expiresAt,
        connected_at: new Date().toISOString(),
      }, { onConflict: "user_id,provider" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return Response.redirect(`${APP_URL}/?gcal_status=error&reason=db_error`, 302);
    }

    return Response.redirect(`${APP_URL}/?gcal_status=success`, 302);
  } catch (e) {
    console.error("google-calendar-callback error:", e);
    return Response.redirect(`https://www.meucerebrodebolso.site/?gcal_status=error&reason=unknown`, 302);
  }
});
