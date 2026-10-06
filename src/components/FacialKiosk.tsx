import React, { useRef, useState, useEffect, useCallback } from 'react';
import { EventItem, Participant } from '../types';
import {
  extractFaceFeatures,
  matchFaceWithRegistry,
  drawBiometricHUD,
} from '../utils/faceEngine';
import {
  playAccessGrantedSound,
  playAccessDeniedSound,
  playScanChirp,
} from '../utils/soundEffects';
import { recordCheckIn } from '../utils/storage';
import {
  Camera,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  Maximize2,
  Volume2,
  Users,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface FacialKioskProps {
  event: EventItem;
  participants: Participant[];
  onCheckInCompleted: (participant: Participant, updatedEvent: EventItem) => void;
  onExitKiosk: () => void;
}

export const FacialKiosk: React.FC<FacialKioskProps> = ({
  event,
  participants,
  onCheckInCompleted,
  onExitKiosk,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Kiosk state
  const [matchState, setMatchState] = useState<'idle' | 'scanning' | 'success' | 'denied'>('idle');
  const [activeMatch, setActiveMatch] = useState<{
    participant: Participant;
    confidence: number;
    timestamp: string;
  } | null>(null);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [terminalId] = useState<string>('TOTEM-PORTAL-MASTER-01');

  // Manual QR input backup
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [manualQrCode, setManualQrCode] = useState<string>('');

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Câmera não suportada neste ambiente. Você pode validar o fluxo via Simulação ou QR Code.');
        setIsCameraActive(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(playErr => {
          console.warn('Video play warning:', playErr);
        });
      }
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.warn('Camera error', err);
      setCameraError('Câmera ocupada ou permissão pendente. Use a simulação abaixo ou insira o QR Code.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Main Biometric Tracking & HUD Loop
  useEffect(() => {
    if (!isCameraActive || !videoRef.current || !canvasRef.current) return;

    let scanLine = 0;
    let scanDirection = 1;
    let framesSinceLastAttempt = 0;

    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (
        !video ||
        !canvas ||
        video.paused ||
        video.ended ||
        video.readyState < 2 ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Face tracking box in viewport center
      const boxWidth = width * 0.46;
      const boxHeight = height * 0.68;
      const faceBox = {
        x: (width - boxWidth) / 2,
        y: (height - boxHeight) / 2,
        width: boxWidth,
        height: boxHeight,
      };

      // Animate laser scan line
      scanLine += 0.015 * scanDirection;
      if (scanLine >= 1) {
        scanLine = 1;
        scanDirection = -1;
      } else if (scanLine <= 0) {
        scanLine = 0;
        scanDirection = 1;
      }
      setScanProgress(scanLine);

      try {
        // Extract landmarks and features
        const { landmarks, quality } = extractFaceFeatures(video, faceBox);

        // Draw biometric HUD overlay
        drawBiometricHUD(
          ctx,
          width,
          height,
          faceBox,
          landmarks,
          matchState === 'scanning',
          matchState,
          scanLine,
          activeMatch?.participant.name
        );

        // Attempt matching periodically if ready and not in cooldown
        framesSinceLastAttempt++;
        if (
          framesSinceLastAttempt > 35 &&
          !isProcessing &&
          matchState === 'idle' &&
          quality.isReady
        ) {
          framesSinceLastAttempt = 0;
          evaluateFace(faceBox);
        }
      } catch (err) {
        console.warn('HUD draw warning', err);
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isCameraActive, matchState, isProcessing, activeMatch]);

  const evaluateFace = (faceBox: { x: number; y: number; width: number; height: number }) => {
    if (!videoRef.current || isProcessing) return;

    setIsProcessing(true);
    setMatchState('scanning');
    playScanChirp();

    setTimeout(() => {
      if (!videoRef.current) {
        setIsProcessing(false);
        setMatchState('idle');
        return;
      }

      const { descriptor } = extractFaceFeatures(videoRef.current, faceBox);
      const match = matchFaceWithRegistry(descriptor, participants, 0.76);

      if (match.matched && match.participant) {
        handleGrantAccess(match.participant, match.confidence, 'face');
      } else {
        // If not matched
        handleDenyAccess();
      }
    }, 600);
  };

  const handleGrantAccess = (
    participant: Participant,
    confidence: number,
    method: 'face' | 'qrcode'
  ) => {
    setMatchState('success');
    setActiveMatch({
      participant,
      confidence,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    });
    playAccessGrantedSound();

    // Record check-in to persistence & push alert
    const { updatedParticipant, updatedEvent } = recordCheckIn(
      participant,
      event,
      method,
      confidence,
      terminalId
    );

    onCheckInCompleted(updatedParticipant, updatedEvent);

    // Auto-reset kiosk after 4 seconds
    setTimeout(() => {
      setMatchState('idle');
      setActiveMatch(null);
      setIsProcessing(false);
    }, 4000);
  };

  const handleDenyAccess = () => {
    setMatchState('denied');
    playAccessDeniedSound();

    setTimeout(() => {
      setMatchState('idle');
      setIsProcessing(false);
    }, 2500);
  };

  // QR Code Instant Verification
  const handleQrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQrCode.trim()) return;

    const query = manualQrCode.trim().toLowerCase();
    const found = participants.find(
      p =>
        p.id.toLowerCase() === query ||
        p.qrToken.toLowerCase().includes(query) ||
        (p.matricula && p.matricula.toLowerCase().includes(query)) ||
        (p.document && p.document.toLowerCase().includes(query))
    );

    if (found) {
      setShowQrModal(false);
      setManualQrCode('');
      handleGrantAccess(found, 100, 'qrcode');
    } else {
      playAccessDeniedSound();
      alert('QR Code ou Credencial não localizada na lista de inscritos deste evento.');
    }
  };

  // Quick Test Attendee Picker (Simulator)
  const handleSimulateParticipant = (p: Participant) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setMatchState('scanning');
    playScanChirp();

    setTimeout(() => {
      const conf = Math.round((97 + Math.random() * 2.8) * 10) / 10;
      handleGrantAccess(p, conf, 'face');
    }, 500);
  };

  const handleSimulateUnknown = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setMatchState('scanning');
    playScanChirp();

    setTimeout(() => {
      handleDenyAccess();
    }, 600);
  };

  const currentCategory = activeMatch && event.categories
    ? event.categories.find(c => c.id === activeMatch.participant.categoryId)
    : null;

  return (
    <div
      className={`relative w-full ${
        isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'max-w-6xl mx-auto py-4 px-4'
      }`}
    >
      {/* Top Bar inside Kiosk */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Totem de Portaria · Reconhecimento Facial</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                {terminalId}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              {event.title} · Acesso Automatizado 24/7
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Check-in via QR</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Tela Cheia"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {!isFullscreen && (
            <button
              onClick={onExitKiosk}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Voltar ao Painel
            </button>
          )}
        </div>
      </div>

      {/* Main Kiosk Surface */}
      <div className="relative aspect-[16/10] max-h-[72vh] w-full bg-black overflow-hidden border-x border-b border-slate-800 rounded-b-2xl flex items-center justify-center">
        {/* Background Camera Video: always mounted so videoRef is available */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
            isCameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Fallback Camera Placeholder when camera is inactive or denied */}
        {!isCameraActive && (
          <div className="text-center p-8 text-slate-500 space-y-3 z-10 bg-slate-950/80 backdrop-blur-sm rounded-2xl border border-slate-800 max-w-md mx-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 mx-auto">
              <Camera className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-slate-200">Câmera não conectada</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {cameraError || 'Inicie a webcam ou utilize a barra de testes rápidos abaixo para validar o fluxo de reconhecimento.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-cyan-950 flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Conectar Câmera</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>Digitar QR / ID</span>
              </button>
            </div>
          </div>
        )}

        {/* Biometric Canvas HUD (Overlay) */}
        <canvas
          ref={canvasRef}
          width={1280}
          height={800}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />

        {/* Access Granted Pop-up Banner */}
        {matchState === 'success' && activeMatch && (
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md z-30 flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-emerald-500/30 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-4 border-emerald-400 p-0.5 bg-slate-950 shadow-lg">
                <img
                  src={activeMatch.participant.photoUrl}
                  alt={activeMatch.participant.name}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  ACESSO AUTORIZADO · {activeMatch.confidence}% MATCH
                </div>
                <h2 className="text-2xl font-extrabold text-white">
                  {activeMatch.participant.name}
                </h2>
                {activeMatch.participant.organization && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeMatch.participant.organization}
                  </p>
                )}
              </div>

              {/* Category Ribbon */}
              <div
                className="py-1.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider mx-auto inline-block"
                style={{
                  backgroundColor: `${currentCategory?.color || '#10b981'}25`,
                  color: currentCategory?.color || '#34d399',
                  border: `1px solid ${currentCategory?.color || '#10b981'}66`,
                }}
              >
                {activeMatch.participant.categoryName || 'Inscrição Confirmada'}
              </div>

              <div className="pt-2 text-[11px] font-mono text-slate-400 flex items-center justify-center gap-4">
                <span>ID: {activeMatch.participant.id}</span>
                <span>Hora: {activeMatch.timestamp}</span>
              </div>
            </div>
          </div>
        )}

        {/* Access Denied Pop-up */}
        {matchState === 'denied' && (
          <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-md z-30 flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-slate-900 border-2 border-rose-500/80 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl shadow-rose-500/30 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-950 border border-rose-600 flex items-center justify-center text-rose-400">
                <XCircle className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Rosto Não Reconhecido</h2>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Não foi encontrado um cadastro correspondente a este rosto. Por favor, apresente seu QR Code ou dirija-se à recepção de credenciamento.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instruction Footer Inside Viewport */}
        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-xs text-slate-300 font-mono pointer-events-none z-20">
          <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>ALINHE O ROSTO DENTRO DO RETÍCULO</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>SINAL SONORO ATIVADO</span>
          </div>
        </div>
      </div>

      {/* Simulator & Instant Test Suite Bar */}
      <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Simulador Rápido de Testes de Portaria
            </h3>
            <p className="text-[11px] text-slate-400">
              Clique em um dos participantes inscritos para simular a leitura facial em tempo real no Totem:
            </p>
          </div>
          <button
            onClick={handleSimulateUnknown}
            className="px-3 py-1 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs font-medium rounded-lg transition-colors shrink-0"
          >
            Simular Pessoa Não Cadastrada (Negar)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {participants.slice(0, 7).map(p => (
            <button
              key={p.id}
              onClick={() => handleSimulateParticipant(p)}
              disabled={isProcessing}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs flex items-center gap-2 transition-all hover:border-cyan-500 text-left disabled:opacity-50"
            >
              <img src={p.photoUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
              <span className="font-medium text-slate-200 truncate max-w-[120px]">{p.name}</span>
              <span className="text-[10px] text-cyan-400 font-mono">[{p.matricula || p.id}]</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modal for QR Code input */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-cyan-400" />
                Validação de QR Code / ID
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Insira o ID do participante (ex: BIO-1001) ou o código do passaporte para validar a entrada:
            </p>
            <form onSubmit={handleQrSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                required
                value={manualQrCode}
                onChange={e => setManualQrCode(e.target.value)}
                placeholder="Ex: BIO-1001"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                >
                  Liberar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
