"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Smartphone,
  Recycle,
  Package,
  ShoppingCart,
  Receipt,
  Users,
  Truck,
  Tags,
  Search,
  BarChart3,
  BookOpen,
  Settings,
  History,
  FileText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import type { UserRole } from "@/types/database";
import { STORE } from "@/lib/store-config";

const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "IMEI Tracker", href: "/dashboard/imei", icon: Search },
  { title: "New Mobiles", href: "/dashboard/inventory/mobiles", icon: Smartphone },
  { title: "Second-Hand", href: "/dashboard/inventory/second-hand", icon: Recycle },
  { title: "Accessories", href: "/dashboard/inventory/accessories", icon: Package },
  { title: "Create Invoice", href: "/dashboard/sales/new", icon: ShoppingCart },
  { title: "Sales History", href: "/dashboard/sales", icon: Receipt },
  { title: "Customers", href: "/dashboard/customers", icon: Users },
  { title: "Ledger", href: "/dashboard/ledger", icon: BookOpen },
];

const adminNav = [
  { title: "Purchases", href: "/dashboard/purchases", icon: FileText },
  { title: "Suppliers", href: "/dashboard/suppliers", icon: Truck },
  { title: "Categories", href: "/dashboard/categories", icon: Tags },
  { title: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { title: "Audit Trail", href: "/dashboard/audit", icon: History },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function AppSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none">{STORE.name}</p>
            <p className="text-xs text-muted-foreground">{STORE.phone}</p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive(item.href)}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive(item.href)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <p className="text-xs text-muted-foreground capitalize">Role: {role}</p>
      </SidebarFooter>
    </Sidebar>
  );
}
