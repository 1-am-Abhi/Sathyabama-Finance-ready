import React, { useState, useEffect, useRef } from 'react';
import { Brain, Send, X, Bot, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { getChatResponse } from '../../services/aiService';

const AIAssistantWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I'm your Sathyabama AI Assistant. How can I help you today? I can summarize proposals, analyze budgets, or help with research trends." }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await getChatResponse(input);
            setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting to the demo service." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform duration-300 relative group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 animate-pulse group-hover:bg-white/30 transition-colors"></div>
                    <Brain className="w-8 h-8 relative z-10" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-bounce"></div>
                </button>
            ) : (
                <Card className="w-80 md:w-96 h-[500px] border-0 shadow-2xl bg-slate-900 ring-1 ring-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                    <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/5 p-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg ring-1 ring-indigo-500/30">
                                <Brain className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold text-white uppercase tracking-tighter italic">Sathyabama AI</CardTitle>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Demo Online</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/5 h-8 w-8 rounded-full">
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-slate-900/50">
                        <div 
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/5"
                        >
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`p-1.5 rounded-lg flex-shrink-0 h-fit ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-indigo-400 border border-white/5'}`}>
                                            {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className={`p-3 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none'}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1 items-center">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-0"></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-300"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 bg-slate-900 border-t border-white/5">
                            <div className="relative flex items-center gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Type your question..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className="p-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-[10px] text-center text-slate-600 mt-2 uppercase tracking-widest font-black">Powered by Sathyabama Demo AI</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AIAssistantWidget;
