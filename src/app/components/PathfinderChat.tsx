import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Loader2 } from "lucide-react";
import logo from "../../imports/image.png";
import { ask, AskError, type AskResponse } from "@/lib/ask";
import {
  saveExchange,
  type ChatMessage,
} from "@/lib/conversations";
import { FormattedAnswer } from "./FormattedAnswer";

const MAX_COMPOSER_HEIGHT = 200;

type RecommendedGptId = NonNullable<AskResponse["recommended_gpt"]>;

const recommendedGpts: Record<RecommendedGptId, { id: RecommendedGptId; name: string; url: string }> = {
  job_search_coach: {
    id: "job_search_coach",
    name: "Job Search Coach",
    url: "https://chatgpt.com/g/g-6994a70db24c8191a903c64842cf85df-archer-job-search-target-list",
  },
  networking_coach: {
    id: "networking_coach",
    name: "Networking Coach",
    url: "https://chatgpt.com/g/g-691d0b3e51208191a91890adf323089f-archer-networking-coach",
  },
  resume_coach: {
    id: "resume_coach",
    name: "Resume Coach",
    url: "https://chatgpt.com/g/g-688a2d3690788191a2b3a32bd6449032-archer-resume-coach",
  },
  interview_coach: {
    id: "interview_coach",
    name: "Interview Coach",
    url: "https://chatgpt.com/g/g-68c4389c741c81919b4a0f3dacf0b555-archer-interview-coach",
  },
  explore: {
    id: "explore",
    name: "Explore",
    url: "https://chatgpt.com/g/g-6aaa2c4711888191be9f0d1635e6e0a2-archer-explore",
  },
  focus: {
    id: "focus",
    name: "Focus",
    url: "https://chatgpt.com/g/g-6aaa2dfec9448191a4c6d30b5a7e4f4d-archer-focus",
  },
  take_aim: {
    id: "take_aim",
    name: "Take Aim",
    url: "https://chatgpt.com/g/g-6aa99b2ec1308191b04ee0d93ca75ed2-archer-take-aim",
  },
  positioning: {
    id: "positioning",
    name: "Establish Positioning",
    url: "https://chatgpt.com/g/g-6aa9f9551f088191a463aeefafd2fe5e-archer-establish-positioning",
  },
  relationship_readiness: {
    id: "relationship_readiness",
    name: "Relationship Readiness",
    url: "https://chatgpt.com/g/g-6aa9fa7f2e54819194fe10af2eb3f77a-archer-relationship-readiness",
  },
  build_relationships: {
    id: "build_relationships",
    name: "Build Relationships",
    url: "https://chatgpt.com/g/g-6aaa2f34082c8191b83dcca0004c61f0-archer-build-relationships",
  },
  build_resume: {
    id: "build_resume",
    name: "Build Resume",
    url: "https://chatgpt.com/g/g-6aa9fab95d8c81918d66eb6a17f01d82-archer-build-resume",
  },
  build_cover_letter: {
    id: "build_cover_letter",
    name: "Build Cover Letter",
    url: "https://chatgpt.com/g/g-6aaa30a5d3908191af99e91b80ae03b9-archer-build-cover-letter",
  },
  master_interview: {
    id: "master_interview",
    name: "Master the Interview",
    url: "https://chatgpt.com/g/g-6aa9faee518c8191b7af3df344646a7b-archer-master-the-interview",
  },
  execute_search: {
    id: "execute_search",
    name: "Execute Search",
    url: "https://chatgpt.com/g/g-6aaa31eb4c2c81918f17e540fc80e523-archer-execute-search",
  },
  negotiate_offer: {
    id: "negotiate_offer",
    name: "Negotiate Offer",
    url: "https://chatgpt.com/g/g-6aa9fb2c13008191ada4cd64548af032-archer-negotiate-offer",
  },
  search_wrap_up: {
    id: "search_wrap_up",
    name: "Search Wrap-Up",
    url: "https://chatgpt.com/g/g-6aaa330a4e808191a25619e014113deb-archer-search-wrap-up",
  },
  jtbd_expansion: {
    id: "jtbd_expansion",
    name: "JTBD Expansion",
    url: "https://chatgpt.com/g/g-6a9f2f670a3c8191ae18b248d87cf0bc-archer-franklin-jtbd",
  },
};

function getRecommendedGpt(value: unknown) {
  return Object.values(recommendedGpts).find((gpt) => gpt.id === value) ?? null;
}

function sliceWithCompleteUrls(text: string, endIndex: number): string {
  const slice = text.slice(0, endIndex);
  const urlPattern = /https?:\/\/[^\s)>\]"']+/g;
  let match: RegExpExecArray | null;
  while ((match = urlPattern.exec(text)) !== null) {
    const urlStart = match.index;
    const urlEnd = urlStart + match[0].length;
    if (endIndex > urlStart && endIndex < urlEnd) {
      return text.slice(0, urlEnd);
    }
  }
  return slice;
}

type PathfinderChatProps = {
  activeConversationId: string | null;
  onActiveConversationChange: (id: string) => void;
  onConversationsChange: () => void;
  loadedMessages: ChatMessage[] | null;
  resetSignal: number;
};

export function PathfinderChat({
  activeConversationId,
  onActiveConversationChange,
  onConversationsChange,
  loadedMessages,
  resetSignal,
}: PathfinderChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(null);
  const [composerHeight, setComposerHeight] = useState(56);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationIdRef = useRef<string | null>(activeConversationId);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);

  const hasMessages = messages.length > 0;
  const showChatPanel = hasMessages || isAsking || activeConversationId !== null;
  const isSearching = showChatPanel;
  const isComposerExpanded = isSearching || composerHeight > 56;

  useEffect(() => {
    conversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, MAX_COMPOSER_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_COMPOSER_HEIGHT ? "auto" : "hidden";
    setComposerHeight(nextHeight);
  }, [searchQuery]);

  useEffect(() => {
    setMessages([]);
    setSearchQuery("");
    setTypedText("");
    setAnimatingMessageId(null);
    setIsAsking(false);
    isAtBottomRef.current = true;
  }, [resetSignal]);

  useEffect(() => {
    if (loadedMessages !== null) {
      setMessages(loadedMessages);
      setSearchQuery("");
      setTypedText("");
      setAnimatingMessageId(null);
      setIsAsking(false);
      isAtBottomRef.current = true;
    }
  }, [loadedMessages]);

  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const fullText = latestAssistant?.content ?? "";

  useEffect(() => {
    if (!animatingMessageId || !fullText) {
      setTypedText("");
      return;
    }

    let i = 0;
    setTypedText("");
    const interval = setInterval(() => {
      setTypedText(sliceWithCompleteUrls(fullText, i));
      i++;
      if (i > fullText.length) {
        clearInterval(interval);
        setAnimatingMessageId(null);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [animatingMessageId, fullText]);

  // Only follow the bottom while the reader is already there. The answer grows every
  // 15ms as it types, so following unconditionally would yank the view back down each
  // tick and make it impossible to scroll up and re-read an earlier answer mid-response.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // Watch the transcript's height rather than reacting to state changes: the answer's
  // rendered height and the typedText that produced it don't grow in lockstep, so a
  // render-driven scroll lands on a stale measurement.
  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content) return;

    const followBottom = () => {
      if (!isAtBottomRef.current) return;
      el.scrollTop = el.scrollHeight;
    };

    followBottom();
    const observer = new ResizeObserver(followBottom);
    observer.observe(content);
    return () => observer.disconnect();
  }, [showChatPanel]);

  const handleSearch = async () => {
    const queryToAsk = searchQuery.trim();
    if (!queryToAsk || isAsking) return;

    const userMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: queryToAsk,
      metadata: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setSearchQuery("");
    setComposerHeight(56);
    setIsAsking(true);

    let conversationId = conversationIdRef.current;

    try {
      // `messages` here is the transcript as it was before this question was appended,
      // which is exactly the history we want. Failed sends are dropped — they were never
      // saved, and feeding "couldn't reach the backend" back in teaches Franklin nothing.
      const history = messages
        .filter((m) => !m.id.startsWith("temp-error-"))
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await ask(queryToAsk, history);

      const assistantMsg: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        metadata: {
          take_aim_job: res.take_aim_job,
          recommended_gpt: res.recommended_gpt,
          sources: res.sources,
          classified: res.classified,
          framework_refs_used: res.framework_refs_used,
          was_filtered: res.was_filtered,
        },
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setAnimatingMessageId(assistantMsg.id);

      conversationId = await saveExchange(queryToAsk, res.answer, {
        take_aim_job: res.take_aim_job,
        recommended_gpt: res.recommended_gpt,
        sources: res.sources,
        classified: res.classified,
        framework_refs_used: res.framework_refs_used,
        was_filtered: res.was_filtered,
      }, conversationId);

      conversationIdRef.current = conversationId;
      onActiveConversationChange(conversationId);
      onConversationsChange();
    } catch (e) {
      if (e instanceof AskError) {
        console.error("Ask request failed:", e.detail);
      } else {
        console.error("Ask request failed:", e);
      }
      const errorMsg: ChatMessage = {
        id: `temp-error-${Date.now()}`,
        role: "assistant",
        content: e instanceof AskError ? e.message : "Sorry — something went wrong. Please try again.",
        metadata: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  const renderAssistantContent = (msg: ChatMessage) => {
    const isLatest = msg.id === latestAssistant?.id;
    const isAnimating = isLatest && animatingMessageId === msg.id;

    if (isAnimating) {
      if (typedText) {
        return (
          <FormattedAnswer
            text={typedText}
            isTyping={isAsking || typedText.length < fullText.length}
          />
        );
      }
      return (
        <div className="flex items-center gap-2 text-gray-500 text-[15px]">
          <Loader2 className="animate-spin" size={16} />
          <span>Thinking…</span>
        </div>
      );
    }

    const gpt = getRecommendedGpt(msg.metadata?.recommended_gpt);
    return (
      <>
        <FormattedAnswer text={msg.content} isTyping={false} />
        {gpt && (
          <div className="mt-4 rounded-xl border border-[#173C7A]/10 bg-[#173C7A]/[0.03] px-4 py-3">
            <a
              href={gpt.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#173C7A] hover:text-[#306FB8]"
            >
              Open Archer&apos;s {gpt.name} GPT
              <ExternalLink size={14} aria-hidden="true" />
            </a>
            <p className="mt-1 text-xs text-gray-500">
              Opens a separate ChatGPT conversation. Your Pathfinder chat and profile are not shared.
            </p>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <motion.div
        className="absolute z-50 flex items-center gap-4"
        initial={false}
        animate={{
          left: "50%",
          top: "50%",
          x: "-50%",
          y: "-120px",
          opacity: isSearching ? 0 : 1,
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{
          pointerEvents: isSearching ? "none" : "auto",
          transformOrigin: "center",
        }}
      >
        <img
          src={logo}
          alt="Franklin"
          className="h-16 opacity-90 cursor-pointer transition-opacity hover:opacity-100"
          onClick={() => {
            /* logo click kept for visual consistency */
          }}
        />
      </motion.div>

      <AnimatePresence>
        {isSearching && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.2, ease: "easeIn" } }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute top-[72px] w-full max-w-6xl px-6 flex"
            style={{ gap: "0rem", bottom: "130px" }}
          >
            <motion.div
              layout
              className="flex flex-col w-full min-h-0"
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <div className="bg-gradient-to-br from-white to-[#306FB8]/[0.03] rounded-2xl border border-[#173C7A]/10 flex-1 min-h-0 shadow-sm relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#306FB8] to-[#173C7A] opacity-80" />
                <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#173C7A]/5">
                  <h3 className="text-lg font-semibold text-[#173C7A] flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      {(isAsking || animatingMessageId) && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#306FB8] opacity-75" />
                      )}
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#306FB8]" />
                    </span>
                    Franklin Response
                  </h3>
                </div>
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto px-8 py-6 archer-scroll"
                >
                  <div ref={contentRef} className="space-y-6">
                    {!hasMessages && !isAsking && activeConversationId && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No messages in this chat yet. Ask a question below to continue.
                      </p>
                    )}
                    {messages.map((msg) =>
                      msg.role === "user" ? (
                        <div key={msg.id} className="flex justify-end">
                          <div className="max-w-[85%] bg-[#173C7A] text-white text-[15px] leading-relaxed px-4 py-3 rounded-2xl rounded-br-md">
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        <div key={msg.id} className="min-w-0">
                          {renderAssistantContent(msg)}
                        </div>
                      )
                    )}
                    {isAsking && messages[messages.length - 1]?.role === "user" && (
                      <div className="flex items-center gap-2 text-gray-500 text-[15px]">
                        <Loader2 className="animate-spin" size={16} />
                        <span>Thinking…</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="absolute z-40 px-6 w-full"
        initial={false}
        animate={{
          left: "50%",
          top: isSearching ? "calc(100% - 80px)" : "50%",
          x: "-50%",
          y: "-50%",
          maxWidth: isSearching ? "72rem" : "42rem",
        }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div
          className={`relative w-full transition-transform duration-300 ${!isSearching && "hover:scale-[1.02]"}`}
        >
          <textarea
            ref={textareaRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.metaKey) {
                e.preventDefault();
                handleSearch();
              } else if (e.key === "Enter" && e.metaKey) {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const newValue =
                  searchQuery.substring(0, start) + "\n" + searchQuery.substring(end);
                setSearchQuery(newValue);
                requestAnimationFrame(() => {
                  target.setSelectionRange(start + 1, start + 1);
                });
              }
            }}
            placeholder={isSearching ? "Ask a new question..." : "Search for career advice..."}
            className={`block w-full px-6 pr-16 border-2 border-[#173C7A] focus:outline-none bg-white shadow-md text-gray-800 resize-none overflow-x-hidden leading-[24px] ${
              isComposerExpanded ? "py-[13px] rounded-3xl" : "py-[14px] rounded-full"
            }`}
            style={{ height: `${composerHeight}px` }}
          />
          <button
            onClick={handleSearch}
            disabled={isAsking}
            className={`absolute right-2 flex items-center justify-center w-[44px] h-[44px] bg-[#306FB8] hover:bg-[#173C7A] disabled:opacity-60 text-white rounded-full transition-transform hover:scale-110 active:scale-95 ${
              isComposerExpanded
                ? "top-1/2 -translate-y-1/2 bg-[#173C7A]"
                : "top-1/2 -translate-y-1/2"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>
      </motion.div>
    </>
  );
}
