import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <p className={styles.footerText}>
              Community sewing &amp; zero-waste textiles, Aotearoa
            </p>
            <p className={styles.email}>
              <a href="mailto:hello@localfibre.co.nz">hello@localfibre.co.nz</a>
            </p>
          </div>

          <div className={styles.footerSection}>
            <h4>Connect</h4>
            <ul className={styles.socialLinks}>
              <li>
                <a
                  href="https://www.instagram.com/localfibre/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://humanitix.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Humanitix
                </a>
              </li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h4>Quick Links</h4>
            <ul className={styles.footerLinks}>
              <li><a href="/#about">About</a></li>
              <li><a href="/#events">Events</a></li>
              <li><a href="/#patterns">Patterns</a></li>
              <li><a href="/#newsletter">Newsletter</a></li>
              <li><a href="/#contact">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} Local Fibre. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
