"use client";

import { Fragment } from "react";

function formatInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="dash-advisor__strong">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function isBulletLine(line: string): boolean {
  return /^[●•\-\*]\s+/.test(line.trim());
}

function stripBullet(line: string): string {
  return line.trim().replace(/^[●•\-\*]\s+/, "");
}

function isHeadingLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 4 || t.length > 120) return false;
  if (isBulletLine(t)) return false;
  if (t.endsWith("?") && t.split(/\s+/).length <= 18) return true;
  if (/^#{1,3}\s/.test(t)) return true;
  if (
    t === t.toUpperCase() &&
    /[A-Z]/.test(t) &&
    t.split(/\s+/).length <= 8 &&
    !t.includes(".")
  ) {
    return true;
  }
  return false;
}

function normalizeHeading(line: string): string {
  return line.trim().replace(/^#{1,3}\s+/, "");
}

type Block =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "heading"; text: string };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const paragraphs = content.split(/\n\n+/);

  for (const raw of paragraphs) {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    if (lines.every(isBulletLine)) {
      blocks.push({ type: "list", items: lines.map(stripBullet) });
      continue;
    }

    if (lines.length === 1 && isHeadingLine(lines[0])) {
      blocks.push({ type: "heading", text: normalizeHeading(lines[0]) });
      continue;
    }

    const chunks: string[] = [];
    let buffer: string[] = [];

    const flushBuffer = () => {
      if (buffer.length) {
        chunks.push(buffer.join(" "));
        buffer = [];
      }
    };

    for (const line of lines) {
      if (isBulletLine(line)) {
        flushBuffer();
        if (blocks.length && blocks[blocks.length - 1].type === "list") {
          (blocks[blocks.length - 1] as { type: "list"; items: string[] }).items.push(
            stripBullet(line),
          );
        } else {
          blocks.push({ type: "list", items: [stripBullet(line)] });
        }
      } else if (isHeadingLine(line)) {
        flushBuffer();
        blocks.push({ type: "heading", text: normalizeHeading(line) });
      } else {
        buffer.push(line);
      }
    }
    flushBuffer();

    for (const text of chunks) {
      blocks.push({ type: "paragraph", text });
    }
  }

  return blocks;
}

export default function AdvisorFormattedContent({ content }: { content: string }) {
  const blocks = parseBlocks(content.trim());

  if (blocks.length === 0) {
    return <p className="dash-advisor__para">{content}</p>;
  }

  return (
    <div className="dash-advisor__prose">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <p key={i} className="dash-advisor__heading">
              {formatInline(block.text)}
            </p>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="dash-advisor__list">
              {block.items.map((item, j) => (
                <li key={j}>{formatInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="dash-advisor__para">
            {formatInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
