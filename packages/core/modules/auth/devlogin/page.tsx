"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@heiso/core/components/ui/button";
import { Input } from "@heiso/core/components/ui/input";
import { Label } from "@heiso/core/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@heiso/core/components/ui/card";
import { useRouter } from "next/navigation";
import { checkAdminStatus, updateAdminPassword } from "./actions";
import Header from "../_components/header";


export default function DevLoginPage() {
    const [step, setStep] = useState<'login' | 'prompt'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLoginCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await checkAdminStatus(email);
        setLoading(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        if (result.lastLoginAt === null) {
            setStep('prompt');
        } else {
            // Normal Login
            doSignIn();
        }
    };

    const doSignIn = async () => {
        setLoading(true);
        const result = await signIn("credentials", {
            username: email, // auth.config uses 'username' field
            password: password,
            redirect: false,
        });

        if (result?.error) {
            setError("Login failed: " + result.error);
            setLoading(false);
        } else {
            router.push('/'); // Go to dashboard
        }
    };

    const handleUpdatePassword = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        const result = await updateAdminPassword(email, newPassword);

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            // Use new password to sign in
            const loginResult = await signIn("credentials", {
                username: email,
                password: newPassword,
                redirect: false,
            });
            if (loginResult?.error) {
                setError("Password updated but login failed.");
                setLoading(false);
            } else {
                router.push('/');
            }
        }
    };

    return (
        <div className="w-full space-y-6">
            <Header
                title="Dev Login Channel"
                description="Internal Admin Access Only"
            />

            <div className="mt-8">
                {step === 'login' && (
                    <form onSubmit={handleLoginCheck} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Email</Label>
                            <Input
                                id="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="admin@heiso.io"
                                className="h-12 bg-background/50 border-white/20 focus:border-primary/50 transition-all rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="h-12 bg-background/50 border-white/20 focus:border-primary/50 transition-all rounded-xl"
                            />
                        </div>
                        {error && <p className="text-destructive text-sm font-medium ml-1">{error}</p>}
                        <div className="pt-2">
                            <Button
                                type="submit"
                                className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl shadow-[0_4px_12px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_6px_20px_rgba(var(--primary-rgb),0.4)] transition-all duration-300 transform hover:-translate-y-0.5"
                                disabled={loading}
                            >
                                {loading ? "Checking..." : "Login"}
                            </Button>
                        </div>
                    </form>
                )}

                {step === 'prompt' && (
                    <div className="space-y-6">
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-sm font-medium leading-relaxed">
                            Recommendation: This is your first login. Would you like to update your password for better security?
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={e => {
                                    const val = e.target.value;
                                    setNewPassword(val);
                                    if (error === "Passwords do not match") {
                                        if (val === confirmPassword) setError('');
                                    } else {
                                        setError('');
                                    }
                                }}
                                className="h-12 bg-background/50 border-white/20 focus:border-primary/50 transition-all rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Confirm Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={e => {
                                    const val = e.target.value;
                                    setConfirmPassword(val);
                                    if (error === "Passwords do not match") {
                                        if (val === newPassword) setError('');
                                    } else {
                                        setError('');
                                    }
                                }}
                                className="h-12 bg-background/50 border-white/20 focus:border-primary/50 transition-all rounded-xl"
                            />
                        </div>

                        {error && <p className="text-destructive text-sm font-medium ml-1">{error}</p>}

                        <div className="flex gap-4 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 h-12 rounded-xl border-white/10 hover:bg-white/5"
                                onClick={doSignIn}
                                disabled={loading}
                            >
                                Skip
                            </Button>
                            <Button
                                className="flex-1 h-12 bg-primary text-primary-foreground font-bold rounded-xl shadow-[0_4px_12px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_6px_20px_rgba(var(--primary-rgb),0.4)] transition-all duration-300"
                                onClick={handleUpdatePassword}
                                disabled={!newPassword || !confirmPassword || loading}
                            >
                                Update & Login
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
