import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Store, Plus, Trash2, Save, Loader2, Settings as SettingsIcon, GripVertical } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ShopSettings, CustomFieldDef } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<ShopSettings>({
    queryKey: ["/api/settings"],
  });

  const [shopName, setShopName] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);

  useEffect(() => {
    if (settings) {
      setShopName(settings.shopName);
      setWhatsappLink(settings.whatsappGroupLink ?? "");
      setCustomFields((settings.customFields as CustomFieldDef[]) ?? []);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/settings", {
        shopName,
        whatsappGroupLink: whatsappLink || null,
        customFields,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved", description: "Your shop settings have been updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addCustomField = () => {
    const newField: CustomFieldDef = {
      id: `field_${Date.now()}`,
      label: "",
      type: "text",
      section: "closing",
      enabled: true,
    };
    setCustomFields((prev) => [...prev, newField]);
  };

  const updateField = (id: string, updates: Partial<CustomFieldDef>) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded-md" />
        <div className="h-60 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-settings-title">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your shop details and custom data fields
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <Store className="w-4 h-4 text-muted-foreground" />
          <div>
            <CardTitle className="text-sm font-medium">Shop Details</CardTitle>
            <CardDescription className="text-xs">Basic information about your shop</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="shopName">Shop Name</Label>
            <Input
              id="shopName"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Enter shop name"
              data-testid="input-shop-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsappLink">WhatsApp Group Invite Link (optional)</Label>
            <Input
              id="whatsappLink"
              value={whatsappLink}
              onChange={(e) => setWhatsappLink(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              data-testid="input-whatsapp-link"
            />
            <p className="text-xs text-muted-foreground">
              Used to quickly open the group when sharing daily closing statements
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-medium">Custom Fields</CardTitle>
              <CardDescription className="text-xs">Add extra fields to your daily closing form</CardDescription>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={addCustomField} data-testid="button-add-field">
            <Plus className="w-4 h-4 mr-1" />
            Add Field
          </Button>
        </CardHeader>
        <CardContent>
          {customFields.length === 0 ? (
            <div className="text-center py-8">
              <SettingsIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No custom fields yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add fields to collect additional data during daily opening or closing
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customFields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                  <GripVertical className="w-4 h-4 text-muted-foreground mt-2.5 shrink-0" />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="Field label"
                      className="sm:col-span-2"
                      data-testid={`input-field-label-${index}`}
                    />
                    <Select
                      value={field.type}
                      onValueChange={(v) => updateField(field.id, { type: v as "text" | "number" })}
                    >
                      <SelectTrigger data-testid={`select-field-type-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={field.section}
                      onValueChange={(v) => updateField(field.id, { section: v as "opening" | "closing" })}
                    >
                      <SelectTrigger data-testid={`select-field-section-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opening">Opening</SelectItem>
                        <SelectItem value="closing">Closing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 shrink-0">
                    <Switch
                      checked={field.enabled}
                      onCheckedChange={(v) => updateField(field.id, { enabled: v })}
                      data-testid={`switch-field-enabled-${index}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeField(field.id)}
                      data-testid={`button-remove-field-${index}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-settings">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
