'use client';

import React, { useState } from 'react';
import {
  Receipt,
  FileText,
  DollarSign,
  Download,
  Calendar,
  CreditCard,
  Building,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { useI18n } from '../../../providers/intl-provider';
import { formatCurrency } from '../../../lib/utils';

export default function BackOfficePage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Back Office & Folio Invoices
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              Finance & Tax Report
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Itemized invoices, PBJT regional tax breakdown, and daily cash drawer reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-card border border-border hover:bg-muted text-foreground shadow-2xs transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export Monthly Tax CSV
          </button>
        </div>
      </div>

      {/* Sample Printable Folio Tax Invoice (Hotel Winotosastro by Athelu) */}
      <div className="p-8 bg-card border border-border rounded-2xl shadow-sm max-w-3xl mx-auto space-y-6">
        {/* Invoice Header */}
        <div className="flex items-start justify-between border-b border-border pb-6">
          <div>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              Hotel Winotosastro by Athelu
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jl. Brigjend Slamet Riyadi No. 250, Surakarta, Jawa Tengah 57141
            </p>
            <p className="text-xs text-muted-foreground">
              NPWPD: 1.02.04.55.99120.000 (Bapenda Kota Surakarta)
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono font-extrabold text-base text-primary">
              INV-BK-2026-1042
            </span>
            <div className="text-xs text-muted-foreground mt-1">Date: 24 Nov 2026</div>
            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
              PAID IN FULL
            </span>
          </div>
        </div>

        {/* Guest & Stay Details */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-semibold text-muted-foreground">Guest Information:</span>
            <div className="font-bold text-sm text-foreground mt-0.5">Siti Rahma</div>
            <div className="text-muted-foreground">KTP: 3372010101900001</div>
            <div className="text-muted-foreground">+62 813-4567-8901</div>
          </div>
          <div className="text-right">
            <span className="font-semibold text-muted-foreground">Stay Details:</span>
            <div className="font-bold text-sm text-foreground mt-0.5">Room 101 (Superior Room)</div>
            <div className="text-muted-foreground">23 Nov 2026 to 25 Nov 2026 (2 Nights)</div>
            <div className="text-muted-foreground">Rate Plan: Room Only (Flexible)</div>
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="border border-border rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-muted/40 font-semibold text-muted-foreground border-b border-border uppercase">
              <tr>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2.5 font-medium text-foreground">
                  Room Charge (2 Nights @ Rp 650.000)
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">ROOM</td>
                <td className="px-4 py-2.5 font-mono text-right font-medium text-foreground">
                  {formatCurrency(1300000)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-foreground">
                  Room Service Dinner (Nasi Liwet Solo & Es Dawet Telasih)
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">F&B</td>
                <td className="px-4 py-2.5 font-mono text-right font-medium text-foreground">
                  {formatCurrency(120000)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Itemized Tax Breakdown */}
        <div className="flex justify-end text-xs">
          <div className="w-72 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal Net Charges:</span>
              <span className="font-mono font-medium text-foreground">{formatCurrency(1420000)}</span>
            </div>
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
              <span>Hotel Service Charge (10%):</span>
              <span className="font-mono font-medium">+{formatCurrency(142000)}</span>
            </div>
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
              <span>PBJT Jasa Perhotelan Surakarta (10%):</span>
              <span className="font-mono font-medium">+{formatCurrency(156200)}</span>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-extrabold text-foreground">
              <span>Total Invoice Amount:</span>
              <span className="font-mono text-primary text-base">{formatCurrency(1718200)}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-600 font-bold pt-1">
              <span>Paid via QRIS (Midtrans):</span>
              <span className="font-mono">-{formatCurrency(1718200)}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-muted-foreground pt-1 border-t border-border">
              <span>Balance Due:</span>
              <span className="font-mono">Rp 0</span>
            </div>
          </div>
        </div>

        {/* Print Button */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground italic">
            Tax invoice valid for Surakarta Regional Revenue Agency (Bapenda).
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white shadow-xs hover:bg-primary/90 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Folio Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
