import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        Credentials({
            credentials: {
                identifier: { label: 'Username or Email', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.identifier || !credentials?.password) return null;
                const id = (credentials.identifier as string).trim().toLowerCase();
                const [rows] = await pool.query(
                    'SELECT id, name, email, password_hash, avatar_url FROM Users WHERE username = ? OR email = ?',
                    [id, id]
                );
                const user = (rows as any[])[0];
                if (!user || !user.password_hash) return null;
                const valid = await bcrypt.compare(credentials.password as string, user.password_hash);
                if (!valid) return null;
                return { id: String(user.id), name: user.name, email: user.email, image: user.avatar_url };
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account }) {
            if (account?.provider === 'google') {
                const [rows] = await pool.query('SELECT id FROM Users WHERE email = ?', [user.email]);
                if ((rows as any[]).length === 0) {
                    await pool.query(
                        'INSERT INTO Users (name, email, provider, avatar_url) VALUES (?, ?, ?, ?)',
                        [user.name, user.email, 'google', user.image]
                    );
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                const [rows] = await pool.query(
                    'SELECT id, role FROM Users WHERE email = ?', [user.email]
                );
                const dbUser = (rows as any[])[0];
                token.id = String(dbUser?.id ?? user.id);
                token.role = dbUser?.role ?? 'user';
            }
            return token;
        },
        async session({ session, token }) {
            (session.user as any).id = token.id;
            (session.user as any).role = token.role;
            return session;
        },
    },
});
