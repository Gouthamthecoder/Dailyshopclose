import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DollarSign,
  Users,
  CreditCard,
  Smartphone,
  Banknote,
  TrendingUp,
  CalendarIcon,
  Zap,
  Receipt,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import type { DailyClosing } from "@shared/schema";

type DateRange = "today" | "week" | "month" | "custom";

export default function Dashboard() {
  const [range, setRange] = useState<DateRange>("week");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(subDays(new Date(), 7));
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const getDateParams = () => {
    const today = new Date();
    let from: string, to: string;

    switch (range) {
      case "today":
        from = to = format(today, "yyyy-MM-dd");
        break;
      case "week":
        from = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
        to = format(today, "yyyy-MM-dd");
        break;
      case "month":
        from = format(startOfMonth(today), "yyyy-MM-dd");
        to = format(endOfMonth(today), "yyyy-MM-dd");
        break;
      case "custom":
        from = customFrom ? format(customFrom, "yyyy-MM-dd") : format(subDays(today, 7), "yyyy-MM-dd");
        to = customTo ? format(customTo, "yyyy-MM-dd") : format(today, "yyyy-MM-dd");
        break;
    }
    return { from, to };
  };

  const { from, to } = getDateParams();

  const { data: closings, isLoading } = useQuery<DailyClosing[]>({
    queryKey: [`/api/closings?from=${from}&to=${to}`],
  });

  const totalSales = closings?.reduce((sum, c) => sum + (c.salesCash + c.salesUpi + c.salesCard), 0) ?? 0;
  const totalCash = closings?.reduce((sum, c) => sum + c.salesCash, 0) ?? 0;
  const totalUpi = closings?.reduce((sum, c) => sum + c.salesUpi, 0) ?? 0;
  const totalCard = closings?.reduce((sum, c) => sum + c.salesCard, 0) ?? 0;
  const totalExpenses = closings?.reduce((sum, c) => sum + c.totalExpenses, 0) ?? 0;
  const totalVisits = closings?.reduce((sum, c) => sum + c.totalCustomerVisits, 0) ?? 0;
  const avgDailySales = closings && closings.length > 0 ? totalSales / closings.length : 0;

  const salesByPayment = [
    { name: "Cash", value: totalCash, color: "hsl(var(--chart-1))" },
    { name: "UPI", value: totalUpi, color: "hsl(var(--chart-2))" },
    { name: "Card", value: totalCard, color: "hsl(var(--chart-3))" },
  ];

  const dailyData = closings?.map((c) => ({
    date: format(new Date(c.date), "MMM dd"),
    cash: c.salesCash,
    upi: c.salesUpi,
    card: c.salesCard,
    total: c.salesCash + c.salesUpi + c.salesCard,
    expenses: c.totalExpenses,
    visits: c.totalCustomerVisits,
  })) ?? [];

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  const downloadCsv = () => {
    if (!closings || closings.length === 0) return;
    const headers = ["Date", "Cash Sales", "UPI Sales", "Card Sales", "Total Sales", "Expenses", "Net Income", "Customer Visits"];
    const rows = closings.map((c) => {
      const total = c.salesCash + c.salesUpi + c.salesCard;
      return [c.date, c.salesCash, c.salesUpi, c.salesCard, total, c.totalExpenses, total - c.totalExpenses, c.totalCustomerVisits].join(",");
    });
    const totalRow = ["TOTAL", totalCash, totalUpi, totalCard, totalSales, totalExpenses, totalSales - totalExpenses, totalVisits].join(",");
    const csv = [headers.join(","), ...rows, totalRow].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shop-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your shop's daily performance
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["today", "week", "month"] as DateRange[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(r)}
              data-testid={`button-range-${r}`}
            >
              {r === "today" ? "Today" : r === "week" ? "This Week" : "This Month"}
            </Button>
          ))}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={range === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setRange("custom")}
                data-testid="button-range-custom"
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: customFrom, to: customTo }}
                onSelect={(range) => {
                  setCustomFrom(range?.from);
                  setCustomTo(range?.to);
                  if (range?.from && range?.to) {
                    setCalendarOpen(false);
                  }
                }}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCsv}
            disabled={isLoading || !closings || closings.length === 0}
            data-testid="button-download-csv"
          >
            <Download className="w-4 h-4 mr-1" />
            Download CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sales"
          value={formatCurrency(totalSales)}
          icon={<DollarSign className="w-4 h-4" />}
          description={`${closings?.length ?? 0} day(s) recorded`}
          isLoading={isLoading}
          testId="card-total-sales"
        />
        <MetricCard
          title="Avg Daily Sales"
          value={formatCurrency(avgDailySales)}
          icon={<TrendingUp className="w-4 h-4" />}
          description="Average per day"
          isLoading={isLoading}
          testId="card-avg-sales"
        />
        <MetricCard
          title="Total Expenses"
          value={formatCurrency(totalExpenses)}
          icon={<Receipt className="w-4 h-4" />}
          description="Period expenses"
          isLoading={isLoading}
          testId="card-total-expenses"
        />
        <MetricCard
          title="Customer Visits"
          value={totalVisits.toLocaleString()}
          icon={<Users className="w-4 h-4" />}
          description="Total footfall"
          isLoading={isLoading}
          testId="card-total-visits"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Trend</CardTitle>
          </CardHeader>
          <CardContent data-testid="chart-sales-trend">
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : dailyData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                No data for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, undefined]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="cash" name="Cash" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="upi" name="UPI" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="card" name="Card" fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Split</CardTitle>
          </CardHeader>
          <CardContent data-testid="chart-payment-split">
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : totalSales === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                No sales data
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={salesByPayment}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {salesByPayment.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--popover))",
                        color: "hsl(var(--popover-foreground))",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, undefined]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2">
                  {salesByPayment.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales vs Expenses</CardTitle>
          </CardHeader>
          <CardContent data-testid="chart-sales-expenses">
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : dailyData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No data for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, undefined]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="total" name="Sales" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Footfall</CardTitle>
          </CardHeader>
          <CardContent data-testid="chart-footfall">
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : dailyData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No data for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="visits" name="Visitors" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {closings && closings.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <SummaryItem icon={<Banknote className="w-4 h-4" />} label="Cash Sales" value={formatCurrency(totalCash)} />
              <SummaryItem icon={<Smartphone className="w-4 h-4" />} label="UPI Sales" value={formatCurrency(totalUpi)} />
              <SummaryItem icon={<CreditCard className="w-4 h-4" />} label="Card Sales" value={formatCurrency(totalCard)} />
              <SummaryItem icon={<Receipt className="w-4 h-4" />} label="Expenses" value={formatCurrency(totalExpenses)} />
              <SummaryItem icon={<DollarSign className="w-4 h-4" />} label="Net Income" value={formatCurrency(totalSales - totalExpenses)} />
              <SummaryItem icon={<Zap className="w-4 h-4" />} label="Days Recorded" value={String(closings.length)} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  description,
  isLoading,
  testId,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  isLoading: boolean;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function SummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
