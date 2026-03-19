import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarIcon,
  Save,
  Send,
  Check,
  ClipboardList,
  Banknote,
  CreditCard,
  Smartphone,
  Users,
  Zap,
  FileText,
  Loader2,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DailyClosing, ShopSettings, CustomFieldDef } from "@shared/schema";

const closingFormSchema = z.object({
  date: z.string(),
  previousCashBalance: z.coerce.number().min(0),
  currentCashBalance: z.coerce.number().min(0),
  totalExpenses: z.coerce.number().min(0),
  expenseNotes: z.string().optional(),
  salesCash: z.coerce.number().min(0),
  salesUpi: z.coerce.number().min(0),
  salesCard: z.coerce.number().min(0),
  totalCustomerVisits: z.coerce.number().int().min(0),
  stockNotes: z.string().optional(),
  electricityMeterReading: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type ClosingFormValues = z.infer<typeof closingFormSchema>;

export default function DailyClosingPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const { toast } = useToast();

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: closing, isLoading: closingLoading } = useQuery<DailyClosing | null>({
    queryKey: [`/api/closings/${dateStr}`],
  });

  const { data: settings } = useQuery<ShopSettings>({
    queryKey: ["/api/settings"],
  });

  const customFields: CustomFieldDef[] = (settings?.customFields as CustomFieldDef[]) ?? [];
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number>>({});

  const emptyDefaults: ClosingFormValues = {
    date: dateStr,
    previousCashBalance: 0,
    currentCashBalance: 0,
    totalExpenses: 0,
    expenseNotes: "",
    salesCash: 0,
    salesUpi: 0,
    salesCard: 0,
    totalCustomerVisits: 0,
    stockNotes: "",
    electricityMeterReading: 0,
    notes: "",
  };

  const form = useForm<ClosingFormValues>({
    resolver: zodResolver(closingFormSchema),
    defaultValues: emptyDefaults,
  });

  const isExistingRecord = closing && closing.id;

  useEffect(() => {
    if (closing && closing.id) {
      form.reset({
        date: closing.date,
        previousCashBalance: closing.previousCashBalance,
        currentCashBalance: closing.currentCashBalance,
        totalExpenses: closing.totalExpenses,
        expenseNotes: closing.expenseNotes ?? "",
        salesCash: closing.salesCash,
        salesUpi: closing.salesUpi,
        salesCard: closing.salesCard,
        totalCustomerVisits: closing.totalCustomerVisits,
        stockNotes: closing.stockNotes ?? "",
        electricityMeterReading: closing.electricityMeterReading ?? 0,
        notes: closing.notes ?? "",
      });
      setCustomFieldValues((closing.customFieldValues as Record<string, string | number>) ?? {});
    } else if (!closingLoading) {
      form.reset({ ...emptyDefaults, date: dateStr });
      setCustomFieldValues({});
    }
  }, [closing, closingLoading, dateStr]);

  const saveMutation = useMutation({
    mutationFn: async (values: ClosingFormValues) => {
      const payload = { ...values, customFieldValues, status: "draft" };
      if (isExistingRecord) {
        return apiRequest("PUT", `/api/closings/${closing.id}`, payload);
      }
      return apiRequest("POST", "/api/closings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/closings") });
      toast({ title: "Saved", description: "Daily closing saved as draft" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (values: ClosingFormValues) => {
      const payload = { ...values, customFieldValues, status: "finalized" };
      if (isExistingRecord) {
        return apiRequest("PUT", `/api/closings/${closing.id}`, payload);
      }
      return apiRequest("POST", "/api/closings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/closings") });
      toast({ title: "Finalized", description: "Daily closing finalized successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const onSave = (values: ClosingFormValues) => {
    saveMutation.mutate(values);
  };

  const onFinalize = () => {
    const values = form.getValues();
    finalizeMutation.mutate(values);
  };

  const handleSendWhatsapp = async () => {
    const values = form.getValues();
    const totalSales = values.salesCash + values.salesUpi + values.salesCard;
    const shopName = settings?.shopName ?? "My Shop";

    let msg = `*${shopName} - Daily Closing*\n`;
    msg += `*Date:* ${format(selectedDate, "dd MMM yyyy")}\n\n`;
    msg += `*--- Cash Summary ---*\n`;
    msg += `Previous Balance: ₹${values.previousCashBalance.toLocaleString("en-IN")}\n`;
    msg += `Current Balance: ₹${values.currentCashBalance.toLocaleString("en-IN")}\n\n`;
    msg += `*--- Sales Summary ---*\n`;
    msg += `Cash: ₹${values.salesCash.toLocaleString("en-IN")}\n`;
    msg += `UPI: ₹${values.salesUpi.toLocaleString("en-IN")}\n`;
    msg += `Card: ₹${values.salesCard.toLocaleString("en-IN")}\n`;
    msg += `*Total Sales: ₹${totalSales.toLocaleString("en-IN")}*\n\n`;
    msg += `*--- Expenses ---*\n`;
    msg += `Total: ₹${values.totalExpenses.toLocaleString("en-IN")}\n`;
    if (values.expenseNotes) msg += `Notes: ${values.expenseNotes}\n`;
    msg += `\n*--- Other ---*\n`;
    msg += `Customer Visits: ${values.totalCustomerVisits}\n`;
    if (values.electricityMeterReading) msg += `Electricity Reading: ${values.electricityMeterReading}\n`;
    if (values.stockNotes) msg += `Stock: ${values.stockNotes}\n`;

    const enabledCustom = customFields.filter((f) => f.enabled);
    if (enabledCustom.length > 0) {
      msg += `\n*--- Custom Fields ---*\n`;
      enabledCustom.forEach((f) => {
        const val = customFieldValues[f.id];
        if (val !== undefined && val !== "") {
          msg += `${f.label}: ${val}\n`;
        }
      });
    }

    if (values.notes) msg += `\nNotes: ${values.notes}\n`;
    msg += `\n*Net: ₹${(totalSales - values.totalExpenses).toLocaleString("en-IN")}*`;

    setGeneratedMessage(msg);
    setWhatsappDialogOpen(true);
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    toast({ title: "Copied", description: "Message copied to clipboard" });
  };

  const openWhatsapp = () => {
    const encoded = encodeURIComponent(generatedMessage);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const navigateDay = (direction: -1 | 1) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  const totalSales = (form.watch("salesCash") || 0) + (form.watch("salesUpi") || 0) + (form.watch("salesCard") || 0);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-closing-title">Daily Closing</h1>
          <p className="text-sm text-muted-foreground">
            Record your shop's daily opening and closing data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => navigateDay(-1)} data-testid="button-prev-day">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="button-select-date">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(selectedDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) {
                    setSelectedDate(d);
                    form.setValue("date", format(d, "yyyy-MM-dd"));
                    setCalendarOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
          <Button size="icon" variant="outline" onClick={() => navigateDay(1)} data-testid="button-next-day">
            <ChevronRight className="w-4 h-4" />
          </Button>
          {isExistingRecord && (
            <Badge variant={closing.status === "finalized" ? "default" : "secondary"}>
              {closing.status === "finalized" ? "Finalized" : "Draft"}
            </Badge>
          )}
        </div>
      </div>

      {closingLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
            <Tabs defaultValue="opening">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="opening" data-testid="tab-opening">Opening</TabsTrigger>
                <TabsTrigger value="closing" data-testid="tab-closing">Closing</TabsTrigger>
                <TabsTrigger value="custom" data-testid="tab-custom">Custom</TabsTrigger>
              </TabsList>

              <TabsContent value="opening" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="previousCashBalance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previous Cash Balance (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} data-testid="input-previous-cash" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="electricityMeterReading"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Electricity Meter Reading</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} data-testid="input-electricity" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Stock Notes (Opening)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="stockNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea placeholder="Note any stock observations at opening..." {...field} data-testid="input-stock-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="closing" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Sales Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="salesCash"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5">
                              <Banknote className="w-3.5 h-3.5" /> Cash (₹)
                            </FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} data-testid="input-sales-cash" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="salesUpi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5" /> UPI (₹)
                            </FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} data-testid="input-sales-upi" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="salesCard"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5" /> Card (₹)
                            </FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} data-testid="input-sales-card" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Total Sales</span>
                      <span className="text-lg font-bold" data-testid="text-total-sales">
                        ₹{totalSales.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Customer Visits</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="totalCustomerVisits"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-visits" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                      <Banknote className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Current Cash Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="currentCashBalance"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} data-testid="input-current-cash" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="totalExpenses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Expenses (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} data-testid="input-expenses" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expenseNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expense Details</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe your expenses..." {...field} data-testid="input-expense-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea placeholder="Any additional notes for the day..." {...field} data-testid="input-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4 mt-4">
                {customFields.filter((f) => f.enabled).length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <ClipboardList className="w-10 h-10 text-muted-foreground mb-3" />
                      <h3 className="text-sm font-medium">No custom fields</h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        Add custom fields in Settings to collect additional data during opening or closing
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {["opening", "closing"].map((section) => {
                      const fields = customFields.filter((f) => f.enabled && f.section === section);
                      if (fields.length === 0) return null;
                      return (
                        <Card key={section}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium capitalize">{section} Custom Fields</CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {fields.map((field) => (
                              <div key={field.id} className="space-y-1.5">
                                <label className="text-sm font-medium">{field.label}</label>
                                <Input
                                  type={field.type === "number" ? "number" : "text"}
                                  value={customFieldValues[field.id] ?? ""}
                                  onChange={(e) =>
                                    setCustomFieldValues((prev) => ({
                                      ...prev,
                                      [field.id]: field.type === "number" ? Number(e.target.value) : e.target.value,
                                    }))
                                  }
                                  data-testid={`input-custom-${field.id}`}
                                />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-draft">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Draft
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onFinalize}
                disabled={finalizeMutation.isPending}
                data-testid="button-finalize"
              >
                {finalizeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Finalize
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSendWhatsapp}
                data-testid="button-send-whatsapp"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to WhatsApp
              </Button>
            </div>
          </form>
        </Form>
      )}

      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>WhatsApp Closing Statement</DialogTitle>
            <DialogDescription>
              Copy this message or open WhatsApp to share it with your group
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-md p-4 max-h-80 overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-sans" data-testid="text-whatsapp-message">
              {generatedMessage}
            </pre>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={copyMessage} data-testid="button-copy-message">
              <Copy className="w-4 h-4 mr-2" />
              Copy Message
            </Button>
            <Button onClick={openWhatsapp} data-testid="button-open-whatsapp">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
