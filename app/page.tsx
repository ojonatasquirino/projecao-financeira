"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Wallet,
  PiggyBank,
  CreditCard,
  ShoppingCart,
  Plus,
  Trash2,
} from "lucide-react";

type Tendencia = "crescente" | "decrescente";

interface ChartData {
  day: number;
  date: string;
  saldo: number;
  saldoComSimulacao: number;
  tendencia: Tendencia;
  saldoCrescente?: number | null;
  saldoDecrescente?: number | null;
}

type MoneyEvent = { amount: number; day: number };

type BannerProps = {
  tone: "success" | "warning" | "danger";
  icon: React.ReactNode;
  children: React.ReactNode;
};

function Banner({ tone, icon, children }: BannerProps) {
  const toneMap = {
    success: {
      border: "border-green-600",
      dot: "bg-green-500",
      iconColor: "text-green-400",
    },
    warning: {
      border: "border-yellow-600",
      dot: "bg-yellow-500",
      iconColor: "text-yellow-400",
    },
    danger: {
      border: "border-red-600",
      dot: "bg-red-500",
      iconColor: "text-red-400",
    },
  } as const;
  const t = toneMap[tone];

  return (
    <div
      role="status"
      className={`w-full rounded-lg border ${t.border} bg-black px-3 py-2`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${t.dot}`} aria-hidden />
        <div className={`${t.iconColor}`} aria-hidden>
          {icon}
        </div>
        <p className="text-[13px] sm:text-sm leading-snug text-gray-200 whitespace-normal break-words hyphens-auto">
          {children}
        </p>
      </div>
    </div>
  );
}

export default function FinancialProjectionMobile() {
  // Valores base
  const [currentBalance, setCurrentBalance] = useState<string>("");
  const [dailySpending, setDailySpending] = useState<string>("");

  // Entradas e saídas (vários itens: valor + dia)
  const [incomes, setIncomes] = useState<MoneyEvent[]>([]);
  const [expenses, setExpenses] = useState<MoneyEvent[]>([]);

  // Form temporário para adicionar itens
  const [incomeAmountStr, setIncomeAmountStr] = useState("");
  const [incomeDayStr, setIncomeDayStr] = useState("");
  const [expenseAmountStr, setExpenseAmountStr] = useState("");
  const [expenseDayStr, setExpenseDayStr] = useState("");

  // Simulação
  const [simulationAmount, setSimulationAmount] = useState<string>("");
  const [simulationDay, setSimulationDay] = useState<string>("");

  // Datas
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const hasMinimumData = Boolean(
    currentBalance && (incomes.length || expenses.length || dailySpending)
  );

  // Utils
  const formatCompact = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    });

  const parseMoneyInput = (value: string) => {
    const normalized = value.replace(/[^\d,.-]/g, "").replace(",", ".");
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  // Adicionar/Remover entradas/saídas
  const addIncome = () => {
    const amount = parseMoneyInput(incomeAmountStr);
    const day = parseInt(incomeDayStr, 10);
    if (!amount || !Number.isFinite(day) || day < 1 || day > daysInMonth)
      return;
    setIncomes((prev) =>
      [...prev, { amount, day }].sort((a, b) => a.day - b.day)
    );
    setIncomeAmountStr("");
    setIncomeDayStr("");
  };
  const removeIncome = (idx: number) =>
    setIncomes((prev) => prev.filter((_, i) => i !== idx));

  const addExpense = () => {
    const amount = parseMoneyInput(expenseAmountStr);
    const day = parseInt(expenseDayStr, 10);
    if (!amount || !Number.isFinite(day) || day < 1 || day > daysInMonth)
      return;
    setExpenses((prev) =>
      [...prev, { amount, day }].sort((a, b) => a.day - b.day)
    );
    setExpenseAmountStr("");
    setExpenseDayStr("");
  };
  const removeExpense = (idx: number) =>
    setExpenses((prev) => prev.filter((_, i) => i !== idx));

  // Projeção com eventos no dia exato
  const chartData = useMemo<ChartData[]>(() => {
    if (!hasMinimumData) return [];

    const balance = parseMoneyInput(currentBalance);
    const daily = parseMoneyInput(dailySpending);
    const simAmount = parseMoneyInput(simulationAmount);
    const simDay = parseInt(simulationDay || "0", 10);

    // Mapas para somatório de eventos diários
    const incomeMap = new Map<number, number>();
    for (const it of incomes)
      incomeMap.set(it.day, (incomeMap.get(it.day) || 0) + it.amount);
    const expenseMap = new Map<number, number>();
    for (const it of expenses)
      expenseMap.set(it.day, (expenseMap.get(it.day) || 0) + it.amount);

    const data: ChartData[] = [];
    let running = balance;
    let runningSim = balance;
    let previous = balance;

    for (let day = currentDay; day <= daysInMonth; day++) {
      // Aplica entradas/saídas fixas do dia
      if (incomeMap.has(day)) {
        const val = incomeMap.get(day) || 0;
        running += val;
        runningSim += val;
      }
      if (expenseMap.has(day)) {
        const val = expenseMap.get(day) || 0;
        running -= val;
        runningSim -= val;
      }

      // Gasto médio diário (estimativa)
      running -= daily;
      runningSim -= daily;

      // Simulação
      if (day === simDay && simAmount > 0) {
        runningSim -= simAmount;
      }

      // Ondas trigonométricas (visuais)
      const progress =
        (day - currentDay) / Math.max(1, daysInMonth - currentDay);
      const base = Math.abs(running) || 1;
      const amp = Math.min(Math.max(base * 0.04, 8), 120); // limites pensados p/ mobile
      const primary = Math.sin(progress * Math.PI * 2) * amp;
      const secondary = Math.cos(progress * Math.PI * 6) * (amp * 0.25);

      const saldoW = running + primary + secondary;
      const saldoSimW = runningSim + primary + secondary;

      const tendencia: Tendencia =
        saldoW >= previous ? "crescente" : "decrescente";
      data.push({
        day,
        date: `${day}/${currentMonth + 1}`,
        saldo: saldoW,
        saldoComSimulacao: saldoSimW,
        tendencia,
        saldoCrescente: tendencia === "crescente" ? saldoW : null,
        saldoDecrescente: tendencia === "decrescente" ? saldoW : null,
      });
      previous = saldoW;
    }

    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentBalance,
    dailySpending,
    incomes,
    expenses,
    simulationAmount,
    simulationDay,
    currentDay,
    daysInMonth,
    hasMinimumData,
  ]);

  // Insights considerando apenas eventos restantes
  const insights = useMemo(() => {
    if (!chartData.length) {
      return {
        final: 0,
        risco: "Indefinido",
        riscoNivel: "neutro" as "alto" | "medio" | "baixo" | "neutro",
        diaSaldoZero: null as string | null,
        tetoDiarioSugerido: 0,
        proximaEntrada: null as string | null,
        proximaSaida: null as string | null,
      };
    }

    const final = chartData[chartData.length - 1].saldo;
    const daysLeft = Math.max(1, daysInMonth - currentDay + 1);
    const balance = parseMoneyInput(currentBalance);

    const upcomingIncomes = incomes.filter((e) => e.day >= currentDay);
    const upcomingExpenses = expenses.filter((e) => e.day >= currentDay);

    const upcomingIncomeTotal = upcomingIncomes.reduce(
      (s, e) => s + e.amount,
      0
    );
    const upcomingExpenseTotal = upcomingExpenses.reduce(
      (s, e) => s + e.amount,
      0
    );

    const tetoZero =
      (balance + upcomingIncomeTotal - upcomingExpenseTotal) / daysLeft;
    const tetoDiarioSugerido = Math.max(0, Math.round(tetoZero * 100) / 100);

    let diaSaldoZero: string | null = null;
    for (const d of chartData) {
      if (d.saldo <= 0) {
        diaSaldoZero = d.date;
        break;
      }
    }

    let riscoNivel: "alto" | "medio" | "baixo";
    if (final < 0) riscoNivel = "alto";
    else if (final < 300) riscoNivel = "medio";
    else riscoNivel = "baixo";
    const risco =
      riscoNivel === "alto"
        ? "Alto"
        : riscoNivel === "medio"
        ? "Médio"
        : "Baixo";

    const proximaEntrada = upcomingIncomes.length
      ? `${upcomingIncomes[0].day}/${currentMonth + 1}`
      : null;
    const proximaSaida = upcomingExpenses.length
      ? `${upcomingExpenses[0].day}/${currentMonth + 1}`
      : null;

    return {
      final,
      risco,
      riscoNivel,
      diaSaldoZero,
      tetoDiarioSugerido,
      proximaEntrada,
      proximaSaida,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, incomes, expenses, currentBalance, currentDay, daysInMonth]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[480px] p-4">
        {/* Header */}
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Previsibilidade Financeira
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Quanto vai sobrar até o fim do mês?
          </p>
        </header>

        {/* Saldo e Gasto diário */}
        <section className="space-y-3 mb-4">
          <Card className="bg-black border border-gray-700/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4 text-gray-300" aria-hidden />
                Saldo atual
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Label htmlFor="saldo-atual" className="text-xs text-gray-400">
                Quanto você tem hoje na conta corrente do seu banco
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  R$
                </span>
                <Input
                  id="saldo-atual"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(e.target.value)}
                  className="h-12 pl-8 bg-black border-gray-700/30 text-white placeholder:text-gray-500"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border border-gray-700/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-orange-400" aria-hidden />
                Gasto médio diário
                <Badge
                  variant="outline"
                  className="h-5 px-2 border-gray-700/40 text-gray-300"
                >
                  Estimativa
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Label htmlFor="gasto-diario" className="text-xs text-gray-400">
                Valor médio que você supõe gastar diariamente
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  R$
                </span>
                <Input
                  id="gasto-diario"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={dailySpending}
                  onChange={(e) => setDailySpending(e.target.value)}
                  className="h-12 pl-8 bg-black border-gray-700/30 text-white placeholder:text-gray-500"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Entradas (valor + dia) */}
        <section className="space-y-3 mb-4">
          <Card className="bg-black border border-gray-700/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" aria-hidden />
                Entradas fixas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label
                    htmlFor="entrada-valor"
                    className="text-xs text-gray-400"
                  >
                    Valor
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      R$
                    </span>
                    <Input
                      id="entrada-valor"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={incomeAmountStr}
                      onChange={(e) => setIncomeAmountStr(e.target.value)}
                      className="h-11 pl-8 bg-black border-gray-700/30 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="entrada-dia"
                    className="text-xs text-gray-400"
                  >
                    Dia
                  </Label>
                  <Input
                    id="entrada-dia"
                    type="number"
                    min={1}
                    max={daysInMonth}
                    placeholder="5"
                    value={incomeDayStr}
                    onChange={(e) => setIncomeDayStr(e.target.value)}
                    className="h-11 bg-black border-gray-700/30 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={addIncome}
                className="h-10 w-full bg-white/10 hover:bg-white/15 text-white border border-gray-700/30"
              >
                <Plus className="h-4 w-4 mr-2" /> Adicionar entrada
              </Button>

              {/* Lista de entradas */}
              {incomes.length > 0 && (
                <ul className="divide-y divide-gray-800 border border-gray-700/20 rounded-md">
                  {incomes.map((item, idx) => (
                    <li
                      key={`inc-${idx}`}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <span className="text-sm text-gray-200">
                        Dia {item.day} • {formatCurrency(item.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5"
                        onClick={() => removeIncome(idx)}
                        aria-label="Remover entrada"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Saídas (valor + dia) */}
          <Card className="bg-black border border-gray-700/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-400" aria-hidden />
                Saídas fixas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label
                    htmlFor="saida-valor"
                    className="text-xs text-gray-400"
                  >
                    Valor
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      R$
                    </span>
                    <Input
                      id="saida-valor"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={expenseAmountStr}
                      onChange={(e) => setExpenseAmountStr(e.target.value)}
                      className="h-11 pl-8 bg-black border-gray-700/30 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="saida-dia" className="text-xs text-gray-400">
                    Dia
                  </Label>
                  <Input
                    id="saida-dia"
                    type="number"
                    min={1}
                    max={daysInMonth}
                    placeholder="10"
                    value={expenseDayStr}
                    onChange={(e) => setExpenseDayStr(e.target.value)}
                    className="h-11 bg-black border-gray-700/30 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={addExpense}
                className="h-10 w-full bg-white/10 hover:bg-white/15 text-white border border-gray-700/30"
              >
                <Plus className="h-4 w-4 mr-2" /> Adicionar saída
              </Button>

              {/* Lista de saídas */}
              {expenses.length > 0 && (
                <ul className="divide-y divide-gray-800 border border-gray-700/20 rounded-md">
                  {expenses.map((item, idx) => (
                    <li
                      key={`exp-${idx}`}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <span className="text-sm text-gray-200">
                        Dia {item.day} • {formatCurrency(item.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5"
                        onClick={() => removeExpense(idx)}
                        aria-label="Remover saída"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Resumo + Banners */}
        {hasMinimumData && (
          <section className="mb-4 space-y-3">
            <Card className="bg-black border border-gray-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-gray-300" aria-hidden />
                  Resumo rápido
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 border border-gray-700/20 rounded-md">
                    <p className="text-[10px] text-gray-400">Saldo final</p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(insights.final)}
                    </p>
                  </div>
                  <div className="p-2 border border-gray-700/20 rounded-md">
                    <p className="text-[10px] text-gray-400">Risco</p>
                    <p
                      className={`text-sm font-semibold ${
                        insights.riscoNivel === "alto"
                          ? "text-red-400"
                          : insights.riscoNivel === "medio"
                          ? "text-yellow-400"
                          : "text-green-400"
                      }`}
                    >
                      {insights.risco}
                    </p>
                  </div>
                  <div className="p-2 border border-gray-700/20 rounded-md">
                    <p className="text-[10px] text-gray-400">
                      Teto diário (R$)
                    </p>
                    <p className="text-sm font-semibold">
                      {formatCompact(insights.tetoDiarioSugerido)}
                    </p>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 border border-gray-700/20 rounded-md">
                    <p className="text-[10px] text-gray-400">Próx. entrada</p>
                    <p className="text-sm font-medium">
                      {insights.proximaEntrada ?? "-"}
                    </p>
                  </div>
                  <div className="p-2 border border-gray-700/20 rounded-md">
                    <p className="text-[10px] text-gray-400">Próx. saída</p>
                    <p className="text-sm font-medium">
                      {insights.proximaSaida ?? "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2" aria-live="polite">
              {insights.riscoNivel === "alto" && (
                <Banner
                  tone="danger"
                  icon={<AlertTriangle className="h-4 w-4" />}
                >
                  Risco alto de fechar o mês no negativo. Limite o gasto diário
                  a{" "}
                  <span className="font-medium">
                    {formatCurrency(insights.tetoDiarioSugerido)}
                  </span>
                  .
                </Banner>
              )}
              {insights.riscoNivel === "medio" && (
                <Banner
                  tone="warning"
                  icon={<TrendingDown className="h-4 w-4" />}
                >
                  Atenção: busque ficar perto de{" "}
                  <span className="font-medium">
                    {formatCurrency(insights.tetoDiarioSugerido)}
                  </span>{" "}
                  por dia.
                </Banner>
              )}
              {insights.riscoNivel === "baixo" && (
                <Banner
                  tone="success"
                  icon={<CheckCircle className="h-4 w-4" />}
                >
                  Cenário saudável. Projeção:{" "}
                  <span className="font-medium">
                    {formatCurrency(insights.final)}
                  </span>{" "}
                  ao fim do mês.
                </Banner>
              )}
              {insights.diaSaldoZero && (
                <Banner
                  tone="warning"
                  icon={<AlertTriangle className="h-4 w-4" />}
                >
                  Saldo previsto ≤ 0 em{" "}
                  <span className="font-medium">{insights.diaSaldoZero}</span>.
                </Banner>
              )}
            </div>
          </section>
        )}

        {/* Gráfico — mobile-first */}
        {hasMinimumData && (
          <section className="mb-4">
            <Card className="bg-black border border-gray-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-300" aria-hidden />
                  Projeção do saldo
                </CardTitle>
                <p className="mt-1 text-[12px] text-gray-400">
                  Verde: alta • Laranja: queda
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto -mx-2 px-2">
                  <div className="min-w-[560px] h-[260px]">
                    <ChartContainer
                      config={{
                        saldoCrescente: {
                          label: "Saldo Crescente",
                          color: "#22c55e",
                        },
                        saldoDecrescente: {
                          label: "Saldo Decrescente",
                          color: "#f97316",
                        },
                        saldoComSimulacao: {
                          label: "Com Simulação",
                          color: "#8b5cf6",
                        },
                      }}
                      className="h-full"
                    >
                      <AreaChart
                        data={chartData}
                        margin={{ top: 6, right: 8, left: 4, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="crescenteGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#22c55e"
                              stopOpacity={0.55}
                            />
                            <stop
                              offset="95%"
                              stopColor="#22c55e"
                              stopOpacity={0.08}
                            />
                          </linearGradient>
                          <linearGradient
                            id="decrescenteGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#f97316"
                              stopOpacity={0.55}
                            />
                            <stop
                              offset="95%"
                              stopColor="#f97316"
                              stopOpacity={0.08}
                            />
                          </linearGradient>
                          <linearGradient
                            id="simulacaoGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#8b5cf6"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="#8b5cf6"
                              stopOpacity={0.06}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#2f2f2f"
                          opacity={0.35}
                        />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          interval="preserveStartEnd"
                          tickCount={5}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          tickFormatter={(v) => `R$ ${formatCompact(v)}`}
                          width={56}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => {
                                const labels: Record<string, string> = {
                                  saldoCrescente: "Saldo (crescente)",
                                  saldoDecrescente: "Saldo (decrescente)",
                                  saldoComSimulacao: "Com simulação",
                                };
                                return [
                                  `R$ ${Number(value).toFixed(2)}`,
                                  labels[name as string] ?? name,
                                ];
                              }}
                              contentStyle={{
                                backgroundColor: "#000000",
                                border: "1px solid rgba(107,114,128,.30)",
                                borderRadius: "10px",
                                color: "#ffffff",
                                padding: "8px 10px",
                              }}
                            />
                          }
                        />

                        <Area
                          type="basis"
                          dataKey="saldoCrescente"
                          stroke="#22c55e"
                          strokeWidth={3}
                          fill="url(#crescenteGradient)"
                          animationDuration={900}
                          connectNulls={false}
                        />
                        <Area
                          type="basis"
                          dataKey="saldoDecrescente"
                          stroke="#f97316"
                          strokeWidth={3}
                          fill="url(#decrescenteGradient)"
                          animationDuration={900}
                          connectNulls={false}
                        />
                        {simulationAmount && simulationDay && (
                          <Area
                            type="basis"
                            dataKey="saldoComSimulacao"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            strokeDasharray="8 4"
                            fill="url(#simulacaoGradient)"
                            animationDuration={700}
                            connectNulls={false}
                          />
                        )}
                      </AreaChart>
                    </ChartContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Simulador */}
        {hasMinimumData && (
          <section className="mb-6">
            <Card className="bg-black border border-gray-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle
                    className="h-4 w-4 text-gray-300"
                    aria-hidden
                  />
                  Simulador de gasto único
                </CardTitle>
                <p className="mt-1 text-[12px] text-gray-400">
                  Teste o impacto de um gasto extra em um dia específico deste
                  mês.
                </p>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label
                      htmlFor="sim-valor"
                      className="text-xs text-gray-400"
                    >
                      Valor
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        R$
                      </span>
                      <Input
                        id="sim-valor"
                        inputMode="decimal"
                        placeholder="200,00"
                        value={simulationAmount}
                        onChange={(e) => setSimulationAmount(e.target.value)}
                        className="h-11 pl-8 bg-black border-gray-700/30 text-white placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="sim-dia" className="text-xs text-gray-400">
                      Dia
                    </Label>
                    <Input
                      id="sim-dia"
                      type="number"
                      min={currentDay}
                      max={daysInMonth}
                      placeholder={String(currentDay + 1)}
                      value={simulationDay}
                      onChange={(e) => setSimulationDay(e.target.value)}
                      className="h-11 bg-black border-gray-700/30 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="text-[12px] text-gray-400 border border-gray-700/20 rounded-md p-3">
                  {simulationAmount && simulationDay ? (
                    <>
                      Simulando gasto de{" "}
                      <span className="text-gray-200 font-medium">
                        {formatCurrency(parseMoneyInput(simulationAmount))}
                      </span>{" "}
                      no dia{" "}
                      <span className="text-gray-200 font-medium">
                        {simulationDay}
                      </span>
                      . Veja a linha roxa tracejada no gráfico.
                    </>
                  ) : (
                    <>
                      Preencha os campos acima para visualizar o impacto
                      imediatamente no gráfico.
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
