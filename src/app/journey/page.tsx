'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { MapPin, CheckCircle, Lock, Lightning, Cards, Desktop, ArrowRight, Fire, ArrowCounterClockwise } from '@phosphor-icons/react';
import { JOURNEY_DAYS, JourneyDay } from '@/data/journeySchedule';
import { useUser } from '@/lib/useUser';
import { getScopedJSON, setScopedJSON, removeScopedKey } from '@/lib/userStorage';
import { GuestLimitModal } from '@/components/GuestLimitModal';

const KEY_COMPLETED = 'journey_completed_days';
const KEY_STREAK = 'journey_streak_dates';
const KEY_TODAY_LOGGED = 'journey_today_logged_day';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function prevDateStr(dateStr: string): string {
  const dt = new Date(dateStr);
  dt.setDate(dt.getDate() - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = Array.from(new Set(dates)).sort().reverse();
  const today = todayStr();
  const yesterday = prevDateStr(today);
  if (unique[0] !== today && unique[0] !== yesterday) return 0;
  let streak = 0;
  let expected = unique[0];
  for (const d of unique) {
    if (d === expected) {
      streak++;
      expected = prevDateStr(d);
    } else {
      break;
    }
  }
  return streak;
}

const actionIcon: Record<JourneyDay['actionType'], React.ReactNode> = {
  drill: <Lightning size={14} weight="fill" />,
  flashcard: <Cards size={14} weight="fill" />,
  simulasi: <Desktop size={14} weight="fill" />,
  review: <ArrowCounterClockwise size={14} weight="fill" />,
};

const catColor: Record<string, string> = { TWK: '#3b82f6', TIU: '#8b5cf6', TKP: '#f59e0b', CAMPURAN: '#10b981' };

const PHASE_LABELS: Record<number, { color: string; bg: string }> = {
  1: { color: '#3b82f6', bg: '#eff6ff' },
  2: { color: '#8b5cf6', bg: '#f5f3ff' },
  3: { color: '#c96442', bg: '#fff7ed' },
};

export default function JourneyPage() {
  const { user, loading: userLoading } = useUser();
  const userId = user?.id ?? null;

  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [streakDates, setStreakDates] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const todayRef = useRef<HTMLDivElement | null>(null);

  // Simpan hari mana yang di-log oleh tombol hari ini (bukan manual toggle)
  const [todayLoggedDay, setTodayLoggedDay] = useState<number | null>(null);

  // Cek apakah guest sudah pernah mencoba mencatat progress roadmap
  useEffect(() => {
    if (!user && !userLoading && typeof window !== 'undefined') {
      if (localStorage.getItem('lolos_guest_tried_journey') === 'true') {
        setShowGuestModal(true);
      }
    }
  }, [user, userLoading]);

  // Muat ulang state setiap kali user login / ganti akun / logout
  useEffect(() => {
    if (userLoading) return;

    if (!userId) {
      // Jika guest / logged out: tampilkan state kosong/bersih total (tidak ada data leak)
      setCompleted(new Set());
      setStreakDates([]);
      setTodayLoggedDay(null);
      setLoaded(true);
      return;
    }

    const savedCompleted = getScopedJSON<number[]>(KEY_COMPLETED, userId, []);
    setCompleted(new Set(savedCompleted));

    const savedStreaks = getScopedJSON<string[]>(KEY_STREAK, userId, []);
    setStreakDates(savedStreaks);

    const savedTodayLog = getScopedJSON<{ date: string; day: number } | null>(KEY_TODAY_LOGGED, userId, null);
    if (savedTodayLog && savedTodayLog.date === todayStr()) {
      setTodayLoggedDay(savedTodayLog.day);
    } else {
      setTodayLoggedDay(null);
    }

    setLoaded(true);
  }, [userId, userLoading]);

  const activeDay = JOURNEY_DAYS.find((d) => !completed.has(d.day))?.day ?? 30;

  useEffect(() => {
    if (loaded && todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loaded]);

  function toggleDay(day: number) {
    const next = new Set(completed);
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
      const today = todayStr();
      if (!streakDates.includes(today)) {
        const nextDates = [today, ...streakDates];
        setStreakDates(nextDates);
        setScopedJSON(KEY_STREAK, userId, nextDates);
      }
    }
    setCompleted(next);
    setScopedJSON(KEY_COMPLETED, userId, Array.from(next));

    if (!user) {
      try {
        localStorage.setItem('lolos_guest_tried_journey', 'true');
      } catch {}
      setShowGuestModal(true);
    }
  }

  function handleLogToday() {
    const today = todayStr();
    if (streakDates.includes(today)) return;
    const nextDates = [today, ...streakDates];
    setStreakDates(nextDates);
    setScopedJSON(KEY_STREAK, userId, nextDates);

    if (!completed.has(activeDay)) {
      const next = new Set(completed);
      next.add(activeDay);
      setCompleted(next);
      setScopedJSON(KEY_COMPLETED, userId, Array.from(next));
    }
    setTodayLoggedDay(activeDay);
    setScopedJSON(KEY_TODAY_LOGGED, userId, { date: today, day: activeDay });

    if (!user) {
      try {
        localStorage.setItem('lolos_guest_tried_journey', 'true');
      } catch {}
      setShowGuestModal(true);
    }
  }

  function handleUndoToday() {
    const today = todayStr();
    const nextDates = streakDates.filter((d) => d !== today);
    setStreakDates(nextDates);
    setScopedJSON(KEY_STREAK, userId, nextDates);

    if (todayLoggedDay !== null && completed.has(todayLoggedDay)) {
      const next = new Set(completed);
      next.delete(todayLoggedDay);
      setCompleted(next);
      setScopedJSON(KEY_COMPLETED, userId, Array.from(next));
    }
    setTodayLoggedDay(null);
    removeScopedKey(KEY_TODAY_LOGGED, userId);
  }

  function resetAll() {
    const empty = new Set<number>();
    setCompleted(empty);
    setScopedJSON(KEY_COMPLETED, userId, []);
    setStreakDates([]);
    setScopedJSON(KEY_STREAK, userId, []);
    setTodayLoggedDay(null);
    removeScopedKey(KEY_TODAY_LOGGED, userId);
  }

  const pct = Math.round((completed.size / JOURNEY_DAYS.length) * 100);
  const streak = calcStreak(streakDates);
  // Sekali sehari: cukup cek apakah tanggal hari ini sudah ada di streakDates
  const loggedToday = streakDates.includes(todayStr());

  // Group by phase
  const phases = [1, 2, 3] as const;
  const daysByPhase = (phase: number) => JOURNEY_DAYS.filter((d) => d.phase === phase);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#faf9f5' }}>
        <div className="text-gray-500">Memuat perjalanan belajar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: '#faf9f5' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <MapPin size={22} weight="fill" style={{ color: '#c96442' }} />
              <h1 className="text-lg font-bold text-gray-800">Roadmap 30 Hari</h1>
            </div>
            <button onClick={resetAll} className="text-xs text-gray-400 underline hover:text-gray-600">
              Reset Progress
            </button>
          </div>
          <p className="text-xs text-gray-500 ml-7">Rencana belajar terstruktur untuk lolos SKD CPNS</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-5 pt-5">
        {/* Progress Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {completed.size}
                <span className="text-base font-medium text-gray-400"> / 30 Hari</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{pct}% kurikulum selesai</p>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
              <Fire size={16} weight="fill" color="#f97316" />
              <span className="text-sm font-bold text-orange-700">{streak}</span>
              <span className="text-xs text-orange-600">hari streak</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#c96442' }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Fase 1: TWK</span>
              <span>Fase 2: TIU</span>
              <span>Fase 3: TKP + Simulasi</span>
            </div>
          </div>

          {/* Tombol Sudah Mengerjakan Hari Ini */}
          {completed.size < 30 && (
            <div className="space-y-1">
              {loggedToday && (
                <div className="flex justify-end">
                  <button
                    onClick={handleUndoToday}
                    className="text-[11px] text-gray-400 hover:text-red-500 underline transition"
                  >
                    Batalkan hari ini
                  </button>
                </div>
              )}
              <button
                onClick={handleLogToday}
                disabled={loggedToday}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition ${
                  loggedToday
                    ? 'bg-green-100 text-green-700 cursor-default border-2 border-green-200'
                    : 'text-white'
                }`}
                style={loggedToday ? {} : { background: '#c96442' }}
              >
                {loggedToday ? (
                  <>
                    <CheckCircle size={18} weight="fill" />
                    Sudah Mengerjakan Hari Ini ✓
                  </>
                ) : (
                  <>
                    <Fire size={18} weight="fill" />
                    Sudah Mengerjakan Hari Ini
                  </>
                )}
              </button>
            </div>
          )}
          {completed.size < 30 && (
            <button
              onClick={() => todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition"
            >
              Lihat Materi Hari Ini
              <ArrowRight size={14} weight="bold" />
            </button>
          )}
          {completed.size === 30 && (
            <div className="flex items-center gap-2 justify-center text-green-700 font-semibold text-sm">
              <CheckCircle size={20} weight="fill" /> Roadmap 30 Hari Selesai! 🎉
            </div>
          )}

          {streak > 0 && (
            <p className="text-[10px] text-center text-gray-400">
              🔥 Kamu sudah belajar {streak} hari berturut-turut. Jangan putus besok!
            </p>
          )}
        </div>

        {/* Timeline per phase */}
        {phases.map((phase) => {
          const days = daysByPhase(phase);
          const phaseMeta = PHASE_LABELS[phase];
          const firstDay = days[0];
          return (
            <div key={phase} className="space-y-3">
              {/* Phase header */}
              <div
                className="px-4 py-2 rounded-xl flex items-center gap-2"
                style={{ background: phaseMeta.bg, border: `1px solid ${phaseMeta.color}33` }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ background: phaseMeta.color }}
                >
                  {phase}
                </div>
                <p className="text-sm font-bold" style={{ color: phaseMeta.color }}>
                  {firstDay.phaseTitle}
                </p>
                <span className="ml-auto text-[10px] text-gray-400">Hari {days[0].day}–{days[days.length - 1].day}</span>
              </div>

              {/* Day cards */}
              <div className="space-y-2 pl-2">
                {days.map((d) => {
                  const isDone = completed.has(d.day);
                  const isToday = d.day === activeDay;
                  const isLocked = d.day > activeDay + 2; // allow 2 days ahead

                  let borderStyle = 'border-gray-100';
                  let bgStyle = 'bg-white';
                  if (isDone) { borderStyle = 'border-green-200'; bgStyle = 'bg-green-50/50'; }
                  else if (isToday) { borderStyle = 'border-[#c96442]'; bgStyle = 'bg-white'; }

                  return (
                    <div
                      key={d.day}
                      ref={isToday ? todayRef : undefined}
                      className={`rounded-xl border-2 ${borderStyle} ${bgStyle} p-4 transition-all ${isLocked ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Day number / check */}
                        <button
                          onClick={() => !isLocked && toggleDay(d.day)}
                          disabled={isLocked}
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition ${
                            isDone ? 'bg-green-500 text-white' : isLocked ? 'bg-gray-200 text-gray-400' : 'border-2 border-gray-300 text-gray-500 hover:border-[#c96442]'
                          }`}
                          aria-label={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
                        >
                          {isDone ? (
                            <CheckCircle size={18} weight="fill" />
                          ) : isLocked ? (
                            <Lock size={14} weight="fill" />
                          ) : (
                            d.day
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            {isToday && !isDone && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: '#c96442' }}>
                                HARI INI
                              </span>
                            )}
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                              style={{ background: catColor[d.category] ?? '#6b7280' }}
                            >
                              {d.category}
                            </span>
                            <span className="text-[10px] text-gray-400">~{d.estimatedMinutes} menit</span>
                          </div>
                          <p className={`text-sm font-semibold ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {d.title}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{d.description}</p>

                          {/* Action button */}
                          {!isDone && !isLocked && (
                            <Link
                              href={d.actionUrl}
                              className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
                              style={{ background: '#c96442' }}
                            >
                              <span>{actionIcon[d.actionType]}</span>
                              {d.actionLabel}
                              <ArrowRight size={12} weight="bold" />
                            </Link>
                          )}
                          {isDone && (
                            <p className="mt-1.5 text-[10px] text-green-600 font-medium">✓ Selesai dipelajari</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guest Limit Modal */}
      <GuestLimitModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        featureName="Roadmap 30 Hari"
        title="Simpan Progres Belajarmu"
        description="Kamu telah menandai materi belajar hari ini. Daftar atau masuk akun gratis agar progres kurikulum 30 hari dan streak belajarmu tidak hilang saat peramban ditutup."
      />
    </div>
  );
}
