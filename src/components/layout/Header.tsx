"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import styles from "./Header.module.css";
import LoginModal from "../ui/LoginModal";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Repair Programme", href: "/repair-programme" },
  { label: "Events", href: "/#events" },
  { label: "Contact", href: "/#contact" },
  { label: "Resources", href: "/#resources" },
];

export default function Header() {
  const { user, signOut, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const pathname = usePathname();

  // Close the phone menu with Escape and stop the page scrolling behind it
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  const handleSignOut = async () => {
    await signOut();
    closeMenu();
  };

  const isActive = (href: string) => !href.includes("#") && pathname === href;
  const onAdmin = pathname.startsWith("/admin");

  const authControls = user ? (
    <button onClick={handleSignOut} className={styles.loginButton}>
      Sign out
    </button>
  ) : (
    <button
      onClick={() => {
        closeMenu();
        setIsLoginOpen(true);
      }}
      className={styles.loginButton}
    >
      Sign in
    </button>
  );

  return (
    <header className={styles.header}>
      <div className="container">
        <nav className={styles.nav} aria-label="Main">
          <Link href="/" className={styles.logo} onClick={closeMenu}>
            <Image
              src="/images/LFLogo-Horizontal.png"
              alt="Local Fibre home"
              width={180}
              height={54}
              priority
              style={{ height: "auto", width: "auto", maxWidth: "160px" }}
            />
          </Link>

          {/* Desktop Navigation */}
          <ul className={styles.navList}>
            {navLinks.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`${styles.navLink} ${isActive(href) ? styles.active : ""}`}
                  aria-current={isActive(href) ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className={styles.navActions}>
            {isAdmin && (
              <Link
                href="/admin"
                className={`${styles.adminButton} ${onAdmin ? styles.adminButtonActive : ""}`}
                aria-current={onAdmin ? "page" : undefined}
                onClick={closeMenu}
              >
                <span className={styles.adminDot} aria-hidden="true" />
                Admin
              </Link>
            )}
            <Link href="/sewing-machines" className={`btn-accent ${styles.ctaButton}`}>
              Apply for a machine
            </Link>
            <div className={styles.desktopAuth}>{authControls}</div>

            {/* Mobile Menu Button */}
            <button
              className={styles.menuButton}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className={`${styles.burger} ${isMenuOpen ? styles.burgerOpen : ""}`} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div id="mobile-menu" className={styles.mobilePanel}>
          {isAdmin && (
            <Link
              href="/admin"
              className={styles.mobileAdminLink}
              onClick={closeMenu}
              aria-current={onAdmin ? "page" : undefined}
            >
              Admin dashboard <span aria-hidden="true">→</span>
            </Link>
          )}
          <ul className={styles.mobileNavList}>
            {navLinks.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={styles.mobileNavLink}
                  onClick={closeMenu}
                  aria-current={isActive(href) ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/#newsletter" className={styles.mobileNavLink} onClick={closeMenu}>
                Newsletter
              </Link>
            </li>
          </ul>
          <Link href="/sewing-machines" className={`btn-accent ${styles.mobileCta}`} onClick={closeMenu}>
            Apply for a sewing machine
          </Link>
          <div className={styles.mobileAuth}>{authControls}</div>
        </div>
      )}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </header>
  );
}
