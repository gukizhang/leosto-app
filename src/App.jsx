import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, Briefcase, Plus, Search, Wallet, TrendingUp, X, 
  ChevronLeft, CheckCircle2, Circle, UploadCloud, Paperclip, Archive, 
  Save, MessageSquarePlus, Trash2, Users, UserCircle, FileText, Image as ImageIcon, ChevronDown,
  PenTool, Printer, FileCheck, Receipt, GripVertical, Bot, Clock, Send, Sparkles, Loader2, CloudOff,
  Lock, LogOut, Globe, Database
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// ==========================================
// 🔴 SUPABASE / GEMINI 配置区（通过 .env 注入）
// ==========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 智能判定：如果尚未配置密钥，则进入本地模拟模式(方便预览)
const isMockMode = !supabaseUrl || !supabaseAnonKey;
const supabase = isMockMode ? null : createClient(supabaseUrl, supabaseAnonKey);

// --- Gemini API 封装 ---
const callGeminiAPI = async (prompt, systemInstruction = "", schema = null) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; // 执行环境注入
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  if (systemInstruction) payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  if (schema) payload.generationConfig = { responseMimeType: "application/json", responseSchema: schema };

  let retries = 5; let delay = 1000; let lastError = null;
  while (retries > 0) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (e) {
      lastError = e; retries--; if (retries === 0) break; await new Promise(r => setTimeout(r, delay)); delay *= 2;
    }
  }
  throw lastError;
};

// --- 常量与初始数据配置 ---
const initialClients = ['星辰科技', '优品购', '悦动体育', '远洋国际', '字节跳动'];
const initialContacts = [
  { id: 'c1', name: '张总 (13800000001)', client: '星辰科技' },
  { id: 'c2', name: '李经理', client: '优品购' }
];
const initialDesigners = ['Alex 视觉指导', 'Sarah UI专家', 'Leo 动效师', 'Niko 插画师'];

const initialProjects = [
  { 
    id: 1, name: '品牌视觉系统升级', client: '星辰科技', contact: '张总 (13800000001)', leadDesigner: 'Alex 视觉指导',
    poStatus: '已提PO', status: '进行中', totalAmount: 50000, paidAmount: 20000, date: '2026-03-01', deadline: '2026-03-25',
    tasks: [
      { id: 101, title: '概念方向提案', isCompleted: true, unitPrice: 15000, quantity: 1, dueDate: '2026-03-05', attachments: [] },
      { id: 102, title: '核心Logo设计', isCompleted: false, unitPrice: 20000, quantity: 1, dueDate: '2026-03-15', attachments: [] }
    ],
    supportRecords: []
  }
];

const STATUS_COLORS = { '沟通中': 'bg-gray-100 text-gray-700', '进行中': 'bg-blue-100 text-blue-700', '待结算': 'bg-yellow-100 text-yellow-700', '已完成': 'bg-green-100 text-green-700', '已暂停': 'bg-red-100 text-red-700' };
const STATUS_OPTIONS = ['沟通中', '进行中', '待结算', '已完成', '已暂停'];
const PO_OPTIONS = ['未提PO', '已提PO'];

const isArchived = (p) => p.status === '已完成' && p.poStatus === '已提PO' && p.totalAmount > 0 && p.paidAmount >= p.totalAmount && (!p.tasks || p.tasks.length === 0 || p.tasks.every(t => t.isCompleted));
const getCountdown = (deadline) => {
  if (!deadline) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline); dl.setHours(0, 0, 0, 0);
  return Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
};

// --- 通用 UI 组件 ---
const CountdownBadge = ({ deadline }) => {
  const days = getCountdown(deadline);
  if (days === null) return <span className="text-slate-400 text-xs">-</span>;
  if (days < 0) return <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">超期 {Math.abs(days)} 天</span>;
  if (days <= 3) return <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">仅剩 {days} 天</span>;
  return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">余 {days} 天</span>;
};

const ProgressBar = ({ label, percent, colorClass }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <div className="flex justify-between text-xs font-medium text-slate-500"><span>{label}</span><span>{Math.round(percent)}%</span></div>
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"><div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${percent}%` }}></div></div>
  </div>
);

const AutocompleteInput = ({ value, onChange, options, onAdd, placeholder, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  useEffect(() => { setInputValue(value || ''); }, [value]);

  const filteredOptions = options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()));
  const isExactMatch = options.some(o => o.toLowerCase() === inputValue.toLowerCase());

  const handleSelect = (val) => { setInputValue(val); onChange(val); setIsOpen(false); };
  const handleCreateNew = () => { if (window.confirm(`"${inputValue}" 目前不存在，是否将其新建入库？`)) { onAdd(inputValue); handleSelect(inputValue); } else { setIsOpen(false); } };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input type="text" value={inputValue} placeholder={placeholder} disabled={disabled} onChange={(e) => { setInputValue(e.target.value); setIsOpen(true); }} onFocus={() => { if(!disabled) setIsOpen(true); }} onBlur={() => setTimeout(() => setIsOpen(false), 200)} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none pr-8 ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`} />
        <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 shadow-lg rounded-lg z-50 max-h-48 overflow-y-auto py-1">
          {filteredOptions.length > 0 ? filteredOptions.map(opt => <div key={opt} onClick={() => handleSelect(opt)} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700">{opt}</div>) : inputValue && !isExactMatch ? null : <div className="px-4 py-2 text-sm text-slate-400 italic">无匹配记录</div>}
          {inputValue && !isExactMatch && <div onClick={handleCreateNew} className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-indigo-600 border-t border-slate-100 flex items-center gap-2"><Plus size={14} /> 新建: "{inputValue}"</div>}
        </div>
      )}
    </div>
  );
};

// --- 安全与认证：Supabase 双轨登录界面组件 ---
const LoginScreen = ({ onLogin, onGoogleLogin, error, isLoading }) => {
  const [loginMethod, setLoginMethod] = useState('password'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[24px] shadow-2xl shadow-indigo-100/50 p-8 border border-slate-100 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
            {loginMethod === 'password' ? <Lock size={32} className="text-white" /> : <Globe size={32} className="text-white" />}
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">LeostoDesign</h1>
          <p className="text-sm text-slate-500 mt-2">私有化部署核心枢纽</p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
          <button onClick={() => setLoginMethod('password')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${loginMethod === 'password' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Lock size={16} /> 账号登录 (国内)</button>
          <button onClick={() => setLoginMethod('google')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${loginMethod === 'google' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Globe size={16} /> Google (海外)</button>
        </div>

        {loginMethod === 'password' ? (
          <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">管理员账号 (Email)</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" placeholder="admin@leosto.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">登录密码</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" placeholder="••••••••" />
            </div>
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
            <button type="submit" disabled={isLoading} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex justify-center items-center gap-2">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : '安全登录系统'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner border border-blue-100"><Globe size={40} /></div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">使用 Google 账号登录</h3>
            <p className="text-sm text-slate-500 text-center mb-8 px-4">适用于海外网络环境团队成员。配置 Supabase Auth 开启。</p>
            {error && <div className="w-full p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 mb-4">{error}</div>}
            <button onClick={onGoogleLogin} disabled={isLoading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold tracking-wide transition-all shadow-md disabled:opacity-70 flex justify-center items-center gap-2">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : '立即使用 Google 登录'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- AI Chat 组件 ---
const AIChatBox = ({ projects }) => {
  const [messages, setMessages] = useState([{ role: 'ai', text: '你好！我是 Leosto AI 项目管家 ✨。我已经读取了当前的全部项目数据。您可以问我：“哪些项目快逾期了？”、“某客户还欠多少尾款？”。' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if(!input.trim() || isLoading) return;
    const userQuery = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setInput(''); setIsLoading(true);

    try {
      const projectContext = projects.map(p => ({ 名称: p.name, 客户: p.client, 状态: p.status, 总金额: p.totalAmount, 已付: p.paidAmount, 未结尾款: p.totalAmount - p.paidAmount, 交付期限: p.deadline, 负责人: p.leadDesigner }));
      const sysPrompt = `你是一个名为 Leosto AI 的资深设计项目管理助理。以下是当前系统中的实时项目数据：\n${JSON.stringify(projectContext)}\n\n请根据这些数据精准回答用户的问题。简明扼要、专业有条理。`;
      const responseText = await callGeminiAPI(`用户提问: ${userQuery}`, sysPrompt);
      setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'AI 引擎暂时无法连接。' }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-80">
      <div className="p-4 border-b border-slate-100 bg-indigo-50/50 flex items-center gap-2"><Bot size={20} className="text-indigo-600" /><span className="font-bold text-slate-700 text-sm">Leosto AI 项目管家 <Sparkles size={14} className="inline text-amber-500 mb-0.5"/></span></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none whitespace-pre-wrap leading-relaxed'}`}>{m.text}</div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><div className="px-4 py-2.5 bg-white border border-slate-100 rounded-2xl rounded-tl-none flex items-center gap-2 text-slate-500 text-sm"><Loader2 size={16} className="animate-spin text-indigo-500" /> 分析中...</div></div>}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white flex gap-2">
        <input disabled={isLoading} type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="向 AI 提问..." className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm bg-slate-50" />
        <button disabled={isLoading} type="submit" className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm w-10 flex items-center justify-center disabled:opacity-50"><Send size={16} /></button>
      </form>
    </div>
  );
};

// --- 管理模块 ---
const SimpleManager = ({ title, icon: Icon, items, onAdd, onDelete, onReorder }) => {
  const [newItem, setNewItem] = useState('');
  const [draggedIdx, setDraggedIdx] = useState(null);

  const handleAdd = (e) => { e.preventDefault(); if (newItem.trim() && !items.includes(newItem.trim())) { onAdd(newItem.trim()); setNewItem(''); } };
  const handleDragStart = (e, idx) => { setDraggedIdx(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e, dropIdx) => {
    e.preventDefault(); if (draggedIdx === null || draggedIdx === dropIdx) return;
    const newItems = [...items]; const [dragged] = newItems.splice(draggedIdx, 1); newItems.splice(dropIdx, 0, dragged);
    onReorder(newItems); setDraggedIdx(null);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Icon size={24} /></div><h2 className="text-xl font-bold text-slate-800">{title}</h2></div>
        <div className="p-6">
          <form onSubmit={handleAdd} className="flex gap-3 mb-6"><input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder={`输入新${title}名称...`} className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none" /><button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium">添加</button></form>
          <div className="flex flex-col gap-2">
            {items.map((item, idx) => (
              <div key={item} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx)} className={`flex items-center justify-between p-3 border rounded-xl transition-colors group ${draggedIdx === idx ? 'opacity-50 border-indigo-300 bg-indigo-50' : 'border-slate-100 hover:border-indigo-100 hover:bg-slate-50 cursor-grab active:cursor-grabbing'}`}>
                <div className="flex items-center gap-3"><GripVertical size={16} className="text-slate-300 group-hover:text-slate-500" /><span className="font-medium text-slate-700">{item}</span></div>
                <button onClick={() => onDelete(item)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
              </div>
            ))}
            {items.length === 0 && <div className="text-center text-slate-400 py-8">暂无数据</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const ContactManager = ({ contacts, clients, onAdd, onDelete, onReorder }) => {
  const [newName, setNewName] = useState('');
  const [selectedClient, setSelectedClient] = useState(clients[0] || '');
  const [draggedIdx, setDraggedIdx] = useState(null);

  const handleAdd = (e) => { e.preventDefault(); if (newName.trim() && selectedClient) { onAdd({ id: Date.now().toString(), name: newName.trim(), client: selectedClient }); setNewName(''); } };
  const handleDrop = (e, dropIdx) => { e.preventDefault(); if (draggedIdx === null || draggedIdx === dropIdx) return; const newItems = [...contacts]; const [dragged] = newItems.splice(draggedIdx, 1); newItems.splice(dropIdx, 0, dragged); onReorder(newItems); setDraggedIdx(null); };

  return (
    <div className="max-w-3xl mx-auto p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><UserCircle size={24} /></div><h2 className="text-xl font-bold text-slate-800">对接人名册</h2></div>
        <div className="p-6">
          <form onSubmit={handleAdd} className="flex gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="w-1/3 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white">{clients.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="输入对接人..." className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium">添加</button>
          </form>
          <div className="flex flex-col gap-2">
            {contacts.map((contact, idx) => (
              <div key={contact.id} draggable onDragStart={() => setDraggedIdx(idx)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, idx)} className={`flex items-center justify-between p-3 border rounded-xl transition-colors group ${draggedIdx === idx ? 'opacity-50 border-indigo-300 bg-indigo-50' : 'border-slate-100 hover:border-indigo-100 hover:bg-slate-50 cursor-grab active:cursor-grabbing'}`}>
                <div className="flex items-center gap-4"><GripVertical size={16} className="text-slate-300 group-hover:text-slate-500" /><span className="font-medium text-slate-700 min-w-[120px]">{contact.name}</span><span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-md border border-slate-200">{contact.client}</span></div>
                <button onClick={() => onDelete(contact.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 打印视图组件 ---
const FinalReportView = ({ project, onBack }) => {
  return (
    <div className="min-h-screen bg-slate-100 py-10 print:py-0 print:bg-white flex justify-center">
      <div className="w-[210mm] min-h-[297mm] bg-white p-[20mm] shadow-2xl print:shadow-none animate-in fade-in zoom-in-95 duration-300 relative">
        <div className="print:hidden absolute top-4 left-4 flex gap-4">
          <button onClick={onBack} className="flex items-center text-slate-500 hover:text-indigo-600 px-4 py-2 bg-white rounded-lg shadow-sm border"><ChevronLeft size={16} className="mr-1"/> 返回</button>
          <button onClick={() => window.print()} className="flex items-center text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm"><Printer size={16} className="mr-2"/> 打印 / 导出 PDF</button>
        </div>
        <div className="border-b-2 border-slate-800 pb-6 mb-8 mt-8 print:mt-0">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight text-center mb-6">项目结案报告</h1>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div className="flex"><span className="text-slate-500 w-24">项目名称：</span><span className="font-bold text-slate-800">{project.name}</span></div>
            <div className="flex"><span className="text-slate-500 w-24">客户名称：</span><span className="font-bold text-slate-800">{project.client}</span></div>
            <div className="flex"><span className="text-slate-500 w-24">主创设计师：</span><span className="font-bold text-slate-800">{project.leadDesigner || '未指派'}</span></div>
            <div className="flex"><span className="text-slate-500 w-24">出具日期：</span><span className="font-bold text-slate-800">{new Date().toLocaleDateString()}</span></div>
          </div>
        </div>
        <div className="space-y-10">
          {project.tasks.filter(t => t.isCompleted || (t.attachments && t.attachments.length > 0)).map((task, idx) => (
            <div key={task.id} className="break-inside-avoid">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-l-4 border-indigo-500 pl-3"><span className="text-indigo-500">{idx + 1}.</span> {task.title}</h3>
              {task.attachments && task.attachments.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 pl-8">
                  {task.attachments.map(att => (
                    <div key={att.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-2">
                      {att.type === 'image' && att.url ? <img src={att.url} alt={att.name} className="w-full h-48 object-cover rounded-md border border-slate-100 mb-2" /> : <div className="w-full h-32 flex flex-col items-center justify-center bg-white rounded-md border border-slate-100 mb-2">{att.type === 'pdf' ? <FileText size={32} className="text-red-400 mb-2" /> : <Paperclip size={32} className="text-slate-400 mb-2" />}<span className="text-xs font-medium text-slate-500 px-4 text-center line-clamp-2">{att.name}</span></div>}
                      <p className="text-xs text-center text-slate-600 truncate px-2">{att.name}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500 pl-8 italic">已完成工作，暂未上传成果预览图</p>}
            </div>
          ))}
        </div>
        <div className="mt-20 pt-8 border-t border-slate-200 flex justify-between text-sm">
          <div><p className="text-slate-500 mb-8">客户确认 (签字/盖章)：</p><p>日期：_____年___月___日</p></div>
          <div><p className="text-slate-500 mb-8">执行方 (签字/盖章)：</p><p>日期：_____年___月___日</p></div>
        </div>
      </div>
    </div>
  );
};

const SettlementListView = ({ project, onBack }) => {
  const taskTotal = project.tasks.reduce((sum, task) => sum + (task.unitPrice * task.quantity), 0);
  const taxAmount = taskTotal * 0.01; const grandTotal = taskTotal + taxAmount;
  return (
    <div className="min-h-screen bg-slate-100 py-10 print:py-0 print:bg-white flex justify-center">
      <div className="w-[210mm] min-h-[297mm] bg-white p-[20mm] shadow-2xl print:shadow-none animate-in fade-in zoom-in-95 duration-300 relative flex flex-col">
        <div className="print:hidden absolute top-4 left-4 flex gap-4">
          <button onClick={onBack} className="flex items-center text-slate-500 hover:text-indigo-600 px-4 py-2 bg-white rounded-lg shadow-sm border"><ChevronLeft size={16} className="mr-1"/> 返回</button>
          <button onClick={() => window.print()} className="flex items-center text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm"><Printer size={16} className="mr-2"/> 打印 / 导出 PDF</button>
        </div>
        <div className="text-center mb-12 mt-8 print:mt-0">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">项目结算清单</h1>
          <p className="text-slate-500 mt-2">LeostoDesign / 结算与对账凭证</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 grid grid-cols-2 gap-y-4 text-sm">
            <div className="flex"><span className="text-slate-500 w-24">项目名称：</span><span className="font-bold text-slate-800">{project.name}</span></div>
            <div className="flex"><span className="text-slate-500 w-24">项目编号：</span><span className="font-bold text-slate-800">NO.{project.id}</span></div>
            <div className="flex"><span className="text-slate-500 w-24">客户名称：</span><span className="font-bold text-slate-800">{project.client}</span></div>
            <div className="flex"><span className="text-slate-500 w-24">立项时间：</span><span className="font-bold text-slate-800">{project.date}</span></div>
            <div className="flex"><span className="text-slate-500 w-24">对接人：</span><span className="font-bold text-slate-800">{project.contact || '-'}</span></div>
            <div className="flex"><span className="text-slate-500 w-24">主创设计师：</span><span className="font-bold text-slate-800">{project.leadDesigner || '-'}</span></div>
        </div>
        <table className="w-full text-left border-collapse mb-8">
          <thead>
            <tr className="bg-slate-800 text-white text-sm">
              <th className="px-4 py-3 font-medium rounded-tl-lg">序号</th><th className="px-4 py-3 font-medium">工作内容</th>
              <th className="px-4 py-3 font-medium text-right">单价 (¥)</th><th className="px-4 py-3 font-medium text-right">数量</th>
              <th className="px-4 py-3 font-medium text-right rounded-tr-lg">单项金额 (¥)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 border-b border-slate-200">
            {project.tasks.map((task, idx) => (
              <tr key={task.id} className="text-sm">
                <td className="px-4 py-4 text-slate-500">{idx + 1}</td><td className="px-4 py-4 font-medium text-slate-800">{task.title}</td>
                <td className="px-4 py-4 text-right text-slate-600">{Number(task.unitPrice).toLocaleString()}</td><td className="px-4 py-4 text-right text-slate-600">{task.quantity}</td>
                <td className="px-4 py-4 text-right font-medium text-slate-800">{(task.unitPrice * task.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mb-16">
          <div className="w-72 space-y-3 text-sm">
            <div className="flex justify-between text-slate-600"><span>合计金额：</span><span>¥ {taskTotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-slate-600 pb-3 border-b border-slate-200"><span>税费 (1%)：</span><span>¥ {taxAmount.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-lg text-slate-900 pt-1"><span>总计应收：</span><span>¥ {grandTotal.toLocaleString()}</span></div>
            {project.paidAmount > 0 && <div className="flex justify-between text-emerald-600 pt-2 text-xs"><span>减：已收账款：</span><span>- ¥ {Number(project.paidAmount).toLocaleString()}</span></div>}
            {project.paidAmount > 0 && <div className="flex justify-between font-bold text-amber-600 pt-1 text-base"><span>本期应结尾款：</span><span>¥ {(grandTotal - project.paidAmount).toLocaleString()}</span></div>}
          </div>
        </div>
        <div className="mt-auto pt-8 border-t border-slate-200 text-sm text-slate-500 flex justify-between">
          <p>请核对上述清单内容，如有疑问请于3个工作日内联系。</p><p>开户行及账号信息另附。</p>
        </div>
      </div>
    </div>
  );
};


// --- 项目详情组件 ---
const ProjectDetail = ({ project, onSave, onBack, onShowReport, onShowSettlement, clients, contacts, designers, onAddClient, onAddContact, onAddDesigner }) => {
  const [editData, setEditData] = useState({ ...project });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newSupportContent, setNewSupportContent] = useState('');
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const fileInputRef = useRef(null);
  const [activeUploadTaskId, setActiveUploadTaskId] = useState(null);

  const availableContacts = useMemo(() => { return contacts.filter(c => c.client === editData.client).map(c => c.name); }, [contacts, editData.client]);
  useEffect(() => { if (editData.contact && !availableContacts.includes(editData.contact)) { setEditData(prev => ({ ...prev, contact: '' })); } }, [editData.client, availableContacts]);

  const progressStats = useMemo(() => {
    const poPercent = editData.poStatus === '已提PO' ? 100 : 0;
    const settlePercent = editData.totalAmount > 0 ? Math.min((editData.paidAmount / editData.totalAmount) * 100, 100) : 0;
    const taskPercent = editData.tasks.length > 0 ? (editData.tasks.filter(t => t.isCompleted).length / editData.tasks.length) * 100 : 0;
    return { poPercent, settlePercent, taskPercent };
  }, [editData]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0 && activeUploadTaskId) {
      const newAttachments = await Promise.all(files.map(async file => {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => { resolve({ id: Date.now() + Math.random().toString(), name: file.name, type: isImage ? 'image' : (isPdf ? 'pdf' : 'other'), url: reader.result }); };
          if(isImage) reader.readAsDataURL(file); else resolve({ id: Date.now() + Math.random().toString(), name: file.name, type: isPdf ? 'pdf' : 'other', url: null });
        });
      }));
      setEditData({ ...editData, tasks: editData.tasks.map(t => t.id === activeUploadTaskId ? { ...t, attachments: [...(t.attachments || []), ...newAttachments], isCompleted: true } : t) });
    }
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (taskId, attId) => { setEditData({ ...editData, tasks: editData.tasks.map(t => t.id === taskId ? { ...t, attachments: t.attachments.filter(a => a.id !== attId) } : t) }); };
  const handleAddTask = (e) => { if (e.key === 'Enter' && newTaskTitle.trim()) { setEditData({ ...editData, tasks: [...editData.tasks, { id: Date.now(), title: newTaskTitle, isCompleted: false, unitPrice: 0, quantity: 1, dueDate: '', attachments: [] }] }); setNewTaskTitle(''); } };
  const toggleTask = (taskId) => setEditData({ ...editData, tasks: editData.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t) });
  const deleteTask = (taskId) => setEditData({ ...editData, tasks: editData.tasks.filter(t => t.id !== taskId) });
  const updateTaskField = (taskId, field, value) => setEditData({ ...editData, tasks: editData.tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t) });
  const handleAddSupport = (e) => { if (e.key === 'Enter' && newSupportContent.trim()) { setEditData({ ...editData, supportRecords: [...(editData.supportRecords || []), { id: Date.now(), content: newSupportContent, date: new Date().toISOString().split('T')[0], isCompleted: false }] }); setNewSupportContent(''); } };
  const toggleSupport = (recordId) => setEditData({ ...editData, supportRecords: editData.supportRecords.map(r => r.id === recordId ? { ...r, isCompleted: !r.isCompleted } : r) });
  const deleteSupport = (recordId) => setEditData({ ...editData, supportRecords: editData.supportRecords.filter(r => r.id !== recordId) });

  const handleAITaskBreakdown = async () => {
    setIsGeneratingTasks(true);
    try {
      const schema = { type: "OBJECT", properties: { tasks: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING", description: "具体的专业工作任务名称" }, unitPrice: { type: "INTEGER" }, quantity: { type: "INTEGER" }, daysNeeded: { type: "INTEGER" } } } } } };
      const prompt = `为名为“${editData.name}”的设计项目（客户 ${editData.client}）拆解 3 到 5 个核心专业工作步骤，估算市场单价(RMB)、数量及所需天数。`;
      const resultText = await callGeminiAPI(prompt, "返回符合要求的 JSON 格式", schema);
      const result = JSON.parse(resultText);

      if (result.tasks && result.tasks.length > 0) {
        const newTasks = result.tasks.map((t, idx) => {
          const dDate = new Date(); dDate.setDate(dDate.getDate() + (t.daysNeeded || (idx + 1) * 3));
          return { id: Date.now() + idx, title: t.title + ' ✨', isCompleted: false, unitPrice: t.unitPrice || 0, quantity: t.quantity || 1, dueDate: dDate.toISOString().split('T')[0], attachments: [] };
        });
        setEditData(prev => ({ ...prev, tasks: [...prev.tasks, ...newTasks] }));
      }
    } catch (e) { alert("AI 任务生成失败，请重试。"); } finally { setIsGeneratingTasks(false); }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-2">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors"><ChevronLeft size={20} /> 返回看板</button>
        <div className="flex gap-3">
          <button onClick={() => onShowReport(editData)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium text-sm"><FileCheck size={16}/> 生成结案报告</button>
          <button onClick={() => onShowSettlement(editData)} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium text-sm"><Receipt size={16}/> 生成结算清单</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{editData.name}</h2>
          <p className="text-slate-500 mt-1 flex items-center gap-2"><span>项目编号: #{editData.id}</span><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[editData.status]}`}>{editData.status}</span></p>
        </div>
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="text-right flex-1 md:flex-none bg-slate-50 px-5 py-3 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 font-medium mb-0.5">项目总金额</div>
            <div className="text-3xl font-black text-indigo-600 tracking-tight">¥{Number(editData.totalAmount).toLocaleString()}</div>
          </div>
          <button onClick={() => onSave(editData)} className="bg-indigo-600 hover:bg-indigo-700 text-white h-14 px-6 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"><Save size={20} /> 同步至云端</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8">
        <ProgressBar label="PO 审批状态" percent={progressStats.poPercent} colorClass="bg-blue-500" />
        <ProgressBar label="财务结算进度" percent={progressStats.settlePercent} colorClass="bg-emerald-500" />
        <ProgressBar label="工作交付进度" percent={progressStats.taskPercent} colorClass="bg-indigo-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5 h-fit">
          <h3 className="font-bold text-lg text-slate-800 border-b border-slate-100 pb-3 mb-2 flex items-center gap-2">管理与财务信息</h3>
          <div><label className="text-sm text-slate-500 mb-1 block">客户名称</label><AutocompleteInput value={editData.client} onChange={v => setEditData({...editData, client: v})} options={clients} onAdd={onAddClient} placeholder="选择或新建客户..." /></div>
          <div><label className="text-sm text-slate-500 mb-1 block">对接人</label><AutocompleteInput value={editData.contact} onChange={v => setEditData({...editData, contact: v})} options={availableContacts} onAdd={(name) => onAddContact({id: Date.now().toString(), name, client: editData.client})} placeholder={editData.client ? "选择或新建对接人..." : "请先选择客户"} disabled={!editData.client} /></div>
          <div><label className="text-sm text-slate-500 mb-1 block">主创设计师</label><AutocompleteInput value={editData.leadDesigner} onChange={v => setEditData({...editData, leadDesigner: v})} options={designers} onAdd={onAddDesigner} placeholder="选择主创设计师..." /></div>
          <div><label className="text-sm font-bold text-indigo-600 mb-1 block flex items-center gap-1"><Clock size={14}/> 整体交付期限 (Deadline)</label><input type="date" value={editData.deadline || ''} onChange={e => setEditData({...editData, deadline: e.target.value})} className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-indigo-50/30"/></div>
          
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm text-slate-500 mb-1 block">项目状态</label><select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500/20">{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="text-sm text-slate-500 mb-1 block">PO状态</label><select value={editData.poStatus || '未提PO'} onChange={e => setEditData({...editData, poStatus: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500/20">{PO_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div><label className="text-sm text-slate-500 mb-1 block">总金额 (¥)</label><input type="number" value={editData.totalAmount} onChange={e => setEditData({...editData, totalAmount: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
            <div><label className="text-sm text-slate-500 mb-1 block">已收账款 (¥)</label><input type="number" value={editData.paidAmount} onChange={e => setEditData({...editData, paidAmount: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
          </div>
          {editData.totalAmount > 0 && editData.totalAmount > editData.paidAmount && (
            <div className="p-4 bg-amber-50 text-amber-700 rounded-xl text-sm border border-amber-100 flex justify-between items-center"><span>当前未结尾款:</span><span className="font-bold text-lg">¥{(editData.totalAmount - editData.paidAmount).toLocaleString()}</span></div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
               <h3 className="font-bold text-lg text-slate-800">项目工作清单</h3>
               <button onClick={handleAITaskBreakdown} disabled={isGeneratingTasks} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 font-bold text-xs rounded-lg hover:shadow-md transition-all disabled:opacity-50 border border-amber-200">
                 {isGeneratingTasks ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {isGeneratingTasks ? 'AI 拆解中...' : 'AI 智能清单生成'}
               </button>
            </div>
            
            <div className="space-y-4 mb-4 max-h-[600px] overflow-y-auto pr-2">
              {editData.tasks.map(task => (
                <div key={task.id} className={`p-4 rounded-xl border transition-colors ${task.isCompleted ? 'bg-slate-50 border-slate-200' : 'bg-white border-indigo-100 hover:border-indigo-300'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <button onClick={() => toggleTask(task.id)} className={`mt-0.5 ${task.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}>{task.isCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />}</button>
                      <div className="flex-1">
                        <div className={`font-medium ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.title}</div>
                        <div className="flex flex-wrap items-center gap-4 mt-2 mb-3 bg-white p-2 border border-slate-100 rounded-lg shadow-sm">
                           <div className="flex items-center gap-2"><span className="text-xs text-slate-500">截止</span><input type="date" value={task.dueDate || ''} onChange={(e) => updateTaskField(task.id, 'dueDate', e.target.value)} className="w-32 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400 text-slate-600" /></div>
                           <div className="flex items-center gap-2"><span className="text-xs text-slate-500">单价 ¥</span><input type="number" value={task.unitPrice || 0} onChange={(e) => updateTaskField(task.id, 'unitPrice', Number(e.target.value))} className="w-20 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-indigo-400" /></div>
                           <div className="flex items-center gap-2"><span className="text-xs text-slate-500">数量</span><input type="number" value={task.quantity || 1} onChange={(e) => updateTaskField(task.id, 'quantity', Number(e.target.value))} className="w-16 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-indigo-400" /></div>
                           <div className="text-xs font-bold text-slate-700 ml-auto mr-2">小计 ¥{((task.unitPrice||0) * (task.quantity||1)).toLocaleString()}</div>
                        </div>
                        
                        {task.attachments && task.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {task.attachments.map(att => (
                              <div key={att.id} className="relative group bg-white p-1 border border-slate-200 rounded-lg shadow-sm flex flex-col w-20">
                                {att.type === 'image' && att.url ? <img src={att.url} alt="封面" className="h-14 w-full object-cover rounded bg-slate-100" /> : att.type === 'pdf' ? <div className="h-14 w-full bg-red-50 text-red-500 flex flex-col items-center justify-center rounded border border-red-100"><FileText size={18} /><span className="text-[9px] font-bold mt-0.5">PDF</span></div> : <div className="h-14 w-full bg-slate-100 text-slate-500 flex items-center justify-center rounded border border-slate-200"><Paperclip size={18} /></div>}
                                <div className="text-[10px] text-slate-600 truncate mt-1 text-center" title={att.name}>{att.name}</div>
                                <button onClick={() => removeAttachment(task.id, att.id)} className="absolute -top-1.5 -right-1.5 bg-white rounded-full text-red-500 shadow-md border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"><X size={12}/></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <button onClick={() => { setActiveUploadTaskId(task.id); fileInputRef.current.click(); }} className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors font-medium"><UploadCloud size={16} /> 添加成果</button>
                      <button onClick={() => deleteTask(task.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={handleAddTask} placeholder="输入新任务内容后按回车键添加..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" multiple onChange={handleFileUpload} />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><MessageSquarePlus size={20} className="text-indigo-500"/> 售后支持与反馈记录</h3>
            <div className="space-y-3 mb-4">
              {editData.supportRecords && editData.supportRecords.length === 0 && <p className="text-slate-400 text-sm text-center py-4">暂无售后记录</p>}
              {editData.supportRecords && editData.supportRecords.map(record => (
                <div key={record.id} className="flex gap-3 items-start group">
                  <button onClick={() => toggleSupport(record.id)} className={`mt-0.5 ${record.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}>{record.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}</button>
                  <div className="flex-1"><p className={`text-sm ${record.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{record.content}</p><p className="text-xs text-slate-400 mt-1">{record.date}</p></div>
                  <button onClick={() => deleteSupport(record.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
            <input type="text" value={newSupportContent} onChange={e => setNewSupportContent(e.target.value)} onKeyDown={handleAddSupport} placeholder="输入客户反馈或修改需求，按回车添加..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(!isMockMode); 
  const [loginError, setLoginError] = useState(''); 
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [dbStatus, setDbStatus] = useState(isMockMode ? 'mock' : 'connecting'); 
  
  const [projects, setProjects] = useState(initialProjects);
  const [clients, setClients] = useState(initialClients);
  const [contacts, setContacts] = useState(initialContacts);
  const [designers, setDesigners] = useState(initialDesigners);
  
  const [currentView, setCurrentView] = useState({ type: 'dashboard', projectId: null, data: null }); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('全部');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const defaultDeadline = new Date(); defaultDeadline.setDate(defaultDeadline.getDate() + 30);
  const [formData, setFormData] = useState({ name: '', client: '', contact: '', leadDesigner: '', poStatus: '未提PO', status: '沟通中', totalAmount: '', paidAmount: '', date: new Date().toISOString().split('T')[0], deadline: defaultDeadline.toISOString().split('T')[0] });

  // --- Supabase 认证监听 ---
  useEffect(() => {
    if (isMockMode) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    setIsLoggingIn(true); setLoginError('');
    if (isMockMode) {
      setTimeout(() => { setUser({ email }); setIsLoggingIn(false); }, 800);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError('账号或密码错误，请重试。');
    setIsLoggingIn(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true); setLoginError('');
    if (isMockMode) { alert("此为模拟模式，请直接使用任意账号密码登录"); setIsLoggingIn(false); return; }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setLoginError(`Google 授权失败: ${error.message}`);
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    if (window.confirm("确定要退出系统吗？")) {
      if (isMockMode) setUser(null);
      else await supabase.auth.signOut();
    }
  };

  // --- Supabase 数据拉取与保存 ---
  const fetchSupabaseData = async () => {
    if (isMockMode || !user) return;
    try {
      const { data: pData, error: pErr } = await supabase.from('projects').select('data').eq('user_id', user.id);
      if (pData && pData.length > 0) setProjects(pData.map(r => r.data).sort((a,b) => b.id - a.id));
      
      const { data: mData } = await supabase.from('master_data').select('data').eq('user_id', user.id).eq('id', 'settings').single();
      if (mData && mData.data) {
        setClients(mData.data.clients || []);
        setContacts(mData.data.contacts || []);
        setDesigners(mData.data.designers || []);
      }
      setDbStatus('connected');
    } catch(e) { setDbStatus('error'); }
  };

  useEffect(() => { fetchSupabaseData(); }, [user]);

  const saveToSupabase = async (table, id, dataPayload) => {
    if (isMockMode || !user) return;
    try {
      await supabase.from(table).upsert({ id, user_id: user.id, data: dataPayload });
    } catch(e) { console.error("DB Error", e); }
  };

  // --- 增删改操作 ---
  const addClient = (name) => { if (!clients.includes(name)) { const newC = [...clients, name]; setClients(newC); saveToSupabase('master_data', 'settings', { clients: newC, contacts, designers }); }};
  const deleteClient = (name) => { const newC = clients.filter(c => c !== name); setClients(newC); saveToSupabase('master_data', 'settings', { clients: newC, contacts, designers }); };
  const addContact = (contactObj) => { const newC = [...contacts, contactObj]; setContacts(newC); saveToSupabase('master_data', 'settings', { clients, contacts: newC, designers }); };
  const deleteContact = (id) => { const newC = contacts.filter(c => c.id !== id); setContacts(newC); saveToSupabase('master_data', 'settings', { clients, contacts: newC, designers }); };
  const addDesigner = (name) => { if (!designers.includes(name)) { const newD = [...designers, name]; setDesigners(newD); saveToSupabase('master_data', 'settings', { clients, contacts, designers: newD }); }};
  const deleteDesigner = (name) => { const newD = designers.filter(c => c !== name); setDesigners(newD); saveToSupabase('master_data', 'settings', { clients, contacts, designers: newD }); };

  const handleCreateProject = (e) => {
    e.preventDefault();
    const newProject = { ...formData, id: Date.now(), totalAmount: Number(formData.totalAmount) || 0, paidAmount: Number(formData.paidAmount) || 0, tasks: [], supportRecords: [] };
    setProjects([newProject, ...projects]);
    saveToSupabase('projects', newProject.id.toString(), newProject);
    
    setIsModalOpen(false);
    const newDefDeadline = new Date(); newDefDeadline.setDate(newDefDeadline.getDate() + 30);
    setFormData({ name: '', client: '', contact: '', leadDesigner: '', poStatus: '未提PO', status: '沟通中', totalAmount: '', paidAmount: '', date: new Date().toISOString().split('T')[0], deadline: newDefDeadline.toISOString().split('T')[0] });
  };

  const handleSaveProject = (updatedData) => {
    const finalData = { ...updatedData, totalAmount: Number(updatedData.totalAmount), paidAmount: Number(updatedData.paidAmount) };
    setProjects(projects.map(p => p.id === finalData.id ? finalData : p));
    saveToSupabase('projects', finalData.id.toString(), finalData);
    setCurrentView({ type: 'dashboard', projectId: null });
  };

  const availableModalContacts = useMemo(() => { return contacts.filter(c => c.client === formData.client).map(c => c.name); }, [contacts, formData.client]);
  useEffect(() => { if (formData.contact && !availableModalContacts.includes(formData.contact)) { setFormData(prev => ({ ...prev, contact: '' })); } }, [formData.client, availableModalContacts]);

  const stats = useMemo(() => {
    let totalRevenue = 0; let pendingPayment = 0; let activeProjects = 0;
    projects.forEach(p => { totalRevenue += p.totalAmount; pendingPayment += (p.totalAmount - p.paidAmount); if (!isArchived(p)) activeProjects++; });
    return { totalRevenue, pendingPayment, activeProjects };
  }, [projects]);

  const { activeList, archiveList } = useMemo(() => {
    const filtered = projects.filter(p => {
      const matchSearch = p.name.includes(searchTerm) || p.client.includes(searchTerm) || p.contact?.includes(searchTerm) || p.leadDesigner?.includes(searchTerm);
      const matchStatus = filterStatus === '全部' || p.status === filterStatus;
      return matchSearch && matchStatus;
    });
    return { activeList: filtered.filter(p => !isArchived(p)), archiveList: filtered.filter(p => isArchived(p)) };
  }, [projects, searchTerm, filterStatus]);

  const archiveTotalAmount = archiveList.reduce((sum, p) => sum + p.totalAmount, 0);
  const isPrintView = currentView.type === 'report' || currentView.type === 'settlement';

  if (isAuthLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-600" /></div>;
  if (!user) return <LoginScreen onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} error={loginError} isLoading={isLoggingIn} />;

  const CloudStatusIndicator = () => (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium ml-4 shrink-0">
      {dbStatus === 'mock' && <><Database size={12} className="text-amber-500" /> 本地模拟模式</>}
      {dbStatus === 'connecting' && <><Loader2 size={12} className="animate-spin text-slate-500" /> 连接 Supabase...</>}
      {dbStatus === 'connected' && <><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Supabase 已连接</>}
      {dbStatus === 'error' && <><CloudOff size={12} className="text-red-500" /> 数据库断开</>}
    </div>
  );

  return (
    <div className={`min-h-screen font-sans ${isPrintView ? 'bg-white' : 'bg-slate-50 pb-12'}`}>
      {!isPrintView && (
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm print:hidden">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 cursor-pointer flex-shrink-0 mr-2" onClick={() => setCurrentView({ type: 'dashboard' })}>
              <img src="logo." alt="Leosto 揽石" className="h-7 object-contain mix-blend-multiply" onError={(e) => { e.target.onerror = null; e.target.outerHTML = '<div class="text-2xl font-black tracking-tighter text-slate-800 flex items-end leading-none">leosto<span class="font-light ml-1 text-lg mb-[2px]">揽石</span></div>'; }} />
            </div>
            
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg flex-shrink-0">
              <button onClick={() => setCurrentView({ type: 'dashboard' })} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView.type === 'dashboard' || currentView.type === 'detail' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>看板</button>
              <button onClick={() => setCurrentView({ type: 'clients' })} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView.type === 'clients' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>客户管理</button>
              <button onClick={() => setCurrentView({ type: 'contacts' })} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView.type === 'contacts' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>对接人</button>
              <button onClick={() => setCurrentView({ type: 'designers' })} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView.type === 'designers' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>主创设计师</button>
            </nav>

            <CloudStatusIndicator />
          </div>
          
          <div className="flex items-center gap-4">
            {currentView.type === 'dashboard' && (
              <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium shadow-sm flex-shrink-0">
                <Plus size={16} /> 新建项目
              </button>
            )}
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="退出系统"><LogOut size={18} /></button>
          </div>
        </header>
      )}

      {currentView.type === 'dashboard' && (
        <main className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl"><Briefcase size={28} /></div>
              <div><p className="text-sm text-slate-500 font-medium">活跃项目 (未结项)</p><h2 className="text-3xl font-bold text-slate-800">{stats.activeProjects}</h2></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={28} /></div>
              <div><p className="text-sm text-slate-500 font-medium">系统总流水 (¥)</p><h2 className="text-3xl font-bold text-slate-800">{stats.totalRevenue.toLocaleString()}</h2></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-xl"><Wallet size={28} /></div>
              <div><p className="text-sm text-slate-500 font-medium">待收尾款 (¥)</p><h2 className="text-3xl font-bold text-slate-800">{stats.pendingPayment.toLocaleString()}</h2></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                {['全部', ...STATUS_OPTIONS].map(status => (
                  <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === status ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>{status}</button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="搜索项目、客户或设计师..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"/>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                    <th className="px-6 py-4 font-medium">项目名称</th>
                    <th className="px-6 py-4 font-medium">交付期限 / 倒计时</th>
                    <th className="px-6 py-4 font-medium">客户 / 对接人</th>
                    <th className="px-6 py-4 font-medium">状态 / PO</th>
                    <th className="px-6 py-4 font-medium text-right">总金额</th>
                    <th className="px-6 py-4 font-medium text-right">已收</th>
                    <th className="px-6 py-4 font-medium text-right">未结</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeList.map(project => (
                    <tr key={project.id} onClick={() => setCurrentView({ type: 'detail', projectId: project.id })} className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 group-hover:text-indigo-600">{project.name}</div>
                        {project.leadDesigner && <div className="text-xs text-indigo-500 mt-1.5 flex items-center gap-1"><PenTool size={12}/>{project.leadDesigner}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-700 mb-1">{project.deadline || '-'}</div>
                        <CountdownBadge deadline={project.deadline} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700 font-medium">{project.client}</div>
                        {project.contact && <div className="text-xs text-slate-500 mt-1">{project.contact}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 items-start">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[project.status]}`}>{project.status}</span>
                          <span className={`text-[11px] font-medium ${project.poStatus === '已提PO' ? 'text-emerald-600 bg-emerald-50 px-2 rounded' : 'text-slate-400'}`}>{project.poStatus}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-700">¥{project.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-emerald-600">¥{project.paidAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-amber-600 font-bold">¥{(project.totalAmount - project.paidAmount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {activeList.length === 0 && <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">暂无项目，快去新建一个吧</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <AIChatBox projects={activeList} />

          {archiveList.length > 0 && (
            <div className="mt-12 opacity-80 hover:opacity-100 transition-opacity">
              <h3 className="text-lg font-bold text-slate-700 mb-4 flex justify-between items-center">
                <div className="flex items-center gap-2"><Archive size={20} className="text-slate-400"/> 归档项目区 (各项进度均已完成)</div>
                <div className="text-sm font-medium text-slate-500">已完结总金额: <span className="text-slate-800 font-bold ml-1">¥ {archiveTotalAmount.toLocaleString()}</span></div>
              </h3>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse bg-slate-50/30">
                  <tbody className="divide-y divide-slate-100">
                    {archiveList.map(project => (
                      <tr key={project.id} onClick={() => setCurrentView({ type: 'detail', projectId: project.id })} className="hover:bg-white transition-colors cursor-pointer group">
                        <td className="px-6 py-3"><div className="font-medium text-slate-600 group-hover:text-indigo-600">{project.name}</div></td>
                        <td className="px-6 py-3 text-slate-500 text-sm">{project.client}</td>
                        <td className="px-6 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${STATUS_COLORS[project.status]}`}>{project.status}</span></td>
                        <td className="px-6 py-3 text-right text-slate-500 text-sm font-medium">¥{project.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      )}

      {currentView.type === 'detail' && (
        <ProjectDetail 
          key={currentView.projectId} project={projects.find(p => p.id === currentView.projectId)} 
          clients={clients} contacts={contacts} designers={designers}
          onAddClient={addClient} onAddContact={addContact} onAddDesigner={addDesigner}
          onSave={handleSaveProject} onBack={() => setCurrentView({ type: 'dashboard' })}
          onShowReport={(pData) => setCurrentView({ type: 'report', data: pData })} onShowSettlement={(pData) => setCurrentView({ type: 'settlement', data: pData })}
        />
      )}

      {currentView.type === 'report' && <FinalReportView project={currentView.data} onBack={() => setCurrentView({ type: 'detail', projectId: currentView.data.id })} />}
      {currentView.type === 'settlement' && <SettlementListView project={currentView.data} onBack={() => setCurrentView({ type: 'detail', projectId: currentView.data.id })} />}

      {currentView.type === 'clients' && <SimpleManager title="客户档案管理" icon={Users} items={clients} onAdd={addClient} onDelete={deleteClient} onReorder={(newC) => {setClients(newC); saveToSupabase('master_data', 'settings', { clients: newC, contacts, designers });}} />}
      {currentView.type === 'contacts' && <ContactManager contacts={contacts} clients={clients} onAdd={addContact} onDelete={deleteContact} onReorder={(newC) => {setContacts(newC); saveToSupabase('master_data', 'settings', { clients, contacts: newC, designers });}} />}
      {currentView.type === 'designers' && <SimpleManager title="主创设计师库" icon={PenTool} items={designers} onAdd={addDesigner} onDelete={deleteDesigner} onReorder={(newD) => {setDesigners(newD); saveToSupabase('master_data', 'settings', { clients, contacts, designers: newD });}} />}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">新建设计项目</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">项目名称</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="如：品牌VI设计"/></div>
                <div className="relative"><label className="block text-sm font-medium text-slate-700 mb-1">客户名称</label><AutocompleteInput value={formData.client} onChange={v => setFormData({...formData, client: v})} options={clients} onAdd={addClient} placeholder="选择客户..." /></div>
                <div className="relative"><label className="block text-sm font-medium text-slate-700 mb-1">对接人 (需先选择客户)</label><AutocompleteInput value={formData.contact} onChange={v => setFormData({...formData, contact: v})} options={availableModalContacts} onAdd={(name) => addContact({id: Date.now().toString(), name, client: formData.client})} placeholder={formData.client ? "选择或新建对接人..." : "请先选择客户"} disabled={!formData.client} /></div>
                <div className="relative"><label className="block text-sm font-medium text-slate-700 mb-1">主创设计师</label><AutocompleteInput value={formData.leadDesigner} onChange={v => setFormData({...formData, leadDesigner: v})} options={designers} onAdd={addDesigner} placeholder="指派设计师..." /></div>
                <div><label className="block text-sm font-bold text-indigo-600 mb-1">交付期限</label><input required type="date" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/30 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"/></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">总金额 (¥)</label><input required type="number" min="0" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"/></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">已收定金 (¥)</label><input required type="number" min="0" value={formData.paidAmount} onChange={e => setFormData({...formData, paidAmount: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"/></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">当前状态</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500/20">{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">PO状态</label><select value={formData.poStatus} onChange={e => setFormData({...formData, poStatus: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500/20">{PO_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border text-slate-600 rounded-lg hover:bg-slate-50 font-medium">取消</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">创建并同步</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
