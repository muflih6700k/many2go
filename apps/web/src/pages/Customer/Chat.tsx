import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, messages as messagesApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import toast from 'react-hot-toast';
import { PaperPlane, Circle, User } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt?: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Agent {
  id: string;
  name: string;
  email: string;
}

export default function Chat() {
  const { user } = useAuth();
  const { isConnected, messages, receivedMessage, sendMessage } = useSocket();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch assigned agent and message history
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Try to find assigned agent from user data or fetch a default one
        // In production, you'd have an assignedAgent field
        const usersRes = await usersApi.getAll('AGENT');
        if (usersRes.data?.data && usersRes.data.data.length > 0) {
          setAgent(usersRes.data.data[0]);
          
          // Load message history with this agent
          const messagesRes = await messagesApi.getConversation(usersRes.data.data[0].id);
          if (messagesRes.data?.data) {
            setHistory(messagesRes.data.data);
          }
        }
      } catch (error) {
        console.error('Failed to load chat data:', error);
        toast.error('Failed to load chat');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Merge socket messages with history
  useEffect(() => {
    if (receivedMessage) {
      setHistory((prev) => {
        // Avoid duplicates
        if (prev.find((m) => m.id === receivedMessage.id)) return prev;
        return [...prev, receivedMessage];
      });
    }
  }, [receivedMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSend = async () => {
    if (!inputValue.trim() || !agent) return;

    const body = inputValue.trim();
    setInputValue('');

    // Send via socket
    const sentViaSocket = sendMessage(agent.id, body);

    if (!sentViaSocket) {
      // Fallback to API if socket fails
      try {
        await messagesApi.create({ recipientId: agent.id, body });
        toast.success('Message sent');
      } catch (error) {
        toast.error('Failed to send message');
        setInputValue(body); // Restore input
      }
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-gray-500">Loading chat...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <div className="bg-gray-100 rounded-full p-6 mb-4">
          <User className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Agent Available</h2>
        <p className="text-gray-600 text-center max-w-md">
          You don't have an assigned travel agent yet. We'll connect you with one shortly!
        </p>
      </div>
    );
  }

  const allMessages = [...history, ...messages];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <PageHeader title="Chat with Your Agent" subtitle="Get instant help with your travel plans" />

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col mt-6">
        {/* Header - Agent Info */}
        <div className="bg-gray-50 border-b px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center relative">
            <span className="text-lg font-semibold text-primary-700">
              {agent.name.charAt(0).toUpperCase()}
            </span>
            {isConnected && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{agent.name}</h3>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Circle className={`w-2 h-2 ${isConnected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} />
              <span>{isConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {allMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <PaperPlane className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm">No messages yet</p>
              <p className="text-sm mt-1">Send a message to start chatting</p>
            </div>
          ) : (
            allMessages.map((msg, index) => {
              const isCustomer = msg.senderId === user?.id;
              const showAvatar = index === 0 || allMessages[index - 1].senderId !== msg.senderId;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] ${isCustomer ? 'flex-row-reverse' : 'flex-row'} flex items-end gap-2`}
                  >
                    {showAvatar && !isCustomer && (
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary-700">
                          {msg.sender?.name?.charAt(0) || 'A'}
                        </span>
                      </div>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isCustomer
                          ? 'bg-[#0D9488] text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border'
                      }`}
                    >
                      <p className="text-sm">{msg.body}</p>
                      <span
                        className={`text-xs mt-1 block ${
                          isCustomer ? 'text-teal-100' : 'text-gray-400'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                        {isCustomer && (
                          <span className="ml-1">
                            {msg.readAt ? '✓✓' : '✓'}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || !isConnected}
              className="w-10 h-10 bg-[#0D9488] rounded-full flex items-center justify-center text-white hover:bg-[#0f766e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PaperPlane className="w-5 h-5" />
            </button>
          </div>
          {!isConnected && (
            <p className="text-xs text-red-500 mt-2 text-center">
              Not connected to chat server. Please refresh the page.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
