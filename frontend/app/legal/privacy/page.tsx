import type { Metadata } from "next";
import LegalPage, { List } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy | MediStock IMS" };

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Privacy policy"
      title="MediStock IMS privacy policy"
      updated="8 October 2026"
      intro="MediStock IMS helps healthcare facilities track medicine stock, suppliers and purchase orders. This policy explains what personal information the system holds about its users, why, and how it is protected in line with the Protection of Personal Information Act 4 of 2013 (POPIA)."
      sections={[
        {
          heading: "Who is responsible",
          body: (
            <p>
              The healthcare facility that deploys MediStock IMS is the responsible party for the personal information of its
              staff in the system. MediStock IMS is the tool the facility uses to process that information.
            </p>
          ),
        },
        {
          heading: "What we collect",
          body: (
            <List
              items={[
                "Account details: full name, work email address, role and permissions, and for Hospital Portal users a facility code and staff ID.",
                "Sign-in information: last login time and sign-in attempts.",
                "Activity records: stock transactions, purchase orders, medicine and supplier changes, and user-management actions, each linked to the user who performed them.",
                "Preferences: notification, theme and accent-colour settings.",
                "Supplier contact details entered by your facility (contact person, email, phone).",
              ]}
            />
          ),
        },
        {
          heading: "What we do not collect",
          body: (
            <p>
              MediStock IMS does not store patient records, patient health information, or payment or insurance details. It
              manages inventory only. Please do not enter patient information in free-text fields.
            </p>
          ),
        },
        {
          heading: "Why we use it",
          body: (
            <List
              items={[
                "To authenticate users and enforce role-based access.",
                "To keep an audit trail of who changed stock, orders and records, for accountability and compliance.",
                "To send in-app alerts such as low stock and expiring medicines.",
                "To produce inventory and expenditure reports.",
              ]}
            />
          ),
        },
        {
          heading: "How it is protected",
          body: (
            <List
              items={[
                "Passwords are stored as salted hashes and are never stored or sent in plain text.",
                "Row Level Security restricts what each role can read or change; users can only see their own settings and activity.",
                "Activity logs can only be written by the system, so entries cannot be forged from the browser.",
                "Access is over an encrypted connection.",
              ]}
            />
          ),
        },
        {
          heading: "Sharing",
          body: (
            <p>
              Personal information is not sold. It is shared only with the service providers that host the system (database and
              authentication hosting) and where the law requires disclosure.
            </p>
          ),
        },
        {
          heading: "Retention",
          body: (
            <p>
              Account and activity records are kept while the facility uses the system and for the period the facility needs
              them for audit and legal purposes. Deactivated accounts keep their historical activity so the audit trail stays
              complete.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <p>
              Under POPIA you may ask to see the personal information held about you, ask for it to be corrected or deleted
              where the law allows, and object to its processing. Contact your facility&apos;s MediStock administrator, who will
              act on the request. If you are not satisfied, you can complain to the Information Regulator (South Africa).
            </p>
          ),
        },
        {
          heading: "Changes",
          body: <p>We may update this policy. The date at the top shows when it last changed.</p>,
        },
      ]}
    />
  );
}
