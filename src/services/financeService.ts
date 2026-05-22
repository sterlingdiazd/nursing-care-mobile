import { requestJson } from "@/src/services/httpClient";

export interface Metric {
  value: number;
  previousValue: number;
  delta: number;
  deltaPercent: number | null;
}

export interface FinanceSummary {
  revenue: Metric;
  collected: Metric;
  pending: number;
  laborCost: Metric;
  grossMargin: Metric;
  marginPercent: number;
  servicesCount: Metric;
  activeNurses: number;
}

export interface CategoryMargin {
  category: string;
  displayName: string;
  revenue: number;
  labor: number;
  margin: number;
  marginPercent: number;
}

export interface ServiceLineMargin {
  serviceLine: string;
  revenue: number;
  labor: number;
  margin: number;
  marginPercent: number;
}

export interface ClientRevenueRow {
  clientName: string;
  servicesCount: number;
  billed: number;
  collected: number;
  pending: number;
  margin: number;
}

export interface NurseParticipationRow {
  nurseName: string;
  servicesCount: number;
  daysWorked: number;
  revenueGenerated: number;
  netPay: number;
  participationPercent: number;
  marginContributed: number;
  loanOutstanding: number;
}

export interface NurseLoanRow {
  nurseName: string;
  outstandingBalance: number;
}

export interface TrendPoint {
  label: string;
  revenue: number;
  margin: number;
}

export type HealthStatus = "green" | "amber" | "red";

export interface HealthIndicator {
  key: string;
  title: string;
  status: HealthStatus;
  value: number;
  valueLabel: string;
  target: number;
  explanation: string;
  drivers: string[];
}

export interface Insight {
  key: string;
  severity: "info" | "warning" | "danger";
  title: string;
  detail: string;
  deepLinkPath: string | null;
}

export interface FinanceOverview {
  from: string;
  to: string;
  summary: FinanceSummary;
  byCategory: CategoryMargin[];
  byServiceLine: ServiceLineMargin[];
  topClients: ClientRevenueRow[];
  nurseParticipation: NurseParticipationRow[];
  loans: NurseLoanRow[];
  totalLoansOutstanding: number;
  monthlyTrend: TrendPoint[];
  health: HealthIndicator[];
  insights: Insight[];
}

export interface FinanceField {
  label: string;
  value: string;
  emphasize: boolean;
}

export interface FinanceDetailRow {
  primary: string;
  meta: string;
  amount: string;
  barFraction: number;
  facts: FinanceField[];
}

export interface FinanceDetail {
  title: string;
  explanation: string | null;
  headline: string;
  headlineCaption: string;
  summary: FinanceField[];
  rows: FinanceDetailRow[];
  footnote: string | null;
}

export async function getFinanceDetail(
  metric: string,
  params?: { from?: string; to?: string },
): Promise<FinanceDetail> {
  const qs = new URLSearchParams();
  qs.append("metric", metric);
  if (params?.from) qs.append("from", params.from);
  if (params?.to) qs.append("to", params.to);
  return requestJson<FinanceDetail>({
    path: `/api/admin/finance/detail?${qs.toString()}`,
    method: "GET",
    auth: true,
  });
}

export async function getFinanceOverview(params?: { from?: string; to?: string }): Promise<FinanceOverview> {
  const qs = new URLSearchParams();
  if (params?.from) qs.append("from", params.from);
  if (params?.to) qs.append("to", params.to);
  const query = qs.toString();
  return requestJson<FinanceOverview>({
    path: `/api/admin/finance/overview${query ? `?${query}` : ""}`,
    method: "GET",
    auth: true,
  });
}
