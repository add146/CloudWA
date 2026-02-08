'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Smile, Paperclip, MoreVertical, Search, Phone, Video, FileText, Zap, StickyNote, Trash2, Archive, Pin, Bell, Settings } from 'lucide-react';

interface Chat {
    id: string;
    name: string;
    picture?: string;
    lastMessage?: {
        body: string;
        timestamp: number;
        fromMe: boolean;
        hasMedia: boolean;
    };
    unreadCount: number;
    isGroup: boolean;
}

interface Message {
    id: string;
    timestamp: number;
    from: string;
    fromMe: boolean;
    body: string;
    hasMedia: boolean;
    media?: {
        url: string;
        mimetype: string;
        filename?: string;
    };
    ack?: string;
}

type TabFilter = 'open' | 'mine' | 'new' | 'closed';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudwa-flow.khibroh.workers.dev';

export default function ChatPage() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabFilter>('open');
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    useEffect(() => {
        loadChats();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadChats = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_URL}/api/chats`, {
                headers: getAuthHeaders()
            });

            const data = await response.json();
            if (data.success) {
                setChats(data.data || []);
            } else {
                setError(data.error || 'Failed to load chats');
            }
        } catch (err: any) {
            console.error('Error loading chats:', err);
            setError(err.message || 'Failed to load chats');
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (chatId: string) => {
        try {
            setMessagesLoading(true);
            const response = await fetch(`${API_URL}/api/chats/${encodeURIComponent(chatId)}/messages`, {
                headers: getAuthHeaders()
            });

            const data = await response.json();
            if (data.success) {
                // Messages come in reverse chronological order, reverse for display
                setMessages((data.data || []).reverse());
            }
        } catch (err) {
            console.error('Error loading messages:', err);
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleSelectChat = (chat: Chat) => {
        setSelectedChat(chat);
        loadMessages(chat.id);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || sending) return;

        const messageText = newMessage;
        setNewMessage('');
        setSending(true);

        // Optimistic update
        const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            timestamp: Date.now() / 1000,
            from: 'me',
            fromMe: true,
            body: messageText,
            hasMedia: false,
            ack: 'PENDING'
        };
        setMessages(prev => [...prev, tempMessage]);

        try {
            const response = await fetch(`${API_URL}/api/chats/${encodeURIComponent(selectedChat.id)}/send`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ message: messageText })
            });

            const data = await response.json();
            if (!data.success) {
                // Remove optimistic message on failure
                setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
                alert('Failed to send message: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error sending message:', err);
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return formatTime(timestamp);
        if (days === 1) return 'Yesterday';
        if (days < 7) return date.toLocaleDateString('id-ID', { weekday: 'short' });
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    };

    const filteredChats = chats.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Tab counts (simplified for now - can be enhanced with backend support)
    const tabCounts = {
        open: chats.length,
        mine: chats.filter(c => c.unreadCount > 0).length,
        new: chats.filter(c => c.unreadCount > 0).length,
        closed: 0
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Left Panel - Chat List */}
            <div className="w-80 border-r flex flex-col bg-white">
                {/* Header */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            Chats
                            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                                {chats.length}
                            </span>
                        </h2>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b px-2 py-1 gap-1">
                    {(['open', 'mine', 'new', 'closed'] as TabFilter[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${activeTab === tab
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {tab}
                            {tabCounts[tab] > 0 && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab ? 'bg-white/20' : 'bg-gray-200'
                                    }`}>
                                    {tabCounts[tab]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-32 text-gray-500">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 text-center text-red-500 text-sm">
                            <p>{error}</p>
                            <button
                                onClick={loadChats}
                                className="mt-2 text-blue-600 hover:underline"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">No chats yet</p>
                            <p className="text-sm mt-1">Conversations will appear here</p>
                        </div>
                    ) : (
                        filteredChats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => handleSelectChat(chat)}
                                className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Avatar */}
                                    <div className="relative">
                                        {chat.picture ? (
                                            <img
                                                src={chat.picture}
                                                alt={chat.name}
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                                {chat.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                        )}
                                        {chat.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                {chat.unreadCount}
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-medium text-sm truncate">{chat.name}</h3>
                                            {chat.lastMessage && (
                                                <span className="text-xs text-gray-400">
                                                    {formatDate(chat.lastMessage.timestamp)}
                                                </span>
                                            )}
                                        </div>
                                        {chat.lastMessage && (
                                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                                {chat.lastMessage.fromMe && '✓ '}
                                                {chat.lastMessage.body || (chat.lastMessage.hasMedia ? '📎 Media' : '')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {filteredChats.length > 0 && (
                    <div className="p-3 border-t flex justify-center gap-1">
                        {[1, 2, 3, 4].map((page) => (
                            <button
                                key={page}
                                className={`w-7 h-7 text-xs rounded-full ${page === 1
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                        <span className="w-7 h-7 flex items-center justify-center text-gray-400">...</span>
                    </div>
                )}
            </div>

            {/* Center Panel - Conversation */}
            <div className="flex-1 flex flex-col bg-gray-50">
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-white px-4 py-3 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {selectedChat.picture ? (
                                    <img
                                        src={selectedChat.picture}
                                        alt={selectedChat.name}
                                        className="h-10 w-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                        {selectedChat.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold">{selectedChat.name}</h3>
                                    <p className="text-xs text-gray-500">
                                        {selectedChat.id.split('@')[0]}
                                    </p>
                                </div>
                                <span className="ml-2 bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">
                                    YOU CAN REPLY ONLY WITH TEMPLATE
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                                    <Phone className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                                    <Video className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                                    <MoreVertical className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messagesLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <div className="text-center">
                                        <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                        <p>No messages yet</p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.fromMe
                                                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-br-sm'
                                                    : 'bg-white shadow-sm rounded-bl-sm'
                                                }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                                            <div className={`flex items-center justify-end gap-1 mt-1 ${msg.fromMe ? 'text-white/70' : 'text-gray-400'
                                                }`}>
                                                <span className="text-xs">{formatTime(msg.timestamp)}</span>
                                                {msg.fromMe && (
                                                    <span className="text-xs">
                                                        {msg.ack === 'READ' ? '✓✓' : msg.ack === 'DEVICE' ? '✓✓' : '✓'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Action Buttons */}
                        <div className="bg-white border-t px-4 py-2 flex gap-2">
                            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition">
                                <MessageCircle className="h-4 w-4" />
                                Reply
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition">
                                <FileText className="h-4 w-4" />
                                Documents
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-purple-600 hover:bg-purple-50 transition">
                                <Zap className="h-4 w-4" />
                                Quick replies
                            </button>
                        </div>

                        {/* Message Input */}
                        <div className="bg-white border-t p-4">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                <button type="button" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                                    <Smile className="h-5 w-5" />
                                </button>
                                <input
                                    type="text"
                                    placeholder="Type your message here"
                                    className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    disabled={sending}
                                />
                                <button type="button" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                                    <Paperclip className="h-5 w-5" />
                                </button>
                                <button
                                    type="submit"
                                    disabled={sending || !newMessage.trim()}
                                    className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                        <div className="text-center">
                            <div className="h-24 w-24 mx-auto mb-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                                <MessageCircle className="h-12 w-12 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800">Select a conversation</h3>
                            <p className="text-gray-500 mt-2">Choose a chat from the list to start messaging</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel - Quick Actions */}
            <div className="w-14 bg-white border-l flex flex-col items-center py-4 gap-3">
                <button className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition">
                    <MessageCircle className="h-5 w-5" />
                </button>
                <button className="p-2.5 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition">
                    <Zap className="h-5 w-5" />
                </button>
                <button className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition">
                    <Paperclip className="h-5 w-5" />
                </button>
                <button className="p-2.5 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition">
                    <FileText className="h-5 w-5" />
                </button>
                <button className="p-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition">
                    <Archive className="h-5 w-5" />
                </button>
                <button className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition">
                    <StickyNote className="h-5 w-5" />
                </button>
                <button className="p-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition">
                    <Pin className="h-5 w-5" />
                </button>

                <div className="flex-1"></div>

                <button className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition">
                    <Bell className="h-5 w-5" />
                </button>
                <button className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition">
                    <Trash2 className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
