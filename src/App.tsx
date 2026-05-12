/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { Bell, BellOff, DollarSign, ExternalLink, Timer, AlertTriangle, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

// --- Audio Logic ---
const useAlarm = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const startAlarm = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (oscillatorRef.current) return;

    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square"; // Annoying square wave
    osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitched beep

    // Create a "beep beep" effect
    gain.gain.setValueAtTime(0, ctx.currentTime);
    const interval = 0.2;
    for (let i = 0; i < 1000; i++) {
       gain.gain.setValueAtTime(1, ctx.currentTime + i * interval);
       gain.gain.setValueAtTime(0, ctx.currentTime + i * interval + 0.1);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    oscillatorRef.current = osc;
    gainNodeRef.current = gain;
  }, []);

  const stopAlarm = useCallback(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
  }, []);

  return { startAlarm, stopAlarm };
};

// --- Main App ---
export default function App() {
  const [isAlarmRunning, setIsAlarmRunning] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [alarmTime, setAlarmTime] = useState("08:00");
  const [showAd, setShowAd] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [adType, setAdType] = useState<"video" | "pix">("video");
  const [pixCode, setPixCode] = useState<string>("");
  const [loadingPix, setLoadingPix] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const { startAlarm, stopAlarm } = useAlarm();

  // Handle recurring popup timer (45 seconds)
  useEffect(() => {
    let timer: number;
    if (isScheduled && !isAlarmRunning) {
      timer = window.setInterval(() => {
        setShowPopup(true);
      }, 45000);
    }
    return () => clearInterval(timer);
  }, [isScheduled, isAlarmRunning]);

  // Check for scheduled alarm
  useEffect(() => {
    let checkInterval: number;
    if (isScheduled && !isAlarmRunning) {
      checkInterval = window.setInterval(() => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (currentTime === alarmTime) {
          setIsAlarmRunning(true);
          setIsScheduled(false);
          startAlarm();
        }
      }, 1000);
    }
    return () => clearInterval(checkInterval);
  }, [isScheduled, isAlarmRunning, alarmTime, startAlarm]);

  // Handle Alarm sequence
  const handleSilenceClick = async () => {
    if (!isAlarmRunning && !isScheduled) {
      // Just check if we want to start immediately or schedule
      // For this request, we'll make the button "Schedule"
      setIsScheduled(true);
      setShowPopup(true);
    } else if (isScheduled) {
      setIsScheduled(false);
    } else if (isAlarmRunning && !showAd) {
      // Pick random ad type
      const selectedType = Math.random() > 0.5 ? "video" : "pix";
      setAdType(selectedType);
      setShowAd(true);
      setCountdown(15);

      if (selectedType === "pix") {
        setLoadingPix(true);
        try {
          const response = await fetch("/api/pix/create", { method: "POST" });
          const data = await response.json();
          if (data.success) {
            setPixCode(data.pix);
          } else {
            console.error("PIX Error:", data.error, data.raw);
            // Fallback for demo if it really fails to generate
            setPixCode("ERRO_AO_GERAR_PIX");
          }
        } catch (error) {
          console.error("Failed to fetch PIX:", error);
          setPixCode("ERRO_CONEXAO");
        } finally {
          setLoadingPix(false);
        }
      }
    }
  };

  // Countdown logic
  useEffect(() => {
    let timer: number;
    if (showAd && countdown > 0) {
      timer = window.setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (showAd && countdown === 0) {
      setShowAd(false);
      setIsAlarmRunning(false);
      stopAlarm();
    }
    return () => clearInterval(timer);
  }, [showAd, countdown, stopAlarm]);

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-lime-400 overflow-hidden flex flex-col items-stretch">
      {/* Header / Marquee Banner */}
      <div className="bg-black text-lime-400 py-2 border-b-2 border-black overflow-hidden flex whitespace-nowrap">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="flex gap-8 text-xs font-mono font-bold uppercase tracking-widest px-4"
        >
          <span>Atenção: Sistema de Alarme Ativo</span>
          <span>•</span>
          <span>Silence agora por apenas 15 segundos da sua vida</span>
          <span>•</span>
          <span>Patrocinado por Capitalismo Selvagem™</span>
          <span>•</span>
          <span>Atenção: Sistema de Alarme Ativo</span>
          <span>•</span>
          <span>Silence agora por apenas 15 segundos da sua vida</span>
        </motion.div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative gap-12">
        {/* Status Display */}
        <div className="text-center">
          <motion.h1 
            animate={isAlarmRunning ? { scale: [1, 1.05, 1], rotate: [0, 1, -1, 0] } : {}}
            transition={{ repeat: Infinity, duration: 0.1 }}
            className={`text-6xl md:text-9xl font-black uppercase leading-none tracking-tighter ${isAlarmRunning ? 'text-red-600' : isScheduled ? 'text-blue-600' : 'text-black'}`}
          >
            {isAlarmRunning ? "Alarme!" : isScheduled ? "Agendado" : "Seguro"}
          </motion.h1>
          <div className="mt-4 font-mono text-sm uppercase font-bold opacity-50 flex flex-col items-center gap-2">
            {isAlarmRunning ? (
              <span>Detectamos que você ainda está dormindo.</span>
            ) : isScheduled ? (
              <span>O alarme tocará às {alarmTime}. Não feche esta aba.</span>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <span>Defina a hora do despertar:</span>
                <input 
                  type="time" 
                  value={alarmTime}
                  onChange={(e) => setAlarmTime(e.target.value)}
                  className="text-4xl bg-white border-4 border-black p-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-lime-400 transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {/* The BIG Button */}
        <div className="relative group">
          <motion.div
            className={`absolute -inset-4 border-4 border-black -z-10 group-hover:inset-0 transition-all ${isScheduled ? 'bg-blue-300' : 'bg-lime-400'}`}
            animate={isAlarmRunning ? { scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
          />
          <button
            id="silence-btn"
            onClick={handleSilenceClick}
            disabled={showAd}
            className={`
              relative px-12 py-8 text-4xl md:text-6xl font-black uppercase border-4 border-black 
              transition-all active:translate-y-2 active:shadow-none
              ${showAd ? 'bg-gray-200 cursor-not-allowed text-gray-500' : 'bg-white hover:bg-black hover:text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}
            `}
          >
            {showAd ? "Processando..." : (isAlarmRunning ? "Silenciar Alarme" : isScheduled ? "Cancelar Alarme" : "Agendar Alarme")}
          </button>
        </div>

        {/* Warning Indicator */}
        <AnimatePresence>
          {isAlarmRunning && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="flex items-center gap-4 border-2 border-black p-4 bg-yellow-300 font-bold uppercase italic"
            >
              <AlertTriangle className="w-8 h-8 fill-black" />
              <span>O som continuará até o fim do anúncio!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Ad Overlay */}
      <AnimatePresence>
        {showAd && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            className="fixed inset-0 z-50 bg-white p-4 md:p-12 flex flex-col items-stretch overflow-y-auto"
          >
            {/* Ad Header */}
            <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-8">
              <div className="flex items-center gap-2">
                <Timer className="w-8 h-8 animate-spin-slow" />
                <span className="text-3xl font-black">{countdown}s</span>
              </div>
              <div className="flex items-center gap-2 bg-black text-white px-4 py-1 uppercase font-bold text-xs">
                <span>Anúncio</span>
                <DollarSign className="w-4 h-4 text-lime-400" />
              </div>
            </div>

            {/* Ad Content */}
            <div className="flex-1 flex flex-col md:flex-row gap-8">
              <div className="flex-1 bg-black border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-hidden relative">
                {adType === "video" ? (
                  <iframe 
                    className="w-full h-full aspect-video"
                    src="https://www.youtube.com/embed/jNQXAC9IVRw?autoplay=1&mute=1" 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                  />
                ) : (
                  <div className="bg-white p-8 border-4 border-black flex flex-col items-center gap-4 text-center">
                    {loadingPix ? (
                       <div className="w-64 h-64 flex flex-col items-center justify-center gap-4">
                          <Timer className="w-12 h-12 animate-spin" />
                          <p className="font-bold uppercase text-xs">Gerando PIX de R$ 1,00...</p>
                       </div>
                    ) : (
                       <>
                        {pixCode.startsWith("ERRO") ? (
                          <div className="w-64 h-64 border-4 border-dashed border-red-500 flex flex-col items-center justify-center p-4 text-red-600 bg-red-50">
                            <AlertTriangle className="w-12 h-12 mb-2" />
                            <p className="font-black text-sm uppercase">Falha na API</p>
                            <p className="text-[10px] mt-2 leading-tight">O sistema de pagamentos Paradise Pags pode estar fora do ar ou os dados da conta são inválidos.</p>
                          </div>
                        ) : (
                          <QRCodeSVG value={pixCode || "00020126360014br.gov.bcb.pix0114+551199999999952040000530398654041.005802BR5913ALVO_ALARMES6009SAO_PAULO62070503***6304E22D"} size={256} />
                        )}
                        <div>
                          <h2 className="text-2xl font-black uppercase">Pague p/ calar</h2>
                          <p className="font-mono text-xs opacity-60">
                            {pixCode.startsWith("ERRO") ? "Tente novamente mais tarde." : (pixCode ? 'QR Code gerado!' : 'carregando...')}
                          </p>
                          <p className="font-bold text-red-600 mt-2">VALOR: R$ 1,00</p>
                        </div>
                       </>
                    )}
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white border-2 border-black px-2 py-1 flex items-center gap-2 font-black cursor-pointer hover:bg-lime-400">
                  <span className="text-xs">SAIBA MAIS</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>

              <div className="md:w-1/3 flex flex-col gap-4">
                <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">
                  Por que esperar? <br />
                  <span className="text-lime-500">Assine o Premium!</span>
                </h3>
                <p className="font-medium text-lg leading-tight">
                  Remova anúncios irritantes e silencie seu alarme instantaneamente. Apenas R$ 29,90/mês.
                </p>
                <div className="flex flex-col gap-2 mt-auto">
                  <div className="border-2 border-black p-3 bg-gray-100 flex items-center justify-between font-bold">
                    <span>Plano Free</span>
                    <span className="text-red-500">ATORMENTADO</span>
                  </div>
                  <div className="border-2 border-black p-3 bg-lime-400 flex items-center justify-between font-bold">
                    <span>Plano Pro</span>
                    <span className="text-black">PAZ TOTAL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 border-t-4 border-black pt-4 text-center font-black uppercase opacity-20 text-xs tracking-widest italic">
               O alarme parará assim que o tempo acabar. Não adianta fechar o app.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating UI Accents */}
      {!showAd && (
        <>
          <div className="fixed top-20 right-10 rotate-12 bg-black text-white px-4 py-2 font-black uppercase text-sm border-2 border-white pointer-events-none">
            Grátis? Não aqui.
          </div>
          <div className="fixed bottom-20 left-10 -rotate-12 bg-lime-400 text-black px-4 py-2 font-black uppercase text-sm border-2 border-black pointer-events-none">
            Clique p/ Sofrer
          </div>
        </>
      )}

      {/* Fullscreen Overlay for interaction start */}
      {!isAlarmRunning && (
        <div className="fixed inset-0 z-0 cursor-pointer pointer-events-none opacity-5 flex items-end justify-end p-4">
           <Bell className="w-64 h-64" />
        </div>
      )}

      {/* Trap Popup */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-lg w-full bg-white border-4 border-black overflow-hidden shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]"
            >
              <button 
                onClick={() => setShowPopup(false)}
                className="absolute top-2 right-2 z-10 bg-black text-white p-2 hover:bg-red-600 transition-colors border-2 border-white"
              >
                <X className="w-6 h-6" />
              </button>
              
              <a 
                href="https://www.instagram.com/harpia.ctv/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block group"
              >
                <img 
                  src="/popup.png" 
                  alt="Harpia CTV Funnel"
                  className="w-full h-auto border-b-4 border-black group-hover:opacity-90 transition-opacity"
                  onError={(e) => {
                    // Fallback to stylized text if image is missing
                    (e.target as HTMLImageElement).src = "https://placehold.co/600x600/000000/FFFFFF?text=CAIU+NO+MEU+FUNNEL!%0Aclique+e+me+segue";
                  }}
                />
                <div className="p-6 bg-yellow-400 font-black uppercase text-center group-hover:bg-lime-400 transition-colors">
                  <p className="text-xl">Clique aqui e me segue no Insta!</p>
                  <p className="text-xs mt-2 font-mono">@harpia.ctv</p>
                </div>
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
