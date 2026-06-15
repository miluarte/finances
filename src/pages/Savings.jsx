import { useEffect, useState } from 'react'
import { Plus, PiggyBank, Pencil } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Drawer, DrawerTrigger, DrawerContent, DrawerHeader,
  DrawerTitle, DrawerFooter, DrawerClose
} from '@/components/ui/drawer'

export default function Savings() {
  const { profile } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', balance: '', emoji: '🐷' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAccounts() }, [profile])

  async function fetchAccounts() {
    if (!profile) return
    const { data } = await supabase
      .from('savings_accounts')
      .select('*')
      .eq('user_id', profile.id)
      .order('name')
    setAccounts(data ?? [])
  }

  function openNew() {
    setEditItem(null)
    setForm({ name: '', balance: '', emoji: '🐷' })
    setOpen(true)
  }

  function openEdit(acc) {
    setEditItem(acc)
    setForm({ name: acc.name, balance: String(acc.balance), emoji: acc.emoji ?? '🐷' })
    setOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        user_id: profile.id,
        name: form.name,
        balance: parseFloat(form.balance),
        emoji: form.emoji,
      }
      if (editItem) {
        await supabase.from('savings_accounts').update(payload).eq('id', editItem.id)
      } else {
        await supabase.from('savings_accounts').insert(payload)
      }
      setOpen(false)
      fetchAccounts()
    } finally {
      setSaving(false)
    }
  }

  const total = accounts.reduce((s, a) => s + (a.balance ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Caixinhas</h1>
          <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{formatCurrency(total)}</span></p>
        </div>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={openNew}><Plus className="h-4 w-4" />Nova</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{editItem ? 'Editar' : 'Nova'} Caixinha</DrawerTitle>
            </DrawerHeader>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>Ícone</Label>
                  <Input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} className="text-center text-lg" />
                </div>
                <div className="col-span-3 space-y-1.5">
                  <Label>Nome</Label>
                  <Input placeholder="Ex: Viagem, Reserva…" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Saldo atual (R$)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} required />
              </div>
              <DrawerFooter>
                <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
                <DrawerClose asChild><Button variant="outline">Cancelar</Button></DrawerClose>
              </DrawerFooter>
            </form>
          </DrawerContent>
        </Drawer>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <PiggyBank className="h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhuma caixinha ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {accounts.map(acc => (
            <Card key={acc.id} className="overflow-hidden">
              <CardContent className="pt-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{acc.emoji ?? '🐷'}</span>
                  <button onClick={() => openEdit(acc)} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm font-medium">{acc.name}</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(acc.balance)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
