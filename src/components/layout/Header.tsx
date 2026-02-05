"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import styles from "./Header.module.css";
import LoginModal from "../ui/LoginModal";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, signOut } = useAuth();
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
                <button onClick={handleSignOut} className={styles.loginButton}>
                  Sign out
                </button>
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
                <button onClick={handleSignOut} className={styles.loginButton}>
                  Sign out
                </button>
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
