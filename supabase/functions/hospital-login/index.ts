import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
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

  // The service-role client bypasses RLS. It is the only place in the app
  // allowed to read hospital_login_secrets.
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
    return json({ error: "No account matches that facility code and staff ID." }, 400);
  }

  const { data: userRecord, error: userError } =
    await adminClient.auth.admin.getUserById(secretRow.user_id);

  if (userError || !userRecord?.user?.email) {
    console.error("hospital-login: could not resolve user email:", userError);
    return json({ error: "Something went wrong. Try again." }, 500);
  }

  // Sign in with the anon-key client, the same kind of client the frontend
  // uses, so the returned session behaves like a normal login.
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
    headers: { "Content-Type": "application/json" },
  });
}