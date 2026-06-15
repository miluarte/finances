import { useEffect, useState } from 'react'
import { Plus, Heart, Trash2, CalendarCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Drawer, DrawerTrigger, DrawerContent, DrawerHeader,
  DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose
} from '@/components/ui/drawer'

export default function Wishlist() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [monthlySavings, setMonthlySavings] = useState(0)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', url: '', emoji: '🛒' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchData() }, [profile])

  async function fetchData() {
    if (!profile) return

    // Busca lista de desejos
    const { data: wishes } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', profile.id)
      .order('price', { ascending: true })
    setItems(wishes ?? [])

    // Calcula capacidade de poupança: média (receitas - despesas) dos últimos 3 meses
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const startDate = threeMonthsAgo.toISOString().split('T')[0]

    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, type, date')
      .eq('user_id', profile.id)
      .gte('date', startDate)

    if (txs?.length) {
      const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      setMonthlySavings(Math.max(0, (income - expense) / 3))
    }
  }

  function estimatedMonth(price) {
    if (!monthlySavings || monthlySavings <= 0) return null
    const months = Math.ceil(price / monthlySavings)
    const target = new Date()
    target.setMonth(target.getMonth() + months)
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(target)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await supabase.from('wishlist_items').insert({
        user_id: profile.id,
        name: form.name,
        price: parseFloat(form.price),
        url: form.url || null,
        emoji: form.emoji,
      })
      setOpen(false)
      setForm({ name: '', price: '', url: '', emoji: '🛒' })
      fetchData()
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id) {
    await supabase.from('wishlist_items').delete().eq('id', id)
    fetchData()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lista de Desejos</h1>
          {monthlySavings > 0 && (
            <p className="text-sm text-muted-foreground">
              Capacidade de poupança: <span className="font-semibold text-foreground">{formatCurrency(monthlySavings)}/mês</span>
            </p>
          )}
        </div>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Novo desejo</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Adicionar Desejo</DrawerTitle>
              <DrawerDescription>O sistema vai calcular quando você poderá comprar.</DrawerDescription>
            </DrawerHeader>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>Ícone</Label>
                  <Input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} className="text-center text-lg" />
                </div>
                <div className="col-span-3 space-y-1.5">
                  <Label>O que você quer comprar?</Label>
                  <Input placeholder="Ex: iPhone 16, Tênis Nike…" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Preço estimado (R$)</Label>
                <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Link (opcional)</Label>
                <Input type="url" placeholder="https://..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              </div>
              <DrawerFooter>
                <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Adicionar'}</Button>
                <DrawerClose asChild><Button variant="outline">Cancelar</Button></DrawerClose>
              </DrawerFooter>
            </form>
          </DrawerContent>
        </Drawer>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Heart className="h-10 w-10 opacity-30" />
          <p className="text-sm">Sua lista de desejos está vazia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const eta = estimatedMonth(item.price)
            return (
              <Card key={item.id}>
                <CardContent className="pt-4 flex items-start gap-3">
                  <span className="text-2xl shrink-0">{item.emoji ?? '🛒'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{item.name}</p>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">ver produto</a>
                      )}
                    </div>
                    <p className="text-lg font-bold mt-0.5">{formatCurrency(item.price)}</p>
                    {eta && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <CalendarCheck className="h-3.5 w-3.5 text-green-600" />
                        <Badge variant="success" className="text-xs">Estimativa: {eta}</Badge>
                      </div>
                    )}
                    {!eta && monthlySavings <= 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Lance receitas para calcular estimativa.</p>
                    )}
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
