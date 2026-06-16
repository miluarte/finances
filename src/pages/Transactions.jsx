import { useEffect, useState, useCallback } from 'react'
import { Plus, Receipt, CheckCircle2, Clock, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogClose
} from '@/components/ui/dialog'
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
  const [editTx, setEditTx] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const fetchData = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      let cardQuery = isAdmin
        ? supabase.from('credit_cards').select('id, name').eq('owner_id', profile.id)
        : supabase.from('card_permissions').select('credit_cards(id, name)').eq('user_id', profile.id)

      const { data: cardData } = await cardQuery
      const flatCards = isAdmin
        ? cardData ?? []
        : (cardData ?? []).map(r => r.credit_cards).filter(Boolean)
      setCards(flatCards)

      let txQuery = supabase
        .from('transactions')
        .select('*, credit_cards(name)')
        .order('date', { ascending: false })

      if (!isAdmin) txQuery = txQuery.eq('user_id', profile.id)

      const { data: txData } = await txQuery
      setTransactions(txData ?? [])
    } finally {
      setLoading(false)
    }
  }, [profile, isAdmin])

  useEffect(() => {
    fetchData()
    window.addEventListener('focus', fetchData)
    return () => window.removeEventListener('focus', fetchData)
  }, [fetchData])

  function openNew() {
    setEditTx(null)
    setForm(emptyForm)
    setSaveError('')
    setOpen(true)
  }

  function openEdit(tx) {
    setEditTx(tx)
    setForm({
      amount: tx.amount,
      date: tx.date,
      merchant: tx.merchant,
      category: tx.category,
      reason: tx.reason,
      card_id: tx.card_id ?? '',
      type: tx.type,
      receipt_url: tx.receipt_url ?? '',
    })
    setSaveError('')
    setOpen(true)
  }

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
    setSaving(true)
    setSaveError('')
    try {
      const payload = {
        amount: parseFloat(form.amount),
        date: form.date,
        merchant: form.merchant,
        category: form.category || 'Outros',
        reason: form.reason,
        card_id: form.card_id || null,
        type: form.type,
        receipt_url: form.receipt_url || null,
      }

      let error
      if (editTx) {
        ({ error } = await supabase.from('transactions').update(payload).eq('id', editTx.id))
      } else {
        ({ error } = await supabase.from('transactions').insert({ ...payload, user_id: profile.id, status: 'pending' }))
      }

      if (error) throw error
      setOpen(false)
      fetchData()
    } catch (err) {
      setSaveError(err?.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setDeleting(id)
    try {
      await supabase.from('transactions').delete().eq('id', id)
      setTransactions(prev => prev.filter(t => t.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  async function toggleStatus(tx) {
    const next = tx.status === 'pending' ? 'settled' : 'pending'
    await supabase.from('transactions').update({ status: next }).eq('id', tx.id)
    setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: next } : t))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Lançamentos</h1>
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {/* Dialog: criar ou editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTx ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {['expense', 'income'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                    form.type === t
                      ? t === 'expense' ? 'bg-destructive text-white border-destructive' : 'bg-green-600 text-white border-green-600'
                      : 'hover:bg-muted'
                  }`}
                >
                  {t === 'expense' ? 'Despesa' : 'Receita'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number" step="0.01" min="0.01" placeholder="0,00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  onKeyDown={e => ['e','E','+','-'].includes(e.key) && e.preventDefault()}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Estabelecimento</Label>
              <Input placeholder="Ex: Supermercado Pão de Açúcar" value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} required />
            </div>

            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Input placeholder="Ex: Compras da semana" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required />
            </div>

            {cards.length > 0 && (
              <div className="space-y-1.5">
                <Label>Cartão</Label>
                <Select value={form.card_id} onValueChange={v => setForm(f => ({ ...f, card_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cartão…" /></SelectTrigger>
                  <SelectContent>
                    {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Comprovante</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground">Enviando…</p>}
              {form.receipt_url && <p className="text-xs text-green-600">✓ Comprovante anexado</p>}
            </div>

            {saveError && (
              <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{saveError}</p>
            )}

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando…' : editTx ? 'Salvar alterações' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Receipt className="h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhum lançamento ainda.</p>
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleStatus(tx)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={tx.status === 'pending' ? 'Marcar como acertado' : 'Marcar como pendente'}
                    >
                      {tx.status === 'pending' ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    </button>
                    <button
                      onClick={() => openEdit(tx)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
              