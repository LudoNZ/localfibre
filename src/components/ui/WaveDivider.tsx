import styles from "./WaveDivider.module.css";

interface WaveDividerProps {
  /** Background of the section above the wave */
  from: string;
  /** Background of the section below the wave */
  to: string;
  flip?: boolean;
}

/** Wavy edge between two colour-block sections */
export default function WaveDivider({ from, to, flip = false }: WaveDividerProps) {
  return (
    <div className={styles.wave} style={{ background: from }} aria-hidden="true">
      <svg
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className={flip ? styles.flip : undefined}
      >
        <path
          d="M0 30 C 120 0, 240 0, 360 30 S 600 60, 720 30 S 960 0, 1080 30 S 1320 60, 1440 30 L1440 60 L0 60 Z"
          fill={to}
        />
      </svg>
    </div>
  );
}
