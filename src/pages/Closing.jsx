/**
 * Tela de Fechamento — exclusiva para Admin/Titular.
 * Seleciona o cartão + mês e gera a prestação de contas por membro.
 */
import { useEffect, useState } from 'react'
import { FileText, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function Closing() {
  const { profile, isAdmin } = useAuth()
  const [cards, setCards] = useState([])
  const [selectedCard, setSelectedCard] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAdmin && profile) fetchCards()
  }, [profile, isAdmin])

  async function fetchCards() {
    const { data } = await supabase.from('credit_cards').select('id, name').eq('owner_id', profile.id)
    setCards(data ?? [])
  }

  async function generateReport() {
    if (!selectedCard || !selectedMonth) return
    setLoading(true)
    try {
      const start = `${selectedMonth}-01`
      const end = `${selectedMonth}-31`

      const { data: txs } = await supabase
        .from('transactions')
        .select('*, profiles(id, full_name, email)')
        .eq('card_id', selectedCard)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })

      // Agrupa por membro
      const byMember = {}
      for (const tx of txs ?? []) {
        const uid = tx.user_id
        if (!byMember[uid]) {
          byMember[uid] = {
            name: tx.profiles?.full_name ?? tx.user_id,
            email: tx.profiles?.email ?? '',
            transactions: [],
            total: 0,
          }
        }
        byMember[uid].transactions.push(tx)
        if (tx.type === 'expense') byMember[uid].total += tx.amount
      }

      setReport(Object.values(byMember))
    } finally {
      setLoading(false)
    }
  }

  // Gera os últimos 12 meses para o select
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
    return { val, label }
  })

  if (!isAdmin) {
    return <div className="py-16 text-center text-muted-foreground text-sm">Acesso restrito ao titular.</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fechamento de Fatura</h1>
        <p className="text-sm text-muted-foreground">Gere a prestação de contas por membro.</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cartão</Label>
              <Select value={selectedCard} onValueChange={setSelectedCard}>
                <SelectTrigger><SelectValue placeholder="Selecione o cartão…" /></SelectTrigger>
                <SelectContent>
                  {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mês de referência</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generateReport} disabled={!selectedCard || loading} className="w-full sm:w-auto gap-2">
            <FileText className="h-4 w-4" />
            {loading ? 'Gerando…' : 'Gerar relatório'}
          </Button>
        </CardContent>
      </Card>

      {/* Relatório por membro */}
      {report && (
        <div className="space-y-4">
          {report.map(member => (
            <Card key={member.email} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">{member.name}</CardTitle>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total a transferir</p>
                    <p className="text-xl font-bold text-destructive">{formatCurrency(member.total)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </CardHeader>
              <Separator />
              <CardContent className="pt-3 space-y-2">
                {member.transactions.map(tx => (
                  <div key={tx.id} className="flex items-start justify-between gap-2 py-1.5 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tx.merchant}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)} · {tx.category} · {tx.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      <Badge variant={tx.status === 'pending' ? 'warning' : 'success'} className="text-xs">
                        {tx.status === 'pending' ? 'Pendente' : 'Acertado'}
                      </Badge>
                      {tx.receipt_url && (
                        <a href={tx.receipt_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {report.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhuma transação encontrada para este período.</p>
          )}
        </div>
      )}
    </div>
  )
}
