"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth/auth-client";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SkeletonAvatar } from "@/components/ui/skeleton";
import { MadinatyLogo } from "@/components/ui/madinaty-logo";

// ========================================================
// EXACT SIX EXISTING SERVICES (From app/page.tsx:213-267)
// ========================================================
const SIX_SERVICES = [
  {
    title: "حفر وتصدعات الطرق",
    desc: "معالجة هبوط الأسفلت، صيانة الأرصفة وتأمين حركة المشاة والمركبات.",
    href: "/#categories",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19h16M4 5h16M9 5v14M15 5v14" />
      </svg>
    ),
  },
  {
    title: "أعطال إنارة الشوارع",
    desc: "إصلاح أعمدة الإنارة المطفأة وتأمين الكابلات الكهربائية السائبة.",
    href: "/#categories",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: "تراكم النفايات والحاويات",
    desc: "تفريغ الحاويات الممتلئة وتنظيف المكبات العشوائية ونقل المخلفات.",
    href: "/#categories",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
  {
    title: "تسربات المياه والصرف",
    desc: "إصلاح الكسور في الشبكات العامة وشفط تجمعات المياه السائبة.",
    href: "/#categories",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    title: "صيانة الحدائق العامة",
    desc: "تقليم الأشجار الخطرة، إصلاح ألعاب الأطفال، والعناية بالمرافق الخضراء.",
    href: "/#categories",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    title: "مخالفات البناء والإشغالات",
    desc: "متابعة إشغالات الأرصفة العامة ومخالفات الهدم والبناء غير المرخصة.",
    href: "/#categories",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
];

function HeaderContent() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  // Scroll state: false = at top, true = scrolled down > 80px
  const [isScrolled, setIsScrolled] = useState(false);

  // Active section tracking for in-page sections on homepage (how-it-works, categories, faq)
  const [activeSection, setActiveSection] = useState("");

  // Dropdown states (Strictly onClick only — no hover triggers)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);

  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const servicesDropdownRef = useRef<HTMLLIElement>(null);

  // ========================================================
  // Scroll Detection
  // ========================================================
  useEffect(() => {
    const handleScroll = () => {
      const threshold = window.innerWidth < 640 ? 50 : 80;
      setIsScrolled(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // ========================================================
  // Scroll Spy: Dynamic Active Section Detection
  // ========================================================
  useEffect(() => {
    if (pathname !== "/") {
      setActiveSection("");
      return;
    }

    const sections = [
      { id: "how-it-works", label: "how-it-works" },
      { id: "categories", label: "categories" },
      { id: "showcase", label: "categories" },
      { id: "faq", label: "faq" },
    ];

    const detectActiveSection = () => {
      const heroEl = document.querySelector("section"); // First section is hero
      const howItWorksEl = document.getElementById("how-it-works");

      // If user is at or near the hero section (before how-it-works starts), no nav link should be active
      if (howItWorksEl) {
        const howItWorksTop = howItWorksEl.getBoundingClientRect().top;
        // If how-it-works is still significantly below the viewport top (> 250px), we are in Hero
        if (howItWorksTop > 250) {
          setActiveSection("");
          return;
        }
      }

      // Check sections from bottom to top for precise activation
      let current = "";
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Trigger when top of section crosses upper portion of viewport (below navbar ~140px)
          if (rect.top <= 200 && rect.bottom > 100) {
            current = sections[i].label;
            break;
          }
        }
      }

      // Fallback: if we scrolled past the hero into the content area but between sections
      if (!current && howItWorksEl && howItWorksEl.getBoundingClientRect().top <= 250) {
        current = "how-it-works";
      }

      setActiveSection(current);
    };

    detectActiveSection();
    window.addEventListener("scroll", detectActiveSection, { passive: true });
    window.addEventListener("resize", detectActiveSection, { passive: true });

    return () => {
      window.removeEventListener("scroll", detectActiveSection);
      window.removeEventListener("resize", detectActiveSection);
    };
  }, [pathname]);

  // Smooth scroll handler for anchor links
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    if (pathname === "/") {
      e.preventDefault();
      setServicesDropdownOpen(false);
      setProfileDropdownOpen(false);
      setMobileMenuOpen(false);

      const targetEl = document.getElementById(sectionId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", `#${sectionId}`);
        const mappedLabel = sectionId === "categories" || sectionId === "showcase" ? "categories" : sectionId;
        setActiveSection(mappedLabel);
      }
    }
  };

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen && typeof window !== "undefined") {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen]);

  // ========================================================
  // Outside Click & Escape Key Handler (Closes ALL Dropdowns)
  // ========================================================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(target)
      ) {
        setProfileDropdownOpen(false);
      }
      if (
        servicesDropdownRef.current &&
        !servicesDropdownRef.current.contains(target)
      ) {
        setServicesDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileDropdownOpen(false);
        setServicesDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // User details
  const user = session?.user;
  const userName = user?.name || user?.email?.split("@")[0] || "مستخدم";
  const userEmail = user?.email || "";
  const userImage = user?.image;
  const userInitial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "م";
  const userRole = (user as Record<string, unknown> | undefined)?.role as string | undefined;

  const roleBadgeMeta = (() => {
    switch (userRole) {
      case "ADMIN":
        return {
          label: "مدير النظام",
          badgeClass: "badge-status-new",
        };
      case "STAFF":
        return {
          label: "موظف ميداني",
          badgeClass: "badge-status-assigned",
        };
      case "CITIZEN":
      default:
        return {
          label: "مواطن مسجل",
          badgeClass: "badge-status-resolved",
        };
    }
  })();

  // Dynamic active state determination based on current route and scroll position
  const isItemActive = (type: string) => {
    if (type === "how-it-works") {
      return pathname === "/" && activeSection === "how-it-works";
    }
    if (type === "services") {
      return servicesDropdownOpen || (pathname === "/" && (activeSection === "categories" || activeSection === "showcase"));
    }
    if (type === "track") {
      return pathname.startsWith("/track");
    }
    if (type === "faq") {
      return pathname === "/" && activeSection === "faq";
    }
    if (type === "admin") {
      return pathname.startsWith("/admin");
    }
    return false;
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay — always mounted, toggled via CSS */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-xs z-30 md:hidden transition-opacity duration-200 ease-out ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* ========================================================
          Navbar Container (RTL layout, dir="rtl"):
          - At top of page: 100% width edge-to-edge navbar with subtle border
          - Upon scrolling: smoothly morphs into a floating glassmorphic pill
          - Fluid physics easing without layout shift
      ======================================================== */}
      <header
        dir="rtl"
        className={`fixed top-0 inset-x-0 z-40 w-full transition-[padding,transform] duration-200 ease-out ${isScrolled
          ? "pt-2.5 sm:pt-3.5 px-3 sm:px-6 lg:px-8 pointer-events-none"
          : "pt-0 px-0 pointer-events-auto"
          }`}
      >
        <div
          className={`mx-auto pointer-events-auto transition-[background-color,border-color,border-radius,box-shadow] duration-200 ease-out ${mobileMenuOpen
            ? "max-w-7xl rounded-2xl bg-[#0B1E38]/95 backdrop-blur-md border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
            : isScrolled
              ? "max-w-7xl rounded-full bg-[#0B1E38]/70 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_rgba(11,30,56,0.18)]"
              : `w-full max-w-full rounded-none border-b border-white/10 ${pathname === "/"
                ? "bg-[#0B1E38]/30 sm:bg-transparent backdrop-blur-xs"
                : "bg-[#0B1E38]/85 backdrop-blur-md"
              } shadow-none`
            }`}
        >
          <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Right Section: Brand Logo (RTL) */}
            <Link
              href="/"
              onClick={(e) => {
                if (pathname === "/") {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  window.history.pushState(null, "", "/");
                  setActiveSection("");
                }
                setServicesDropdownOpen(false);
                setProfileDropdownOpen(false);
              }}
              className="flex items-center gap-2 group shrink-0 transition-opacity hover:opacity-90"
              aria-label="الصفحة الرئيسية لمنصة مدينتي"
            >
              <MadinatyLogo
                variant="light"
                priority
                className="h-9 sm:h-10 w-auto object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
              />
            </Link>

            {/* Center: Desktop Navigation Links (Clean white text + Solid cyan underline on active item) */}
            <nav aria-label="التنقل الرئيسي" className="hidden md:block">
              <ul className="flex items-center gap-6 lg:gap-8 list-none m-0 p-0">
                {/* 1. كيفية عمل المنصة */}
                <li className="relative flex items-center">
                  <Link
                    href="/#how-it-works"
                    onClick={(e) => scrollToSection(e, "how-it-works")}
                    className={`py-1.5 text-sm transition-colors duration-200 ${isItemActive("how-it-works")
                      ? "text-white font-bold"
                      : "text-white/80 hover:text-white font-medium"
                      }`}
                  >
                    كيفية عمل المنصة
                  </Link>
                  <span
                    className={`absolute -bottom-2.5 right-1/2 translate-x-1/2 w-8 h-[3px] rounded-full bg-[#0891B2] shadow-[0_0_10px_rgba(8,145,178,0.8)] transition-all duration-300 ease-out ${isItemActive("how-it-works") ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
                      }`}
                    aria-hidden="true"
                  />
                </li>

                {/* 2. الخدمات البلدية (Strictly onClick only — NO hover triggers) */}
                <li className="relative flex items-center" ref={servicesDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setServicesDropdownOpen((prev) => !prev);
                      setProfileDropdownOpen(false);
                    }}
                    aria-expanded={servicesDropdownOpen}
                    aria-haspopup="menu"
                    className={`inline-flex items-center gap-1.5 py-1.5 text-sm transition-colors duration-200 cursor-pointer ${isItemActive("services")
                      ? "text-white font-bold"
                      : "text-white/80 hover:text-white font-medium"
                      }`}
                  >
                    <span>الخدمات البلدية</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-3.5 w-3.5 transition-transform duration-300 ease-out ${servicesDropdownOpen ? "rotate-180 text-[#22d3ee]" : "text-white/60"
                        }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <span
                    className={`absolute -bottom-2.5 right-1/2 translate-x-1/2 w-8 h-[3px] rounded-full bg-[#0891B2] shadow-[0_0_10px_rgba(8,145,178,0.8)] transition-all duration-300 ease-out ${isItemActive("services") ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
                      }`}
                    aria-hidden="true"
                  />

                  {/* Services Dropdown Panel */}
                  <div
                    role="menu"
                    aria-orientation="vertical"
                    className={`absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 top-full mt-3 w-[340px] sm:w-[480px] rounded-2xl border border-white/15 bg-[#0B1E38]/95 backdrop-blur-2xl p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] z-50 transition-all duration-200 ease-out transform ${servicesDropdownOpen
                      ? "opacity-100 translate-y-0 scale-100 pointer-events-auto visible"
                      : "opacity-0 translate-y-2 scale-95 pointer-events-none invisible"
                      }`}
                    dir="rtl"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-2">
                      <span className="text-xs font-bold text-white">مجالات الخدمات والبلاغات البلدية</span>
                      <Link
                        href="/#categories"
                        onClick={(e) => scrollToSection(e, "categories")}
                        className="text-[11px] font-semibold text-[#22d3ee] hover:underline"
                      >
                        عرض التفاصيل ←
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {SIX_SERVICES.map((service, idx) => (
                        <Link
                          key={idx}
                          href={service.href}
                          role="menuitem"
                          onClick={(e) => scrollToSection(e, "categories")}
                          className="flex items-start gap-2.5 rounded-xl p-2.5 text-right hover:bg-white/10 group transition-all"
                        >
                          <div className="h-9 w-9 rounded-lg bg-white/10 text-[#22d3ee] group-hover:bg-[#0891B2] group-hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                            {service.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white group-hover:text-[#22d3ee] transition-colors truncate">
                              {service.title}
                            </p>
                            <p className="text-[10px] text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                              {service.desc}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="mt-2 pt-2 border-t border-white/10 px-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>توثيق مصور وتوجيه آلي لكل بلاغ</span>
                      <Link
                        href="/reports/new"
                        onClick={() => setServicesDropdownOpen(false)}
                        className="font-bold text-[#22d3ee] hover:text-[#38bdf8]"
                      >
                        + تقديم بلاغ فوري
                      </Link>
                    </div>
                  </div>
                </li>

                {/* 3. تتبع بلاغ */}
                <li className="relative flex items-center">
                  <Link
                    href="/track"
                    onClick={() => {
                      setServicesDropdownOpen(false);
                      setProfileDropdownOpen(false);
                    }}
                    className={`py-1.5 text-sm transition-colors duration-200 ${isItemActive("track")
                      ? "text-white font-bold"
                      : "text-white/80 hover:text-white font-medium"
                      }`}
                  >
                    تتبع بلاغ
                  </Link>
                  <span
                    className={`absolute -bottom-2.5 right-1/2 translate-x-1/2 w-8 h-[3px] rounded-full bg-[#0891B2] shadow-[0_0_10px_rgba(8,145,178,0.8)] transition-all duration-300 ease-out ${isItemActive("track") ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
                      }`}
                    aria-hidden="true"
                  />
                </li>

                {/* 4. الأسئلة الشائعة */}
                <li className="relative flex items-center">
                  <Link
                    href="/#faq"
                    onClick={(e) => scrollToSection(e, "faq")}
                    className={`py-1.5 text-sm transition-colors duration-200 ${isItemActive("faq")
                      ? "text-white font-bold"
                      : "text-white/80 hover:text-white font-medium"
                      }`}
                  >
                    الأسئلة الشائعة
                  </Link>
                  <span
                    className={`absolute -bottom-2.5 right-1/2 translate-x-1/2 w-8 h-[3px] rounded-full bg-[#0891B2] shadow-[0_0_10px_rgba(8,145,178,0.8)] transition-all duration-300 ease-out ${isItemActive("faq") ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
                      }`}
                    aria-hidden="true"
                  />
                </li>

                {/* 6. لوحة الإدارة (Only for ADMIN) */}
                {userRole === "ADMIN" && (
                  <li className="relative flex items-center">
                    <Link
                      href="/admin"
                      onClick={() => {
                        setServicesDropdownOpen(false);
                        setProfileDropdownOpen(false);
                      }}
                      className={`py-1.5 text-sm transition-colors duration-200 ${isItemActive("admin")
                        ? "text-amber-300 font-bold"
                        : "text-amber-200/90 hover:text-amber-100 font-medium"
                        }`}
                    >
                      الإدارة
                    </Link>
                    <span
                      className={`absolute -bottom-2.5 right-1/2 translate-x-1/2 w-8 h-[3px] rounded-full bg-gradient-to-r from-amber-400 to-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.9)] transition-all duration-300 ease-out ${isItemActive("admin") ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
                        }`}
                      aria-hidden="true"
                    />
                  </li>
                )}
              </ul>
            </nav>

            {/* Left Section: User Actions (Glassmorphic Pill Login / Profile Button) */}
            <div className="flex items-center gap-2 sm:gap-3">
              {isPending ? (
                <SkeletonAvatar size={36} className="h-9 w-9 bg-white/20" />
              ) : session?.user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Notifications Center Bell */}
                  <NotificationBell />

                  {/* Profile Dropdown Trigger (Pill Glassmorphic button, Strictly onClick only) */}
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen((prev) => !prev);
                        setServicesDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }}
                      aria-expanded={profileDropdownOpen}
                      aria-haspopup="menu"
                      aria-label="قائمة حساب المستخدم"
                      className="inline-flex items-center gap-2 rounded-full bg-[#0891B2]/25 hover:bg-[#0891B2]/35 active:bg-[#0891B2]/45 border border-[#22D3EE]/35 px-3 py-1.5 text-white font-medium text-xs sm:text-sm backdrop-blur-md shadow-[0_2px_12px_rgba(8,145,178,0.25)] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0891B2]/40"
                    >
                      <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full overflow-hidden shrink-0 border border-white/40 bg-[#0891B2] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {userImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={userImage}
                            alt={userName}
                            className="h-full w-full object-cover rounded-full"
                          />
                        ) : (
                          <span>{userInitial}</span>
                        )}
                      </div>
                      <span className="hidden sm:inline-block max-w-[90px] truncate text-xs text-white">
                        {userName}
                      </span>
                      <svg
                        className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/80 transition-transform duration-200 ${profileDropdownOpen ? "rotate-180 text-white" : ""
                          }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Profile Dropdown Panel */}
                    {profileDropdownOpen && (
                      <div
                        role="menu"
                        aria-orientation="vertical"
                        className="absolute left-0 top-full mt-3 w-72 rounded-2xl border border-white/15 bg-[#0B1E38]/95 backdrop-blur-xl p-2.5 shadow-[0_16px_36px_rgba(0,0,0,0.4)] z-50 animate-in fade-in zoom-in-95 duration-150"
                        dir="rtl"
                      >
                        {/* User Summary Header */}
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 mb-1.5">
                          <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 border border-white/20 bg-[#0891B2] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                            {userImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={userImage} alt={userName} className="h-full w-full object-cover rounded-full" />
                            ) : (
                              <span>{userInitial}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">{userName}</p>
                            {userEmail && (
                              <p className="text-[11px] text-slate-300 truncate font-mono mt-0.5">{userEmail}</p>
                            )}
                            <div className="mt-1.5">
                              <span className={`badge-civic-pill ${roleBadgeMeta.badgeClass} text-[10px] px-2 py-0.5`}>
                                {roleBadgeMeta.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Account Navigation Links */}
                        <div className="py-1 space-y-0.5 text-xs font-medium text-slate-200">
                          <Link
                            href="/dashboard"
                            role="menuitem"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-white hover:bg-white/10 hover:text-[#22d3ee] transition-colors"
                          >
                            <svg className="h-4 w-4 text-[#22d3ee] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span>لوحة التحكم الرئيسية</span>
                          </Link>

                          {userRole === "ADMIN" && (
                            <Link
                              href="/admin"
                              role="menuitem"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-amber-200 hover:bg-amber-500/10 hover:text-amber-100 transition-colors"
                            >
                              <svg className="h-4 w-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              <span>لوحة الإدارة والرقابة المركزية</span>
                            </Link>
                          )}

                          <Link
                            href="/reports/new"
                            role="menuitem"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-white hover:bg-white/10 hover:text-[#22d3ee] transition-colors"
                          >
                            <svg className="h-4 w-4 text-[#22d3ee] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>تقديم بلاغ جديد</span>
                          </Link>

                          <Link
                            href="/track"
                            role="menuitem"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-white hover:bg-white/10 hover:text-[#22d3ee] transition-colors"
                          >
                            <svg className="h-4 w-4 text-[#22d3ee] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>الاستعلام وتتبع البلاغات</span>
                          </Link>

                          <Link
                            href="/notifications"
                            role="menuitem"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-white hover:bg-white/10 hover:text-[#22d3ee] transition-colors"
                          >
                            <svg className="h-4 w-4 text-[#22d3ee] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span>مركز الإشعارات والتنبيهات</span>
                          </Link>
                        </div>

                        {/* Sign Out Action */}
                        <div className="pt-1.5 mt-1 border-t border-white/10">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={async () => {
                              setProfileDropdownOpen(false);
                              await signOut();
                              window.location.href = "/login";
                            }}
                            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer text-right"
                          >
                            <svg className="h-4 w-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>تسجيل الخروج</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Glassmorphic Pill Login Button (From Reference 1000427853.png) */
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full bg-[#0891B2]/25 hover:bg-[#0891B2]/35 active:bg-[#0891B2]/45 border border-[#22D3EE]/35 px-4 sm:px-5 py-2 text-white font-semibold text-xs sm:text-sm backdrop-blur-md shadow-[0_2px_12px_rgba(8,145,178,0.25)] transition-all cursor-pointer"
                  >
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>تسجيل الدخول</span>
                  </Link>
                </div>
              )}

              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(!mobileMenuOpen);
                  setProfileDropdownOpen(false);
                  setServicesDropdownOpen(false);
                }}
                aria-label="القائمة الرئيسية"
                aria-expanded={mobileMenuOpen}
                className="md:hidden rounded-xl p-2.5 text-white/90 hover:text-white hover:bg-white/10 active:bg-white/15 active:scale-90 touch-manipulation transition-all cursor-pointer"
              >
                <svg
                  className="h-6 w-6 transition-transform duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer — always mounted, toggled via CSS for instant GPU animation */}
          <div
            className={`md:hidden overflow-hidden will-change-[max-height,opacity] transition-[max-height,opacity] duration-200 ease-out ${
              mobileMenuOpen
                ? "max-h-[calc(100dvh-5rem)] opacity-100 pointer-events-auto"
                : "max-h-0 opacity-0 pointer-events-none"
            }`}
          >
            <div className="border-t border-white/10 bg-[#0B1E38]/98 backdrop-blur-2xl px-4 pt-3 pb-6 rounded-b-2xl shadow-[0_16px_36px_rgba(0,0,0,0.5)] overflow-y-auto overscroll-contain max-h-[calc(100dvh-5rem)]">
              {isPending ? (
                <div className="mb-3 pb-3 border-b border-white/10 flex items-center gap-3">
                  <SkeletonAvatar size={36} className="bg-white/20" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-24 rounded-sm bg-white/20 animate-pulse" />
                    <div className="h-2.5 w-16 rounded-sm bg-white/15 animate-pulse" />
                  </div>
                </div>
              ) : session?.user ? (
                <div className="mb-3 pb-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full overflow-hidden shrink-0 border border-white/30 bg-[#0891B2] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {userImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={userImage} alt={userName} className="h-full w-full object-cover rounded-full" />
                      ) : (
                        <span>{userInitial}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{userName}</p>
                      <span className="inline-block text-[10px] text-slate-300">
                        {roleBadgeMeta.label}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs font-bold text-[#22d3ee] bg-white/10 px-2.5 py-1 rounded-md"
                  >
                    لوحة التحكم ←
                  </Link>
                </div>
              ) : null}

              <nav className="flex flex-col gap-1">
                <Link
                  href="/#how-it-works"
                  onClick={(e) => scrollToSection(e, "how-it-works")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${isItemActive("how-it-works")
                    ? "text-[#0891B2] bg-white/10 font-bold"
                    : "text-white/90 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  كيفية عمل المنصة
                </Link>

                {/* Mobile Services Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setMobileServicesOpen((prev) => !prev)}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all text-right cursor-pointer ${isItemActive("services")
                      ? "text-[#0891B2] bg-white/10 font-bold"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <span>الخدمات البلدية (6 مجالات)</span>
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${mobileServicesOpen ? "rotate-180 text-[#0891B2]" : "text-white/60"
                        }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {mobileServicesOpen && (
                    <div className="pr-4 pl-2 py-1 space-y-1">
                      {SIX_SERVICES.map((service, idx) => (
                        <Link
                          key={idx}
                          href={service.href}
                          onClick={(e) => scrollToSection(e, "categories")}
                          className="flex items-center gap-2 rounded-lg py-1.5 px-2 text-xs text-slate-300 hover:text-[#0891B2] hover:bg-white/10 transition-colors"
                        >
                          <span className="text-[#0891B2] shrink-0">{service.icon}</span>
                          <span className="truncate">{service.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href="/track"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${isItemActive("track")
                    ? "text-[#0891B2] bg-white/10 font-bold"
                    : "text-white/90 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  تتبع بلاغ
                </Link>

                <Link
                  href="/#faq"
                  onClick={(e) => scrollToSection(e, "faq")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${isItemActive("faq")
                    ? "text-[#0891B2] bg-white/10 font-bold"
                    : "text-white/90 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  الأسئلة الشائعة
                </Link>

                {userRole === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${isItemActive("admin")
                      ? "text-amber-300 bg-amber-500/20 font-bold"
                      : "text-amber-200 hover:bg-amber-500/10 hover:text-amber-100"
                      }`}
                  >
                    لوحة الإدارة المركزية
                  </Link>
                )}
              </nav>

              {/* Mobile Sign Out button if logged in */}
              {session?.user && (
                <div className="pt-3 mt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await signOut();
                      window.location.href = "/login";
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Static spacer to preserve normal document flow on non-home pages */}
      {pathname !== "/" && <div className="h-16 w-full shrink-0" aria-hidden="true" />}
    </>
  );
}

export function Header() {
  return (
    <Suspense
      fallback={
        <div className="h-16 w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="h-8 w-28 rounded-md bg-white/10 animate-pulse" />
          <div className="h-9 w-9 rounded-full bg-white/10 animate-pulse" />
        </div>
      }
    >
      <HeaderContent />
    </Suspense>
  );
}
