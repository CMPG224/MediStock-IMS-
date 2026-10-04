import type { ReactNode } from "react";
import Icon from "./Icon";
import styles from "./AuthLayout.module.css";

type AuthLayoutProps = {
  /** Material Symbols name for the badge above the title. */
  icon: string;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;

  /** Use the green badge instead of blue (for success states). */
  success?: boolean;

  /** Smaller heading, used on the secondary auth screens. */
  compact?: boolean;

  /** Anything below the card—a backlink, legal footer, etc. */
  footer?: ReactNode;

  /** Show the decorative background blobs. Only the main login uses them. */
  decorated?: boolean;
};

/**
 * The shared frame for every authentication screen: centred column, badge,
 * title, subtitle, white card, optional footer.
 *
 * Four screens use this. Putting it in one place means a change to the card
 * shadow or the page padding happens once, not four times.
 */
export default function AuthLayout({
  icon,
  title,
  subtitle,
  children,
  success = false,
  compact = false,
  footer,
  decorated = false,
}: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      {decorated && (
        <>
          <div
            className={`${styles.blob} ${styles.blobTop}`}
          />
          <div
            className={`${styles.blob} ${styles.blobBottom}`}
          />
        </>
      )}

      <div className={styles.content}>
        <div
          className={`${styles.badge} ${
            success ? styles.badgeSuccess : ""
          }`}
        >
          <Icon name={icon} size={30} color="#fff" />
        </div>

        {/* Exactly one <h1> per screen: it is the page’s headline. */}
        <h1
          className={`${styles.title} ${
            compact ? styles.titleSmall : ""
          }`}
        >
          {title}
        </h1>

        <p className={styles.subtitle}>{subtitle}</p>

        <div className={styles.card}>{children}</div>

        {footer}
      </div>
    </div>
  );
}