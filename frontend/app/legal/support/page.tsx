import type { Metadata } from "next";
import LegalPage, { List } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Technical Support | MediStock IMS" };

export default function SupportPage() {
  return (
    <LegalPage
      eyebrow="Support"
      title="Technical support"
      updated="8 October 2026"
      intro="Stuck or something not working? Start with the quick fixes below, then contact your facility's MediStock administrator."
      sections={[
        {
          heading: "Signing in",
          body: (
            <List
              items={[
                "\"Incorrect email or password\": check your work email and password. Passwords are case-sensitive.",
                "Forgot your password: use \"Forgot password\" on the sign-in page to get a reset link by email.",
                "Hospital Portal: you need both your facility code and staff ID. Ask your administrator if either is rejected.",
                "Account deactivated or still pending: an administrator must activate it from the Users page.",
              ]}
            />
          ),
        },
        {
          heading: "Access and permissions",
          body: (
            <p>
              If a page or button is missing, your role may not allow it. Ask an administrator to review your role under User
              Management.
            </p>
          ),
        },
        {
          heading: "Data problems",
          body: (
            <List
              items={[
                "Stock count looks wrong: open Transactions to see every movement, who made it and when.",
                "Missing alert: check that the medicine has a reorder point greater than 0 and the alert type is enabled in Settings.",
                "Save failed: refresh the page and retry; if it repeats, note the error message and report it.",
              ]}
            />
          ),
        },
        {
          heading: "Contacting support",
          body: (
            <>
              <p>
                Contact your facility&apos;s MediStock administrator or IT support team first. When you report a problem,
                include:
              </p>
              <List
                items={[
                  "Your name, role and work email.",
                  "The page you were on and what you were trying to do.",
                  "The exact error message, and the date and time it happened.",
                  "A screenshot, if possible, with no patient or personal information visible.",
                ]}
              />
            </>
          ),
        },
        {
          heading: "Service hours",
          body: (
            <p>
              Support is available during normal business hours. Urgent stock-safety issues should follow your facility&apos;s
              escalation procedure.
            </p>
          ),
        },
      ]}
    />
  );
}
