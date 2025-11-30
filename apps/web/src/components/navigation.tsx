'use client'
import Nav from "@/components/nav";
import { useState } from "react";
import { MoreVertical } from 'lucide-react';

export default function Navigation() {
    const [showMe, setShowMe] = useState(true);
    function toggle(){
      console.log("toggle");
      setShowMe(!showMe);
    }
    
    return (
        <>
            <button onClick={toggle} className="text-white hover:text-gray-300 block md:hidden">
                <MoreVertical className="h-5 w-5 text-white font-bold"/>
            </button>
        
            {/* Nav: mobile */}
            <div className={`pl-6 w-full md:w-auto ${showMe ? 'block' : 'hidden'} md:hidden`} id="nav-content">
                <Nav />
            </div>

            {/* Nav: Browser */}
            <div className="pl-6 w-full md:w-auto hidden md:block md:mr-16" id="nav-content">
                <Nav />
            </div>
      </>
      
    );
}