import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../providers/theme-provider';
import { QueryProvider } from '../providers/query-provider';
import { IntlProvider } from '../providers/intl-provider';

export const metadata: Metadata = {
  title: 'Hospitality PMS & Channel Manager | Hotel Winotosastro AProject',
  description: 'Production-grade Multi-Tenant Hotel Property Management System with Integrated Agoda Channel Manager',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <IntlProvider>{children}</IntlProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
