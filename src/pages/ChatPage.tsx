import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MessageCircle,
  Send,
  Search,
  ArrowLeft,
  ShieldCheck,
  User as UserIcon,
  ExternalLink,
  AlertCircle,
  Store,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useMarketplace } from '../context/MarketplaceContext';
import { ChatMessage, FIELD_LIMITS } from '../types';

export const ChatPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, authReady, signInWithGoogle, conversations, sendChatMessage } = useMarketplace();

  const initialConvId = searchParams.get('conversationId') || '';
  const [selectedConvId, setSelectedConvId] = useState<string>(initialConvId);
  const [mobileThreadOpen, setMobileThreadOpen] = useState<boolean>(Boolean(initialConvId));
  const [searchTerm, setSearchTerm] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync URL ?conversationId param into selection
  useEffect(() => {
    const paramId = searchParams.get('conversationId');
    if (paramId) {
      setSelectedConvId(paramId);
      setMobileThreadOpen(true);
    } else if (!selectedConvId && conversations.length > 0) {
      setSelectedConvId(conversations[0].id);
    }
  }, [searchParams, conversations, selectedConvId]);

  const filteredConversations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const otherName = user && c.buyerUid === user.uid ? c.sellerName : c.buyerName;
      return (
        otherName.toLowerCase().includes(q) ||
        c.listingTitle.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchTerm, user]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConvId) || null,
    [conversations, selectedConvId]
  );

  // Real-time messages listener for the active conversation
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified || !activeConversation) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    setMessagesError(null);

    const participantField =
      activeConversation.buyerUid === user.uid ? 'buyerUid' : 'sellerUid';
    const messagesQuery = query(
      collection(db, 'conversations', activeConversation.id, 'messages'),
      where(participantField, '==', user.uid)
    );

    const unsub = onSnapshot(
      messagesQuery,
      (snap) => {
        const list: ChatMessage[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChatMessage, 'id'>),
        }));
        list.sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || Date.now();
          const tB = b.createdAt?.toMillis?.() || Date.now();
          return tA - tB;
        });
        setMessages(list);
        setLoadingMessages(false);
      },
      (err) => {
        setLoadingMessages(false);
        setMessagesError('Unable to load messages for this conversation.');
        handleFirestoreError(
          err,
          OperationType.LIST,
          `conversations/${activeConversation.id}/messages`
        );
      }
    );

    return () => unsub();
  }, [authReady, user, activeConversation]);

  // Smooth auto-scroll when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConversation?.id]);

  const handleSelectConversation = (convId: string) => {
    setSelectedConvId(convId);
    setSearchParams({ conversationId: convId });
    setMobileThreadOpen(true);
    setSendError(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !draftText.trim() || sending) return;
    setSendError(null);
    setSending(true);
    const pendingText = draftText;
    try {
      await sendChatMessage(activeConversation, pendingText);
      setDraftText('');
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (!authReady) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="h-[520px] rounded-3xl frosted-glass animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="frosted-glass-strong rounded-3xl p-8 border border-slate-200 shadow-lg space-y-5">
          <div className="w-16 h-16 neu-circle mx-auto flex items-center justify-center text-[#0F172A] bg-slate-100">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h1 className="font-display font-black text-2xl text-slate-900">
            Sign In for Buyer &amp; Seller Chat
          </h1>
          <p className="text-sm text-slate-700 font-medium">
            Connect directly with verified sellers and buyers to coordinate in-game deliveries and answer questions in real time.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="btn-navy inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm shadow-md"
          >
            <UserIcon className="w-4 h-4" />
            <span>Sign in with Google</span>
          </button>
        </div>
      </main>
    );
  }

  const counterpartName = activeConversation
    ? activeConversation.buyerUid === user.uid
      ? activeConversation.sellerName
      : activeConversation.buyerName
    : '';
  const counterpartRole = activeConversation
    ? activeConversation.buyerUid === user.uid
      ? 'Verified Seller'
      : 'Marketplace Buyer'
    : '';

  return (
    <main className="max-w-[1400px] w-full max-w-full min-w-0 mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-vintage font-bold text-2xl sm:text-3xl text-[#0F172A] flex items-center gap-2.5">
            <MessageCircle className="w-7 h-7 text-[#0F172A] shrink-0" />
            <span>Buyer &amp; Seller Chat</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 font-medium mt-0.5">
            Direct real-time messaging between verified buyers and sellers on Beatrix.gl.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="btn-navy-outline px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Storefront</span>
          </Link>
        </div>
      </div>

      {/* Main Split Chat Container */}
      <div className="frosted-glass-strong rounded-3xl border border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.1)] overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[640px] max-h-[78vh] min-h-[460px]">
        {/* Left Pane: Conversations Inbox */}
        <aside
          className={`md:col-span-4 lg:col-span-4 border-r border-slate-200 bg-white/75 flex flex-col min-h-0 ${
            mobileThreadOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search buyer, seller, or offer..."
                aria-label="Search conversations"
                className="w-full neu-pressed rounded-full pl-10 pr-4 py-2 text-xs text-slate-900 font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <MessageCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-900">No conversations yet</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Visit any marketplace offer and click &ldquo;Chat with Seller&rdquo;, or reply to buyers from your orders.
                </p>
                <Link
                  to="/"
                  className="btn-navy inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold"
                >
                  Browse Offers
                </Link>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isBuyer = conv.buyerUid === user.uid;
                const name = isBuyer ? conv.sellerName : conv.buyerName;
                const roleLabel = isBuyer ? 'Seller' : 'Buyer';
                const selected = activeConversation?.id === conv.id;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full text-left p-4 transition-colors flex items-start gap-3 ${
                      selected
                        ? 'bg-[#FFF0F5] border-l-4 border-[#0F172A]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl btn-navy text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-black text-sm text-[#0F172A] truncate">
                          {name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
                          {roleLabel}
                        </span>
                      </div>
                      {conv.listingTitle && (
                        <div className="text-[11px] font-bold text-blue-900 truncate">
                          Re: {conv.listingTitle}
                        </div>
                      )}
                      <div className="text-xs text-slate-600 truncate">
                        {conv.lastMessage || 'New conversation — send a message'}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Pane: Active Message Thread */}
        <section
          className={`md:col-span-8 lg:col-span-8 flex flex-col min-h-0 bg-white/55 ${
            mobileThreadOpen ? 'flex' : 'hidden md:flex'
          }`}
        >
          {!activeConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl neu-circle flex items-center justify-center text-[#0F172A]">
                <MessageCircle className="w-7 h-7" />
              </div>
              <h2 className="font-display font-black text-lg text-slate-900">
                Select a Conversation
              </h2>
              <p className="text-xs text-slate-600 max-w-sm">
                Choose a buyer or seller thread on the left to exchange live delivery updates or pre-purchase questions.
              </p>
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-white/90 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileThreadOpen(false)}
                    className="md:hidden p-2 rounded-xl neu-flat text-slate-800 border border-slate-300 shrink-0"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-9 h-9 rounded-xl btn-navy text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {counterpartName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display font-black text-sm sm:text-base text-[#0F172A] truncate">
                        {counterpartName}
                      </h2>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{counterpartRole}</span>
                      </span>
                    </div>
                    {activeConversation.listingTitle && (
                      <div className="text-[11px] text-slate-600 font-semibold truncate">
                        Topic: {activeConversation.listingTitle}
                      </div>
                    )}
                  </div>
                </div>

                {activeConversation.listingId && (
                  <Link
                    to={`/listing/${activeConversation.listingId}`}
                    className="btn-navy-outline px-3 py-1.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 shrink-0"
                  >
                    <span>View Offer</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                {messagesError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{messagesError}</span>
                  </div>
                )}

                {loadingMessages ? (
                  <div className="py-12 text-center text-xs text-slate-600 font-semibold">
                    Loading conversation...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center space-y-2 text-slate-600">
                    <div className="text-sm font-bold text-slate-900">Start the conversation</div>
                    <p className="text-xs max-w-sm mx-auto">
                      Send a message below to discuss item availability, server region, or order delivery.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderUid === user.uid;
                    const timeStr = msg.createdAt?.toDate
                      ? msg.createdAt.toDate().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Sending...';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed break-words shadow-xs ${
                            isMine
                              ? 'btn-navy text-white rounded-br-sm'
                              : 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm'
                          }`}
                        >
                          <div
                            className={`text-[10px] font-bold mb-0.5 ${
                              isMine ? 'text-pink-200' : 'text-slate-500'
                            }`}
                          >
                            {msg.senderName}
                          </div>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 mt-1 px-1">
                          {timeStr}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <form
                onSubmit={handleSend}
                className="p-3 sm:p-4 border-t border-slate-200 bg-white/95 space-y-2"
              >
                {sendError && (
                  <div className="text-xs font-bold text-rose-700 px-2">{sendError}</div>
                )}
                <div className="flex items-center gap-2.5">
                  <input
                    type="text"
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    maxLength={FIELD_LIMITS.CHAT_MESSAGE_MAX}
                    placeholder={`Message ${counterpartName}...`}
                    aria-label={`Message ${counterpartName}`}
                    className="flex-1 neu-pressed rounded-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draftText.trim()}
                    className="btn-navy px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sending ? 'Sending' : 'Send'}</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
};
