import styles from "./page.module.css";
import ContactForm from "@/components/forms/ContactForm";

export const metadata = {
  title: "Contact Us | Local Fibre",
  description: "Get in touch with Local Fibre. We'd love to hear from you!",
};

export default function ContactPage() {
  return (
    <div className={styles.contactPage}>
      <section className={styles.hero}>
        <div className="container">
          <h1>Get in Touch</h1>
          <p className={styles.tagline}>
            Have questions, want to get involved, or just want to say hello? We&apos;d love to hear from
            you.
          </p>
        </div>
      </section>

      <section className={styles.contactSection}>
        <div className="container">
          <div className={styles.contactContent}>
            <div className={styles.contactInfo}>
              <h2>Contact Information</h2>
              <div className={styles.infoItem}>
                <h3>Email</h3>
                <p>
                  <a href="mailto:hello@localfibre.co.nz">hello@localfibre.co.nz</a>
                </p>
              </div>
              <div className={styles.infoItem}>
                <h3>Social Media</h3>
                <p>
                  <a
                    href="https://www.instagram.com/localfibre/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Follow us on Instagram
                  </a>
                </p>
              </div>
              <div className={styles.infoItem}>
                <h3>Events</h3>
                <p>
                  Check out our <a href="/events">upcoming events</a> or find us on{" "}
                  <a href="https://humanitix.com" target="_blank" rel="noopener noreferrer">
                    Humanitix
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className={styles.formWrapper}>
              <h2>Send us a Message</h2>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

