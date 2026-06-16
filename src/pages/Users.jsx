import { useEffect, useState } from 'react'
import { Plus, Users, Trash2, ShieldCheck, User, Pencil } from 'lucide-react'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogClose
} from '@/components/ui/dialog'

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'member' }

export default function UsersPage() {
  const [users, setUsers]     = useState([])
  const [open, setOpen]       = useState(false)
  const [editUser, setEditUser] = useState(null)   // user being edited
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data ?? [])
  }

  function openNew() {
    setEditUser(null)
    setForm(EMPTY_FORM)
    setError('')
    setOpen(true)
  }

  function openEdit(user) {
    setEditUser(user)
    setForm({ full_name: user.full_name, email: user.email, password: '', role: user.role })
    setError('')
    setOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (!supabaseAdmin) {
      setError('VITE_SUPABASE_SERVICE_KEY não configurada no .env')
      return
    }
    setSaving(true)
    try {
      if (editUser) {
        // Atualiza nome e role no profile
        const profileUpdates = { full_name: form.full_name, role: form.role }
        const { error: profileErr } = await supabaseAdmin
          .from('profiles')
          .update(profileUpdates)
          .eq('id', editUser.id)
        if (profileErr) throw profileErr

        // Atualiza email e/ou senha no Auth se alterados
        const authUpdates = {}
        if (form.email !== editUser.email) authUpdates.email = form.email
        if (form.password) authUpdates.password = form.password
        if (Object.keys(authUpdates).length > 0) {
          const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
            editUser.id, authUpdates
          )
          if (authErr) throw authErr
        }

        setUsers(prev => prev.map(u =>
          u.id === editUser.id
            ? { ...u, full_name: form.full_name, email: form.email, role: form.role }
            : u
        ))
      } else {
        // Cria novo usuário
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: form.email,
          password: form.password,
          email_confirm: true,
          user_metadata: { full_name: form.full_name },
        })
        if (authErr) throw authErr

        if (form.role === 'admin') {
          await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', authData.user.id)
        }

        await fetchUsers()
      }

      setOpen(false)
    } catch (err) {
      setError(err.message ?? 'Erro ao salvar usuário')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(user) {
    if (!supabaseAdmin) return
    setDeleting(user.id)
    try {
      await supabaseAdmin.auth.admin.deleteUser(user.id)
      setUsers(prev => prev.filter(u => u.id !== user.id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="h-4 w-4" />Novo usuário
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Editar Usuário' : 'Cadastrar Usuário'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input
                placeholder="Ex: Ana Silva"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="ana@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{editUser ? 'Nova senha (deixe vazio para manter)' : 'Senha'}</Label>
              <Input
                type="password"
                placeholder="mínimo 6 caracteres"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                minLength={form.password ? 6 : undefined}
                required={!editUser}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <div className="flex gap-2">
                {['member', 'admin'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: r }))}
                    className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                      form.role === r
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    {r === 'admin' ? 'Admin' : 'Membro'}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando…' : editUser ? 'Salvar alterações' : 'Criar usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <Card key={user.id}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {user.role === 'admin'
                    ? <ShieldCheck className="h-4 w-4 text-primary" />
                    : <User className="h-4 w-4 text-primary" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="shrink-0">
                  {user.role === 'admin' ? 'Admin' : 'Membro'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => openEdit(user)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                  disabled={deleting === user.id}
                  onClick={() => handleDelete(user)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
