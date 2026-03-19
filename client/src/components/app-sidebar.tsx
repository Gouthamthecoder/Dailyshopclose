import { useLocation, Link } from "wouter";
import { LayoutDashboard, ClipboardList, Settings, Store } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const allNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, adminOnly: true },
  { title: "Daily Closing", url: "/closing", icon: ClipboardList, adminOnly: false },
  { title: "Settings", url: "/settings", icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isAdmin } = useAuth();

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary text-primary-foreground">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">ShopClose</h2>
            <p className="text-xs text-muted-foreground">Daily Sales Tracker</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <p className="text-xs text-muted-foreground">Daily closing made easy</p>
      </SidebarFooter>
    </Sidebar>
  );
}
