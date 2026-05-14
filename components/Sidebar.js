
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
  { label: "Fees", href: "/fees" },
  { label: "Assets", href: "/assets" },
  { label: "Reports", href: "/reports" },
  { label: "User Management", href: "/user-management" },
];

// Maroon-red from logo: #8B1F1F
export default function Sidebar({ user }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const visibleLinks = sidebarLinks.filter((link) => canAccessPath(user?.role, link.href));

  return (
    <>
      {/* Mobile Toggle Button at top left */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-[#8B1F1F] text-white p-3 rounded-full shadow-lg focus:outline-none"
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
            src="/logo.jpeg"
            alt="Logo"
            width={180}
            height={180}
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
                    className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors group
                      hover:bg-[#8B1F1F]/10 hover:text-[#8B1F1F]
                      ${isActive ? "bg-[#8B1F1F]/10 text-[#8B1F1F] font-bold" : "text-black"}
                    `}
                    onClick={() => setOpen(false)}
                  >
                    {Icon && <Icon className={`text-2xl mr-4 ${isActive ? "text-[#8B1F1F]" : "group-hover:text-[#8B1F1F]"}`} />}
                    <span className={`tracking-wide text-base ${isActive ? "text-[#8B1F1F]" : "group-hover:text-[#8B1F1F]"}`}>{link.label}</span>
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
