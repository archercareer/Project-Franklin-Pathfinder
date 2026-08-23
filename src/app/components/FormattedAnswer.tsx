import React from "react";
import { FileText, ExternalLink } from "lucide-react";

type InlineSegment =
  | { type: "text"; content: string }
  | { type: "bold"; content: string }
  | { type: "italic"; content: string }
  | { type: "code"; content: string }
  | { type: "link"; content: string; href: string }
  | { type: "raw_link"; content: string; href: string };

/**
 * Peels sentence punctuation off the end of a bare URL. The URL becomes the link,
 * the punctuation goes back into the prose — otherwise it disappears, since a bare
 * URL renders as a pill rather than as its own text.
 */
function splitUrlPunctuation(url: string): { url: string; trailing: string } {
  const trailing = url.match(/[.,;:!?]+$/);
  if (!trailing) return { url, trailing: "" };
  return { url: url.slice(0, -trailing[0].length), trailing: trailing[0] };
}

function tokenizeInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Order matters: markdown links → code → bold → italic → raw URLs
  const pattern =
    /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)|(_([^_]+)_)|(https?:\/\/[^\s)>\]"']+)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    if (match[1]) {
      segments.push({ type: "link", content: match[2], href: match[3] });
    } else if (match[4]) {
      segments.push({ type: "bold", content: match[5] });
    } else if (match[6]) {
      segments.push({ type: "code", content: match[7] });
    } else if (match[8]) {
      segments.push({ type: "italic", content: match[9] });
    } else if (match[10]) {
      segments.push({ type: "italic", content: match[11] });
    } else if (match[12]) {
      const { url, trailing } = splitUrlPunctuation(match[12]);
      segments.push({ type: "raw_link", content: url, href: url });
      if (trailing) {
        segments.push({ type: "text", content: trailing });
      }
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }
  return segments;
}

function renderLink(
  key: number,
  href: string,
  label: string
): React.ReactNode {
  return (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      className="text-[#306FB8] underline decoration-[#306FB8]/40 underline-offset-2 hover:decoration-[#306FB8] transition-colors break-all"
    >
      {label}
    </a>
  );
}

/**
 * Bare URLs in an answer are worksheet links. Showing the URL itself buries the
 * sentence under 60 characters of Drive gibberish, so render a compact pill instead
 * and keep the address in the tooltip.
 */
function renderWorksheetPill(key: number, href: string): React.ReactNode {
  return (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      aria-label={`Open worksheet (${href})`}
      className="inline-flex items-center gap-1.5 align-middle whitespace-nowrap no-underline rounded-full px-2.5 py-1 text-[13px] font-medium bg-[#306FB8]/10 hover:bg-[#306FB8]/20 border border-[#306FB8]/20 text-[#173C7A] transition-colors"
    >
      <FileText size={14} className="shrink-0" />
      Open worksheet
      <ExternalLink size={12} className="shrink-0 opacity-70" />
    </a>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const segments = tokenizeInline(text);
  return segments.map((seg, i) => {
    switch (seg.type) {
      case "bold":
        return (
          <strong key={i} className="font-semibold text-[#173C7A]">
            {seg.content}
          </strong>
        );
      case "italic":
        return (
          <em key={i} className="italic text-gray-800">
            {seg.content}
          </em>
        );
      case "code":
        return (
          <code
            key={i}
            className="bg-[#306FB8]/10 text-[#173C7A] px-1.5 py-0.5 rounded-md font-mono text-[13px]"
          >
            {seg.content}
          </code>
        );
      case "link":
        return renderLink(i, seg.href, seg.content);
      case "raw_link":
        return renderWorksheetPill(i, seg.href);
      default:
        return <React.Fragment key={i}>{seg.content}</React.Fragment>;
    }
  });
}

type Block =
  | { type: "h1" | "h2" | "h3"; content: string }
  | { type: "paragraph"; content: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "blockquote"; content: string }
  | { type: "code"; content: string; lang?: string }
  | { type: "hr" };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  let paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let codeBlock: { content: string[]; lang?: string } | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", content: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list && list.items.length > 0) {
      blocks.push(list);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");

    if (codeBlock) {
      if (line.trim().startsWith("```")) {
        blocks.push({
          type: "code",
          content: codeBlock.content.join("\n"),
          lang: codeBlock.lang,
        });
        codeBlock = null;
      } else {
        codeBlock.content.push(raw);
      }
      continue;
    }

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      flushParagraph();
      flushList();
      codeBlock = { content: [], lang: fence[1] || undefined };
      continue;
    }

    if (/^\s*---+\s*$/.test(line) || /^\s*\*\*\*+\s*$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "hr" });
      continue;
    }

    const h3 = line.match(/^###\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    const h1 = line.match(/^#\s+(.*)$/);
    if (h1 || h2 || h3) {
      flushParagraph();
      flushList();
      if (h1) blocks.push({ type: "h1", content: h1[1] });
      else if (h2) blocks.push({ type: "h2", content: h2[1] });
      else if (h3) blocks.push({ type: "h3", content: h3[1] });
      continue;
    }

    const bq = line.match(/^>\s?(.*)$/);
    if (bq) {
      flushParagraph();
      flushList();
      blocks.push({ type: "blockquote", content: bq[1] });
      continue;
    }

    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul) {
      flushParagraph();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(ul[1]);
      continue;
    }
    if (ol) {
      flushParagraph();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(ol[1]);
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  if (codeBlock) {
    blocks.push({
      type: "code",
      content: codeBlock.content.join("\n"),
      lang: codeBlock.lang,
    });
  }
  flushParagraph();
  flushList();

  return blocks;
}

export function FormattedAnswer({
  text,
  isTyping,
}: {
  text: string;
  isTyping: boolean;
}) {
  const blocks = parseBlocks(text);

  const cursor = isTyping ? (
    <span className="inline-block w-[3px] h-[1.05em] ml-0.5 bg-[#306FB8] animate-pulse align-[-0.2em] rounded-sm" />
  ) : null;

  if (blocks.length === 0) {
    return (
      <p className="text-gray-700 leading-relaxed text-[15px]">
        {cursor}
      </p>
    );
  }

  const lastIndex = blocks.length - 1;

  return (
    <div className="space-y-4 text-gray-700 text-[15px] break-words min-w-0">
      {blocks.map((block, i) => {
        const trailing = isTyping && i === lastIndex ? cursor : null;
        switch (block.type) {
          case "h1":
            return (
              <h2
                key={i}
                className="text-xl font-bold text-[#173C7A] mt-1 mb-1 leading-snug"
              >
                {renderInline(block.content)}
                {trailing}
              </h2>
            );
          case "h2":
            return (
              <h3
                key={i}
                className="text-lg font-semibold text-[#173C7A] mt-1 mb-0.5 leading-snug"
              >
                {renderInline(block.content)}
                {trailing}
              </h3>
            );
          case "h3":
            return (
              <h4
                key={i}
                className="text-base font-semibold text-[#173C7A] mt-1 mb-0.5 leading-snug"
              >
                {renderInline(block.content)}
                {trailing}
              </h4>
            );
          case "paragraph":
            return (
              <p key={i} className="leading-7">
                {renderInline(block.content)}
                {trailing}
              </p>
            );
          case "ul":
            return (
              <ul
                key={i}
                className="list-disc pl-6 space-y-1.5 marker:text-[#306FB8] leading-7"
              >
                {block.items.map((item, j) => (
                  <li key={j}>
                    {renderInline(item)}
                    {isTyping && i === lastIndex && j === block.items.length - 1
                      ? cursor
                      : null}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol
                key={i}
                className="list-decimal pl-6 space-y-1.5 marker:text-[#306FB8] marker:font-semibold leading-7"
              >
                {block.items.map((item, j) => (
                  <li key={j}>
                    {renderInline(item)}
                    {isTyping && i === lastIndex && j === block.items.length - 1
                      ? cursor
                      : null}
                  </li>
                ))}
              </ol>
            );
          case "blockquote":
            return (
              <blockquote
                key={i}
                className="border-l-4 border-[#306FB8]/40 bg-[#306FB8]/5 pl-4 pr-3 py-2 rounded-r-md text-gray-700 italic"
              >
                {renderInline(block.content)}
                {trailing}
              </blockquote>
            );
          case "code":
            return (
              <pre
                key={i}
                className="bg-[#0f2852] text-gray-100 rounded-lg p-4 overflow-x-auto text-[13px] leading-6 font-mono shadow-inner"
              >
                <code>{block.content}</code>
              </pre>
            );
          case "hr":
            return (
              <hr
                key={i}
                className="border-0 border-t border-[#173C7A]/15 my-2"
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
