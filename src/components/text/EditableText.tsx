"use client";

import { ElementType, Fragment, ReactNode } from "react";
import Link from "next/link";
import { TEXT_SLOTS, TextKey } from "@/lib/siteTextSlots";
import { useTextEdit } from "./TextEditContext";
import styles from "./EditableText.module.css";

interface EditableTextProps {
  id: TextKey;
  /** The text loaded on the server (getSiteText) */
  text: string;
  /** Element for each paragraph, e.g. "h2" or "p" */
  as?: ElementType;
  className?: string;
}

// [link text](/page), [email](mailto:…) or [site](https://…); anything else stays plain text
const LINK = /\[([^\]]+)\]\(((?:\/|#|mailto:|https?:\/\/)[^)\s]*)\)/g;

function withLinks(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(LINK)) {
    const [whole, label, href] = match;
    parts.push(line.slice(last, match.index));
    parts.push(
      href.startsWith("/") || href.startsWith("#") ? (
        <Link key={match.index} href={href}>
          {label}
        </Link>
      ) : (
        <a
          key={match.index}
          href={href}
          {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {label}
        </a>
      )
    );
    last = match.index + whole.length;
  }
  parts.push(line.slice(last));
  return parts;
}

/** Single lines keep their breaks */
const renderLines = (paragraph: string) =>
  paragraph.split("\n").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {withLinks(line)}
    </Fragment>
  ));

/** A piece of page text that admins can change in place while edit mode is on */
export default function EditableText({ id, text, as: Tag = "span", className }: EditableTextProps) {
  const { editing, saved, open } = useTextEdit();
  const value = saved[id] ?? text;
  const paragraphs = TEXT_SLOTS[id].multiline ? value.split(/\n{2,}/) : [value];

  const editProps = editing
    ? {
        "data-editable": "",
        role: "button",
        tabIndex: 0,
        title: `Edit: ${TEXT_SLOTS[id].label}`,
        onClick: (e: React.MouseEvent) => {
          // Don't follow links inside the text while editing
          e.preventDefault();
          e.stopPropagation();
          open(id, value);
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open(id, value);
          }
        },
      }
    : {};

  if (paragraphs.length === 1) {
    return (
      <Tag className={`${className ?? ""} ${editing ? styles.editable : ""}`.trim() || undefined} {...editProps}>
        {renderLines(paragraphs[0])}
      </Tag>
    );
  }

  // Several paragraphs: one wrapper to click, each paragraph styled as usual
  return (
    <div className={editing ? styles.editable : styles.group} {...editProps}>
      {paragraphs.map((paragraph, i) => (
        <Tag key={i} className={className}>
          {renderLines(paragraph)}
        </Tag>
      ))}
    </div>
  );
}
