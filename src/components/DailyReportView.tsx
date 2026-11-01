import React, { useState } from 'react';
import {
  CalendarCheck,
  TrendingUp,
  DollarSign,
  Receipt,
  Download,
  Printer,
  Ban,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
  PieChart,
  ShoppingBag,
  CreditCard,
  Smartphone,
  Banknote,
  FileText,
  X,
} from 'lucide-react';
import { DailyReportSummary, Sale, UserRole } from '../types';
import { formatCOP, generateDailyReport } from '../utils/billing';
import { sounds } from '../utils/audio';
import { SlushCupIcon } from './SlushCupIcon';

interface DailyReportViewProps {
  sales: Sale[];
  currentRole: UserRole;
  onViewInvoice: (sale: Sale) => void;
  onAnnulSale: (saleId: string) => void;
  onRequestAdminAuth: () => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  sales,
  currentRole,
  onViewInvoice,
  onAnnulSale,
  onRequestAdminAuth,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Cash Register Closing (Arqueo) state
  const [openingFloat, setOpeningFloat] = useState<number>(50000); // 50.000 COP base inicial
  const [actualCashCounted, setActualCashCounted] = useState<number>(0);
  const [showArqueoModal, setShowArqueoModal] = useState<boolean>(false);
  const [showPrintClosingModal, setShowPrintClosingModal] = useState<boolean>(false);
  const [arqueoSavedMsg, setArqueoSavedMsg] = useState<string | null>(null);

  // Anulacion modal confirmation
  const [saleToAnnulId, setSaleToAnnulId] = useState<string | null>(null);

  const isAdmin = currentRole === 'administrador';

  // Generate day report
  const summary: DailyReportSummary = generateDailyReport(sales, selectedDate);

  // Filter sales for the selected date
  const daySales = sales.filter((s) => s.createdAt.slice(0, 10) === selectedDate);

  // Arqueo difference calculation
  const totalExpectedCash = openingFloat + summary.cashExpected;
  const cashDifference = actualCashCounted - totalExpectedCash;

  // Export day sales to CSV (Admin only)
  const handleExportCSV = () => {
    sounds.playClick();
    const headers = [
      'Factura',
      'Hora',
      'Cajero',
      'Cliente',
      'Items',
      'Subtotal',
      'Descuento',
      'Total',
      'MedioPago',
      'Estado',
    ];

    const rows = daySales.map((s) => [
      s.invoiceNumber,
      new Date(s.createdAt).toLocaleTimeString('es-CO'),
      `"${s.cashierName}"`,
      `"${s.customerName || 'Consumidor Final'}"`,
      `"${s.items.map((i) => `${i.quantity}x ${i.size} ${i.flavorName}`).join('; ')}"`,
      s.subtotal,
      s.discount,
      s.total,
      s.paymentMethod,
      s.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ICE_GRANIZADOS_Reporte_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAnnulClick = (saleId: string) => {
    if (!isAdmin) {
      onRequestAdminAuth();
      return;
    }
    sounds.playClick();
    setSaleToAnnulId(saleId);
  };

  const handleConfirmAnnul = () => {
    if (saleToAnnulId) {
      sounds.playWarning();
      onAnnulSale(saleToAnnulId);
      setSaleToAnnulId(null);
    }
  };

  // =========================================================================
  // VIEW FOR EMPLOYEE: STRICTLY SHOW MONEY RECEIVED (NO INSUMOS, NO PROFIT)
  // =========================================================================
  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header for Employee */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/30 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-cyan-950/70 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">
                Cierre de Caja (Dinero Recaudado)
              </h2>
              <p className="text-xs text-slate-400">
                Resumen exclusivo de dinero recibido en el turno para entrega de caja.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowPrintClosingModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:opacity-90 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Imprimir Cierre de Turno</span>
            </button>
          </div>
        </div>

        {/* 4 Cards strictly displaying Money Received */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Money Collected */}
          <div className="p-5 rounded-3xl bg-gradient-to-b from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,242,254,0.15)]">
            <div className="flex items-center justify-between text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <span>Total Dinero Recaudado</span>
              <DollarSign className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-white font-mono tracking-tight">
              {formatCOP(summary.grossSales)}
            </div>
            <div className="mt-1 text-[11px] text-cyan-300 font-medium">
              {summary.totalSalesCount} {summary.totalSalesCount === 1 ? 'ticket cobrado' : 'tickets cobrados'}
            </div>
          </div>

          {/* Cash in Drawer */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-lg">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <span>Efectivo en Caja</span>
              <Banknote className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-emerald-300 font-mono tracking-tight">
              {formatCOP(summary.cashExpected)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Dinero físico recibido por ventas
            </div>
          </div>

          {/* Transfers (Nequi / Daviplata) */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-fuchsia-500/30 shadow-lg">
            <div className="flex items-center justify-between text-fuchsia-400 text-xs font-bold uppercase tracking-wider">
              <span>Nequi / Daviplata</span>
              <Smartphone className="w-4 h-4 text-fuchsia-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-fuchsia-300 font-mono tracking-tight">
              {formatCOP(summary.byPaymentMethod['Nequi / Daviplata'] || 0)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Transferencias electrónicas verificadas
            </div>
          </div>

          {/* Cards / Datáfono */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-sky-500/30 shadow-lg">
            <div className="flex items-center justify-between text-sky-400 text-xs font-bold uppercase tracking-wider">
              <span>Tarjeta / Datáfono</span>
              <CreditCard className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-sky-300 font-mono tracking-tight">
              {formatCOP(summary.byPaymentMethod['Tarjeta / Datáfono'] || 0)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Vouchers de tarjetas débito / crédito
            </div>
          </div>
        </div>

        {/* Section: Arqueo del Efectivo en Caja (Entrega de Dinero) */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Cuadre y Conteo de Efectivo Físico
            </h3>
            <span className="text-xs text-slate-400">
              Fecha: {selectedDate}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Base Inicial de Caja (Apertura):
                </label>
                <input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Dinero que se tenía en caja antes de empezar a vender.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Efectivo Físico Contado en Gaveta:
                </label>
                <input
                  type="number"
                  value={actualCashCounted || ''}
                  onChange={(e) => setActualCashCounted(parseFloat(e.target.value) || 0)}
                  placeholder="Digita el dinero total en gaveta..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Cuenta todos los billetes y monedas que hay físicamente en la gaveta.
                </span>
              </div>
            </div>

            {/* Live Cash Balance Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Base Inicial en Caja:</span>
                  <span className="font-mono text-white font-bold">{formatCOP(openingFloat)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>(+) Ventas del Turno en Efectivo:</span>
                  <span className="font-mono text-emerald-400 font-bold">{formatCOP(summary.cashExpected)}</span>
                </div>
                <div className="flex justify-between text-slate-200 pt-2 border-t border-slate-800 font-bold">
                  <span>(=) Efectivo Total Esperado:</span>
                  <span className="font-mono text-white text-sm">{formatCOP(totalExpectedCash)}</span>
                </div>
                <div className="flex justify-between text-slate-200 font-bold">
                  <span>Efectivo Contado por Cajero:</span>
                  <span className="font-mono text-cyan-300 text-sm">{formatCOP(actualCashCounted)}</span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex justify-between items-center font-bold ${
                  actualCashCounted === 0
                    ? 'bg-slate-900 border-slate-700 text-slate-400'
                    : cashDifference === 0
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
                    : cashDifference > 0
                    ? 'bg-blue-950/70 border-blue-500/60 text-blue-300'
                    : 'bg-rose-950/70 border-rose-500/60 text-rose-300'
                }`}
              >
                <span>
                  {actualCashCounted === 0
                    ? 'Ingresa el conteo para verificar'
                    : cashDifference === 0
                    ? '✓ ¡Caja Cuadrada Exacta!'
                    : cashDifference > 0
                    ? 'Sobrante en Caja:'
                    : 'Faltante en Caja:'}
                </span>
                <span className="font-mono text-sm">
                  {actualCashCounted === 0 ? '' : formatCOP(Math.abs(cashDifference))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Facturas Cobradas del Turno (Solo información de cobro) */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-cyan-400" />
              Facturas Cobradas ({daySales.length})
            </h3>
            <span className="text-xs text-slate-400">
              Registros de cobro del día
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Factura</th>
                  <th className="py-3 px-3">Hora</th>
                  <th className="py-3 px-3">Cliente / Mesa</th>
                  <th className="py-3 px-3">Medio de Pago</th>
                  <th className="py-3 px-3 text-right">Total Cobrado</th>
                  <th className="py-3 px-3 text-center">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {daySales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      No hay cobros registrados en esta fecha.
                    </td>
                  </tr>
                ) : (
                  daySales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-950/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-cyan-400">{sale.invoiceNumber}</td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(sale.createdAt).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300">
                        {sale.customerName || 'Consumidor Final'}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-medium">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white text-sm">
                        {formatCOP(sale.total)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            onViewInvoice(sale);
                          }}
                          className="px-2 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-[11px] font-sans font-semibold border border-cyan-500/30 transition-colors"
                        >
                          Ver Recibo
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Thermal Shift Closing Receipt (Imprimir Cierre de Turno) */}
        {showPrintClosingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-sm bg-slate-950 border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_40px_rgba(0,242,254,0.3)]">
              <button
                type="button"
                onClick={() => setShowPrintClosingModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
                aria-label="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Thermal Paper Simulation */}
              <div className="bg-white text-black p-5 rounded-xl font-mono text-xs shadow-inner space-y-3 print:m-0 print:p-0">
                <div className="text-center pb-2 border-b border-dashed border-neutral-400">
                  <div className="flex justify-center mb-1">
                    <SlushCupIcon size={28} className="w-7 h-7 text-black" />
                  </div>
                  <h4 className="font-black text-sm uppercase tracking-wider">ICE GRANIZADOS</h4>
                  <p className="text-[10px] text-neutral-600">COMPROBANTE DE CIERRE DE CAJA</p>
                  <p className="text-[10px] text-neutral-600">Fecha: {selectedDate}</p>
                </div>

                <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-neutral-400">
                  <div className="flex justify-between font-bold">
                    <span>TOTAL RECAUDADO:</span>
                    <span>{formatCOP(summary.grossSales)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-700 pl-2">
                    <span>• Efectivo en Ventas:</span>
                    <span>{formatCOP(summary.cashExpected)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-700 pl-2">
                    <span>• Nequi / Daviplata:</span>
                    <span>{formatCOP(summary.byPaymentMethod['Nequi / Daviplata'] || 0)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-700 pl-2">
                    <span>• Tarjetas:</span>
                    <span>{formatCOP(summary.byPaymentMethod['Tarjeta / Datáfono'] || 0)}</span>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-neutral-400">
                  <div className="flex justify-between">
                    <span>Base Inicial:</span>
                    <span>{formatCOP(openingFloat)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Efectivo Esperado:</span>
                    <span>{formatCOP(totalExpectedCash)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Efectivo Contado:</span>
                    <span>{formatCOP(actualCashCounted)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1">
                    <span>Diferencia:</span>
                    <span>{formatCOP(cashDifference)}</span>
                  </div>
                </div>

                <div className="pt-6 pb-2 text-[10px] text-center space-y-4 text-neutral-600">
                  <div className="border-t border-neutral-400 w-3/4 mx-auto pt-1">
                    Firma Cajero(a)
                  </div>
                  <div className="border-t border-neutral-400 w-3/4 mx-auto pt-1">
                    Firma Entrega / Administrador
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 mt-5">
                <button
                  type="button"
                  onClick={() => setShowPrintClosingModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    window.print();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-xs font-black flex items-center justify-center space-x-1.5 shadow-[0_0_15px_rgba(0,242,254,0.4)]"
                >
                  <Printer className="w-4 h-4 stroke-[2.5]" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW FOR ADMINISTRATOR: FULL BUSINESS INTELLIGENCE & INVENTORY AUDIT
  // =========================================================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Date Picker for Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/30 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-cyan-950/70 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-wide">
              Reporte Diario de Ventas & Control de Insumos
            </h2>
            <p className="text-xs text-slate-400">
              Desglose financiero consolidado del día, unidades por tamaño y arqueo de caja.
            </p>
          </div>
        </div>

        {/* Date Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              setShowArqueoModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(217,70,239,0.3)] hover:opacity-90 transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Arqueo de Caja</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            title="Exportar ventas del día a CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards (Admin View) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Ventas Brutas del Día</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {formatCOP(summary.grossSales)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {summary.totalSalesCount} transacciones completadas
          </div>
        </div>

        {/* Insumos Cost */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Costo de Insumos</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300 font-mono">
            {formatCOP(summary.totalCost)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Vasos, tapas, hielo y pulpas utilizadas
          </div>
        </div>

        {/* Net Profit */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,242,254,0.15)] bg-gradient-to-b from-cyan-950/20 to-slate-900">
          <div className="flex items-center justify-between text-cyan-300 text-xs font-semibold">
            <span>Ganancia Neta del Día</span>
            <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              {summary.profitMarginPercent}% margen
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300 font-mono">
            {formatCOP(summary.netProfit)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400">
            Utilidad real descontando materia prima
          </div>
        </div>

        {/* Cash Expected */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Efectivo en Caja</span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
            {formatCOP(summary.cashExpected)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Ventas en efectivo sin contar base
          </div>
        </div>
      </div>

      {/* Breakdowns Grid (Admin Only) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breakdown by Size (12oz: 12k, 14oz: 14k, 16oz: 16k) */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              Ventas por Tamaño
            </h3>
            <span className="text-xs text-slate-400">
              Total:{' '}
              {summary.bySize['12oz'].count +
                summary.bySize['14oz'].count +
                summary.bySize['16oz'].count}{' '}
              uds
            </span>
          </div>

          <div className="space-y-3">
            {[
              { size: '12oz', label: '12 Onzas ($12.000)', color: 'from-cyan-400 to-blue-500' },
              { size: '14oz', label: '14 Onzas ($14.000)', color: 'from-blue-500 to-indigo-500' },
              { size: '16oz', label: '16 Onzas ($16.000)', color: 'from-fuchsia-500 to-pink-500' },
            ].map(({ size, label, color }) => {
              const data = summary.bySize[size as '12oz' | '14oz' | '16oz'];
              return (
                <div key={size} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-200">{label}</span>
                    <span className="font-mono font-bold text-white">
                      {data.count} vendidos
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Recaudado:</span>
                    <span className="text-cyan-300 font-bold">{formatCOP(data.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown by Payment Method */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-fuchsia-400" />
            Medios de Pago
          </h3>

          <div className="space-y-3">
            {[
              { id: 'Efectivo', label: 'Efectivo en Caja', color: 'text-emerald-400' },
              { id: 'Nequi / Daviplata', label: 'Nequi / Daviplata', color: 'text-fuchsia-400' },
              { id: 'Tarjeta / Datáfono', label: 'Tarjeta / Datáfono', color: 'text-cyan-400' },
            ].map(({ id, label, color }) => {
              const amount = summary.byPaymentMethod[id as keyof typeof summary.byPaymentMethod] || 0;
              const pct = summary.grossSales > 0 ? Math.round((amount / summary.grossSales) * 100) : 0;

              return (
                <div key={id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-200">{label}</span>
                    <span className={`font-mono font-bold ${color}`}>{formatCOP(amount)}</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-right text-[10px] text-slate-500 font-mono">
                    {pct}% del total
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular Flavors */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            Sabores Más Vendidos
          </h3>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {Object.keys(summary.byFlavor).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Sin ventas registradas en esta fecha.
              </p>
            ) : (
              Object.entries(summary.byFlavor)
                .sort((a, b) => b[1] - a[1])
                .map(([flavorName, count], idx) => (
                  <div
                    key={flavorName}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-200 truncate">
                        {flavorName}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-cyan-300">
                      {count} {count === 1 ? 'granizado' : 'granizados'}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Day Invoices Table (Admin View with Annul) */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-cyan-400" />
            Facturas del Día ({daySales.length})
          </h3>
          <span className="text-xs text-slate-400">
            Fecha: {selectedDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Factura</th>
                <th className="py-3 px-3">Hora</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Detalle Granizados</th>
                <th className="py-3 px-3">Medio</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {daySales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    No hay facturas registradas en esta fecha.
                  </td>
                </tr>
              ) : (
                daySales.map((sale) => {
                  const isAnnulled = sale.status === 'anulada';
                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-950/60 transition-colors ${
                        isAnnulled ? 'opacity-40 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-cyan-400">{sale.invoiceNumber}</td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(sale.createdAt).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300">
                        {sale.customerName || 'Consumidor Final'}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300 max-w-xs truncate">
                        {sale.items
                          .map(
                            (i) =>
                              `${i.quantity}x ${i.size} (${i.flavorName}${
                                i.secondaryFlavorName ? '+' + i.secondaryFlavorName : ''
                              })`
                          )
                          .join(', ')}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-400">
                        {sale.paymentMethod}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        {formatCOP(sale.total)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase ${
                            isAnnulled
                              ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5 font-sans">
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              onViewInvoice(sale);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-950 text-cyan-300 hover:text-cyan-200 transition-colors"
                            title="Ver o reimprimir ticket"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {!isAnnulled && (
                            <button
                              type="button"
                              onClick={() => handleAnnulClick(sale.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 hover:text-rose-300 transition-colors"
                              title="Anular factura y devolver stock"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Register Closing (Arqueo de Caja) Modal for Admin */}
      {showArqueoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-950 border border-fuchsia-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(217,70,239,0.3)]">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-fuchsia-400" />
              Arqueo & Cierre Diario de Caja
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Verificación física del dinero en gaveta para la fecha {selectedDate}.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Base Inicial de Caja (Apertura):
                </label>
                <input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-fuchsia-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Efectivo Físico Contado en Gaveta:
                </label>
                <input
                  type="number"
                  value={actualCashCounted}
                  onChange={(e) => setActualCashCounted(parseFloat(e.target.value) || 0)}
                  placeholder="Ej. 180000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Arqueo Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Base Inicial:</span>
                  <span className="font-mono text-white">{formatCOP(openingFloat)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Ventas en Efectivo del Día:</span>
                  <span className="font-mono text-white">{formatCOP(summary.cashExpected)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-200 pt-1 border-t border-slate-800">
                  <span>Efectivo Total Esperado:</span>
                  <span className="font-mono">{formatCOP(totalExpectedCash)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Efectivo Real Contado:</span>
                  <span className="font-mono text-cyan-300">{formatCOP(actualCashCounted)}</span>
                </div>

                <div
                  className={`mt-2 p-2.5 rounded-xl border flex justify-between items-center font-bold ${
                    cashDifference === 0
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : cashDifference > 0
                      ? 'bg-blue-950/60 border-blue-500/50 text-blue-300'
                      : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  }`}
                >
                  <span>
                    {cashDifference === 0
                      ? '¡Caja Cuadrada Exacta!'
                      : cashDifference > 0
                      ? 'Sobrante en Caja:'
                      : 'Faltante en Caja:'}
                  </span>
                  <span className="font-mono text-sm">{formatCOP(Math.abs(cashDifference))}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowArqueoModal(false)}
                  className="py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playSuccess();
                    setArqueoSavedMsg(
                      `Cierre de caja guardado con éxito. Efectivo esperado: ${formatCOP(
                        totalExpectedCash
                      )} | Contado: ${formatCOP(actualCashCounted)} | Dif: ${formatCOP(
                        cashDifference
                      )}`
                    );
                    setShowArqueoModal(false);
                    setTimeout(() => setArqueoSavedMsg(null), 4000);
                  }}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-xs font-black shadow-[0_0_15px_rgba(217,70,239,0.4)]"
                >
                  Guardar Cierre de Turno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Arqueo Saved Notification Banner */}
      {arqueoSavedMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-fuchsia-950/90 border border-fuchsia-500 text-fuchsia-200 shadow-[0_0_25px_rgba(217,70,239,0.4)] backdrop-blur-md flex items-center space-x-3 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-fuchsia-400 shrink-0" />
          <span className="text-xs font-bold">{arqueoSavedMsg}</span>
          <button
            type="button"
            onClick={() => setArqueoSavedMsg(null)}
            className="p-1 text-fuchsia-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modal: Confirmar Anulación de Factura */}
      {saleToAnnulId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-slate-950 border border-rose-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)]">
            <div className="flex items-center space-x-3 text-rose-400 pb-3 border-b border-slate-800">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Anular Factura
              </h3>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              ¿Estás seguro de anular esta factura? Los insumos (vasos, pulpas, hielo) se revertirán automáticamente al inventario activo.
            </p>

            <div className="flex space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setSaleToAnnulId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAnnul}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              >
                Sí, Anular Factura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
