import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  FileText, 
  Home, 
  UserCircle, 
  PenTool, 
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/ezquill/", icon: Home },
    { name: "Documents", href: "/ezquill/documents", icon: FileText },
    { name: "Autofill Profile", href: "/ezquill/profile", icon: UserCircle },
    { name: "My Signature", href: "/ezquill/signature", icon: PenTool },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <Link href="/ezquill/" className="flex items-center gap-2 font-bold text-xl text-sidebar-foreground">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
            <PenTool size={18} />
          </div>
          EzQuill
        </Link>
      </div>
      <div className="px-4 py-2 flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/ezquill/" && location.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b bg-background flex items-center px-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <span className="font-bold text-lg">EzQuill</span>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col pt-16 md:pt-0 max-w-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}