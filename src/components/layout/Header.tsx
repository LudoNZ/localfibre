"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import styles from "./Header.module.css";
import LoginModal from "../ui/LoginModal";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { label: "About", id: "about" },
  { label: "Events", id: "events" },
  { label: "Patterns", id: "patterns" },
  { label: "Contact", id: "contact" },
];

export default function Header() {
  const { user, signOut, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const pathname = usePathname();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    setIsMenuOpen(false);
    if (pathname === "/") {
      e.preventDefault();
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", `#${sectionId}`);
      }
    }
  };

  const handleNewsletterClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setIsMenuOpen(false);
    if (pathname === "/") {
      e.preventDefault();
      const el = document.getElementById("newsletter");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", "#newsletter");
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className="container">
        <nav className={styles.nav}>
          <Link href="/" className={styles.logo} onClick={() => setIsMenuOpen(false)}>
            <Image
              src="/images/LFLogo-Horizontal.png"
              alt="Local Fibre"
              width={180}
              height={54}
              priority
              style={{ height: "auto", width: "auto", maxWidth: "180px" }}
            />
          </Link>

          {/* Desktop Navigation */}
          <ul className={styles.navList}>
            {navLinks.map(({ label, id }) => (
              <li key={id}>
                <a
                  href={`/#${id}`}
                  className={styles.navLink}
                  onClick={(e) => handleNavClick(e, id)}
                >
                  {label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/#newsletter"
                className={styles.newsletterBtn}
                onClick={handleNewsletterClick}
              >
                Newsletter
              </a>
            </li>
            <li className={styles.authItem}>
              {user ? (
                <div className={styles.authButtons}>
                  <button onClick={handleSignOut} className={styles.loginButton}>
                    Sign out
                  </button>
                  {isAdmin && (
                    <Link href="/admin" className={styles.adminLink} aria-label="Admin dashboard">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                      </svg>
                    </Link>
                  )}
                </div>
              ) : (
                <button onClick={() => setIsLoginOpen(true)} className={styles.loginButton}>
                  Sign in
                </button>
              )}
            </li>
          </ul>

          {/* Mobile Menu Button */}
          <button
            className={styles.menuButton}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span className={styles.menuIcon}>{isMenuOpen ? "✕" : "☰"}</span>
          </button>
        </nav>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <ul className={styles.mobileNavList}>
            {navLinks.map(({ label, id }) => (
              <li key={id}>
                <a
                  href={`/#${id}`}
                  className={styles.mobileNavLink}
                  onClick={(e) => handleNavClick(e, id)}
                >
                  {label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/#newsletter"
                className={styles.mobileNavLink}
                onClick={handleNewsletterClick}
              >
                Newsletter
              </a>
            </li>
            <li>
              {user ? (
                <div className={styles.authButtons}>
                  <button onClick={handleSignOut} className={styles.loginButton}>
                    Sign out
                  </button>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className={styles.adminLink}
                      onClick={() => setIsMenuOpen(false)}
                      aria-label="Admin dashboard"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                      </svg>
                    </Link>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => { setIsMenuOpen(false); setIsLoginOpen(true); }}
                  className={styles.loginButton}
                >
                  Sign in
                </button>
              )}
            </li>
          </ul>
        )}
      </div>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </header>
  );
}
