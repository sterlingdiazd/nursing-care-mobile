import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getCareRequestsInRange,
  getActiveNurseProfilesPaged,
  type AdminCareRequestListItemDto,
} from "@/src/services/adminPortalService";
import { categoryOf, type CalendarAssignment, type ServiceCategory } from "@/src/components/calendar/serviceCategory";

export type CalendarView = "month" | "week";

export interface CalendarDay {
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  categories: ServiceCategory[]; // distinct categories present that day (for dots)
  count: number; // total assignments + unassigned slots that day
  hasUnassigned: boolean;
}

export interface CalendarNurse {
  userId: string;
  name: string;
}

export interface UseServiceCalendarResult {
  view: CalendarView;
  setView: (v: CalendarView) => void;
  label: string; // e.g. "Mayo 2026" or "19 – 25 may"
  gridDays: CalendarDay[]; // 42 days (6 weeks) for the month grid
  weekDays: CalendarDay[]; // 7 days for the week of the selected day
  selectedDay: string;
  setSelectedDay: (iso: string) => void;
  assignmentsByDate: Record<string, CalendarAssignment[]>;
  roster: CalendarNurse[];
  isLoading: boolean;
  error: string | null;
  goPrev: () => void;
  goNext: () => void;
  goToday: () => void;
  reload: () => void;
}

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTHS_ES_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const atNoon = (y: number, m: number, day: number) => new Date(y, m, day, 12, 0, 0, 0);
const addDays = (d: Date, n: number) => atNoon(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => atNoon(d.getFullYear(), d.getMonth() + n, 1);
/** Monday-based weekday index: Mon=0 … Sun=6. */
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;
const startOfWeek = (d: Date) => addDays(d, -mondayIndex(d));

export function useServiceCalendar(enabled: boolean): UseServiceCalendarResult {
  const today = useMemo(() => atNoon(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()), []);
  const todayIso = isoOf(today);

  const [anchor, setAnchor] = useState<Date>(() => atNoon(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState<CalendarView>("month");
  const [selectedDay, setSelectedDay] = useState<string>(todayIso);

  const [items, setItems] = useState<AdminCareRequestListItemDto[]>([]);
  const [roster, setRoster] = useState<CalendarNurse[]>([]);
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
      const [careRequests, nurses] = await Promise.all([
        getCareRequestsInRange({ from: rangeFrom, to: rangeTo }),
        getActiveNurseProfilesPaged({ page: 1, pageSize: 100 }),
      ]);
      if (id !== reqId.current) return;
      setItems(careRequests);
      setRoster(
        nurses.items.map((n) => ({
          userId: n.userId,
          name: `${n.name ?? ""} ${n.lastName ?? ""}`.trim() || "Enfermera",
        })),
      );
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
      const a: CalendarAssignment = {
        id: it.id,
        date,
        category: categoryOf(it.careRequestType),
        careRequestType: it.careRequestType,
        nurseUserId: it.assignedNurseUserId,
        nurseName: it.assignedNurseDisplayName,
        clientName: it.clientDisplayName,
        status: it.status,
        total: it.total,
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
        hasUnassigned: dayItems.some((a) => !a.nurseUserId),
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
    roster,
    isLoading,
    error,
    goPrev,
    goNext,
    goToday,
    reload: load,
  };
}
