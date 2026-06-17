import { useEffect, useRef, useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { Toast } from "../feedback/States";
import useMessageThread from "../../hooks/useMessageThread";
import { useUnread } from "../../contexts/UnreadContext";

/**
 * Shared trainer↔client chat thread. Used by BOTH the trainer client-profile
 * Messages tab (pass clientId) and the client portal Messages tab (omit clientId
 * → self), so the two surfaces can't drift. The visual shell — header with
 * presence, grey "them" bubbles on the left, lime "You" bubbles on the right,
 * and the composer — matches the original trainer mock (minus the phone + "···"
 * buttons, which were removed); the fake data/state is replaced by real REST +
 * socket wiring via useMessageThread, plus ticks, presence and typing.
 *
 * @param {string} [clientId]     trainer supplies the Client profile id; client omits it
 * @param {string} [fallbackName] name to show before the conversation resolves
 */
const initials = (name = "") =>
  name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

const firstNameOf = (name = "") => name.split(" ")[0] || name;

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// "Last seen" — relative for the recent past, then a calendar date.
const fmtLastSeen = (iso) => {
  if (!iso) return "offline";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "offline";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// Single grey tick (sent), double grey (delivered), double blue (read).
const SingleCheck = ({ className = "" }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const DoubleCheck = ({ className = "" }) => (
  <svg width="18" height="14" viewBox="0 0 20 16" fill="none" className={className} aria-hidden="true">
    <path d="M1.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.5 11.5l.8.8 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StatusTicks = ({ status }) => {
  if (status === "read") return <DoubleCheck className="text-sky-400" />;
  if (status === "delivered") return <DoubleCheck className="text-text-muted" />;
  return <SingleCheck className="text-text-muted" />; // "sent" (or anything pre-delivery)
};

const MessageThread = ({ clientId, fallbackName }) => {
  const {
    loading,
    error,
    started,
    conversationId,
    otherParticipant,
    presence,
    otherTyping,
    messages,
    myRole,
    hasMore,
    loadingEarlier,
    sending,
    send,
    notifyTyping,
    loadEarlier,
    reload,
  } = useMessageThread({ clientId });

  const unread = useUnread();

  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState(null);
  const listRef = useRef(null);
  const typingStopTimer = useRef(null);
  const typingActiveRef = useRef(false);
  const lastTypingEmitRef = useRef(0);

  const otherName = otherParticipant?.name || fallbackName || (myRole === "trainer" ? "Client" : "Coach");
  const otherFirst = firstNameOf(otherName);
  const otherInitials = initials(otherName) || (myRole === "trainer" ? "C" : "T");

  // Register the open conversation so its unread badge is suppressed while
  // viewed (and re-synced when we leave).
  useEffect(() => {
    if (conversationId) unread.setActive(conversationId);
    return () => unread.clearActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Auto-scroll the thread (not the page) to the newest message / typing row.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, otherTyping]);

  const stopTyping = () => {
    if (typingStopTimer.current) {
      clearTimeout(typingStopTimer.current);
      typingStopTimer.current = null;
    }
    lastTypingEmitRef.current = 0;
    if (typingActiveRef.current) {
      typingActiveRef.current = false;
      notifyTyping(false);
    }
  };

  // Tear down any in-flight typing signal on unmount.
  useEffect(() => () => stopTyping(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (e) => {
    setDraft(e.target.value);
    if (!started) return; // no conversation room yet → nothing to broadcast to
    // Re-emit start at most every 1.5s so the backend's 3s typing auto-expire
    // doesn't drop the indicator mid-message during long continuous typing.
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 1500) {
      typingActiveRef.current = true;
      lastTypingEmitRef.current = now;
      notifyTyping(true);
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(stopTyping, 2000);
  };

  const doSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    stopTyping();
    setDraft("");
    try {
      await send(text);
    } catch (e) {
      setDraft(text); // restore so the user doesn't lose their message
      setToast({ kind: "error", message: e?.response?.data?.message || e?.message || "Couldn't send message" });
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  return (
    <Card padding="none" className="overflow-hidden flex flex-col">
      {/* Conversation header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[13px] font-bold">
            {otherInitials}
          </div>
          <span
            className={[
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
              presence.online ? "bg-primary" : "bg-text-muted",
            ].join(" ")}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{otherName}</p>
          {otherTyping ? (
            <p className="text-[12px] text-primary">typing…</p>
          ) : presence.online ? (
            <p className="text-[12px] text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Online
            </p>
          ) : (
            <p className="text-[12px] text-text-muted">Last seen {fmtLastSeen(presence.lastSeenAt)}</p>
          )}
        </div>
      </div>

      {/* Thread */}
      <div ref={listRef} className="h-[460px] overflow-y-auto px-5 py-5 space-y-4 bg-bg/40">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin-slow" />
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <p className="text-sm text-text-secondary">{error}</p>
            <Button size="sm" variant="secondary" onClick={() => reload()}>Try again</Button>
          </div>
        ) : !started || messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-text-muted">
                <path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7A2.5 2.5 0 0117.5 16H9l-4 3v-3H6.5A2.5 2.5 0 014 13.5v-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-base font-semibold text-text-primary">Start the conversation</p>
            <p className="text-sm text-text-secondary mt-1 max-w-xs">
              {myRole === "trainer"
                ? `Send ${otherFirst} a message to kick things off. They'll see it in their portal.`
                : `Send your coach a message to get started.`}
            </p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center">
                <Button size="sm" variant="ghost" loading={loadingEarlier} onClick={loadEarlier}>
                  Load earlier messages
                </Button>
              </div>
            )}
            {messages.map((msg) => {
              const isMine = msg.senderRole === myRole;
              return isMine ? (
                <div key={msg._id} className="flex justify-end">
                  <div className="max-w-[80%] sm:max-w-[72%] flex flex-col items-end gap-1">
                    <div className="rounded-2xl rounded-br-md bg-primary text-black px-4 py-2.5 text-sm leading-relaxed shadow-glow-sm whitespace-pre-wrap break-words">
                      {msg.body}
                    </div>
                    <span className="text-[11px] text-text-muted pr-1 flex items-center gap-1">
                      You · {fmtTime(msg.createdAt)}
                      <StatusTicks status={msg.status} />
                    </span>
                  </div>
                </div>
              ) : (
                <div key={msg._id} className="flex justify-start items-end gap-2.5">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[11px] font-bold">
                    {otherInitials}
                  </div>
                  <div className="max-w-[80%] sm:max-w-[72%] flex flex-col items-start gap-1">
                    <div className="rounded-2xl rounded-bl-md bg-surface-elevated border border-border text-text-primary px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.body}
                    </div>
                    <span className="text-[11px] text-text-muted pl-1">{otherFirst} · {fmtTime(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })}

            {otherTyping && (
              <div className="flex justify-start items-end gap-2.5">
                <div className="w-8 h-8 shrink-0 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[11px] font-bold">
                  {otherInitials}
                </div>
                <div className="rounded-2xl rounded-bl-md bg-surface-elevated border border-border px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse-slow" />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse-slow [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse-slow [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={draft}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onBlur={stopTyping}
            placeholder={`Message ${otherFirst}…`}
            className="flex-1 min-h-[44px] max-h-32 px-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted outline-none transition-all resize-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <Button onClick={doSend} loading={sending} disabled={!draft.trim()} className="px-4" aria-label="Send message">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M16 2L8 10M16 2l-5 14-3-6-6-3 14-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Send
          </Button>
        </div>
        <p className="text-[11px] text-text-muted mt-2 pl-1">Press Enter to send · Shift+Enter for a new line</p>
      </div>

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </Card>
  );
};

export default MessageThread;
