// supabase/functions/invite-user/index.ts
//
// Backs "Create New User" on the Users page. Inviting needs the service_role
// key (auth.admin), so it can't happen in the browser. The caller's own JWT
// is checked first: only an active administrator may invite.
//
// Deploy with: supabase functions deploy invite-user

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ROLES = ["administrator", "pharmacist", "manager", "nurse", "staff"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Act as the caller so is_admin() sees their auth.uid().
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: isAdmin, error: adminError } = await callerClient.rpc("is_admin");
  if (adminError || isAdmin !== true) {
    return json({ error: "Only administrators can invite users." }, 403);
  }

  let body: { full_name?: string; email?: string; role?: string; redirect_to?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const fullName = (body.full_name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role ?? "staff";
  if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "A full name and a valid email are required." }, 400);
  }
  if (!ROLES.includes(role)) {
    return json({ error: "Unknown role." }, 400);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: body.redirect_to,
  });
  if (inviteError || !invited.user) {
    console.error("invite-user: invite failed:", inviteError);
    const exists = inviteError?.message?.toLowerCase().includes("already");
    return json({ error: exists ? "A user with that email already exists." : "Could not send the invite. Try again." }, exists ? 409 : 500);
  }

  // handle_new_user created the profile with the default role; set the real
  // one. Invited users count as "pending" until their first sign-in.
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ role, full_name: fullName, is_active: false })
    .eq("id", invited.user.id);
  if (profileError) {
    console.error("invite-user: profile update failed:", profileError);
    return json({ error: "Invite sent, but the role could not be set. Edit it on the Users page." }, 500);
  }

  return json({ id: invited.user.id });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
