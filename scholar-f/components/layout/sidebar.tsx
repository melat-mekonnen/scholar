"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SidebarItem {
  href: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

interface SidebarProps {
  brand?: {
    name: string;
    logo?: ReactNode;
  };
  sections: SidebarSection[];
  footer?: ReactNode;
  className?: string;
  collapsed?: boolean;
}

export function Sidebar({
  brand,
  sections,
  footer,
  className,
  collapsed = false,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r bg-card",
        collapsed && "w-16",
        className,
      )}
    >
      {/* Brand */}
      {brand && (
        <div className="flex h-16 items-center border-b px-6">
          {brand.logo && (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              {brand.logo}
            </div>
          )}
          {!collapsed && (
            <span className="ml-3 font-semibold text-lg">{brand.name}</span>
          )}
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-2">
              {section.title && !collapsed && (
                <div className="px-3 py-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h3>
                </div>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start h-10 px-3",
                        collapsed && "px-2 justify-center",
                        isActive &&
                          "bg-secondary font-medium text-secondary-foreground",
                      )}
                      size="sm"
                      asChild
                    >
                      <Link href={item.href}>
                        {item.icon && (
                          <span className={cn("mr-3", collapsed && "mr-0")}>
                            {item.icon}
                          </span>
                        )}
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </Button>
                  );
                })}
              </div>

              {sectionIndex < sections.length - 1 && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {footer && <div className="border-t p-4">{footer}</div>}
    </aside>
  );
}
