import type { Metadata } from "next";
import LegalPage, { List } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms of Service | MediStock IMS" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of service"
      title="MediStock IMS terms of service"
      updated="8 October 2026"
      intro="These terms apply to everyone who signs in to MediStock IMS. By using the system you agree to them. If you do not agree, do not use it."
      sections={[
        {
          heading: "Authorised use",
          body: (
            <p>
              MediStock IMS is for authorised staff of the healthcare facility that provided your account. Use it only for
              managing medicine stock, suppliers, purchase orders and related reports.
            </p>
          ),
        },
        {
          heading: "Your account",
          body: (
            <List
              items={[
                "Keep your password and sign-in details confidential and do not share your account.",
                "You are responsible for actions taken under your account.",
                "Tell your administrator immediately if you suspect your account has been used by someone else.",
                "Sessions end automatically after a period of inactivity.",
              ]}
            />
          ),
        },
        {
          heading: "Roles and permissions",
          body: (
            <p>
              What you can see and do depends on your role (for example administrator, manager, pharmacist, nurse or staff).
              Do not try to access data or functions your role does not allow.
            </p>
          ),
        },
        {
          heading: "Accuracy of records",
          body: (
            <p>
              Stock levels, batch numbers, expiry dates and orders must be entered accurately and promptly. MediStock IMS
              supports, but does not replace, your facility&apos;s clinical and pharmacy procedures. Verify critical stock
              before dispensing.
            </p>
          ),
        },
        {
          heading: "Acceptable behaviour",
          body: (
            <List
              items={[
                "Do not enter patient information or other unrelated personal information.",
                "Do not attempt to break, probe or bypass the system's security.",
                "Do not upload malicious content or interfere with other users.",
                "Do not alter or try to delete audit records.",
              ]}
            />
          ),
        },
        {
          heading: "Audit and monitoring",
          body: (
            <p>
              Your actions, such as stock movements, order changes and sign-ins, are recorded and visible to administrators for
              accountability and compliance. See the Privacy Policy for details.
            </p>
          ),
        },
        {
          heading: "Availability",
          body: (
            <p>
              We aim to keep the system available during normal business hours but do not guarantee uninterrupted service.
              Planned maintenance will be kept as short as possible.
            </p>
          ),
        },
        {
          heading: "Liability",
          body: (
            <p>
              To the extent the law allows, MediStock IMS is provided &quot;as is&quot; and is not liable for losses arising
              from inaccurate data entered by users, service interruptions, or decisions made using the system&apos;s reports and
              alerts.
            </p>
          ),
        },
        {
          heading: "Suspension and changes",
          body: (
            <p>
              An administrator may suspend or deactivate an account that breaches these terms. We may update these terms; the
              date at the top shows the latest version. Continued use means you accept the changes.
            </p>
          ),
        },
        {
          heading: "Governing law",
          body: <p>These terms are governed by the laws of the Republic of South Africa.</p>,
        },
      ]}
    />
  );
}
