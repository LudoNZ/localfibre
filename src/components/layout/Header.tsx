"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import styles from "./Header.module.css";
import LoginModal from "../ui/LoginModal";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, signOut, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className="container">
        <nav className={styles.nav}>
          <Link href="/" className={styles.logo}>
            <Image
              src="/images/LFLogo-Horizontal.png"
              alt="Local Fibre"
              width={200}
              height={60}
              priority
              style={{ height: "auto", width: "auto", maxWidth: "200px" }}
            />
          </Link>

          {/* Desktop Navigation */}
          <ul className={styles.navList}>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/events">Events</Link>
            </li>
            <li>
              <Link href="/patterns">Patterns</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
            <li>
              <a href="#newsletter" className="btn-secondary">
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
                    <Link href="/admin" className={styles.adminLink} aria-label="Admin dashboard">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                      </svg>
                    </Link>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className={styles.loginButton}
                >
                  Sign in
                </button>
              )}
            </li>
          </ul>

          {/* Mobile Menu Button */}
          <button
            className={styles.menuButton}
            onClick={toggleMenu}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span className={styles.menuIcon}>
              {isMenuOpen ? "✕" : "☰"}
            </span>
          </button>
        </nav>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <ul className={styles.mobileNavList}>
            <li>
              <Link href="/" onClick={() => setIsMenuOpen(false)}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/events" onClick={() => setIsMenuOpen(false)}>
                Events
              </Link>
            </li>
            <li>
              <Link href="/patterns" onClick={() => setIsMenuOpen(false)}>
                Patterns
              </Link>
            </li>
            <li>
              <Link href="/contact" onClick={() => setIsMenuOpen(false)}>
                Contact
              </Link>
            </li>
            <li>
              <a href="#newsletter" onClick={() => setIsMenuOpen(false)} className="btn-secondary">
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
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsLoginOpen(true);
                  }}
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
