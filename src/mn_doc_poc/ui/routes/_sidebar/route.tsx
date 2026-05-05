import SidebarLayout from "@/components/apx/sidebar-layout";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Map as MapIcon, BarChart2, Shield, User, Building2, GitMerge, Bot, ScrollText } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePersona, type PersonaId } from "@/lib/persona-context";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_sidebar")({
  component: () => <Layout />,
});

const PERSONAS: { id: PersonaId; label: string; role: string }[] = [
  { id: "consumer",       label: "Consumer",       role: "Warden – Facility A" },
  { id: "super_viewer",   label: "Super Viewer",   role: "Commissioner" },
  { id: "engineer",       label: "Engineer",       role: "MNIT Data Engineer" },
  { id: "domain_advisor", label: "Domain Advisor", role: "Facility Admin Director" },
  { id: "analyst",        label: "Analyst",        role: "Data Analyst" },
];

const PERSONA_ACCESS: Record<PersonaId, { governance: boolean; analytics: boolean; pipelines: boolean; auditLog: boolean }> = {
  consumer:       { governance: false, analytics: false, pipelines: false, auditLog: false },
  super_viewer:   { governance: false, analytics: false, pipelines: false, auditLog: false },
  engineer:       { governance: false, analytics: false, pipelines: true,  auditLog: true  },
  domain_advisor: { governance: true,  analytics: false, pipelines: false, auditLog: true  },
  analyst:        { governance: false, analytics: true,  pipelines: false, auditLog: false },
};

function Layout() {
  const location = useLocation();
  const { persona, setPersona } = usePersona();
  const access = PERSONA_ACCESS[persona];
  const personaInfo = PERSONAS.find(p => p.id === persona)!;

  const navItems = [
    {
      to: "/client-journey",
      label: "Client Journey",
      icon: <MapIcon size={16} />,
      visible: true,
    },
    {
      to: "/pipelines",
      label: "Pipelines",
      icon: <GitMerge size={16} />,
      visible: access.pipelines,
    },
    {
      to: "/governance",
      label: "Unity Catalog Governance",
      icon: <Shield size={16} />,
      visible: access.governance,
    },
    {
      to: "/audit-log",
      label: "Audit Log",
      icon: <ScrollText size={16} />,
      visible: access.auditLog,
    },
    {
      to: "/analytics",
      label: "Advanced Analytics",
      icon: <BarChart2 size={16} />,
      visible: access.analytics,
    },
    {
      to: "/genie",
      label: "AI Genie",
      icon: <Bot size={16} />,
      visible: true,
    },
    {
      to: "/profile",
      label: "Profile",
      icon: <User size={16} />,
      visible: true,
    },
  ];

  return (
    <SidebarLayout>
      {/* Persona Switcher */}
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center gap-1">
          <Building2 size={12} />
          Active Persona
        </SidebarGroupLabel>
        <SidebarGroupContent className="px-2 pb-2 space-y-2">
          <Select value={persona} onValueChange={(v) => setPersona(v as PersonaId)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERSONAS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground px-0.5">{personaInfo.role}</p>
          <div className="flex flex-wrap gap-1">
            {PERSONA_ACCESS[persona].governance && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">Governance</Badge>
            )}
            {PERSONA_ACCESS[persona].analytics && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">Analytics</Badge>
            )}
            {persona === "super_viewer" && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1">PII Unlocked</Badge>
            )}
            {persona === "engineer" && (
              <>
                <Badge variant="outline" className="text-[10px] h-4 px-1">PII Masked</Badge>
                <Badge variant="secondary" className="text-[10px] h-4 px-1">Pipelines</Badge>
              </>
            )}
            {persona === "consumer" && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">Facility A Only</Badge>
            )}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Navigation */}
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navItems.filter(i => i.visible).map((item) => (
              <SidebarMenuItem key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-sm",
                    location.pathname === item.to
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Databricks branding */}
      <SidebarGroup className="mt-auto">
        <SidebarGroupContent>
          <div className="px-2 py-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
            <p className="text-[10px] font-semibold text-orange-700 dark:text-orange-400">Powered by</p>
            <p className="text-xs font-bold text-orange-600 dark:text-orange-300">Databricks Unity Catalog</p>
            <p className="text-[10px] text-orange-500 dark:text-orange-400 mt-0.5">Delta Lake · RBAC · Lineage</p>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarLayout>
  );
}
