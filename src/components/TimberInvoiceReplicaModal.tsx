import React from 'react';
import { X, Printer, Share2, Download, CheckCircle2 } from 'lucide-react';

interface TimberInvoiceReplicaModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderData?: any;
}

export const PHYSICAL_BILL_25 = {
    invoiceNo: '25',
    date: '25/08/25',
    vendorName: 'K.V.SOMASUNDARAM SON',
    address: '1-A, Modachur Road, Gobi - 638476, Erode (Dt)',
    email: 'kvstimbers@gmail.com',
    phone: '(M)98650 16017, 93632 28065',
    gstin: '33AJKPP5362R1ZG',
    pan: 'AJKPP5362R',
    hsnCode: '4407, 4403',
    customerName: 'R. Thangavelu Avl',
    customerAddress: 'Nalla chitti Palayam, Sivagiri 638109, Erode Dt.',
    ewayBillNo: '5418 6645 4188',
    vehicleNo: 'TN-70J-6881',
    description: 'Teak wood Sizes',
    mCubm: '2.92',
    taxableAmount: 338983.06,
    sgst: 30508.47,
    cgst: 30508.47,
    totalTax: 61016.94,
    invoiceTotal: 400000.00,
    col1: [
        '6 x 9', '12½ - 2', '9 - 2', '7 - 14', '5 - 2', '6½ - 10', '5 x 4',
        '6 - 6', '2½ - 14', '4 - 8', '8 - 12', '6½ - 10', '5 - 20', '4½ - 14'
    ],
    col2: [
        '5 x 3', '8 - 6', '3½ - 3', '4 - 3', '36 - 1', '3 - 3', '3½ - 6',
        '4 - 2', '7 - 40', '5 - 60', '2 - 100', '4 x 4', '4 - 1', '12 x 2', '3½ - 7'
    ],
    col3: [
        '12 x 4', '8 - 3', '6½ - 2', '7½ - 1½', '8 - 2', '4 - 2', '13 - 12½',
        '8 - 3', '5½ - 1', '7 - 4', '2 - 4', '13½ - 1½', '7 - 2'
    ]
};

export default function TimberInvoiceReplicaModal({ isOpen, onClose, orderData }: TimberInvoiceReplicaModalProps) {
    if (!isOpen) return null;

    const data = orderData || PHYSICAL_BILL_25;
    const isExactBill25 = !orderData || orderData.id === '25';

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
            <div className="w-full max-w-3xl bg-amber-50 dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-zinc-800 shadow-2xl flex flex-col my-auto max-h-[96vh] overflow-hidden">
                
                {/* Modal Controls Header */}
                <div className="no-print p-4 bg-zinc-900 text-white flex items-center justify-between shrink-0 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold text-base sm:text-lg">🪵 Physical Paper Bill Replica</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono border border-amber-500/30">
                            Bill #{data.id || PHYSICAL_BILL_25.invoiceNo}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow"
                        >
                            <Printer className="w-4 h-4" /> Print Bill
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Bill Paper Container */}
                <div className="p-4 sm:p-8 overflow-y-auto font-serif text-amber-950 dark:text-zinc-100 bg-[#fefcf3] dark:bg-zinc-950">
                    <div className="printable-area max-w-2xl mx-auto border-2 border-red-900/40 p-5 sm:p-8 bg-[#fffdf5] dark:bg-zinc-900 shadow-xl rounded-sm space-y-4 relative">
                        
                        {/* Header Red/Burgundy Styling matching bill.jpeg */}
                        <div className="text-center text-red-900 dark:text-red-400 space-y-1 pb-3 border-b-2 border-red-900/30">
                            <div className="flex justify-between items-center text-[10px] font-sans font-bold uppercase tracking-wider text-red-800 dark:text-red-300">
                                <span>Invoice No.: <strong className="text-base text-red-900 dark:text-red-400 font-mono font-black">{data.id || PHYSICAL_BILL_25.invoiceNo}</strong></span>
                                <span className="px-2 py-0.5 border border-red-800 rounded font-black text-xs">CASH / CREDIT BILL</span>
                                <span>Date: <strong className="text-sm font-mono">{data.date || PHYSICAL_BILL_25.date}</strong></span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase font-serif pt-1 text-red-900 dark:text-red-400">
                                {PHYSICAL_BILL_25.vendorName}
                            </h1>

                            <p className="text-xs font-sans font-semibold text-red-900/90 dark:text-red-300">
                                {PHYSICAL_BILL_25.address} | Email: {PHYSICAL_BILL_25.email}
                            </p>
                            <p className="text-[11px] font-sans font-bold italic text-red-800 dark:text-red-300">
                                Dealing in all Kinds of Imported Timbers Logs & Sizes | HSN Code: {PHYSICAL_BILL_25.hsnCode}
                            </p>
                            <div className="text-[11px] font-sans font-extrabold text-red-950 dark:text-red-200 flex flex-wrap justify-center gap-4 pt-0.5">
                                <span>GST TIN: {PHYSICAL_BILL_25.gstin}</span>
                                <span>PAN: {PHYSICAL_BILL_25.pan}</span>
                                <span>Ph: {PHYSICAL_BILL_25.phone}</span>
                            </div>
                        </div>

                        {/* Customer & Vehicle Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans border-b border-red-900/20 pb-3">
                            <div className="space-y-1">
                                <p><span className="text-red-900 dark:text-red-400 font-bold">Mr./Messrs:</span> <strong className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{data.customerName || PHYSICAL_BILL_25.customerName}</strong></p>
                                <p><span className="text-red-900 dark:text-red-400 font-bold">Address:</span> {data.customerAddress || PHYSICAL_BILL_25.customerAddress}</p>
                            </div>
                            <div className="space-y-1 sm:text-right">
                                <p><span className="text-red-900 dark:text-red-400 font-bold">Vehicle No:</span> <strong className="font-mono text-zinc-900 dark:text-zinc-100">{data.vehicleNo || PHYSICAL_BILL_25.vehicleNo}</strong></p>
                                <p><span className="text-red-900 dark:text-red-400 font-bold">E-Way Bill:</span> <strong className="font-mono text-zinc-900 dark:text-zinc-100">{data.ewayBillNo || PHYSICAL_BILL_25.ewayBillNo}</strong></p>
                            </div>
                        </div>

                        {/* Bill Item Matrix Table */}
                        <div className="border border-red-900/40 rounded overflow-hidden">
                            <div className="grid grid-cols-12 bg-red-950 text-amber-100 text-[11px] font-sans font-bold uppercase py-2 px-3 border-b border-red-900/40">
                                <span className="col-span-2">Rate</span>
                                <span className="col-span-7">Description (Cut Sizes)</span>
                                <span className="col-span-1 text-center">M.CUBM</span>
                                <span className="col-span-2 text-right">Amount (Rs. Ps.)</span>
                            </div>

                            <div className="p-3 bg-[#fffdf5] dark:bg-zinc-900 text-xs font-mono leading-relaxed space-y-3">
                                <div className="flex justify-between items-center font-bold text-red-900 dark:text-red-400 font-sans border-b border-red-900/20 pb-1">
                                    <span>{PHYSICAL_BILL_25.description}</span>
                                    <span className="text-[10px] bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded text-red-900 dark:text-red-300 font-mono">
                                        42 Log Pieces (105/26)
                                    </span>
                                </div>

                                {/* 3 Column Hand-Written Cut Sizes Matrix */}
                                <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-zinc-800 dark:text-zinc-200 bg-amber-100/50 dark:bg-zinc-800/50 p-3 rounded border border-amber-200/60 dark:border-zinc-700/60 font-serif">
                                    <div className="space-y-1 border-r border-amber-300/40 pr-2">
                                        {PHYSICAL_BILL_25.col1.map((sz, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span>{sz}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-1 border-r border-amber-300/40 pr-2">
                                        {PHYSICAL_BILL_25.col2.map((sz, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span>{sz}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-1">
                                        {PHYSICAL_BILL_25.col3.map((sz, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span>{sz}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Volume Row */}
                                <div className="grid grid-cols-12 font-bold py-2 border-t border-b border-red-900/20 text-xs font-sans">
                                    <span className="col-span-2 text-zinc-500">₹1,16,090.09</span>
                                    <span className="col-span-7 font-bold text-zinc-900 dark:text-zinc-100">
                                        Teak Wood Total Volume: <strong className="text-red-900 dark:text-red-400">2.92 CBM</strong> (approx. 103.12 CFT)
                                    </span>
                                    <span className="col-span-1 text-center font-extrabold text-red-900 dark:text-red-400">2.92</span>
                                    <span className="col-span-2 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                                        338983.06
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Financial Totals Breakdown matching bill.jpeg */}
                        <div className="flex justify-end pt-1 font-sans">
                            <div className="w-full sm:w-80 space-y-1.5 text-xs border border-red-900/40 rounded p-3 bg-red-50/50 dark:bg-zinc-900">
                                <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                                    <span>Taxable Amount:</span>
                                    <strong className="font-mono text-sm font-extrabold">₹3,38,983.06</strong>
                                </div>
                                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                                    <span>SGST (9%):</span>
                                    <span className="font-mono">₹30,508.47</span>
                                </div>
                                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                                    <span>CGST (9%):</span>
                                    <span className="font-mono">₹30,508.47</span>
                                </div>
                                <div className="flex justify-between text-zinc-700 dark:text-zinc-300 pt-1 border-t border-red-900/20">
                                    <span className="font-bold">TOTAL TAX (18%):</span>
                                    <strong className="font-mono text-red-900 dark:text-red-400">₹61,016.94</strong>
                                </div>
                                <div className="flex justify-between text-base font-black text-red-950 dark:text-red-300 pt-2 border-t-2 border-red-900/40">
                                    <span>INVOICE TOTAL:</span>
                                    <span className="font-mono text-xl text-red-900 dark:text-red-400">
                                        ₹4,00,000.00
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Terms & Footer Signatures */}
                        <div className="flex justify-between items-end text-[10px] font-sans text-zinc-600 dark:text-zinc-400 pt-4 border-t border-red-900/20">
                            <div>
                                <p className="font-bold uppercase text-red-900 dark:text-red-400">E & O.E</p>
                                <p>Goods once sold will not be taken back.</p>
                                <p className="italic text-[9px] text-zinc-400 mt-1">Generated via Streetvend Intelligence POS</p>
                            </div>
                            <div className="text-right space-y-8">
                                <p className="font-bold text-red-900 dark:text-red-400 uppercase text-xs">For K.V.SOMASUNDARAM SON</p>
                                <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 border-t border-dashed border-red-900/40 pt-1">
                                    Authorized Signatory
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
