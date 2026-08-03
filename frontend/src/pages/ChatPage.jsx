import React, { useState, useEffect } from "react";
import Topbar from "../components/Topbar";
import ModeSelectionModal from "../components/ModeSelectionModal";
import PostInteractionReportModal from "../components/PostInteractionReportModal";
import { coachingApi } from "../api/endpoints";

export default function ChatPage() {
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(true);

  const [sessionList, setSessionList] = useState([]); // past coaching sessions history
  const [session, setSession] = useState(null); // active session { id, mode, scenario_title, product_context, customer_persona, turns }
  const [activeTurn, setActiveTurn] = useState(null); // latest analyzed turn
  const [turns, setTurns] = useState([]);

  const [customerInput, setCustomerInput] = useState("");
  const [agentInput, setAgentInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [postReport, setPostReport] = useState(null);

  // Voice Simulation States
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Load session history and automatically restore active session on mount
  useEffect(() => {
    fetchSessionListAndRestore();
  }, []);

  const fetchSessionListAndRestore = async () => {
    try {
      const res = await coachingApi.listSessions();
      const sessions = res.data.sessions || [];
      setSessionList(sessions);
    } catch (err) {
      console.error("Failed to load coaching session list:", err);
    }
  };



  const loadSessionDetails = async (sessionId) => {
    setLoading(true);
    try {
      const res = await coachingApi.getSession(sessionId);
      const sessData = res.data;
      setSession(sessData);
      setTurns(sessData.turns || []);
      if (sessData.turns && sessData.turns.length > 0) {
        const lastT = sessData.turns[sessData.turns.length - 1];
        setActiveTurn(lastT);
        setAgentInput(lastT.suggested_response || "");
      } else {
        setActiveTurn(null);
        setAgentInput("");
      }
      localStorage.setItem("active_coaching_session_id", sessionId);
      setShowHistoryPanel(false);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error("Failed to load session details:", err);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation(); // prevent triggering row click
    if (!window.confirm("Are you sure you want to delete this coaching session?")) return;

    try {
      await coachingApi.deleteSession(sessionId);
      const updatedList = sessionList.filter((s) => s.id !== sessionId);
      setSessionList(updatedList);

      const currentActiveId = session?.id || session?.session_id;
      if (currentActiveId === sessionId) {
        if (updatedList.length > 0) {
          loadSessionDetails(updatedList[0].id);
        } else {
          setSession(null);
          setTurns([]);
          setActiveTurn(null);
          localStorage.removeItem("active_coaching_session_id");
        }
      }
    } catch (err) {
      alert("Failed to delete session: " + (err.response?.data?.detail || err.message));
    }
  };

  // Text-to-Speech (TTS) for Customer Simulator
  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Speech-to-Text (STT) for Agent Reply Microphone Input
  const startMicListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setAgentInput((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.start();
  };

  // Trigger TTS on new customer message if TTS is enabled
  useEffect(() => {
    if (activeTurn?.customer_message && ttsEnabled) {
      speakText(activeTurn.customer_message);
    }
  }, [activeTurn, ttsEnabled]);

  // Start new session callback from modal
  const handleStartSession = (sessionData) => {
    setSession(sessionData);
    setTurns(sessionData.first_turn ? [sessionData.first_turn] : []);
    setActiveTurn(sessionData.first_turn || null);
    setCustomerInput("");
    setAgentInput(sessionData.first_turn?.suggested_response || "");
    setShowHistoryPanel(false);

    const sId = sessionData.id || sessionData.session_id;
    if (sId) {
      localStorage.setItem("active_coaching_session_id", sId);
    }

    // Automatically refresh session history list
    coachingApi.listSessions().then((res) => setSessionList(res.data.sessions || [])).catch(() => {});
  };


  // Simulate next customer turn (Simulator / Replay Mode)
  const handleSimulateTurn = async () => {
    const sId = session?.id || session?.session_id;
    if (!sId) return;
    setLoading(true);
    try {
      const res = await coachingApi.simulateTurn({ session_id: sId });
      const newTurn = res.data.turn;
      setTurns((prev) => [...prev, newTurn]);
      setActiveTurn(newTurn);
      if (newTurn.suggested_response) {
        setAgentInput(newTurn.suggested_response);
      }
      setLoading(false);
      // Auto update history turn count
      coachingApi.listSessions().then((r) => setSessionList(r.data.sessions || [])).catch(() => {});
    } catch (err) {
      setLoading(false);
      alert("Error generating turn: " + (err.response?.data?.detail || err.message));
    }
  };

  // Analyze manual customer turn
  const handleAnalyzeManualTurn = async (e) => {
    e.preventDefault();
    const sId = session?.id || session?.session_id;
    if (!sId || !customerInput.trim()) return;
    setLoading(true);
    try {
      const res = await coachingApi.analyzeTurn({
        session_id: sId,
        customer_message: customerInput,
        agent_message: agentInput || null,
      });
      const newTurn = res.data.turn;
      setTurns((prev) => [...prev, newTurn]);
      setActiveTurn(newTurn);
      if (newTurn.suggested_response) {
        setAgentInput(newTurn.suggested_response);
      }
      setCustomerInput("");
      setLoading(false);
      coachingApi.listSessions().then((r) => setSessionList(r.data.sessions || [])).catch(() => {});
    } catch (err) {
      setLoading(false);
      alert("Error analyzing turn: " + (err.response?.data?.detail || err.message));
    }
  };

  // Send agent reply & auto-trigger next customer turn
  const handleSendAgentReply = async () => {
    const sId = session?.id || session?.session_id;
    const textToSend = agentInput.trim() || activeTurn?.suggested_response || "Thank you for reaching out, I am investigating this immediately.";
    if (!activeTurn) return;

    setTurns((prev) =>
      prev.map((t) => (t.id === activeTurn.id ? { ...t, agent_message: textToSend } : t))
    );
    setActiveTurn((prev) => (prev ? { ...prev, agent_message: textToSend } : null));
    setAgentInput("");

    // In Simulator or Replay mode, automatically trigger the next customer message turn
    if (sId && (session?.mode === "simulator" || session?.mode === "replay")) {
      setLoading(true);
      try {
        const res = await coachingApi.simulateTurn({ session_id: sId, agent_message: textToSend });
        const newTurn = res.data.turn;
        setTurns((prev) => [...prev, newTurn]);
        setActiveTurn(newTurn);
        if (newTurn.suggested_response) {
          setAgentInput(newTurn.suggested_response);
        }
        setLoading(false);
        coachingApi.listSessions().then((r) => setSessionList(r.data.sessions || [])).catch(() => {});
      } catch (err) {
        setLoading(false);
      }
    }
  };


  // Finish session & generate report
  const handleFinishSession = async () => {
    const sId = session?.id || session?.session_id;
    if (!sId) return;
    setLoading(true);
    try {
      const res = await coachingApi.finishSession(sId);
      setPostReport(res.data.report);
      setIsReportModalOpen(true);
      setLoading(false);
      coachingApi.listSessions().then((r) => setSessionList(r.data.sessions || [])).catch(() => {});
    } catch (err) {
      setLoading(false);
      alert("Error generating session report: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="h-screen max-h-screen flex flex-col bg-transparent text-ink overflow-hidden">
      
      {/* Top Bar Header matching Dashboard Theme */}
      <Topbar
        title="Three-Panel Coaching Console"
        subtitle={session ? `[Mode: ${session.mode.toUpperCase()}] ${session.scenario_title}` : "Real-time AI Guidance, Customer Simulation & RAG Recommendations"}
      >
        <div className="flex items-center space-x-3">
          {session && (
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center space-x-1.5 ${
                ttsEnabled
                  ? "bg-teal-100 border-teal text-teal-800"
                  : "bg-white border-border text-ink-muted hover:bg-paper"
              }`}
            >
              <span>{ttsEnabled ? "🔊 Voice Customer ON" : "🔇 Voice Customer OFF"}</span>
            </button>
          )}

          {session && (
            <button
              onClick={handleFinishSession}
              disabled={loading || turns.length === 0}
              className="px-4 py-1.5 rounded-lg bg-teal text-white font-bold hover:bg-teal-dark transition text-xs shadow-sm disabled:opacity-50 flex items-center space-x-1"
            >
              <span>📥 Export PDF / Finish Report</span>
            </button>
          )}

          <button
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className="px-3 py-1.5 rounded-lg bg-white border border-border text-ink font-bold hover:bg-paper transition text-xs"
          >
            📜 {showHistoryPanel ? "Hide History" : "History Panel"}
          </button>

          <button
            onClick={() => setIsModeModalOpen(true)}
            className="px-4 py-1.5 rounded-lg bg-navy text-white font-bold hover:bg-navy-light transition text-xs shadow-sm"
          >
            ⚡ New Session
          </button>
        </div>
      </Topbar>

      {/* Main Layout with Three-Panel Console + RIGHT SIDE HISTORY RAIL */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* MAIN CONSOLE / EMPTY STATE AREA */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!session ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="text-6xl">🎧</div>
              <h2 className="text-2xl font-bold text-ink">Welcome to AI Support Coaching Console</h2>
              <p className="text-ink-muted text-sm max-w-md">
                Coach live customer interactions turn-by-turn with Voice Call Simulation, Escalation Risk Alerts, and RAG Knowledge Recommendations.
              </p>
              <button
                onClick={() => setIsModeModalOpen(true)}
                className="px-6 py-3 rounded-xl bg-teal text-white font-extrabold hover:bg-teal-dark transition text-sm shadow-md"
              >
                🚀 Launch Coaching Session
              </button>
            </div>
          ) : (
            /* Light Theme Three-Panel Layout */
            <div className="flex-1 grid grid-cols-12 gap-4 p-5 overflow-hidden h-full">
              
              {/* PANEL 1: Conversation Window & Mode Controls (4 Cols) */}
              <div className="col-span-4 bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] flex flex-col shadow-glass overflow-hidden h-full">
                <div className="px-4 py-3 bg-paper border-b border-border flex items-center justify-between text-xs font-bold text-ink">
                  <span>💬 Live Conversation Window</span>
                  <span className="text-ink-muted">{turns.length} Turn(s)</span>
                </div>

                {/* Conversation Turns Stream */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-paper/50">
                  {turns.map((t, idx) => (
                    <div key={idx} className="space-y-3">
                      {/* Customer Bubble */}
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl rounded-tl-none p-3.5 max-w-[90%] text-xs text-amber-950 shadow-sm">
                        <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 mb-1">
                          <span>Customer (Turn {t.turn_index})</span>
                          {ttsEnabled && (
                            <button onClick={() => speakText(t.customer_message)} className="text-amber-700 hover:text-amber-900">
                              🔊 Replay Voice
                            </button>
                          )}
                        </div>
                        <div className="leading-relaxed">{t.customer_message}</div>
                      </div>

                      {/* Agent Response Bubble */}
                      {t.agent_message ? (
                        <div className="bg-teal-50 border border-teal-200 rounded-2xl rounded-tr-none p-3.5 max-w-[90%] ml-auto text-xs text-teal-950 shadow-sm">
                          <div className="text-[10px] font-bold text-teal-800 mb-1">Support Agent</div>
                          <div className="leading-relaxed">{t.agent_message}</div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-ink-muted italic ml-2">Waiting for agent reply...</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mode Controls Bar */}
                <div className="p-4 bg-white border-t border-border space-y-3">
                  {session.mode === "simulator" && (
                    <button
                      onClick={handleSimulateTurn}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-teal-50 border border-teal-300 text-teal-800 font-bold hover:bg-teal-100 transition text-xs shadow-sm disabled:opacity-50"
                    >
                      {loading ? "Simulating..." : "🤖 Simulate Next Customer Turn"}
                    </button>
                  )}

                  {session.mode === "replay" && (
                    <button
                      onClick={handleSimulateTurn}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 transition text-xs shadow-sm disabled:opacity-50"
                    >
                      {loading ? "Replaying..." : "📼 Replay Next Transcript Turn"}
                    </button>
                  )}

                  {session.mode === "manual" && (
                    <form onSubmit={handleAnalyzeManualTurn} className="space-y-2">
                      <textarea
                        value={customerInput}
                        onChange={(e) => setCustomerInput(e.target.value)}
                        placeholder="Paste customer message..."
                        className="w-full bg-paper border border-border rounded-xl p-2.5 text-xs text-ink focus:outline-none focus:border-teal resize-none h-16"
                      />
                      <button
                        type="submit"
                        disabled={loading || !customerInput.trim()}
                        className="w-full py-2 rounded-xl bg-navy text-white font-bold hover:bg-navy-light transition text-xs disabled:opacity-50"
                      >
                        Analyze Customer Turn
                      </button>
                    </form>
                  )}

                  {/* Agent Reply Box with Speech-to-Text Microphone Button */}
                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-ink uppercase">
                      <span>Agent Response Input</span>
                      <button
                        onClick={startMicListening}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition flex items-center space-x-1 ${
                          isListening
                            ? "bg-rose-100 border-rose-300 text-rose-700 animate-pulse"
                            : "bg-paper border-border text-ink hover:bg-gray-200"
                        }`}
                      >
                        <span>🎙️ {isListening ? "Listening..." : "Speak Response"}</span>
                      </button>
                    </div>
                    <textarea
                      value={agentInput}
                      onChange={(e) => setAgentInput(e.target.value)}
                      placeholder="Type or speak agent response..."
                      className="w-full bg-paper border border-border rounded-xl p-2.5 text-xs text-ink focus:outline-none focus:border-teal resize-none h-16"
                    />
                    <button
                      onClick={handleSendAgentReply}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-teal text-white font-bold hover:bg-teal-dark transition text-xs shadow-sm disabled:opacity-50"
                    >
                      {loading ? "Processing..." : "Send Agent Response"}
                    </button>
                  </div>
                </div>
              </div>

              {/* PANEL 2: Real-Time Coaching Feed (5 Cols) */}
              <div className="col-span-5 bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] p-5 space-y-4 overflow-y-auto shadow-glass h-full">
                <div className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                  ⚡ Real-Time Coaching Feed
                </div>

                {activeTurn ? (
                  <>
                    {/* High Risk Escalation Alert Overlay Banner */}
                    {activeTurn.is_high_risk && (
                      <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-4 text-rose-900 shadow-sm space-y-1.5 animate-pulse">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">⚠️</span>
                          <span className="font-extrabold text-sm uppercase">HIGH ESCALATION RISK DETECTED ({activeTurn.escalation_score}%)</span>
                        </div>
                        <div className="text-xs font-semibold text-rose-800">Reason: {activeTurn.escalation_reason}</div>
                        <div className="text-xs text-rose-900 bg-rose-100/70 p-2.5 rounded-lg mt-2 border border-rose-200">
                          <span className="font-bold">Intervention Strategy:</span> {activeTurn.escalation_recommendation}
                        </div>
                      </div>
                    )}

                    {/* Intent & Sentiment Meter */}
                    <div className="bg-paper border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-ink">Customer Emotional State</span>
                        <span className="px-2.5 py-1 rounded-md bg-white border border-border text-ink font-bold capitalize shadow-2xs">
                          {activeTurn.intent}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-ink-muted font-medium">Frustration Level</span>
                          <span className={`font-bold ${activeTurn.frustration_level > 60 ? "text-rose-600" : "text-amber-600"}`}>
                            {activeTurn.frustration_level}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              activeTurn.frustration_level > 60 ? "bg-rose-500" : activeTurn.frustration_level > 30 ? "bg-amber-500" : "bg-teal"
                            }`}
                            style={{ width: `${activeTurn.frustration_level}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI Suggested Agent Response */}
                    <div className="bg-paper border border-border rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-800 uppercase">Suggested Agent Response</span>
                        <button
                          onClick={() => setAgentInput(activeTurn.suggested_response || "")}
                          className="px-3 py-1 rounded-lg bg-teal text-white text-[11px] font-bold shadow-2xs hover:bg-teal-dark transition"
                        >
                          📋 Use Suggestion
                        </button>
                      </div>
                      <div className="text-xs text-ink bg-white p-3 rounded-xl border border-border italic leading-relaxed">
                        "{activeTurn.suggested_response}"
                      </div>
                    </div>

                    {/* Tone Quality & Communication Improvement Tips */}
                    <div className="bg-paper border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-ink">Tone & Clarity Score</span>
                        <span className="text-teal-dark font-extrabold text-sm">{activeTurn.tone_clarity_score}/100</span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[11px] font-semibold text-ink-muted uppercase">Communication Improvement Tips:</div>
                        <ul className="space-y-2 text-xs text-ink">
                          {activeTurn.coaching_tips?.map((tip, idx) => (
                            <li key={idx} className="bg-white p-2.5 rounded-lg border border-border shadow-2xs">
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-ink-muted">
                    Select or generate a customer turn to view live coaching feedback.
                  </div>
                )}
              </div>

              {/* PANEL 3: Knowledge Recommendation Panel (3 Cols) */}
              <div className="col-span-3 bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] p-5 space-y-4 overflow-y-auto shadow-glass h-full">
                <div className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                  📚 Knowledge Recommendations (RAG)
                </div>

                {activeTurn?.retrieved_knowledge && activeTurn.retrieved_knowledge.length > 0 ? (
                  <div className="space-y-3">
                    {activeTurn.retrieved_knowledge.map((doc, idx) => (
                      <div key={idx} className="bg-paper border border-border rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-ink truncate w-36">{doc.document || "Knowledge Doc"}</span>
                          <span className="text-[10px] text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full font-mono font-bold">
                            {(doc.score * 100).toFixed(0)}% match
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-muted bg-white p-2.5 rounded-lg border border-border line-clamp-4 leading-relaxed">
                          {doc.text || doc.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-ink-muted text-center px-4">
                    Relevant FAQs and support documentation will surface here based on conversation context.
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* RIGHT SIDE SESSION HISTORY RAIL (Shown on start screen or when toggled) */}
        {(!session || showHistoryPanel) && (
          <div className="w-72 bg-white/80 backdrop-blur-xl border-l border-white/40 flex flex-col shrink-0 shadow-glass z-10">
            <div className="p-3.5 bg-paper/50 border-b border-white/40 flex items-center justify-between">
              <span className="text-xs font-bold text-ink uppercase tracking-wider">📜 Past Coaching History</span>
              <button
                onClick={() => setIsModeModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-teal text-white text-[11px] font-bold hover:bg-teal-dark transition shadow-2xs"
              >
                + New
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sessionList.length === 0 ? (
                <div className="text-xs text-ink-muted text-center py-10">No previous sessions yet</div>
              ) : (
                sessionList.map((s) => {
                  const isActive = session && (session.id === s.id || session.session_id === s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => loadSessionDetails(s.id)}
                      className={`w-full cursor-pointer text-left p-3 rounded-xl border transition flex flex-col space-y-1 group relative ${
                        isActive
                          ? "bg-teal-50 border-teal-300 text-teal-950 font-semibold shadow-2xs"
                          : "bg-white border-border/80 hover:bg-paper text-ink"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="uppercase font-bold text-teal-dark px-1.5 py-0.5 rounded bg-teal-100/60">
                          {s.mode}
                        </span>
                        
                        <div className="flex items-center space-x-1.5">
                          {s.resolution_score && (
                            <span className="font-bold text-ink-muted bg-paper px-1.5 py-0.5 rounded">
                              {s.resolution_score}/100
                            </span>
                          )}
                          {/* Delete Session Button */}
                          <button
                            onClick={(e) => handleDeleteSession(e, s.id)}
                            title="Delete Session"
                            className="text-ink-muted hover:text-rose-600 p-0.5 rounded transition opacity-80 hover:opacity-100"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="text-xs font-bold truncate pr-2">{s.scenario_title}</div>
                      
                      <div className="text-[10px] text-ink-muted flex justify-between pt-0.5">
                        <span>{s.turn_count || 0} turns</span>
                        <span className="capitalize font-medium text-ink-muted">{s.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}


      </div>

      {/* Modals */}
      <ModeSelectionModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        onStartSession={handleStartSession}
      />

      <PostInteractionReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={postReport}
        scenarioTitle={session?.scenario_title}
      />
    </div>
  );
}
