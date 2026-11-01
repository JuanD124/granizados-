import React, { useRef, useState } from 'react';
import { Printer, Download, X, CheckCircle2, Sparkles, Share2 } from 'lucide-react';
import { Sale } from '../types';
import { formatCOP } from '../utils/billing';
import { sounds } from '../utils/audio';

interface InvoiceModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ sale, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);

  if (!sale) return null;

  const handlePrint = () => {
    sounds.playClick();
    window.print();
  };

  const handleCopyText = () => {
    sounds.playClick();
    const textReceipt = `
========================================
           ICE GRANIZADOS
   Cra. 43A # 18 Sur - Local 102
         NIT: 901.482.910-1
       WhatsApp: +57 300 987 6543
========================================
FACTURA POS: ${sale.invoiceNumber}
FECHA: ${new Date(sale.createdAt).toLocaleString('es-CO')}
CAJERO: ${sale.cashierName}
UBICACIÓN / MESA: ${sale.tableName || 'Mostrador'}
CLIENTE: ${sale.customerName || 'Consumidor Final'}
----------------------------------------
CANT | DESCRIPCIÓN                 | VALOR
----------------------------------------
${sale.items
  .map(
    (item) =>
      `${item.quantity}x Granizado ${item.size} (${item.flavorName}${
        item.secondaryFlavorName ? ' + ' + item.secondaryFlavorName : ''
      })\n   ${item.toppings.map((t) => '+' + t.name).join(', ')}\n   Subt: ${formatCOP(
        item.unitPrice * item.quantity
      )}`
  )
  .join('\n')}
----------------------------------------
SUBTOTAL:   ${formatCOP(sale.subtotal)}
DESCUENTO:  ${formatCOP(sale.discount)}
TOTAL PAGAR:${formatCOP(sale.total)}
MEDIO PAGO: ${sale.paymentMethod}
RECIBIDO:   ${formatCOP(sale.amountPaid)}
DEVUELTA:   ${formatCOP(sale.change)}
========================================
  ¡GRACIAS POR DISFRUTAR EL SABOR ICE!
========================================
`.trim();

    navigator.clipboard?.writeText(textReceipt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md flex justify-center items-center animate-in fade-in duration-200">
      <div className="relative w-full max-w-md my-auto bg-slate-950 border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_60px_rgba(0,242,254,0.3)] flex flex-col max-h-[92vh]">
        {/* Header Actions */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2 text-cyan-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-xs sm:text-sm font-bold tracking-wide uppercase">
              Venta Facturada con Éxito
            </span>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            aria-label="Cerrar recibo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Ticket Container */}
        <div
          ref={receiptRef}
          id="printable-ticket"
          className="my-4 p-5 bg-white text-slate-900 font-mono text-xs rounded-xl shadow-2xl border-t-8 border-cyan-400 leading-relaxed overflow-y-auto flex-1 print:m-0 print:p-4 print:shadow-none print:w-full"
        >
          {/* Receipt Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-400">
            <h3 className="text-lg font-black tracking-widest text-slate-950 uppercase">
              ★ ICE GRANIZADOS ★
            </h3>
            <p className="text-[11px] font-semibold text-slate-700">
              Granizados Artesanales Neón & Refrescantes
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              NIT: 901.482.910-1 | Régimen Simplificado
            </p>
            <p className="text-[10px] text-slate-500">
              Cra. 43A # 18 Sur - Local 102 | Medellín, CO
            </p>
            <p className="text-[10px] text-slate-500">
              Tel / WhatsApp: +57 300 987 6543
            </p>
          </div>

          {/* Invoice Info */}
          <div className="py-3 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <div className="flex justify-between font-bold">
              <span>FACTURA N°:</span>
              <span className="text-cyan-700">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>FECHA / HORA:</span>
              <span>{new Date(sale.createdAt).toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between">
              <span>CAJERO:</span>
              <span>{sale.cashierName}</span>
            </div>
            {sale.tableName && (
              <div className="flex justify-between font-bold text-cyan-800">
                <span>UBICACIÓN / MESA:</span>
                <span>{sale.tableName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>CLIENTE:</span>
              <span>{sale.customerName || 'Consumidor Final'}</span>
            </div>
          </div>

          {/* Items Header */}
          <div className="py-2 border-b border-slate-300 font-bold text-[10px] uppercase flex justify-between">
            <span className="w-8">CANT</span>
            <span className="flex-1 px-2">DESCRIPCIÓN</span>
            <span className="text-right">VALOR</span>
          </div>

          {/* Items List */}
          <div className="py-2 border-b border-dashed border-slate-400 space-y-3">
            {sale.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-bold text-[11px]">
                  <span className="w-8">{item.quantity}x</span>
                  <span className="flex-1 px-2">
                    Granizado {item.size} - {item.flavorName}
                    {item.secondaryFlavorName && ` / ${item.secondaryFlavorName}`}
                  </span>
                  <span className="text-right">
                    {formatCOP(item.unitPrice * item.quantity)}
                  </span>
                </div>
                {item.toppings.length > 0 && (
                  <div className="pl-8 text-[10px] text-slate-600">
                    + {item.toppings.map((t) => `${t.name} (${formatCOP(t.price)})`).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div className="py-3 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-700">
              <span>SUBTOTAL:</span>
              <span>{formatCOP(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>DESCUENTO:</span>
                <span>-{formatCOP(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm text-slate-950 pt-1 border-t border-slate-200">
              <span>TOTAL A PAGAR:</span>
              <span>{formatCOP(sale.total)}</span>
            </div>
          </div>

          {/* Payment & Cash Details */}
          <div className="py-3 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>MEDIO DE PAGO:</span>
              <span className="font-bold">{sale.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span>MONTO RECIBIDO:</span>
              <span>{formatCOP(sale.amountPaid)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>CAMBIO / DEVUELTA:</span>
              <span className="text-emerald-700">{formatCOP(sale.change)}</span>
            </div>
          </div>

          {/* Automatic Inventory Deduction Notice */}
          <div className="py-2.5 my-2 bg-slate-100 rounded-lg p-2 text-[10px] text-slate-600 space-y-0.5">
            <p className="font-bold text-slate-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-600" />
              Insumos descontados automáticamente:
            </p>
            <p>
              • {sale.items.reduce((s, i) => s + i.quantity, 0)} vasos y tapas domo
              {sale.items.map((i) => ` (${i.size})`).join(', ')}
            </p>
            <p>
              • {sale.items.reduce((s, i) => s + i.quantity, 0)} pitillos cuchara neón
            </p>
            <p>• Porciones de pulpa/siropes e hielo purificado proporcional al tamaño</p>
          </div>

          {/* Receipt Footer & Barcode Mock */}
          <div className="text-center pt-3 space-y-2">
            <div className="flex justify-center py-1">
              {/* Simulated 1D Barcode */}
              <div className="flex items-center space-x-[2px] h-9">
                {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1].map(
                  (w, i) => (
                    <div
                      key={i}
                      className="bg-slate-900 h-full"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  )
                )}
              </div>
            </div>
            <p className="font-mono text-[9px] text-slate-500 tracking-wider">
              COD: {sale.id.toUpperCase()}
            </p>
            <p className="text-[11px] font-bold text-slate-900">
              ¡GRACIAS POR TU COMPRA!
            </p>
            <p className="text-[10px] text-slate-500">
              Conserva este ticket para cualquier reclamo o garantía.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-[0_0_15px_rgba(0,242,254,0.4)]"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={handleCopyText}
            className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border text-xs font-bold transition-all ${
              copied
                ? 'bg-emerald-950 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-200'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Copiar</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all"
            aria-label="Cerrar recibo"
          >
            <span>Cerrar Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
