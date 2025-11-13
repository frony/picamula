'use server';

// import BandAndFanLogo from '@/components/bandandfan-logo'
import React from "react";
// import Navigation from "@/components/nav-group";
import { useAuth } from '@/hooks/use-auth'

export default async function Header() {
  // const session = await auth();
  // const userRole = (session as any)?.user?.role;

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap bg-slate-500 pt-1 pb-2 w-full">
        {/* Logo */}
        <div className="flex-shrink-0 ml-1 md:ml-8">
          <h1 className="juntatribo">JuntaTribo</h1>
        </div>

        {/* <Navigation isLoggedIn={!!session} userRole={userRole} /> */}
      </header>
    </>
  );
}
