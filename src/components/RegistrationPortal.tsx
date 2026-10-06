import React, { useState, useRef, useEffect } from 'react';
import { EventItem, Participant } from '../types';
import { extractFaceFeatures } from '../utils/faceEngine';
import { createAvatarDataUrl } from '../utils/mockData';
import { BadgeModal } from './BadgeModal';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  User,
  CreditCard,
  Building,
  RefreshCw,
  ScanFace,
  Upload,
} from 'lucide-react';

interface RegistrationPortalProps {
  event: EventItem;
  participants?: Participant[];
  onRegisterSuccess: (newParticipant: Participant, updatedEvent: EventItem) => void;
  onSwitchToKiosk?: () => void;
}

export const RegistrationPortal: React.FC<RegistrationPortalProps> = ({
  event,
  participants = [],
  onRegisterSuccess,
}) => {
  const [name, setName] = useState('');
  const [matricula, setMatricula] = useState('');
  const [organization, setOrganization] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Camera capture state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedEmbeddings, setCapturedEmbeddings] = useState<number[] | null>(null);
  const [qualityStats, setQualityStats] = useState<{
    lighting: number;
    sharpness: number;
    centering: number;
    isReady: boolean;
  }>({ lighting: 0, sharpness: 0, centering: 0, isReady: false });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Newly created participant for badge view
  const [registeredParticipant, setRegisteredParticipant] = useState<Participant | null>(null);
  const [showBadge, setShowBadge] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Time calculations
  const nowTime = new Date().getTime();
  const opensTime = new Date(event.registrationOpensAt).getTime();
  const closesTime = new Date(event.registrationClosesAt).getTime();
  const isBeforeOpen = nowTime < opensTime;
  const isAfterClose = nowTime > closesTime;

  // Capacity calculations
  const totalRegistered = event.categories.reduce((acc, c) => acc + c.registeredCount, 0);
  const remainingSpots = Math.max(0, event.totalCapacity - totalRegistered);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Câmera não suportada neste navegador.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // autoPlay may continue
        }
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error(err);
      setCameraError(
        err?.message || 'Permissão da câmera necessária. Certifique-se de liberar o acesso ou envie/gere uma foto.'
      );
      setIsCameraActive(false);
    }
  };

  // Ensure stream plays when isCameraActive changes
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
      const onLoaded = () => {
        monitorQuality();
      };
      if (videoRef.current.readyState >= 2) {
        monitorQuality();
      } else {
        videoRef.current.addEventListener('loadeddata', onLoaded, { once: true });
      }
    }
  }, [isCameraActive]);

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const monitorQuality = () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
    if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) {
      animFrameRef.current = requestAnimationFrame(monitorQuality);
      return;
    }

    try {
      const { quality } = extractFaceFeatures(videoRef.current);
      setQualityStats(quality);
    } catch {
      // Ignore
    }

    animFrameRef.current = requestAnimationFrame(monitorQuality);
  };

  const triggerPhotoCountdown = () => {
    if (countdown !== null) return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          takeSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 900);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const vW = videoRef.current.videoWidth || 640;
    const vH = videoRef.current.videoHeight || 480;
    if (vW === 0 || vH === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const minDim = Math.min(vW, vH);
    const startX = (vW - minDim) / 2;
    const startY = (vH - minDim) / 2;

    try {
      ctx.drawImage(videoRef.current, startX, startY, minDim, minDim, 0, 0, 480, 480);
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.92);

      const { descriptor, quality } = extractFaceFeatures(canvas);

      setCapturedPhoto(photoDataUrl);
      setCapturedEmbeddings(descriptor);
      setQualityStats({ ...quality, isReady: true });
      stopCamera();
    } catch (err) {
      console.error('Erro na captura da foto', err);
    }
  };

  const handleUseDemoPhoto = () => {
    const demoUrl = createAvatarDataUrl(name || 'Participante Cadastrado', ['#06b6d4', '#3b82f6']);
    const img = new Image();
    img.onload = () => {
      const { descriptor, quality } = extractFaceFeatures(img);
      setCapturedPhoto(demoUrl);
      setCapturedEmbeddings(descriptor);
      setQualityStats({ ...quality, isReady: true });
      stopCamera();
    };
    img.src = demoUrl;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const imgUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const { descriptor, quality } = extractFaceFeatures(img);
        setCapturedPhoto(imgUrl);
        setCapturedEmbeddings(descriptor);
        setQualityStats({ ...quality, isReady: true });
        stopCamera();
      };
      img.src = imgUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateError(null);

    const upperName = name.trim().toUpperCase();
    const cleanMatricula = matricula.replace(/\D/g, '').trim();
    const upperOrganization = organization.trim().toUpperCase();

    if (!upperName || !cleanMatricula || !upperOrganization) {
      setDuplicateError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!/^\d+$/.test(cleanMatricula)) {
      setDuplicateError('A matrícula deve conter estritamente apenas números (0-9).');
      return;
    }

    // REGRA 1: IMPEDIR CADASTRO COM MESMO NOME E MESMO NÚMERO DE MATRÍCULA
    const eventParticipants = participants.filter(p => p.eventId === event.id);

    const existingNameParticipant = eventParticipants.find(
      p => p.name.trim().toUpperCase() === upperName
    );
    const existingMatriculaParticipant = eventParticipants.find(
      p => p.matricula.trim() === cleanMatricula
    );

    if (existingNameParticipant && existingMatriculaParticipant) {
      setDuplicateError(
        `CADASTRO NÃO PERMITIDO: Já existe um participante registrado neste evento com o NOME "${upperName}" e com a MATRÍCULA "${cleanMatricula}".`
      );
      return;
    }

    if (existingNameParticipant) {
      setDuplicateError(
        `CADASTRO NÃO PERMITIDO: Já existe uma inscrição com o NOME "${upperName}". Informe o nome completo com sobrenome ou procure a administração.`
      );
      return;
    }

    if (existingMatriculaParticipant) {
      setDuplicateError(
        `CADASTRO NÃO PERMITIDO: O número de MATRÍCULA "${cleanMatricula}" já está cadastrado para o participante "${existingMatriculaParticipant.name}". Cada matrícula deve ser única.`
      );
      return;
    }

    if (remainingSpots <= 0) {
      setDuplicateError('Vagas esgotadas para este evento!');
      return;
    }

    const defaultCategory = event.categories[0] || {
      id: 'cat-geral',
      name: 'Participante',
      maxCapacity: event.totalCapacity,
      registeredCount: 0,
      checkedInCount: 0,
      color: '#06b6d4',
      price: '',
      description: '',
    };

    const participantId = `BIO-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrToken = `BIOPASS:${event.id}:${participantId}:SEC-${Math.floor(10000 + Math.random() * 90000)}`;

    const newParticipant: Participant = {
      id: participantId,
      eventId: event.id,
      name: upperName,
      matricula: cleanMatricula,
      organization: upperOrganization,
      categoryId: defaultCategory.id,
      categoryName: defaultCategory.name,
      photoUrl:
        capturedPhoto ||
        `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="45" fill="%2306b6d4"/><text x="50" y="55" font-size="20" fill="white" text-anchor="middle">${encodeURIComponent(
          upperName.slice(0, 2)
        )}</text></svg>`,
      faceEmbeddings: capturedEmbeddings || new Array(64).fill(0.12),
      qrToken,
      status: 'confirmed',
      registeredAt: new Date().toISOString(),
    };

    // Update category counts
    const updatedCategories = event.categories.map(c => {
      if (c.id === defaultCategory.id) {
        return { ...c, registeredCount: c.registeredCount + 1 };
      }
      return c;
    });

    const updatedEvent: EventItem = {
      ...event,
      categories: updatedCategories,
    };

    onRegisterSuccess(newParticipant, updatedEvent);
    setRegisteredParticipant(newParticipant);
    setShowBadge(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Status Alert: Countdown / Closed (se aplicável) */}
      {isBeforeOpen && (
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-center gap-3 text-blue-200">
          <Clock className="w-5 h-5 text-blue-400 shrink-0 animate-spin" />
          <div className="text-xs">
            <span className="font-bold">INSCRIÇÕES AINDA NÃO LIBERADAS:</span>
            <p className="text-blue-300/80 mt-0.5">
              A abertura oficial está programada para{' '}
              <span className="font-mono font-semibold text-white">
                {new Date(event.registrationOpensAt).toLocaleString('pt-BR')}
              </span>
              . O formulário abaixo será habilitado automaticamente nesta data e horário.
            </p>
          </div>
        </div>
      )}

      {isAfterClose && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-3 text-rose-200">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">PRAZO DE INSCRIÇÃO ENCERRADO:</span>
            <p className="text-rose-300/80 mt-0.5">
              O período de inscrições terminou em{' '}
              {new Date(event.registrationClosesAt).toLocaleString('pt-BR')}.
            </p>
          </div>
        </div>
      )}

      {/* Main Registration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Step 1: 1. Biometria Facial */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                1. Biometria Facial
              </h2>
              {capturedPhoto && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Capturada
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sua foto será convertida em vetor criptográfico de 64 pontos para check-in instantâneo no Totem
            </p>
          </div>

          {/* Camera Viewport or Snapshot Preview */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 flex items-center justify-center">
            {/* Background Camera Video: always mounted in DOM to guarantee ref is never null and stream attaches immediately */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] absolute inset-0 ${
                isCameraActive && !capturedPhoto ? 'block' : 'hidden'
              }`}
            />

            {isCameraActive && !capturedPhoto ? (
              <>
                {/* Biometric Oval Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-60 border-2 border-dashed border-cyan-400/70 rounded-[50%] shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse" />
                  <div className="absolute w-44 h-0.5 bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-pulse" />
                </div>

                {/* Countdown Overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-7xl font-mono font-extrabold text-cyan-400 animate-ping">
                      {countdown}
                    </span>
                  </div>
                )}

                {/* Real-time Quality Badges */}
                <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-lg p-2 flex items-center justify-between text-[10px] text-slate-300 font-mono">
                  <span>Luz: {qualityStats.lighting}%</span>
                  <span>Foco: {qualityStats.sharpness}%</span>
                  <span>Central: {qualityStats.centering}%</span>
                  <span className={qualityStats.isReady ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {qualityStats.isReady ? 'ALINHADO' : 'AJUSTE'}
                  </span>
                </div>
              </>
            ) : capturedPhoto ? (
              <div className="relative w-full h-full">
                <img
                  src={capturedPhoto}
                  alt="Biometria Facial Capturada"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/80 px-2 py-1 rounded-md border border-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Biometria Indexada
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPhoto(null);
                      setCapturedEmbeddings(null);
                      startCamera();
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refazer
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                  <ScanFace className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300">Câmera em Espera</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ligue a webcam para captura automática, carregue uma foto ou use a foto de demonstração
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="space-y-3">
            {cameraError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                {cameraError}
              </div>
            )}

            {isCameraActive ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerPhotoCountdown}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-900/40 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Capturar Foto (3s)
                </button>
                <button
                  type="button"
                  onClick={takeSnapshot}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
                >
                  Agora
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-medium transition-colors"
                >
                  Parar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-900/40 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Abrir Câmera ao Vivo
                  </button>

                  <label className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-center">
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>Carregar Arquivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleUseDemoPhoto}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                  title="Gera uma imagem biométrica imediata para cadastramento sem necessidade de webcam"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Usar Foto de Demonstração (Teste Rápido)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: 2. Dados do Participante */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              2. Dados do Participante
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Preencha seus dados para vinculação ao sistema de controle de portaria biométrica
            </p>
          </div>

          {/* Dados do Evento Vinculados ao Participante */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-400 block">Evento:</span>
                <span className="font-bold text-white text-xs block truncate" title={event.title}>
                  {event.title}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-slate-400 block">Local do Evento:</span>
                <span className="font-semibold text-slate-200 text-xs block truncate" title={event.description}>
                  {event.description || 'Centro de Eventos Principal'}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-amber-400 block">Prato do Dia:</span>
                <span className="font-bold text-amber-300 text-xs block truncate" title={event.location}>
                  {event.location || 'Menu Especial do Dia'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Duplicate or Validation Error Alert */}
            {duplicateError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600/80 text-rose-200 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">Atenção ao Cadastrar:</span>
                  <p className="leading-relaxed text-rose-200">{duplicateError}</p>
                </div>
              </div>
            )}

            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome Completo *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  disabled={isBeforeOpen || isAfterClose}
                  value={name}
                  onChange={e => {
                    setName(e.target.value.toUpperCase());
                    if (duplicateError) setDuplicateError(null);
                  }}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600 uppercase disabled:opacity-50"
                />
              </div>
            </div>

            {/* Matrícula */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Matrícula *
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={isBeforeOpen || isAfterClose}
                  value={matricula}
                  onChange={e => {
                    const onlyDigits = e.target.value.replace(/\D/g, '');
                    setMatricula(onlyDigits);
                    if (duplicateError) setDuplicateError(null);
                  }}
                  placeholder="Ex: 98401"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600 font-mono disabled:opacity-50"
                />
              </div>
            </div>

            {/* Empresa */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Empresa *
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  disabled={isBeforeOpen || isAfterClose}
                  value={organization}
                  onChange={e => {
                    setOrganization(e.target.value.toUpperCase());
                    if (duplicateError) setDuplicateError(null);
                  }}
                  placeholder="Nome da sua empresa"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600 uppercase disabled:opacity-50"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={
                  isBeforeOpen ||
                  isAfterClose ||
                  !capturedPhoto ||
                  remainingSpots <= 0
                }
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-lg shadow-cyan-950 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Confirmar Inscrição & Gerar Passaporte</span>
              </button>
              {!capturedPhoto && (
                <p className="text-[11px] text-amber-400/90 text-center mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Capture ou envie sua biometria facial no passo 1 ao lado para concluir
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Badge Modal on Success */}
      {showBadge && registeredParticipant && (
        <BadgeModal
          participant={registeredParticipant}
          event={event}
          onClose={() => setShowBadge(false)}
        />
      )}
    </div>
  );
};
