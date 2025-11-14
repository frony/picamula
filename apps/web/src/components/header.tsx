'use server';

import React from "react";
import Navigation from "@/components/navigation";

export default async function Header() {
  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap bg-slate-500 pt-1 pb-2 w-full fixed top-0 z-50">
        <div className="flex-shrink-0 ml-1 md:ml-8">
          <h1 className="juntatribo md:text-3xl">JuntaTribo</h1>
        </div>
        <Navigation />
      </header>
    </>
  );
}
