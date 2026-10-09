"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./landing.css";

// three.js needs a browser; keep it out of the server render.
const PillCapsule = dynamic(() => import("./PillCapsule"), { ssr: false });

gsap.registerPlugin(ScrollTrigger);

// Placeholder figures for a demonstration build — swap for measured numbers before use.
const STATS = [
  { n: "99.98%", l: "Inventory accuracy across tracked sites" },
  { n: "4.2M", l: "Units under management at any moment" },
  { n: "<30s", l: "From goods-in scan to a live stock position" },
  { n: "24/7", l: "Cold-chain and expiry monitoring, unattended" },
];

const PLATFORM = [
  {
    h: "Batch and lot traceability",
    p: "Every unit carries its batch, its origin and its expiry from goods-in to dispatch. Trace forward to every customer who received a lot, or backward to the consignment it arrived on, in a single query.",
  },
  {
    h: "Serialisation",
    p: "Unit-level identifiers modelled on GS1 application identifiers, so aggregation from unit to pack to case to pallet stays intact through every movement and split.",
  },
  {
    h: "Expiry and shelf life",
    p: "FEFO allocation by default. Stock approaching expiry surfaces on a rolling horizon you configure per product, long before it becomes write-off.",
  },
  {
    h: "Cold chain",
    p: "Continuous temperature logging against each consignment, with excursion alerts and a permanent record attached to the batch — not to a spreadsheet somebody has to remember to file.",
  },
  {
    h: "Automated replenishment",
    p: "Reorder points computed from real consumption rather than static minimums, with lead-time and seasonality applied per site and per supplier.",
  },
  {
    h: "Recall management",
    p: "Scope a recall by batch, date range or supplier and get the affected units, their current holders and their movement history immediately. Quarantine propagates across every site at once.",
  },
  {
    h: "Multi-site transfers",
    p: "Inter-site movements are two-sided and reconciled. Stock in transit is visible to both ends and to nobody's imagination.",
  },
  {
    h: "Immutable audit trail",
    p: "Every adjustment carries a user, a reason code and a timestamp, and nothing is deleted. Corrections are written as reversing entries, the way an accountable ledger works.",
  },
  {
    h: "Integrations",
    p: "Dispensing systems, ERP and finance, supplier EDI and scanner hardware, over a documented API with webhooks for anything that needs to react to a movement.",
  },
];

const FEATURES = [
  {
    h: "Live, not nightly",
    p: "Positions update as movements happen. Nobody waits for an overnight batch job to find out what is on the shelf this morning.",
  },
  {
    h: "Records built for inspection",
    p: "The audit trail is the source of truth, not a report generated from one. What an inspector asks for is what the system already stores.",
  },
  {
    h: "Works where the signal does not",
    p: "Scanning continues offline at the receiving bay and the dispensary, and reconciles on reconnect without duplicating movements.",
  },
];

const WHY = [
  {
    h: "One point of accountability",
    p: "Intake, storage, transfer and dispatch run on one ledger. There is no second system to reconcile against, and no gap between them for stock to disappear into.",
  },
  {
    h: "Visibility across every site",
    p: "Depot, distribution centre and dispensary report into the same live position, so a shortage in one place can be answered by surplus in another.",
  },
  {
    h: "Compliance as a by-product",
    p: "Traceability, temperature history and audit records fall out of ordinary daily use. Nobody has to assemble them the week before an inspection.",
  },
  {
    h: "Loss you can actually see",
    p: "Shrinkage, expiry write-off and mis-picks are attributed to a site, a shift and a reason code, which is the only way they ever get smaller.",
  },
  {
    h: "Fast resolution",
    p: "Discrepancies are raised against the movement that caused them, with the scan history attached, so investigations start with evidence rather than a search.",
  },
];

const STANDARDS = [
  "GS1 identifiers",
  "GDP",
  "GxP",
  "FEFO allocation",
  "Serialisation",
  "Cold-chain logging",
  "HL7 / FHIR",
  "POPIA",
  "GDPR",
  "Role-based access",
  "Immutable audit trail",
  "Documented API",
];

const FAQ = [
  {
    q: "What does MediStock actually track?",
    a: "Stock at unit, pack, case and pallet level, each carrying its own batch, expiry, supplier and location. Movements between those levels — receiving, splitting, transferring, dispensing, returning, writing off — are all recorded as entries against the same ledger, so a position at any moment is the sum of its movements rather than a number somebody typed in.",
  },
  {
    q: "How does a recall work in practice?",
    a: "You scope it by batch, by manufacture or expiry date range, or by supplier consignment. The system returns every affected unit, where it currently sits, and every site or customer that received one. Quarantine applies across all sites at once, and the units stay blocked from allocation until the recall is closed.",
  },
  {
    q: "What happens when a fridge goes out of range?",
    a: "Temperature is logged continuously against the consignment, not just sampled at handover. An excursion raises an alert immediately and attaches a permanent record to the affected batch, so the decision about whether that stock is still saleable is made against real data and stays documented.",
  },
  {
    q: "Can it run when the network drops?",
    a: "Yes. Scanning at the receiving bay and the dispensary continues offline against a local store, and movements reconcile on reconnect. Movements are idempotent, so a reconnect cannot double-count a scan that had already been accepted.",
  },
  {
    q: "How is stock allocated?",
    a: "First-expiry-first-out by default, so the oldest viable stock moves first and write-off falls. Allocation rules can be overridden per product where clinical or contractual requirements demand it, and every override is recorded against the user who made it.",
  },
  {
    q: "What does it integrate with?",
    a: "Dispensing and point-of-sale systems, ERP and finance, supplier EDI, and scanner hardware, through a documented API. Webhooks fire on movement events so downstream systems can react without polling.",
  },
  {
    q: "Who can change stock figures?",
    a: "Access is role-based and adjustments require a reason code. Nothing is ever deleted — a correction is written as a reversing entry against the original, so the history of what was believed and when remains readable after the fact.",
  },
  {
    q: "Is it certified?",
    a: "This is a demonstration build. It is designed against the standards and practices listed above, but it does not carry certification or regulatory approval, and nothing here should be read as a claim to either.",
  },
];

export default function Site() {
  const rootRef = useRef(null);
  const [solid, setSolid] = useState(false);

  // header goes solid once the pinned stage is behind you
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setSolid(window.scrollY > window.innerHeight * 0.6);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // reveal-on-enter for everything below the stage
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray("[data-reveal]").forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.75,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} id="top" className="landing">
      <header className="site-header" data-solid={solid ? "1" : "0"}>
        <div className="wrap">
          <a className="mark" href="#top">
            <b />
            MediStock <span className="mark-sub">(IMS)</span>
          </a>
          <nav className="nav">
            <a href="#platform">Platform</a>
            <a href="#why">Why MediStock</a>
            <a href="#standards">Compliance</a>
            <a href="#faq">FAQ</a>
          </nav>
          <Link className="btn btn--solid btn--sm" href="/login">
            Sign in <span className="arrow">→</span>
          </Link>
        </div>
      </header>

      <PillCapsule />

      {/* ---- stats banner ---- */}
      <section className="section section--tight">
        <div className="wrap">
          <div className="stats" data-reveal>
            {STATS.map((s) => (
              <div className="stat" key={s.l}>
                <div className="stat-n">{s.n}</div>
                <div className="stat-l">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- platform ---- */}
      <section className="section" id="platform">
        <div className="wrap">
          <div className="section-head" data-reveal>
            <div>
              <h2 className="h2">
                Nine systems.
                <br />
                <span className="soft">One ledger underneath them.</span>
              </h2>
            </div>
            <p className="lede">
              Pharmaceutical stock is not ordinary inventory. It expires, it needs temperature, it gets recalled, and
              somebody has to be able to prove where every unit went. MediStock is built for that from the ledger up.
            </p>
          </div>

          <div className="grid-3" data-reveal>
            {PLATFORM.map((s) => (
              <article className="card" key={s.h}>
                <h3 className="h3">{s.h}</h3>
                <p>{s.p}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---- features ---- */}
      <section className="section">
        <div className="wrap">
          <div className="features">
            {FEATURES.map((f) => (
              <div className="feature" key={f.h} data-reveal>
                <h3 className="h3">{f.h}</h3>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- why ---- */}
      <section className="section" id="why">
        <div className="wrap why">
          <div data-reveal>
            <h2 className="h2">
              We hold the ledger.
              <br />
              <span className="soft">You hold the stock.</span>
            </h2>
            <p className="lede" style={{ marginTop: 24 }}>
              Most stock loss is not theft. It is a movement nobody recorded, a batch nobody flagged, and a count
              nobody could reconcile until it was far too late to act on. Five decisions close those gaps.
            </p>
          </div>

          <ul className="why-list" data-reveal>
            {WHY.map((w) => (
              <li key={w.h}>
                <div>
                  <h3>{w.h}</h3>
                  <p>{w.p}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- standards ---- */}
      <section id="standards">
        <div className="wrap" style={{ paddingBottom: 26 }}>
          <h2 className="h3" data-reveal>
            Built against recognised standards
          </h2>
        </div>
        <div className="marquee">
          <div className="marquee-track">
            {[...STANDARDS, ...STANDARDS].map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
        </div>
        <div className="wrap" style={{ paddingTop: 26 }}>
          <p className="mono dim" data-reveal>
            Demonstration build. Designed against these standards and practices; not certified against them.
          </p>
        </div>
      </section>

      {/* ---- faq ---- */}
      <section className="section" id="faq">
        <div className="wrap">
          <div className="section-head" data-reveal>
            <div>
              <h2 className="h2">
                Straight answers.
                <br />
                <span className="soft">No hand-waving.</span>
              </h2>
            </div>
          </div>

          <div className="faq" data-reveal>
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <i>+</i>
                </summary>
                <p className="a">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---- cta ---- */}
      <section className="cta" id="contact">
        <div className="wrap">
          <h2 className="display" data-reveal>
            Know what is on the shelf.
            <br />
            <span className="soft">Before somebody asks.</span>
          </h2>
          <p className="lede" style={{ margin: "0 auto" }} data-reveal>
            We will walk a batch through intake, storage, transfer and dispatch against your own stock profile, and
            show you the audit trail it leaves behind.
          </p>
          <div className="cta-row" data-reveal>
            <Link className="btn btn--solid" href="/login">
              Sign in to MediStock <span className="arrow">→</span>
            </Link>
            <a className="btn btn--ghost" href="#platform">
              See the platform
            </a>
          </div>
        </div>
      </section>

      {/* ---- footer ---- */}
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="mark" style={{ marginBottom: 16 }}>
                <b />
                MediStock <span className="mark-sub">(IMS)</span>
              </div>
              <p className="body" style={{ maxWidth: "32ch" }}>
                Pharmaceutical inventory infrastructure. From goods-in scan to dispatch, on one accountable ledger.
              </p>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                <li>
                  <a href="#platform">Batch traceability</a>
                </li>
                <li>
                  <a href="#platform">Cold chain</a>
                </li>
                <li>
                  <a href="#platform">Recall management</a>
                </li>
                <li>
                  <a href="#platform">Integrations</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li>
                  <a href="#why">Why MediStock</a>
                </li>
                <li>
                  <a href="#standards">Compliance</a>
                </li>
                <li>
                  <a href="#faq">FAQ</a>
                </li>
                <li>
                  <Link href="/login">Sign in</Link>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Colophon</h4>
              <ul>
                <li>CMPG 224 (SE)</li>
                <li>Interface in Three.js</li>
                <li>Motion by GSAP</li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>MediStock (IMS) — demonstration build, not a certified medical or regulatory system.</span>
            <span className="mono">
              <Link href="/legal/privacy">Privacy</Link> · <Link href="/legal/terms">Terms</Link> ·{" "}
              <Link href="/legal/support">Support</Link>
            </span>
            <span className="mono">Structure inspired by unitedcarriers.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
