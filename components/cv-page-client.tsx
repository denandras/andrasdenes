"use client";

import { useEffect } from "react";
import Image from "next/image";
import BottomNav from "@/components/bottom-nav";
import BrandMark from "@/components/brand-mark";
import LanguageSwitcher, { useSiteLanguage } from "@/components/language-switcher";
import { IconDownload, IconLocation, IconOpenInNew } from "@/components/icons";
import type { SiteLanguage } from "@/lib/site-language";

type CvPageClientProps = {
  cvDownloadUrl: string | null;
  initialLanguage: SiteLanguage;
  upcomingConcerts: Array<{
    date: string;
    city: string;
    venue: string;
    note?: string;
    href?: string;
  }>;
};

const cvSections = [
  {
    title: "Competitions",
    items: [
      { era: "2024", title: "Davison Young Musicians Foundation National Brass Competition", detail: "3rd prize" },
      { era: "2023", title: "International Trombone Association (Frank Smith Competition)", detail: "1st prize" },
      { era: "2022", title: "43rd Brass and Percussion Meeting and Competition", detail: "1st prize" },
      { era: "2022", title: "XIII. International Trombone Competition in Brno", detail: "3rd prize" },
      { era: "2021", title: "Hungarian National Trombone Competition (Hungarian Trombone Camp)", detail: "1st prize" },
      { era: "2021", title: "International VaraĹľdin Woodwind & Brass Competition", detail: "1st prize and 2nd prize in the overall category (wind instruments)" },
      { era: "2020", title: "Online Trombone Competition, Trombone Category C", detail: "3rd prize" },
      { era: "2019", title: "XIII. International Trombone Competition in Brno", detail: "1st prize" },
      { era: "2018", title: "XIII. National Vocational High School Trombone and Tuba Competition", detail: "2nd prize" },
    ],
  },
  {
    title: "Auditions",
    items: [
      { era: "2025", title: "Óbudai Danubia Orchestra audition", detail: "Winner" },
      { era: "2024", title: "Alba Regia Symphony Orchestra audition", detail: "Winner" },
      { era: "2024", title: "Hungarian State Opera audition", detail: "Qualified" },
    ],
  },
  {
    title: "Solo performances",
    items: [
      { era: "2025", title: "Solo performance on the Hungarian Radio Symphony Orchestra's New Year's concert", detail: "Solo performance" },
      { era: "2025", title: "Concert of Accademia Ungheria Rome's 'I Giovedi in via Giulia' series", detail: "Solo performance" },
      { era: "2025", title: "Held a masterclass in Kunming as part of the China Orchestra Network Festival", detail: "Masterclass" },
      { era: "2025", title: "Held a masterclass in Poznan as part of the Tromboholizm Festival", detail: "Masterclass" },
      { era: "2024", title: "Talent Day concert accompanied by the Franz Liszt Chamber Orchestra", detail: "Solo performance" },
    ],
  },
];

const cvSectionsHu = [
  {
    title: "Versenyek",
    items: [
      { era: "2024", title: "Davison Young Musicians Foundation Országos Rézfúvós Verseny", detail: "III. díj" },
      { era: "2023", title: "ITF (Frank Smith) Nemzetközi Harsonaverseny", detail: "I. díj" },
      { era: "2022", title: "43. Rézfúvós és Ütőhangszeres Találkozó és Verseny", detail: "I. díj" },
      { era: "2022", title: "XIII. Nemzetközi Harsonaverseny Brno", detail: "III. díj" },
      { era: "2021", title: "Hungarian National Trombone Competition (Hungarian Trombone Camp)", detail: "I. díj" },
      { era: "2021", title: "International Varaždin Woodwind & Brass Competition", detail: "I. díj, valamint második díj összesített kategóriában" },
      { era: "2020", title: "Online Trombone Competition, Trombone Category C", detail: "III. díj" },
      { era: "2019", title: "XIII. Nemzetközi Harsonaverseny Brno", detail: "I. díj" },
      { era: "2018", title: "XIII. Országos Szakgimnáziumi Harsona- és Tubaverseny", detail: "II. díj" },
    ],
  },
  {
    title: "Próbajátékok",
    items: [
      { era: "2025", title: "Próbajátékot nyert az Óbudai Danubia Zenekarba", detail: "Győztes" },
      { era: "2024", title: "Próbajátékot nyert az Alba Regia Szimfonikus Zenekarba", detail: "Győztes" },
      { era: "2024", title: "Eredményes próbajáték a Magyar Állami Operaházba", detail: "Sikeres" },
    ],
  },
  {
    title: "Szóló",
    items: [
      { era: "2025", title: "A Magyar Rádió Szimfonikus Zenekarának újévi koncertjén való közreműködés", detail: "Szóló" },
      { era: "2025", title: "A római Accademia Ungheria I Giovedì in via Giulia műsorán való fellépés", detail: "Szóló" },
      { era: "2025", title: "Mesterkurzust tartott Kunmingben a China Orchestra Network fesztivál keretein belül", detail: "Mesterkurzus" },
      { era: "2025", title: "Mesterkurzust tartott Poznańban a Tromboholizm Fesztivál részeként", detail: "Mesterkurzus" },
      { era: "2024", title: "Tehetség-napi koncert a Liszt Ferenc Kamarazenekar kíséretével", detail: "Szóló" },
    ],
  },
];

export default function CvPageClient({ cvDownloadUrl, initialLanguage, upcomingConcerts }: CvPageClientProps) {
  const { language } = useSiteLanguage(initialLanguage);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );

    nodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
    };
  }, []);

  const labels = language === "hu"
    ? {
        header: "Életrajz",
        name: "Dénes András",
        role: "Harsonaművész",
        location: "Budapest, Magyarország",
        downloadCv: "Életrajz letöltése",
      }
    : {
        header: "CV",
        name: "András Dénes",
        role: "Professional Trombonist",
        location: "Budapest, Hungary",
        downloadCv: "Download CV",
      };

  const showUpcomingSection = language === "hu";

  const activeSections = language === "hu" ? cvSectionsHu : cvSections;

  const sectionsNewestFirst = activeSections.map((section) => ({
    ...section,
    items: [...section.items].sort((a, b) => Number.parseInt(b.era, 10) - Number.parseInt(a.era, 10)),
  }));

  return (
    <div className="flex min-h-screen flex-col bg-background-dark text-neutral-100">
      <header className="sticky top-0 z-50 border-b border-neutral-border bg-background-dark/80 backdrop-blur-md">
        <div className="relative flex h-16 w-full items-center justify-center px-6">
          <div className="flex items-center gap-2">
            <BrandMark />
            <h1 className="font-display text-lg font-bold tracking-tight uppercase">{labels.header}</h1>
          </div>
          <div className="absolute top-1/2 right-6 -translate-y-1/2">
            <LanguageSwitcher initialLanguage={initialLanguage} light />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 pb-24">
        <div className="w-full px-6 py-8">
          <section className="flex flex-col items-center p-2 pb-8 text-center" data-reveal>
            <div className="group relative">
              <div className="absolute -inset-1 rounded-full bg-primary/20 blur transition duration-1000 group-hover:duration-200" />
              <div className="relative rounded-full border-2 border-primary/20 bg-charcoal p-1">
                <Image
                  src="/profile.jpeg"
                  alt="Portrait of a professional musician with a trombone"
                  width={128}
                  height={128}
                  className="h-32 w-32 rounded-full object-cover shadow-2xl"
                />
              </div>
            </div>

            <div className="mt-6 space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">{labels.name}</h2>
              <p className="font-medium text-primary">{labels.role}</p>
              <div className="flex items-center justify-center gap-1 text-sm text-neutral-300">
                <IconLocation className="size-3" />
                <span>{labels.location}</span>
              </div>
            </div>
          </section>

          {showUpcomingSection ? (
            <section className="mb-2 border-t border-neutral-border/80 pt-8" data-reveal>
              <div className="mb-4 flex items-end justify-between gap-3">
                <h3 className="font-display text-3xl leading-[0.9] font-bold tracking-tight text-white uppercase">
                  Közelgő koncertek
                </h3>
              </div>

              <div className="space-y-3">
                {upcomingConcerts.length > 0 ? (
                  upcomingConcerts.map((concert) => (
                    concert.href ? (
                      <a
                        key={`${concert.date}-${concert.city}-${concert.venue}`}
                        href={concert.href}
                        target="_blank"
                        rel="noreferrer"
                        className="interactive-surface group flex items-start justify-between gap-4 rounded-xl border border-neutral-border bg-neutral-dark/40 p-5 transition-all hover:border-primary/30 hover:bg-neutral-dark"
                        data-proximity
                        data-proximity-strength="2.1"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-wider text-primary uppercase">
                            <span className="rounded-full bg-primary/10 px-2 py-1">{concert.date}</span>
                            <span className="rounded-full bg-primary/10 px-2 py-1">{concert.city}</span>
                          </div>
                          <h4 className="font-display text-lg font-semibold leading-tight text-white">{concert.note || concert.venue}</h4>
                          {concert.note && concert.venue ? <p className="mt-1 text-sm text-neutral-300">{concert.venue}</p> : null}
                        </div>
                        <IconOpenInNew className="mt-0.5 size-5 shrink-0 text-neutral-300 transition-colors group-hover:text-primary" />
                      </a>
                    ) : (
                      <article
                        key={`${concert.date}-${concert.city}-${concert.venue}`}
                        className="interactive-surface group rounded-xl border border-neutral-border bg-neutral-dark/40 p-5 transition-all hover:border-primary/30 hover:bg-neutral-dark"
                        data-proximity
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-wider text-primary uppercase">
                          <span className="rounded-full bg-primary/10 px-2 py-1">{concert.date}</span>
                          <span className="rounded-full bg-primary/10 px-2 py-1">{concert.city}</span>
                        </div>
                        <h4 className="font-display text-lg font-semibold leading-tight text-white">{concert.note || concert.venue}</h4>
                        {concert.note && concert.venue ? <p className="mt-1 text-sm text-neutral-300">{concert.venue}</p> : null}
                      </article>
                    )
                  ))
                ) : (
                  <article
                    className="rounded-xl border border-neutral-border bg-neutral-dark/40 p-5 text-sm text-neutral-200"
                  >
                    Átmenetileg nem elérhető
                  </article>
                )}
              </div>
            </section>
          ) : null}

          <section className="mt-6 border-t border-neutral-border/80" data-reveal>
            {sectionsNewestFirst.map((section, index) => {
              const isMirrored = index % 2 === 1;
              const isLastSection = index === sectionsNewestFirst.length - 1;
              const shouldShowBottomDivider = !isLastSection || !!cvDownloadUrl;
              const heading = section.title.replace(/\.$/, "");
              const headingColClass = isMirrored
                ? "md:order-2 md:text-right"
                : "md:order-1 md:text-left";
              const listColClass = isMirrored ? "md:order-1" : "md:order-2";

              return (
                <div
                  key={section.title}
                  className={`relative grid gap-6 py-10 md:grid-cols-12 md:gap-8 ${
                    shouldShowBottomDivider ? "border-b border-neutral-border/70" : ""
                  }`}
                >
                  <h3
                    className={`pointer-events-none absolute top-11 z-0 hidden max-w-[92%] font-display text-6xl leading-[0.85] font-bold tracking-tight text-white/60 uppercase [overflow-wrap:anywhere] md:block lg:text-7xl ${
                      isMirrored ? "right-1 text-right" : "left-1 text-left"
                    }`}
                  >
                    {heading}
                  </h3>

                  <div className={`md:col-span-4 ${headingColClass}`}>
                    <h3 className="font-display text-4xl leading-[0.88] font-bold tracking-tight text-white uppercase [overflow-wrap:anywhere] md:hidden">
                      {heading}
                    </h3>
                  </div>

                  <div className={`relative md:col-span-8 ${listColClass}`}>
                    <div className="relative z-10 space-y-3 md:pt-10">
                      {section.items.map((item) => (
                        <div
                          key={`${section.title}-${item.era}-${item.title}`}
                        >
                          <article
                            className="interactive-surface group rounded-xl border border-neutral-border bg-neutral-dark/40 p-5 transition-all hover:border-primary/30 hover:bg-neutral-dark"
                            data-proximity
                          >
                            <div className="mb-2 flex items-center gap-3">
                              <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold tracking-wider text-primary uppercase">
                                {item.era}
                              </span>
                            </div>
                            <h4 className="font-display text-lg font-semibold leading-tight">{item.title}</h4>
                            <p className="mt-2 text-sm text-neutral-300">{item.detail}</p>
                          </article>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {cvDownloadUrl ? (
            <div className="pt-8" data-reveal>
              <a
                href={cvDownloadUrl}
                className="interactive-surface group flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 font-display font-semibold text-neutral-100 transition-all hover:border-primary/35 hover:bg-primary/10"
                data-proximity
                data-proximity-strength="2.1"
              >
                <IconDownload className="size-4 text-primary" />
                {labels.downloadCv}
              </a>
            </div>
          ) : null}
        </div>
      </main>

      <BottomNav active="cv" />
    </div>
  );
}
