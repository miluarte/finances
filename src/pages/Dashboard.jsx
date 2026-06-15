import { useEffect, useState } from 'react'
import { AlertTriangle, CreditCard, TrendingDown, Wallet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, getMonthYear } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

// Threshold para alerta de limite (80% do limite usado)
const LIMIT_ALERT_THRESHOLD = 0.8

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const currentMonth = getMonthYear()

  useEffect(() => {
    fetchSummary()
  }, [profile])

  async function fetchSummary() {
    if (!profile) return
    setLoading(true)
    try {
      // Busca transações do mês atual do usuário
      const startDate = `${currentMonth}-01`
      const endDate = `${currentMonth}-31`

      let query = supabase
        .from('transactions')
        .select('amount, type, card_id, status')
        .gte('date', startDate)
        .lte('date', endDate)

      if (!isAdmin) {
        query = query.eq('user_id', profile.id)
      }

      const { data: txs } = await query

      const totalExpenses = txs?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
      const totalIncome = txs?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
      const pendingAmount = txs?.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0) ?? 0

      // Cartões e limites (apenas admin)
      let cards = []
      if (isAdmin) {
        const { data } = await supabase.from('credit_cards').select('*').eq('owner_id', profile.id)
        cards = data ?? []
      }

      setSummary({ totalExpenses, totalIncome, pendingAmount, cards })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Carregando…</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {profile?.full_name?.split(' ')[0] ?? 'Usuário'} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumo de {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Meus gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-destructive">{formatCurrency(summary?.totalExpenses)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
            <Wallet className="h-4 w-4 text-green-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-green-600">{formatCurrency(summary?.totalIncome)}</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
            <CreditCard className="h-4 w-4 text-yellow-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente acerto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-yellow-600">{formatCurrency(summary?.pendingAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cartões — apenas admin */}
      {isAdmin && summary?.cards?.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Cartões</h2>
          {summary.cards.map(card => {
            const used = card.current_balance ?? 0
            const limit = card.credit_limit ?? 1
            const ratio = used / limit
            const limitWarning = ratio >= LIMIT_ALERT_THRESHOLD

            return (
              <Card key={card.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{card.name}</span>
                    <Badge variant={limitWarning ? 'warning' : 'secondary'}>
                      {formatCurrency(used)} / {formatCurrency(limit)}
                    </Badge>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${limitWarning ? 'bg-yellow-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Limite disponível estimado: {formatCurrency(limit - used)}
                  </p>
                  {limitWarning && (
                    <Alert variant="warning" className="py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="text-xs font-semibold">Atenção</AlertTitle>
                      <AlertDescription className="text-xs">
                        Mais de {Math.round(ratio * 100)}% do limite utilizado. Verifique se há compras não lançadas.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
