import { storage } from "./storage";
import { format, subDays } from "date-fns";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  const existingAdmin = await storage.getUserByUsername("admin");
  const hashedPassword = await bcrypt.hash("admin123", 10);
  if (!existingAdmin) {
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
      role: "admin",
    });
    console.log("Seeded admin user: admin / admin123");
  }

  const existingSettings = await storage.getSettings();
  if (existingSettings.shopName === "My Shop" && (!existingSettings.customFields || existingSettings.customFields.length === 0)) {
    await storage.updateSettings({
      shopName: "Sri Lakshmi Stores",
      customFields: [
        { id: "field_1", label: "Staff Present", type: "number", section: "opening", enabled: true },
        { id: "field_2", label: "Pending Orders", type: "number", section: "closing", enabled: true },
      ],
    });
  }

  const existingClosings = await storage.getAllClosings();
  if (existingClosings.length === 0) {
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(today, i), "yyyy-MM-dd");
      const cashSales = 5000 + Math.round(Math.random() * 10000);
      const upiSales = 3000 + Math.round(Math.random() * 8000);
      const cardSales = 1000 + Math.round(Math.random() * 5000);
      const expenses = 500 + Math.round(Math.random() * 2000);
      const visits = 20 + Math.round(Math.random() * 60);

      await storage.createClosing({
        date,
        previousCashBalance: 10000 + Math.round(Math.random() * 5000),
        currentCashBalance: 12000 + Math.round(Math.random() * 8000),
        totalExpenses: expenses,
        expenseNotes: i === 0 ? "Electricity bill, cleaning supplies" : null,
        salesCash: cashSales,
        salesUpi: upiSales,
        salesCard: cardSales,
        totalCustomerVisits: visits,
        stockNotes: i === 0 ? "Low on rice and dal" : null,
        electricityMeterReading: 15200 + i * 12,
        customFieldValues: { field_1: 2 + Math.floor(Math.random() * 3), field_2: Math.floor(Math.random() * 5) },
        notes: null,
        status: "finalized",
        sentToWhatsapp: i > 0,
      });
    }
  }
}
