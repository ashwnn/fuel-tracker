'use client';

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/number";
import { FillUpEntry, Vehicle } from "@/types";

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}

function AnalyticsContent() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [entries, setEntries] = useState<FillUpEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, [token]);

  useEffect(() => {
    if (selectedVehicleId && token) {
      loadEntries(selectedVehicleId);
    }
  }, [selectedVehicleId, token]);

  const loadVehicles = async () => {
    if (!token) return;
    
    try {
      const { vehicles: vehicleList } = await api.vehicles.list(token);
      setVehicles(vehicleList);
      if (vehicleList.length > 0) {
        setSelectedVehicleId(vehicleList[0].id);
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async (vehicleId: number) => {
    if (!token) return;
    
    try {
      const { entries: entryList } = await api.entries.list(vehicleId, token);
      setEntries(entryList);
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  };

  if (loading) {
    return <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading analytics…</div>;
  }

  if (vehicles.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Please add a vehicle to view analytics.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  
  // Calculate analytics
  const totalCost = entries.reduce((sum, e) => sum + e.totalCost, 0);
  const totalVolume = entries.reduce((sum, e) => sum + e.fuelVolumeL, 0);
  const avgPricePerLiter = totalVolume > 0 ? totalCost / totalVolume : 0;
  
  const economyEntries = entries.filter(e => e.economyLPer100Km);
  const avgEconomy = economyEntries.length > 0
    ? economyEntries.reduce((sum, e) => sum + (e.economyLPer100Km || 0), 0) / economyEntries.length
    : 0;

  const mpgEntries = entries.filter(e => e.economyMpg);
  const avgMpg = mpgEntries.length > 0
    ? mpgEntries.reduce((sum, e) => sum + (e.economyMpg || 0), 0) / mpgEntries.length
    : 0;

  // Group by month
  const monthlyData = entries.reduce((acc, entry) => {
    const date = new Date(entry.entryDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = { cost: 0, volume: 0, count: 0 };
    }
    acc[monthKey].cost += entry.totalCost;
    acc[monthKey].volume += entry.fuelVolumeL;
    acc[monthKey].count += 1;
    return acc;
  }, {} as Record<string, { cost: number; volume: number; count: number }>);

  const monthlyStats = Object.entries(monthlyData)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6);

  const mpgTrend = mpgEntries
    .slice()
    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
    .slice(0, 10);

  const selectedVehicleDetails = vehicles.find(v => v.id === selectedVehicleId);

  const aiInsight = (() => {
    if (!mpgEntries.length || !selectedVehicleDetails) return 'Not enough data yet for insights.';

    const latest = mpgEntries[0];
    const delta = mpgEntries.length > 1 ? (latest.economyMpg || 0) - (mpgEntries[mpgEntries.length - 1].economyMpg || 0) : 0;
    const makeModel = [selectedVehicleDetails.make, selectedVehicleDetails.model].filter(Boolean).join(' ');
    const transmission = selectedVehicleDetails.transmissionType || 'Unknown transmission';
    const expected = selectedVehicleDetails.expectedMpg;

    const issues: string[] = [];
    if (expected && avgMpg && avgMpg < expected * 0.9) issues.push('fuel efficiency below expected spec (check tires, filters, driving style)');
    if (delta < -1) issues.push('recent downward MPG trend (inspect tire pressure, alignment, or aggressive driving)');
    if (transmission === 'AUTOMATIC') issues.push('ensure transmission fluid is serviced per schedule');
    if (transmission === 'CVT') issues.push('watch for CVT slip; consider fluid change intervals');

    const suggestions = issues.length
      ? issues.join('; ')
      : 'Efficiency is near expected; maintain regular service and moderate speeds.';

    const label = makeModel || selectedVehicleDetails.name || 'vehicle';
    return `For ${label} (${transmission}), avg MPG is ${formatNumber(avgMpg,1)}${expected ? ` vs expected ${formatNumber(expected,1)}` : ''}. ${suggestions}`;
  })();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Recent performance and monthly patterns.</CardDescription>
          </div>
          <div className="w-full max-w-xs">
            <Select
              value={selectedVehicleId || ''}
              onChange={(e) => setSelectedVehicleId(parseInt(e.target.value))}
            >
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {entries.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
              No entries yet for analytics.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Overall statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Stat label="Total entries" value={entries.length} />
                  <Stat label="Total spent" value={`$${formatNumber(totalCost, 2)}`} />
                  <Stat label="Total fuel" value={`${formatNumber(totalVolume, 1)} L`} />
                  <Stat label="Avg price/L" value={`$${formatNumber(avgPricePerLiter, 3)}`} />
                  {avgEconomy > 0 && <Stat label="Avg economy" value={`${formatNumber(avgEconomy, 2)} L/100km`} />}
                  {avgMpg > 0 && <Stat label="Avg MPG" value={`${formatNumber(avgMpg, 1)} mpg`} />}
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Monthly breakdown (last 6)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Fills</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead>Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyStats.map(([month, data]) => (
                        <TableRow key={month}>
                          <TableCell>{month}</TableCell>
                          <TableCell>{data.count}</TableCell>
                          <TableCell>{formatNumber(data.volume, 1)} L</TableCell>
                          <TableCell>${formatNumber(data.cost, 2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {economyEntries.length > 0 && (
                <Card className="border-border/70 shadow-sm md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Recent economy trend</CardTitle>
                    <CardDescription>Last 10 recorded economy values.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 md:grid-cols-2">
                    {economyEntries.slice(0, 10).map(entry => (
                      <div key={entry.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">{new Date(entry.entryDate).toLocaleDateString()}</span>
                        <span className="font-semibold">{formatNumber(entry.economyLPer100Km, 2)} L/100km</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {mpgTrend.length > 0 && (
                <Card className="border-border/70 shadow-sm md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">MPG trend</CardTitle>
                    <CardDescription>Last 10 MPG readings across fill-ups.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 md:grid-cols-2">
                    {mpgTrend.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">{new Date(entry.entryDate).toLocaleDateString()}</span>
                        <span className="font-semibold">{formatNumber(entry.economyMpg, 1)} mpg</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {mpgTrend.length > 0 && (
                <Card className="border-border/70 shadow-sm md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">AI efficiency insight</CardTitle>
                    <CardDescription>Contextual note considering your vehicle and recent MPG.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                      {aiInsight}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/70 shadow-sm md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Fuel type distribution</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(
                    entries.reduce((acc, e) => {
                      acc[e.fuelType] = (acc[e.fuelType] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      <span>{type}</span>
                      <Badge variant="secondary">{count} ({formatNumber((count / entries.length) * 100, 1)}%)</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
