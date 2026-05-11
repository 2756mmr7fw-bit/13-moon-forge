import { Link, useLocation } from "wouter";
import { Film, LayoutDashboard, Settings, Video, Plus } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r border-border/40">
          <SidebarHeader className="h-16 px-4 flex items-center justify-start border-b border-border/40">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-primary tracking-tight">
              <Film className="w-5 h-5" />
              <span>13 Moon Editor</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                  <Link href="/dashboard">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/projects"}>
                  <Link href="/projects">
                    <Video className="w-4 h-4 mr-2" />
                    Projects
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/projects/new"}>
                  <Link href="/projects/new">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 flex flex-col min-w-0 bg-background/50">
          <div className="flex-1 p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
