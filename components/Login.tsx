import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from './common/Button';
import { Spinner } from './common/Spinner';
import { Card } from './common/Card';

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        if (!supabase) {
            setError("Supabase client not available.");
            setLoading(false);
            return;
        }
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // The onAuthStateChange in App.tsx will handle the session update
        } catch (error: any) {
            setError(error.error_description || error.message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = "w-full p-2 border-2 border-gray-300 rounded-lg font-sans focus:border-primary focus:ring-primary";
    const labelStyle = "block mb-1 text-sm font-medium text-text-secondary";

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <header className="text-center mb-8">
                    <h1 className="text-5xl font-bold tracking-tight text-primary" style={{ fontFamily: "'Racing Sans One', cursive" }}>Nutrigym</h1>
                    <p className="text-text-secondary mt-2 font-sans">Tu asistente de nutrición y fitness.</p>
                </header>
                <Card>
                    <h2 className="text-xl font-bold text-center mb-6 text-primary">Iniciar Sesión</h2>
                    <form onSubmit={handleLogin} className="space-y-4 font-sans">
                        <div>
                            <label htmlFor="email" className={labelStyle}>Correo Electrónico</label>
                            <input
                                id="email"
                                className={inputStyle}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="tu@email.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className={labelStyle}>Contraseña</label>
                            <input
                                id="password"
                                className={inputStyle}
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                            />
                        </div>
                        {error && <p className="text-danger text-sm text-center">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Spinner /> : 'Acceder'}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default Login;
