import styles from "./ImpactStats.module.css";

export interface ImpactStat {
  value: number | string | null;
  label: string;
}

interface ImpactStatsProps {
  stats: ImpactStat[];
  tone?: "light" | "dark";
}

/** Row of big impact numbers. Stats without a value (or zero) are hidden. */
export default function ImpactStats({ stats, tone = "light" }: ImpactStatsProps) {
  const shown = stats.filter((s) => s.value !== null && s.value !== undefined && s.value !== 0);
  if (shown.length === 0) return null;

  return (
    <dl className={`${styles.stats} ${styles[tone]}`}>
      {shown.map((stat) => (
        <div key={stat.label} className={styles.stat}>
          <dt className={styles.label}>{stat.label}</dt>
          <dd className={styles.value}>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
