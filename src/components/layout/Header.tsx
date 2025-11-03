"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import styles from "./Header.module.css";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className={styles.header}>
      <div className="container">
        <nav className={styles.nav}>
          <Link href="/" className={styles.logo}>
            <Image
              src="/images/logo.svg"
              alt="Local Fibre"
              width={150}
              height={60}
              priority
              style={{ height: "auto", width: "auto" }}
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
          </ul>
        )}
      </div>
    </header>
  );
}

