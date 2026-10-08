// supabase/functions/hospital-login/index.ts
//
// Backs the Hospital Portal screen: facility_code + staff_id in, a real
// Supabase session out. Supabase Auth's client-side methods
// (signInWithPassword, resetPasswordForEmail, ...) cover email/password and
// forgot-password entirely — this is the ONE screen that needs custom
// server-side code, because "log in with a facility code instead of a
// password" isn't something Supabase Auth does natively.
//
// How it works: every hospital account has a real password, but it's a
// long random string the human never sees or types — it's stored in
// hospital_login_secrets, a table locked down so ONLY this function (using
// the service_role key) can read it. This function looks up that secret by
// the facility_code + staff_id pair, then signs in on the user's behalf
// with it, and hands back the resulting session. From the frontend's
// perspective, it gets back exactly the same {access_token, refresh_token,
// user} shape a normal signInWithPassword call would produce.
//
// Deploy with: supabase functions deploy hospital-login
// Calls to it need the ANON key in the Authorization header, same as any
// other Supabase API call — see the frontend integration notes for how
// supabase-js does this automatically via `functions.invoke`.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Lets the browser call this function from the frontend's origin.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: { facility_code?: string; staff_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const facilityCode = (body.facility_code ?? "").trim();
  const staffId = (body.staff_id ?? "").trim();
  if (!facilityCode || !staffId) {
    return json({ error: "facility_code and staff_id are both required." }, 400);
  }

  // The service-role client bypasses RLS — this is the only place in the
  // whole app that's allowed to read hospital_login_secrets.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: secretRow, error: lookupError } = await adminClient
    .from("hospital_login_secrets")
    .select("secret_password, user_id")
    .eq("facility_code", facilityCode)
    .eq("staff_id", staffId)
    .maybeSingle();

  if (lookupError) {
    console.error("hospital-login lookup failed:", lookupError);
    return json({ error: "Something went wrong. Try again." }, 500);
  }
  if (!secretRow) {
    // Same message regardless of which part was wrong — same reasoning as
    // the earlier Django version: don't let this response reveal which
    // facility codes exist.
    return json({ error: "No account matches that facility code and staff ID." }, 400);
  }

  // Fetch the email for that user_id — signInWithPassword needs an email,
  // not a user id.
  const { data: userRecord, error: userError } =
    await adminClient.auth.admin.getUserById(secretRow.user_id);
  if (userError || !userRecord?.user?.email) {
    console.error("hospital-login: could not resolve user email:", userError);
    return json({ error: "Something went wrong. Try again." }, 500);
  }

  // Sign in with the anon-key client — this is the same client type the
  // frontend itself uses, so the session it returns behaves identically to
  // a normal email/password login.
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signInData, error: signInError } =
    await anonClient.auth.signInWithPassword({
      email: userRecord.user.email,
      password: secretRow.secret_password,
    });

  if (signInError || !signInData.session) {
    console.error("hospital-login: sign-in failed:", signInError);
    return json({ error: "Something went wrong. Try again." }, 500);
  }

  return json({
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
    user: signInData.user,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
