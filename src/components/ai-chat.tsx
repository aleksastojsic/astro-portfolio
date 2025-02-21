import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Bot, BotMessageSquare, X, Folder, Code2, Sparkles, Mail, Send, LoaderCircle } from 'lucide-preact';
import { marked } from 'marked';
import Button from '@/components/ui/button';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MessageState {
  count: number;
  lastReset: string;
}

const MESSAGE_LIMIT = 5;
const DAILY_STORAGE_KEY = 'ai-chat-state';
const CONVERSATION_STORAGE_KEY = 'ai-chat-conversation';

const UserMessage = ({ content }: { content: string }) => <div className='text-sm'>{content}</div>;
const AssistantMessage = ({ content }: { content: string }) => (
  <div
    className='prose prose-sm dark:prose-invert max-w-none break-words'
    dangerouslySetInnerHTML={{ __html: content }}
  />
);

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [showWelcomeBubble, setShowWelcomeBubble] = useState(true);
  const [inputValue, setInputValue] = useState('');

  const chatPanelRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedMessages = getStoredConversation();
    const storedState = getStoredState();

    setMessages(storedMessages);
    setUserMessageCount(storedState.count);

    const timer = setTimeout(() => setShowWelcomeBubble(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && chatPanelRef.current && !chatPanelRef.current.contains(target)) {
        setIsOpen(false);
        if (window.matchMedia('(max-width: 640px)').matches) {
          document.body.style.removeProperty('overflow');
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const getStoredState = useCallback((): MessageState => {
    const defaultState: MessageState = {
      count: 0,
      lastReset: new Date().toISOString().split('T')[0],
    };
    try {
      const stored = localStorage.getItem(DAILY_STORAGE_KEY);
      if (!stored) return defaultState;
      const state: MessageState = JSON.parse(stored);
      const today = new Date().toISOString().split('T')[0];
      if (state.lastReset !== today) {
        saveState(defaultState);
        return defaultState;
      }
      return state;
    } catch {
      return defaultState;
    }
  }, []);

  const saveState = useCallback((state: MessageState) => {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(state));
  }, []);

  const getStoredConversation = useCallback((): Message[] => {
    try {
      const stored = sessionStorage.getItem(CONVERSATION_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map((msg: any) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.role === 'assistant' ? marked.parse(msg.content) : msg.content,
        })) as Message[];
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  const saveConversation = useCallback((msgs: Message[]) => {
    sessionStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(msgs));
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messagesRef.current) {
      requestAnimationFrame(() => {
        messagesRef.current!.scrollTop = messagesRef.current!.scrollHeight;
      });
    }
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || userMessageCount >= MESSAGE_LIMIT || isLoading) return;

      const newCount = userMessageCount + 1;
      setUserMessageCount(newCount);
      setIsLoading(true);
      setInputValue('');

      const userMessage: Message = { role: 'user', content };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      saveConversation(newMessages);
      scrollToBottom();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages }),
        });

        if (!response.ok || !response.body) throw new Error('Failed to fetch response');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          assistantMessage += text;
          const parsedContent = await marked.parse(assistantMessage);
          const assistantUpdate: Message = { role: 'assistant', content: parsedContent };
          setMessages([...newMessages, assistantUpdate]);
          scrollToBottom();
        }

        const finalParsedContent = await marked.parse(assistantMessage);
        const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: finalParsedContent }];
        setMessages(finalMessages);
        saveConversation(finalMessages);
      } catch (error) {
        console.error('Chat error:', error);
        setUserMessageCount((prev) => prev - 1);
        setMessages((prev) => prev.slice(0, -1));
        saveConversation(messages);
      } finally {
        setIsLoading(false);
        saveState({
          count: newCount,
          lastReset: new Date().toISOString().split('T')[0],
        });
        scrollToBottom();
      }
    },
    [isLoading, messages, saveConversation, saveState, scrollToBottom, userMessageCount],
  );

  const handleToggle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      const newIsOpen = !isOpen;
      if (newIsOpen) {
        if (window.matchMedia('(max-width: 640px)').matches) {
          document.body.style.setProperty('overflow', 'hidden', 'important');
        }
        scrollToBottom();
      } else if (!newIsOpen && window.matchMedia('(max-width: 640px)').matches) {
        document.body.style.removeProperty('overflow');
      }
      setIsOpen(newIsOpen);
      setShowWelcomeBubble(false);
    },
    [isOpen, scrollToBottom],
  );

  const handlePromptClick = useCallback(
    (e: MouseEvent, prompt: string) => {
      e.stopPropagation();
      handleSendMessage(prompt);
    },
    [handleSendMessage],
  );

  const predefinedPrompts = [
    {
      icon: <Folder class='size-6 shrink-0 text-amber-500 sm:size-5 dark:text-amber-400' />,
      text: 'What are your main projects?',
      prompt: "What are Aleksa's main projects?",
    },
    {
      icon: <Code2 class='size-6 shrink-0 text-purple-500 sm:size-5 dark:text-purple-400' />,
      text: 'What technologies do you use?',
      prompt: 'Tell me about your tech stack and skills.',
    },
    {
      icon: <Sparkles class='size-6 shrink-0 text-pink-500 sm:size-5 dark:text-pink-400' />,
      text: 'Tell me something interesting about yourself',
      prompt: 'What are some interesting facts about you?',
    },
    {
      icon: <Mail class='size-6 shrink-0 text-sky-500 sm:size-5 dark:text-sky-400' />,
      text: 'How can I get in touch?',
      prompt: 'How can I contact you?',
    },
  ];

  return (
    <div>
      {showWelcomeBubble && (
        <div className='animate-bounce-in fixed right-5 bottom-[84px] z-40 flex w-72 items-start gap-3 transition-all duration-300'>
          <div className='bg-base-300 relative w-full rounded-2xl p-4 shadow-lg'>
            <div className='bg-base-300 absolute right-4 -bottom-2 size-4 rotate-45'></div>
            <div className='flex gap-3'>
              <div className='bg-secondary relative flex size-10 items-center justify-center rounded-xl'>
                <Bot class='text-secondary-content size-6' />
                <div className='border-base-300 absolute -right-1 -bottom-1 size-4 rounded-full border-2 bg-green-500 dark:bg-green-400'></div>
              </div>
              <div className='flex-1'>
                <p className='text-base-content font-medium'>Beep boop! 👋</p>
                <p className='text-base-content/85 text-sm'>Ask me about Aleksa's projects or anything else.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={handleToggle}
        variant='secondary'
        size='icon'
        className='fixed right-5 bottom-5 z-40 size-12 rounded-full'
        aria-label='Chat with Portfolio AI'
      >
        <BotMessageSquare class='!size-6' />
      </Button>

      <div
        ref={chatPanelRef}
        className={`bg-base-300 fixed inset-0 z-40 origin-bottom-right shadow-lg transition-all duration-300 ease-[cubic-bezier(0,1.2,1,1)] sm:inset-auto sm:right-5 sm:bottom-[84px] sm:w-80 sm:rounded-2xl ${
          isOpen ? 'visible scale-100 opacity-100' : 'invisible scale-0 opacity-0'
        }`}
      >
        <div className='relative flex h-full flex-col sm:h-auto'>
          <div className='bg-base-300 absolute right-4 -bottom-2 hidden size-4 rotate-45 sm:block'></div>

          <div className='bg-secondary text-secondary-content flex items-center gap-3 p-2 sm:rounded-t-2xl'>
            <div className='bg-secondary-content/15 relative flex size-10 items-center justify-center rounded-xl'>
              <Bot class='size-6' />
              <div className='border-secondary absolute -right-1 -bottom-1 size-4 rounded-full border-2 bg-green-500 dark:bg-green-400'></div>
            </div>
            <div className='flex-1'>
              <h3 className='font-medium'>Portfolio AI</h3>
              <p className='text-xs opacity-90'>Built by Aleksa & Powered by Groq</p>
            </div>
            <Button onClick={handleToggle} variant='ghost' size='icon' className='text-secondary-content sm:hidden'>
              <X class='size-6' />
            </Button>
          </div>

          <div className='flex flex-1 flex-col overflow-hidden sm:max-h-96'>
            <div ref={messagesRef} className='flex flex-1 flex-col gap-2 overflow-y-auto p-2'>
              {messages.length === 0 && (
                <div className='flex h-full flex-col items-center justify-center gap-2'>
                  <Bot class='text-secondary size-16 sm:hidden' />
                  <p className='font-medium'>What can I help with?</p>
                  <div className='grid grid-cols-2 gap-2 sm:grid-cols-1'>
                    {predefinedPrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        onClick={(e) => handlePromptClick(e, prompt.prompt)}
                        variant='ghost'
                        className='bg-base-100 hover:bg-base-200 flex h-full flex-col items-start gap-2 rounded-xl p-3 text-left text-sm whitespace-normal transition-colors hover:cursor-pointer sm:flex-row sm:items-start sm:justify-start sm:gap-3 sm:px-4 sm:py-3 sm:text-left'
                      >
                        {prompt.icon}
                        <span>{prompt.text}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div key={index} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  <div
                    className={`${
                      message.role === 'user' ? 'bg-secondary text-secondary-content' : 'bg-base-100 text-base-content'
                    } max-w-[85%] overflow-hidden rounded-2xl px-4 py-2`}
                  >
                    {message.role === 'user' ? (
                      <UserMessage content={message.content} />
                    ) : (
                      <AssistantMessage content={message.content} />
                    )}
                    <div className='mt-1 text-xs opacity-80'>
                      {new Date().toLocaleTimeString([], { timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className='border-base-content/10 space-y-2 border-t p-2'>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }}
                className='flex gap-2'
              >
                <input
                  type='text'
                  value={inputValue}
                  onChange={(e) => setInputValue(e.currentTarget.value)}
                  placeholder='Ask about Aleksa...'
                  disabled={isLoading || userMessageCount >= MESSAGE_LIMIT}
                  className='bg-base-100 text-base-content placeholder:text-base-content/50 border-base-300 focus-visible:outline-secondary w-full rounded-xl border px-4 text-base disabled:cursor-not-allowed disabled:opacity-50'
                />
                <Button
                  type='submit'
                  variant='secondary'
                  size='icon'
                  disabled={isLoading || userMessageCount >= MESSAGE_LIMIT}
                  className='shrink-0 rounded-xl'
                >
                  {isLoading ? <LoaderCircle class='animate-spin' /> : <Send class='size-5' />}
                </Button>
              </form>
              <div className='flex items-center justify-between px-1 text-xs'>
                <span className={`text-base-content/85 ${userMessageCount >= MESSAGE_LIMIT ? 'text-error' : ''}`}>
                  {userMessageCount}/{MESSAGE_LIMIT} today
                </span>
                <span className='text-base-content/85 text-right'>AI can make mistakes.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
