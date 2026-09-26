import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, Boxes, CreditCard, LayoutDashboard, LogOut, Package, PackageCheck, Settings, ShoppingCart, Store, UsersRound, WalletCards } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menu = [
  { icon: LayoutDashboard, label: "نظرة عامة", path: "/dashboard" },
  { icon: ShoppingCart, label: "نقطة البيع", path: "/sales" },
  { icon: PackageCheck, label: "طلبات المتجر", path: "/orders" },
  { icon: Package, label: "المنتجات", path: "/products" },
  { icon: UsersRound, label: "العملاء والديون", path: "/customers" },
  { icon: WalletCards, label: "المصروفات", path: "/expenses" },
  { icon: BarChart3, label: "التقارير", path: "/reports" },
  { icon: CreditCard, label: "الاشتراك", path: "/billing" },
  { icon: Settings, label: "إعدادات المحل", path: "/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <main className="min-h-screen grid place-items-center p-6"><section className="w-full max-w-md rounded-[2rem] bg-card p-9 text-center shadow-xl shadow-primary/10"><div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><Store /></div><h1 className="text-2xl font-extrabold">مرحباً بك في ZAYROX</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">سجّل الدخول للوصول الآمن إلى بيانات محلك ومبيعاتك.</p><Button className="mt-7 w-full" size="lg" onClick={() => setLocation("/login")}>تسجيل الدخول</Button><Button className="mt-3 w-full" size="lg" variant="outline" onClick={() => setLocation("/register")}>إنشاء حساب</Button></section></main>;
  return <SidebarProvider defaultOpen><DashboardContent>{children}</DashboardContent></SidebarProvider>;
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const items = user?.role === "super_admin" ? [...menu, { icon: Boxes, label: "إدارة المنصة", path: "/admin" }] : menu;
  const active = items.find(item => item.path === location)?.label ?? "ZAYROX";
  return <>
    <Sidebar side="right" collapsible="icon" className="border-l border-r-0">
      <SidebarHeader className="h-20 px-3 py-4"><button className="flex w-full items-center gap-3 text-right" onClick={() => setLocation("/dashboard")}><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Store size={20} /></span><span className="group-data-[collapsible=icon]:hidden"><b className="block text-sm tracking-tight">ZAYROX</b><small className="block text-[10px] text-muted-foreground">SHOP MANAGER</small></span></button></SidebarHeader>
      <SidebarContent><SidebarMenu className="px-3 py-3">{items.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} tooltip={item.label} className="h-11 rounded-xl" onClick={() => setLocation(item.path)}><item.icon size={18}/><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent>
      <SidebarFooter className="p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl p-2 text-right hover:bg-accent"><Avatar className="size-9 border"><AvatarFallback className="bg-secondary text-xs text-secondary-foreground">{user?.name?.slice(0, 1) ?? "م"}</AvatarFallback></Avatar><span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><b className="block truncate text-xs">{user?.name ?? "صاحب المحل"}</b><small className="block truncate text-[10px] text-muted-foreground">{user?.email ?? "حساب آمن"}</small></span></button></DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={logout}><LogOut className="ml-2 size-4"/>تسجيل الخروج</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter>
    </Sidebar>
    <SidebarInset className="bg-background"><header className="no-print flex h-20 items-center justify-between border-b border-border/70 bg-background/75 px-4 backdrop-blur md:px-8">{isMobile ? <SidebarTrigger/> : <div/>}<div className="text-left"><p className="text-[11px] text-muted-foreground">إدارة ذكية وبسيطة</p><h2 className="font-bold">{active}</h2></div></header><main className="min-h-[calc(100vh-5rem)] p-4 md:p-8">{children}</main></SidebarInset>
  </>;
}
