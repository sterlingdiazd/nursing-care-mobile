import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getNurseCareRequestsInRange } from "@/src/services/careRequestService";
import type { CareRequestDto } from "@/src/types/careRequest";
import type { AdminCareRequestStatus } from "@/src/services/adminPortalService";
import { categoryOf, type CalendarAssignment } from "@/src/components/calendar/serviceCategory";
import type { CalendarView, CalendarDay } from "@/src/hooks/useServiceCalendar";

export type { CalendarView, CalendarDay };

export interface UseNurseServiceCalendarResult {
  view: CalendarView;
  setView: (v: CalendarView) => void;
  label: string; // e.g. "Mayo 2026" or "19 – 25 may"
  gridDays: CalendarDay[]; // 42 days (6 weeks) for the month grid
  weekDays: CalendarDay[]; // 7 days for the week of the selected day
  selectedDay: string;
  setSelectedDay: (iso: string) => void;
  assignmentsByDate: Record<string, CalendarAssignment[]>;
  isLoading: boolean;
  error: string | null;
  goPrev: () => void;
  goNext: () => void;
  goToday: () => void;
  reload: () => void;
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MONTHS_ES_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const atNoon = (y: number, m: number, day: number) => new Date(y, m, day, 12, 0, 0, 0);
const addDays = (d: Date, n: number) => atNoon(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => atNoon(d.getFullYear(), d.getMonth() + n, 1);
/** Monday-based weekday index: Mon=0 … Sun=6. */
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;
const startOfWeek = (d: Date) => addDays(d, -mondayIndex(d));

/**
 * Nurse-scoped service calendar hook. Mirrors useServiceCalendar but uses the
 * nurse's own care-requests endpoint instead of the admin one, and omits the
 * nurse roster (a nurse has no concept of "free nurses" relative to herself).
 */
export function useNurseServiceCalendar(enabled: boolean): UseNurseServiceCalendarResult {
  const today = useMemo(() => atNoon(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()), []);
  const todayIso = isoOf(today);

  const [anchor, setAnchor] = useState<Date>(() => atNoon(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState<CalendarView>("month");
  const [selectedDay, setSelectedDay] = useState<string>(todayIso);

  const [items, setItems] = useState<CareRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  // 6-week grid (42 days) starting on the Monday on/before the 1st of the anchor month.
  const gridStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const gridDates = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);
  const rangeFrom = isoOf(gridDates[0]);
  const rangeTo = isoOf(gridDates[41]);

  const load = useCallback(async () => {
    if (!enabled) return;
    const id = ++reqId.current;
    setIsLoading(true);
    setError(null);
    try {
      const careRequests = await getNurseCareRequestsInRange({ from: rangeFrom, to: rangeTo });
      if (id !== reqId.current) return;
      setItems(careRequests);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e instanceof Error ? e.message : "No fue posible cargar el calendario.");
    } finally {
      if (id === reqId.current) setIsLoading(false);
    }
  }, [enabled, rangeFrom, rangeTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const assignmentsByDate = useMemo(() => {
    const map: Record<string, CalendarAssignment[]> = {};
    for (const it of items) {
      const date = it.careRequestDate ? it.careRequestDate.slice(0, 10) : null;
      if (!date) continue;
      // CareRequestDto.status includes "Asignada" which is not in AdminCareRequestStatus;
      // map it to "Pending" so DayDetail's statusLabel renders "Pendiente" (its default).
      const mappedStatus: AdminCareRequestStatus =
        it.status === "Asignada" ? "Pending" : (it.status as AdminCareRequestStatus);
      const a: CalendarAssignment = {
        id: it.id,
        date,
        category: categoryOf(it.careRequestType ?? ""),
        careRequestType: it.careRequestType ?? "",
        nurseUserId: it.assignedNurse ?? null,
        nurseName: it.assignedNurseDisplayName ?? null,
        // CareRequestDto does not expose the client's display name to nurses.
        // Use the service description as the primary label in its place.
        clientName: it.careRequestDescription || "",
        status: mappedStatus,
        total: it.total ?? 0,
      };
      (map[date] ??= []).push(a);
    }
    return map;
  }, [items]);

  const toDay = useCallback(
    (d: Date): CalendarDay => {
      const iso = isoOf(d);
      const dayItems = assignmentsByDate[iso] ?? [];
      const categories = Array.from(new Set(dayItems.map((a) => a.category)));
      return {
        iso,
        inMonth: d.getMonth() === anchor.getMonth(),
        isToday: iso === todayIso,
        categories,
        count: dayItems.length,
        // Nurses see only their own assigned requests — no "unassigned" concept.
        hasUnassigned: false,
      };
    },
    [assignmentsByDate, anchor, todayIso],
  );

  const gridDays = useMemo(() => gridDates.map(toDay), [gridDates, toDay]);

  const weekDays = useMemo(() => {
    const sel = selectedDay ? new Date(`${selectedDay}T12:00:00`) : today;
    const ws = startOfWeek(sel);
    return Array.from({ length: 7 }, (_, i) => toDay(addDays(ws, i)));
  }, [selectedDay, today, toDay]);

  const label = useMemo(() => {
    if (view === "month") return `${MONTHS_ES[anchor.getMonth()].replace(/^./, (c) => c.toUpperCase())} ${anchor.getFullYear()}`;
    const ws = startOfWeek(new Date(`${selectedDay}T12:00:00`));
    const we = addDays(ws, 6);
    return `${ws.getDate()} ${MONTHS_ES_SHORT[ws.getMonth()]} – ${we.getDate()} ${MONTHS_ES_SHORT[we.getMonth()]}`;
  }, [view, anchor, selectedDay]);

  const goPrev = useCallback(() => {
    if (view === "month") setAnchor((a) => addMonths(a, -1));
    else setSelectedDay((s) => isoOf(addDays(new Date(`${s}T12:00:00`), -7)));
  }, [view]);

  const goNext = useCallback(() => {
    if (view === "month") setAnchor((a) => addMonths(a, 1));
    else setSelectedDay((s) => isoOf(addDays(new Date(`${s}T12:00:00`), 7)));
  }, [view]);

  const goToday = useCallback(() => {
    setAnchor(atNoon(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(todayIso);
  }, [today, todayIso]);

  return {
    view,
    setView,
    label,
    gridDays,
    weekDays,
    selectedDay,
    setSelectedDay,
    assignmentsByDate,
    isLoading,
    error,
    goPrev,
    goNext,
    goToday,
    reload: load,
  };
}
