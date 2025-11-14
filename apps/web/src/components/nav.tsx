'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { LogOut, UserPlus, LogIn } from 'lucide-react';

export default function Nav() {
    const pathname = usePathname();
    const isHome = pathname === '/';
    const { isAuthenticated, logout, user } = useAuth();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch by only rendering auth-dependent UI after mount
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = async () => {
        await logout();
    };

    return (
        <nav className="flex items-center space-x-4">
            {/* <Link href="/" className={cn('text-sm font-medium transition-colors text-popover', !isHome ? 'text-popover' : 'hover:underline')}>Home</Link> */}
            {/* <Link href="/" className={cn('text-sm font-medium transition-colors hover:text-primary', isHome ? 'text-primary' : 'text-muted-foreground')}>Home</Link> */}
            {mounted && isAuthenticated && (
                <>
                    <Link href="/" className={cn('text-sm font-medium transition-colors text-popover', isHome ? 'text-popover' : 'hover:underline')}>Trips</Link>
                    <div className="flex items-center space-x-2 md:space-x-4">
                    <button 
                        onClick={handleLogout}
                        className={cn('flex items-center text-sm font-medium transition-colors text-popover hover:underline hover:decoration-2')}
                    >
                        <LogOut className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Logout</span>
                    </button>
                    </div>
                </>
            )}
            { mounted && !isAuthenticated && pathname === '/signup' && 
                (<Link href="/login" className={'flex items-center text-sm font-medium transition-colors hover:text-primary'}>
                    <LogIn className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Login</span>
                </Link>)
            }
            
            { mounted && !isAuthenticated && pathname === '/login' && 
                (<Link href="/signup" className={'flex items-center text-sm font-medium transition-colors hover:text-primary'}>
                    <UserPlus className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Signup</span>
                </Link>)
            }
        </nav>
    );
}