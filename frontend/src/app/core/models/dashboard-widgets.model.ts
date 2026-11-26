export interface AgendaEvent {
  id: number;
  event_date: string;
  event_time: string;
  title: string;
  tag: string;
  tone: 'violet' | 'amber' | 'mint';
}

export interface WeeklyAttendance {
  id: number;
  day_label: string;
  day_order: number;
  present_pct: number;
  absent_pct: number;
}

export interface NoticeItem {
  id: number;
  title: string;
  summary: string;
  author: string;
  category: string;
  published_at: string;
}
