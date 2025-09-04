import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const DAILY_LIMIT = 3;
const MAX_CHARS = 240;

// Supabase client setup (fallback for local testing)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ljnjdguqjrevhhuwkaxg.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmpkZ3VxanJldmhodXdrYXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzU0NDgsImV4cCI6MjA3MjU1MTQ0OH0._MRu-P-0r7hZ8i-Oh5xnYMaRNMEr1Vzw2tlKocMC6G4";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function NoospaceMinimal() {
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState("");
  const [symbol, setSymbol] = useState("✶");
  const [tags, setTags] = useState("");
  const [view, setView] = useState("scroll");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState(null);

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    try {
      let { data, error } = await supabase.from("entries").select("*").order("date", { ascending: true });
      if (error) throw error;
      if (data) setEntries(data);
    } catch (err) {
      console.error("Fetch error:", err.message);
      setError("Could not fetch entries. Check Supabase keys or table existence.");
    }
  }

  const filtered = useMemo(() => {
    let list = entries;
    if (filter) list = list.filter(e => e.tags?.includes(filter));
    return list;
  }, [entries, filter]);

  function countToday() {
    const key = todayKey();
    return entries.filter(e => e.date.startsWith(key)).length;
  }

  async function addEntry() {
    setError("");
    const trimmed = text.trim();
    const tgs = tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean).slice(0,5);

    if (!trimmed) return setError("Write a short impulse.");
    if (trimmed.length > MAX_CHARS) return setError(`Keep it under ${MAX_CHARS} characters.`);
    if (countToday() >= DAILY_LIMIT) return setError(`Daily ritual limit reached (${DAILY_LIMIT}). Return tomorrow.`);

    const entry = {
      text: trimmed,
      symbol: (symbol || "✶").slice(0,2),
      tags: tgs.length ? tgs : ["untagged"],
      wallet: wallet || null,
      date: new Date().toISOString(),
      stars: 0,
    };

    try {
      const { data, error } = await supabase.from("entries").insert([entry]).select();
      if (error) throw error;
      if (data) setEntries(prev => [...prev, ...data]);
      setText("");
      setTags("");
    } catch (err) {
      console.error("Insert error:", err.message);
      setError("Could not save entry.");
    }
  }

  function connectWallet() {
    const fakeAddr = "0x" + Math.floor(Math.random() * 1e16).toString(16).padStart(16,"0");
    setWallet(fakeAddr);
  }

  async function starEntry(id) {
    try {
      const entry = entries.find(e => e.id === id);
      const { data, error } = await supabase.from("entries").update({ stars: entry.stars + 1 }).eq("id", id).select();
      if (error) throw error;
      if (data) setEntries(prev => prev.map(e => e.id === id ? data[0] : e));
    } catch (err) {
      console.error("Star error:", err.message);
      setError("Could not update stars.");
    }
  }

  async function deleteEntry(id) {
    try {
      const { error } = await supabase.from("entries").delete().eq("id", id);
      if (error) throw error;
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error("Delete error:", err.message);
      setError("Could not delete entry.");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-50 backdrop-blur bg-neutral-950/90 border-b border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☄️</span>
            <h1 className="text-lg md:text-2xl font-semibold tracking-tight">Noospace</h1>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <button className={`px-3 py-1.5 rounded-xl border ${view === "scroll" ? "bg-neutral-200 text-neutral-900" : "border-neutral-700"}`} onClick={() => setView("scroll")}>Scroll</button>
            <button className={`px-3 py-1.5 rounded-xl border ${view === "spiral" ? "bg-neutral-200 text-neutral-900" : "border-neutral-700"}`} onClick={() => setView("spiral")}>Spiral</button>
            {!wallet ? (
              <button className="ml-4 px-3 py-1.5 rounded-xl border border-neutral-700" onClick={connectWallet}>Connect Wallet</button>
            ) : (
              <span className="ml-4 text-xs text-neutral-400">{wallet.slice(0,6)}…{wallet.slice(-4)}</span>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <section className="mb-6 p-4 rounded-2xl border border-neutral-800 bg-neutral-900/40">
          <div className="flex flex-col md:flex-row gap-3 items-stretch">
            <input value={symbol} onChange={e=>setSymbol(e.target.value)} maxLength={2} placeholder="✶" className="w-full md:w-24 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 outline-none" />
            <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="inscribe a brief impulse (≤ 240 chars)" maxLength={MAX_CHARS} className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 outline-none resize-y min-h-[64px]" />
            <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="tags, comma-separated" className="w-full md:w-56 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 outline-none" />
            <button onClick={addEntry} className="px-4 py-2 rounded-xl bg-white text-neutral-900 font-medium hover:opacity-90">Inscribe</button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            <span>Daily rituals left: {Math.max(0, DAILY_LIMIT - count
