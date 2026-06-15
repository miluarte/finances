import { useEffect, useState, useCallback } from 'react'
import { Plus, Receipt, CheckCircle2, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getMonthYear } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Drawer, DrawerTrigger, DrawerContent, DrawerHeader,
  DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer',
  'Moradia', 'Vestuário', 'Mercado', 'Farmácia', 'Outros'
]

const emptyForm = {
  amount: '',
  date: new Date().toISOString().split('T')[0],
  merchant: '',
  category: '',
  reason: '',
  card_id: '',
  type: 'expense',
  receipt_url: '',
}

export default function Transactions() {
  const { profile, isAdmin } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [monthYear] = useState(getMonthYear())

  const fetchData = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      // Cartões permitidos ao usuário
      let cardQuery = isAdmin
        ? supabase.from('credit_cards').select('id, name').eq('owner_id', profile.id)
        : supabase.from('card_permissions').select('credit_cards(id, name)').eq('user_id', profile.id)

      const { data: cardData } = await cardQuery
      const flatCards = isAdmin
        ? cardData ?? []
        : (cardData ?? []).map(r => r.credit_cards).filter(Boolean)
      setCards(flatCards)

      // Transações do mês
      const start = `${monthYear}-01`
      const end = `${monthYear}-31`
      let txQuery = supabase
        .from('transactions')
        .select('*, credit_cards(name)')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })

      if (!isAdmin) txQuery = txQuery.eq('user_id', profile.id)

      const { data: txData } = await txQuery
      setTransactions(txData ?? [])
    } finally {
      setLoading(false)
    }
  }, [profile, isAdmin, monthYear])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleReceiptUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `receipts/${profile.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('receipts').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
      setForm(f => ({ ...f, receipt_url: publicUrl }))
    } catch (err) {
      console.error('Upload falhou:', err)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    console.log('handleSave chamado', { profile, form })
    setSaving(true)
    setSaveError('')
    try {
      const payload = {
        user_id: profile.id,
        amount: parseFloat(form.amount),
        date: form.date,
        merchant: form.merchant,
        category: form.category || 'Outros',
        reason: form.reason,
        card_id: form.card_id || null,
        type: form.type,
        receipt_url: form.receipt_url || null,
        status: 'pending',
      }
      console.log('Enviando payload:', payload)
      const { data, error } = await supabase.from('transactions').insert(payload).select()
      console.log('Resposta Supabase:', { data, error })
      if (error) throw error
      setOpen(false)
      setForm(emptyForm)
      fetchData()
    } catch (err) {
      console.error('Erro ao salvar:', err)
      setSaveError(err?.message ?? 'Erro ao salvar. Verifique o console.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(tx) {
    const next = tx.status === 'pending' ? 'settled' : 'pending'
    await supabase.from('transactions').update({ status: next }).eq('id', tx.id)
    fetchData()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lançamentos</h1>
          <p className="text-sm text-muted-foreground">{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())}</p>
        </div>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Novo Lançamento</DrawerTitle>
              <DrawerDescription>Preencha os dados da compra ou receita.</DrawerDescription>
            </DrawerHeader>
            <form onSubmit={handleSave} className="space-y-3">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: 'expense' }))}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors ${form.type === 'expense' ? 'bg-destructive text-white border-destructive' : 'hover:bg-muted'}`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: 'income' }))}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors ${form.type === 'income' ? 'bg-green-600 text-white border-green-600' : 'hover:bg-muted'}`}
                >
                  Receita
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Data</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Estabelecimento (onde)</Label>
                <Input placeholder="Ex: Supermercado Pão de Açúcar" value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} required />
              </div>

              <div className="space-y-1.5">
                <Label>Categoria (o quê)</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Motivo / Justificativa (por quê)</Label>
                <Input placeholder="Ex: Compras da semana" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required />
              </div>

              {cards.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Cartão utilizado</Label>
                  <Select value={form.card_id} onValueChange={v => setForm(f => ({ ...f, card_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cartão…" /></SelectTrigger>
                    <SelectContent>
                      {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Comprovante (imagem)</Label>
                <Input type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} disabled={uploading} />
                {uploading && <p className="text-xs text-muted-foreground">Enviando…</p>}
                {form.receipt_url && <p className="text-xs text-green-600">✓ Comprovante anexado</p>}
              </div>

              {saveError && (
                <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{saveError}</p>
              )}
              <DrawerFooter>
                <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar lançamento'}</Button>
                <DrawerClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Receipt className="h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhum lançamento neste mês.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => (
            <Card key={tx.id} className="overflow-hidden">
              <CardContent className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{tx.merchant}</span>
                    <Badge variant="outline" className="text-xs shrink-0">{tx.category}</Badge>
                    <Badge variant={tx.status === 'pending' ? 'warning' : 'success'} className="text-xs shrink-0">
                      {tx.status === 'pending' ? 'Pendente' : 'Acertado'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(tx.date)} · {tx.reason}</p>
                  {tx.credit_cards?.name && <p className="text-xs text-muted-foreground">{tx.credit_cards.name}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`font-semibold text-sm ${tx.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                  <button
                    onClick={() => toggleStatus(tx)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={tx.status === 'pending' ? 'Marcar como acertado' : 'Marcar como pendente'}
                  >
                    {tx.status === 'pending' ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  </button>
                  {tx.receipt_url && (
                    <a href={tx.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">comprovante</a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
