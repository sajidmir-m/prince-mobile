import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STORE } from "@/lib/store-config";
import { StoreLogo } from "@/components/store-logo";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-black p-2">
          <StoreLogo size={80} className="h-full w-full" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{STORE.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{STORE.address}</p>
        <p className="mt-3 text-muted-foreground">
          Professional inventory, billing, purchase tracking, and IMEI lifecycle
          management for mobile retail businesses.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {STORE.phone} · {STORE.email}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
            Sign In
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
