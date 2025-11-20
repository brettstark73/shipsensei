import { NextAuthOptions } from 'next-auth'
import { Adapter } from 'next-auth/adapters'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GithubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email public_repo',
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id || (token?.sub as string)
      }

      // Add GitHub access token to session for repo creation
      if (token?.accessToken) {
        ;(session as { accessToken?: string }).accessToken = token.accessToken as string
      }

      return session
    },
    async jwt({ token, account }) {
      // Store access token in JWT for later use
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      return token
    },
  },
  session: {
    strategy: 'database',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
