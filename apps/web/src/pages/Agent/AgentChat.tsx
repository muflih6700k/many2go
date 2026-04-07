import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';
import { messages as messagesApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import toast from 'react-hot-toast';
import { PaperPlane, User, MessageCircle, ChevronLeft } from 'lucide-react';

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

interface Customer {
  id: string;
  name: string;
  email: string;
  lastMessage?: Message;
  unreadCount: number;
}

export default function AgentChat() {
  const { user } = useAuth();
  const { isConnected, receivedMessage, sendMessage } = useSocket();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch customers with conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const conversationsRes = await messagesApi.getConversations();
        if (conversationsRes.data?.data) {
          const conversationData = conversationsRes.data.data.map((conv: any) => ({
            id: conv.partner.id,
            name: conv.partner.name,
            email: conv.partner.email,
            lastMessage: conv.lastMessage,
            unreadCount: conv.unreadCount,
          }));
          setCustomers(conversationData);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Load messages when customer selected
  useEffect(() => {
    if (!selectedCustomer) return;
    
    const fetchMessages = async () => {
      try {
        const res = await messagesApi.getConversation(selectedCustomer.id);
        if (res.data?.data) {
          setMessages(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    fetchMessages();
  }, [selectedCustomer]);

  // Handle incoming messages via socket
  useEffect(() => {
    if (!receivedMessage) return;
    
    // Add to conversation if customer is selected
    if (selectedCustomer && 
        (receivedMessage.senderId === selectedCustomer.id || 
         receivedMessage.recipientId === selectedCustomer.id)) {
      setMessages((prev) => {
        if (prev.find(m => m.id === receivedMessage.id)) return prev;
        return [...prev, receivedMessage];
      });
    }
    
    // Update customer conversation list
    setCustomers((prev) => {
      const senderId = receivedMessage.senderId;
      const existingCustomer = prev.find(c => c.id === senderId);
      
      if (!existingCustomer && receivedMessage.sender) {
        // New customer conversation
        return [{
          id: receivedMessage.sender.id,
          name: receivedMessage.sender.name,
          email: receivedMessage.sender.email,
          lastMessage: receivedMessage,
          unreadCount: 1,
        }, ...prev];
      }
      
      return prev.map(c => {
        if (c.id === senderId) {
          return {
            ...c,
            lastMessage: receivedMessage,
            unreadCount: selectedCustomer?.id === senderId ? 0 : c.unreadCount + 1,
          };
        }
        return c;
      });
    });
  }, [receivedMessage, selectedCustomer]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsMobileChatOpen(true);
    // Mark as read in UI
    setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, unreadCount: 0 } : c));
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !selectedCustomer) return;

    const body = inputValue.trim();
    setInputValue('');

    // Send via socket
    const sentViaSocket = sendMessage(selectedCustomer.id, body);

    if (!sentViaSocket) {
      try {
        await messagesApi.create({ recipientId: selectedCustomer.id, body });
      } catch (error) {
        toast.error('Failed to send message');
        setInputValue(body);
      }
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <PageHeader title="Customer Chat" subtitle="Reply to customer messages in real-time" />

      <div className="flex-1 flex overflow-hidden bg-white rounded-xl shadow-sm border mt-6">
        {/* Left Panel - Customer List */}
        <div className={`w-full lg:w-80 border-r bg-gray-50 flex flex-col ${isMobileChatOpen ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b bg-white">
            <h3 className="font-medium text-gray-900">Conversations</h3>
            <p className="text-sm text-gray-500">{customers.length} customers</p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : customers.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No conversations yet</p>
              </div>
            ) : (
              customers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-white transition-colors border-b ${
                    selectedCustomer?.id === customer.id ? 'bg-white border-l-4 border-l-[#0D9488]' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary-700">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 truncate">{customer.name}</span>
                      {customer.unreadCount > 0 && (
                        <span className="bg-[#0D9488] text-white text-xs font-medium px-2 py-0.5 rounded-full">
                          {customer.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {customer.lastMessage?.body || 'No messages yet'}
                    </p>
                    {customer.lastMessage && (
                      <span className="text-xs text-gray-400">
                        {formatDate(customer.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className={`flex-1 flex flex-col ${!isMobileChatOpen ? 'hidden lg:flex' : 'flex'}`}>
          {!selectedCustomer ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium text-gray-600">Select a customer to view conversation</p>
              <p className="text-sm">Click on any customer from the list</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="bg-gray-50 border-b px-4 py-3 flex items-center gap-3">
                <button 
                  onClick={() => setIsMobileChatOpen(false)}
                  className="lg:hidden p-1 hover:bg-gray-200 rounded"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-700">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{selectedCustomer.name}</h4>
                  <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-500'}`}>
                    {isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <User className="w-12 h-12 mx-auto mb-3" />
                      <p>Start the conversation</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isAgent = msg.senderId === user?.id;
                    
                    return (
                      <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${isAgent ? 'flex-row-reverse' : 'flex-row'} flex items-end gap-2`}>
                          {!isAgent && (
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-primary-700">
                                {selectedCustomer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className={`px-4 py-2 rounded-2xl ${
                            isAgent 
                              ? 'bg-[#0D9488] text-white rounded-br-sm' 
                              : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border'
                          }`}>
                            <p className="text-sm">{msg.body}</p>
                            <span className={`text-xs mt-1 block ${isAgent ? 'text-teal-100' : 'text-gray-400'}`}>
                              {formatTime(msg.createdAt)}
                              {isAgent && <span className="ml-1">{msg.readAt ? '✓✓' : '✓'}</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your reply..."
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
