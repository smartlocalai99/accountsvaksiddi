
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
import { sidebarIcons } from "@/components/sidebarIcons";
import { canAccessPath } from "@/lib/permissions";

const sidebarLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Admissions", href: "/admissions" },
  { label: "Parents", href: "/parents" },
  { label: "Students", href: "/students" },
  { label: "Staff", href: "/staff" },
  { label: "Payroll", href: "/payroll" },
  { label: "Fees", href: "/fees" },
  { label: "Expenses", href: "/expenses" },
  { label: "Assets", href: "/assets" },
  { label: "Alerts", href: "/alerts" },
  { label: "Reports", href: "/reports" },
  { label: "User Management", href: "/user-management" },
];

const accountantSidebarLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Admissions", href: "/admissions" },
  { label: "Fees", href: "/fees" },
  { label: "Transactions", href: "/transactions" },
  { label: "Cash / Bank", href: "/bank-cash" },
  { label: "Reconciliation", href: "/reconciliation" },
  { label: "Expenses", href: "/expenses" },
  { label: "Payroll", href: "/payroll" },
  { label: "Alerts", href: "/alerts" },
  { label: "Reports", href: "/reports" },
];

// Primary brand color (updated): #08516d
export default function Sidebar({ user }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const visibleLinks =
    String(user?.role || "").toUpperCase() === "ACCOUNTANT"
      ? accountantSidebarLinks.filter((link) => canAccessPath(user?.role, link.href))
      : sidebarLinks.filter((link) => canAccessPath(user?.role, link.href));

  return (
    <>
      {/* Mobile Toggle Button at top left */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-primary text-white p-3 rounded-full shadow-lg focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        {open ? (
          <span>&#10005;</span>
        ) : (
          <span>&#9776;</span>
        )}
      </button>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white shadow-xl flex flex-col p-6 z-20 transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        style={{ minWidth: 240 }}
      >
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/s.jpg"
            alt="Logo"
            width={80}
            height={80}
            priority
          />
        </div>
        <nav className="flex-1 w-full">
          <ul className="space-y-2">
            {visibleLinks.map((link) => {
              const Icon = sidebarIcons[link.label];
              const isActive = router.pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors group ${isActive ? "bg-primary-10 text-primary font-bold" : "text-black"}`}
                    onClick={() => setOpen(false)}
                  >
                    {Icon && <Icon className={`text-2xl mr-4 ${isActive ? "text-primary" : "group-hover:text-primary"}`} />}
                    <span className={`tracking-wide text-base ${isActive ? "text-primary" : "group-hover:text-primary"}`}>{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      {/* Overlay for mobile when sidebar is open */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-10 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
