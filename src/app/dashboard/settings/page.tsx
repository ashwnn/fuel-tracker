'use client';

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/number";
import type { MonthlyBudget } from "@/types";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'budgets' | 'apikeys' | 'export'>('budgets');

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Control budgets, API keys, and exports.</p>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">{user?.email}</Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="budgets">Budgets</TabsTrigger>
              <TabsTrigger value="apikeys">API Keys</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>

            <TabsContent value="budgets" className="mt-6">
              <BudgetSettings token={token} />
            </TabsContent>

            <TabsContent value="apikeys" className="mt-6">
              <ApiKeySettings token={token} />
            </TabsContent>

            <TabsContent value="export" className="mt-6">
              <ExportSettings token={token} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetSettings({ token }: { token: string | null }) {
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
  });

  useEffect(() => {
    loadBudget();
  }, [token]);

  const loadBudget = async () => {
    if (!token) return;
    
    try {
      const { budget: userBudget } = await api.budgets.get(token);
      setBudget(userBudget);
      if (userBudget) {
        setFormData({
          amount: userBudget.amount.toString(),
          currency: userBudget.currency,
        });
      }
    } catch (error) {
      console.error('Failed to load budget:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      await api.budgets.create({
        amount: parseFloat(formData.amount),
        currency: formData.currency,
      }, token);
      
      await loadBudget();
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !confirm('Are you sure you want to delete your monthly budget?')) return;

    setLoading(true);
    setError('');

    try {
      await api.budgets.delete(token);
      setBudget(null);
      setFormData({ amount: '', currency: 'USD' });
    } catch (err: any) {
      setError(err.message || 'Failed to delete budget');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Monthly budget</CardTitle>
          <CardDescription>Set a monthly cap to keep spending on track.</CardDescription>
        </div>
        <Button variant={budget ? "secondary" : "default"} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : budget ? 'Edit budget' : 'Set budget'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {budget && !showForm && (
          <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">
              Your monthly budget is set to <span className="font-semibold text-foreground">{budget.currency} ${formatNumber(budget.amount, 2)}</span> every month.
            </p>
            <p className="text-xs text-muted-foreground">This applies to all months. Track usage on the dashboard.</p>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={loading}>
              Delete budget
            </Button>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monthly budget amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="500.00"
                required
              />
              <p className="text-xs text-muted-foreground">This amount applies to every month.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                required
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </Select>
            </div>

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Saving…' : budget ? 'Update budget' : 'Set budget'}
            </Button>
          </form>
        )}

        {!budget && !showForm && (
          <p className="text-sm text-muted-foreground">No monthly budget set. Set a budget to track your fuel spending.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ApiKeySettings({ token }: { token: string | null }) {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  useEffect(() => {
    loadApiKeys();
  }, [token]);

  const loadApiKeys = async () => {
    if (!token) return;
    
    try {
      const { apiKeys: keyList } = await api.apiKeys.list(token);
      setApiKeys(keyList);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const result = await api.apiKeys.create(newKeyName, token);
      setGeneratedKey(result.apiKey.key);
      await loadApiKeys();
      setNewKeyName('');
    } catch (err: any) {
      setError(err.message || 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!token) return;
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;

    try {
      await api.apiKeys.revoke(id, token);
      await loadApiKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      alert('Failed to revoke API key');
    }
  };

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Use keys to integrate FuelTracker with other tools.</CardDescription>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Generate key'}</Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {generatedKey && (
          <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="font-semibold">API key generated!</p>
            <p className="text-muted-foreground">Copy this key now. It will not be shown again.</p>
            <div className="rounded-md bg-background px-3 py-2 font-mono text-xs">{generatedKey}</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                  alert('Copied to clipboard!');
                }}
              >
                Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setGeneratedKey('')}>
                Close
              </Button>
            </div>
          </div>
        )}

        {showForm && !generatedKey && (
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key name</Label>
              <Input
                id="keyName"
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="My integration"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Generating…' : 'Generate key'}
            </Button>
          </form>
        )}

        {apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys generated yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map(key => (
                <TableRow key={key.id}>
                  <TableCell>{key.name}</TableCell>
                  <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(key.id)}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ExportSettings({ token }: { token: string | null }) {
  const [loading, setLoading] = useState(false);

  const handleExportJson = async () => {
    if (!token) return;
    setLoading(true);
    
    try {
      const data = await api.export.json(token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fueltracker-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export JSON:', error);
      alert('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    if (!token) return;
    setLoading(true);
    
    try {
      const response = await api.export.csv(token);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fueltracker-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Export your data</CardTitle>
        <CardDescription>Download everything for backups or analysis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleExportJson} disabled={loading}>
            {loading ? 'Exporting…' : 'Export as JSON'}
          </Button>
          <Button variant="secondary" onClick={handleExportCsv} disabled={loading}>
            {loading ? 'Exporting…' : 'Export as CSV'}
          </Button>
        </div>
        <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
          <p className="font-semibold">Export information</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li><span className="text-foreground">JSON:</span> Complete data including all vehicles, entries, budgets, and relationships.</li>
            <li><span className="text-foreground">CSV:</span> Simplified entry data suitable for spreadsheet analysis.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
