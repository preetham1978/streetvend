import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { Plus, Trash2, Receipt, Calendar, Tag, DollarSign, X, ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export interface ExpenseItem {
    id: string;
    title: string;
    category: string;
    amount: number;
    date: string;
}

export default function ExpensesPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();

    const vendorId = user?.id || 'v1';
    const storageKey = `streetvend_expenses_${vendorId}`;

    const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form states
    const [formTitle, setFormTitle] = useState('');
    const [formCategory, setFormCategory] = useState('Ingredients');
    const [formAmount, setFormAmount] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (!isAuthLoading && !user) {
            const storedUser = localStorage.getItem('vendor_user');
            if (!storedUser) {
                navigate('/login');
                return;
            }
        }

        // Load expenses from localStorage or populate default seed
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setExpenses(parsed);
                    return;
                }
            } catch (e) {
                console.error("Error reading saved expenses:", e);
            }
        }

        // Default seed data matching screenshot (Total ₹6,850)
        const initialSeed: ExpenseItem[] = [
            { id: 'exp_1', title: 'Puri, chutney, masala', category: 'Ingredients', amount: 2500, date: '2025-01-10' },
            { id: 'exp_2', title: 'Cart spot rent – January', category: 'Rent', amount: 3000, date: '2025-01-01' },
            { id: 'exp_3', title: 'LPG cylinder refill', category: 'Gas', amount: 850, date: '2025-01-08' },
            { id: 'exp_4', title: 'Helper daily wage', category: 'Helpers', amount: 500, date: '2025-01-14' }
        ];

        setExpenses(initialSeed);
        localStorage.setItem(storageKey, JSON.stringify(initialSeed));
    }, [user, isAuthLoading, navigate, storageKey]);

    const saveExpensesToStorage = (updated: ExpenseItem[]) => {
        setExpenses(updated);
        localStorage.setItem(storageKey, JSON.stringify(updated));
    };

    const handleAddExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim() || !formAmount || isNaN(Number(formAmount))) return;

        const newExpense: ExpenseItem = {
            id: 'exp_' + Date.now(),
            title: formTitle.trim(),
            category: formCategory,
            amount: parseFloat(formAmount),
            date: formDate || new Date().toISOString().split('T')[0]
        };

        const updated = [newExpense, ...expenses];
        saveExpensesToStorage(updated);

        // Reset form
        setFormTitle('');
        setFormAmount('');
        setFormCategory('Ingredients');
        setFormDate(new Date().toISOString().split('T')[0]);
        setIsAddModalOpen(false);
    };

    const handleDeleteExpense = (id: string) => {
        const updated = expenses.filter(item => item.id !== id);
        saveExpensesToStorage(updated);
    };

    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

    const categoryOptions = [
        'Ingredients',
        'Rent',
        'Gas',
        'Helpers',
        'Packaging',
        'Utilities',
        'Maintenance',
        'Transport',
        'Other'
    ];

    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-bg-base flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-text-primary tracking-tight">
                        Expenses
                    </h1>
                    <p className="text-xs sm:text-sm text-text-secondary font-medium mt-1">
                        Track your business expenses
                    </p>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-6 py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] cursor-pointer"
                >
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                    <span>Add Expense</span>
                </button>
            </div>


            {/* Total Expenses Banner (Mirroring Screenshot) */}
            <div className="bg-gradient-to-r from-[#ff3530] via-[#ff5035] to-[#f97316] rounded-3xl p-6 sm:p-8 shadow-2xl mb-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <span className="text-white/90 font-medium text-sm sm:text-base">
                        Total Expenses
                    </span>
                    <h2 className="font-sans font-extrabold text-4xl sm:text-5xl mt-2 tracking-tight not-italic">
                        ₹{totalExpenses.toLocaleString('en-IN')}
                    </h2>
                </div>
            </div>

            {/* Expense List Items (Mirroring Screenshot) */}
            <div className="space-y-3.5">
                {expenses.length === 0 ? (
                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-12 text-center">
                        <Receipt className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-60" />
                        <p className="text-base font-bold text-text-primary">No expenses recorded yet</p>
                        <p className="text-xs text-text-tertiary mt-1">Click "+ Add Expense" to log your first business expense.</p>
                    </div>
                ) : (
                    expenses.map((expense) => (
                        <div
                            key={expense.id}
                            className="bg-bg-surface border border-border-subtle rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-md hover:border-brand-500 transition-all group"
                        >
                            <div className="min-w-0 pr-4">
                                <h3 className="font-bold text-base sm:text-lg text-text-primary mb-1 truncate">
                                    {expense.title}
                                </h3>
                                <p className="text-xs sm:text-sm text-text-tertiary font-medium">
                                    {expense.category} · {expense.date}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <span className="font-sans font-extrabold text-lg sm:text-2xl text-brand-500 not-italic">
                                    ₹{expense.amount.toLocaleString('en-IN')}
                                </span>
                                <button
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    className="p-2 rounded-xl text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                                    title="Delete expense"
                                >
                                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Expense Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-bg-surface border border-border-subtle rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative mt-auto sm:mt-0">
                        <div className="w-12 h-1 bg-border-subtle rounded-full mx-auto mb-6 sm:hidden shrink-0" />
                        <div className="flex items-center justify-between pb-4 mb-6 border-b border-border-subtle">
                            <h2 className="font-display font-bold text-xl text-text-primary">
                                Add New Expense
                            </h2>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-surface-inset transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                    Expense Title / Description
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Puri, chutney, masala"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl bg-bg-base border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-brand-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                        Category
                                    </label>
                                    <select
                                        value={formCategory}
                                        onChange={(e) => setFormCategory(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl bg-bg-base border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-brand-500"
                                    >
                                        {categoryOptions.map(cat => (
                                            <option key={cat} value={cat} className="bg-bg-surface text-text-primary">
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                        Amount (₹)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        step="any"
                                        placeholder="e.g. 2500"
                                        value={formAmount}
                                        onChange={(e) => setFormAmount(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl bg-bg-base border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl bg-bg-base border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-brand-500"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-4 border-t border-border-subtle">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-3 rounded-2xl bg-bg-surface-inset hover:bg-bg-surface text-text-secondary font-bold text-sm transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg transition-all"
                                >
                                    Save Expense
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
