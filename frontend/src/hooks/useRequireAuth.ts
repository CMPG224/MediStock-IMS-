"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

/**
 * Client-side route guard: redirects to "/" if nobody's signed in, and
 * hands back the current user once there is one.
 *
 * This is a stopgap, not the final answer. It checks auth AFTER the page
 * has already rendered in the browser -- for a moment, an unauthenticated
 * visitor sees a blank/loading screen before being bounced, rather than
 * being blocked before the page ever loads. The more correct approach --
 * checking the session on the SERVER via a cookie, before any protected
 * page's HTML is even sent -- needs the @supabase/ssr package and Next.js
 * middleware, which is a real architecture decision worth making
 * deliberately. Treat that as follow-up work, not something silently
 * skipped.
 */
export function useRequireAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let active = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!active) return;
            if (!data.session) {
                router.replace("/");
                return;
            }
            setUser(data.session.user);
            setLoading(false);
        }).catch(() => {
            // getSession() can reject outright, not just resolve with no
            // session. Without this branch a rejected promise leaves the page
            // stuck showing nothing forever. Fail the same way an absent
            // session does: assume signed-out, send them to sign in.
            if (active) router.replace("/");
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                router.replace("/");
            } else {
                setUser(session.user);
            }
        });

        return () => {
            active = false;
            listener.subscription.unsubscribe();
        };
    }, [router]);

    return { user, loading };
}