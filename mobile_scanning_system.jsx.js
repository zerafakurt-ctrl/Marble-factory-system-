import React, { useEffect, useMemo, useState } from "react";
import { QrCode, Package, Scissors, Archive, Search, Download, Trash2, Save, ClipboardList, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

const STORAGE_KEY = "marble-factory-mobile-system-v1";

const initialData = {
  slabs: [
    { id: "S001", material: "Avant Quartz", lengthCm: 320, widthCm: 160, thickness: "20mm", location: "Rack A1", status: "available", remainingArea: 5.12, notes: "" },
    { id: "S002", material: "Ceramic", lengthCm: 320, widthCm: 160, thickness: "12mm", location: "Rack B2", status: "available", remainingArea: 5.12, notes: "" },
  ],
  cuts: [],
  offcuts: [],
};

function areaSqm(lengthCm, widthCm) {
  return Number(((lengthCm * widthCm) / 10000).toFixed(2));
}

function exportJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function statusColor(status) {
  switch (status) {
    case "available": return "bg-green-100 text-green-800";
    case "reserved": return "bg-amber-100 text-amber-800";
    case "used": return "bg-slate-200 text-slate-800";
    case "offcut": return "bg-blue-100 text-blue-800";
    default: return "bg-slate-100 text-slate-700";
  }
}

export default function MobileScanningSystem() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialData;
  });
  const [scanValue, setScanValue] = useState("");
  const [activeSlabId, setActiveSlabId] = useState("");
  const [jobName, setJobName] = useState("");
  const [operator, setOperator] = useState("");
  const [usedLength, setUsedLength] = useState("");
  const [usedWidth, setUsedWidth] = useState("");
  const [offcutLength, setOffcutLength] = useState("");
  const [offcutWidth, setOffcutWidth] = useState("");
  const [offcutLocation, setOffcutLocation] = useState("");
  const [search, setSearch] = useState("");
  const [newSlab, setNewSlab] = useState({ id: "", material: "", lengthCm: 320, widthCm: 160, thickness: "20mm", location: "", status: "available", notes: "" });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const slabs = data.slabs;
  const activeSlab = useMemo(() => slabs.find((s) => s.id === activeSlabId), [slabs, activeSlabId]);

  const filteredSlabs = useMemo(() => {
    const q = search.toLowerCase();
    return slabs.filter((s) =>
      s.id.toLowerCase().includes(q) ||
      s.material.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q)
    );
  }, [slabs, search]);

  const totals = useMemo(() => {
    const totalSlabs = slabs.length;
    const available = slabs.filter((s) => s.status === "available").length;
    const reserved = slabs.filter((s) => s.status === "reserved").length;
    const offcuts = data.offcuts.length;
    return { totalSlabs, available, reserved, offcuts };
  }, [slabs, data.offcuts]);

  function handleScan() {
    const match = slabs.find((s) => s.id.toLowerCase() === scanValue.trim().toLowerCase());
    if (match) {
      setActiveSlabId(match.id);
    } else {
      alert("Slab not found. Add it first or check the code.");
    }
  }

  function addSlab() {
    if (!newSlab.id || !newSlab.material || !newSlab.location) {
      alert("Please fill slab ID, material, and location.");
      return;
    }
    if (slabs.some((s) => s.id === newSlab.id)) {
      alert("Slab ID already exists.");
      return;
    }
    const slabArea = areaSqm(Number(newSlab.lengthCm), Number(newSlab.widthCm));
    setData((prev) => ({
      ...prev,
      slabs: [...prev.slabs, { ...newSlab, remainingArea: slabArea }],
    }));
    setNewSlab({ id: "", material: "", lengthCm: 320, widthCm: 160, thickness: "20mm", location: "", status: "available", notes: "" });
  }

  function logCut() {
    if (!activeSlab || !jobName || !operator || !usedLength || !usedWidth) {
      alert("Select slab and complete job, operator, and used strip size.");
      return;
    }

    const usedArea = areaSqm(Number(usedLength), Number(usedWidth));
    const remainingArea = Math.max(0, Number((activeSlab.remainingArea - usedArea).toFixed(2)));

    setData((prev) => ({
      ...prev,
      cuts: [
        {
          id: `CUT-${Date.now()}`,
          date: new Date().toLocaleString(),
          slabId: activeSlab.id,
          jobName,
          operator,
          usedLength: Number(usedLength),
          usedWidth: Number(usedWidth),
          usedArea,
          remainingArea,
        },
        ...prev.cuts,
      ],
      slabs: prev.slabs.map((s) =>
        s.id === activeSlab.id
          ? {
              ...s,
              remainingArea,
              status: remainingArea === 0 ? "used" : remainingArea < 5.12 ? "offcut" : s.status,
            }
          : s
      ),
    }));

    setUsedLength("");
    setUsedWidth("");
    setJobName("");
  }

  function saveOffcut() {
    if (!activeSlab || !offcutLength || !offcutWidth || !offcutLocation) {
      alert("Select slab and complete offcut size and location.");
      return;
    }
    const offcutArea = areaSqm(Number(offcutLength), Number(offcutWidth));
    setData((prev) => ({
      ...prev,
      offcuts: [
        {
          id: `OFF-${Date.now()}`,
          slabId: activeSlab.id,
          material: activeSlab.material,
          lengthCm: Number(offcutLength),
          widthCm: Number(offcutWidth),
          area: offcutArea,
          location: offcutLocation,
          status: "reusable",
          date: new Date().toLocaleString(),
        },
        ...prev.offcuts,
      ],
    }));
    setOffcutLength("");
    setOffcutWidth("");
    setOffcutLocation("");
  }

  function removeSlab(id) {
    setData((prev) => ({ ...prev, slabs: prev.slabs.filter((s) => s.id !== id) }));
    if (activeSlabId === id) setActiveSlabId("");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <QrCode className="h-6 w-6" /> Marble Factory Mobile Scanning System
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <Card className="rounded-2xl"><CardContent className="p-4"><div className="text-sm text-slate-500">Total Slabs</div><div className="text-2xl font-bold">{totals.totalSlabs}</div></CardContent></Card>
              <Card className="rounded-2xl"><CardContent className="p-4"><div className="text-sm text-slate-500">Available</div><div className="text-2xl font-bold">{totals.available}</div></CardContent></Card>
              <Card className="rounded-2xl"><CardContent className="p-4"><div className="text-sm text-slate-500">Reserved</div><div className="text-2xl font-bold">{totals.reserved}</div></CardContent></Card>
              <Card className="rounded-2xl"><CardContent className="p-4"><div className="text-sm text-slate-500">Offcuts</div><div className="text-2xl font-bold">{totals.offcuts}</div></CardContent></Card>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="scan" className="space-y-4">
          <TabsList className="grid grid-cols-5 rounded-2xl">
            <TabsTrigger value="scan">Scan & Cut</TabsTrigger>
            <TabsTrigger value="slabs">Slabs</TabsTrigger>
            <TabsTrigger value="offcuts">Offcuts</TabsTrigger>
            <TabsTrigger value="add">Add Slab</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Scan or Enter Slab ID</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Slab ID / QR value</Label>
                    <div className="mt-2 flex gap-2">
                      <Input value={scanValue} onChange={(e) => setScanValue(e.target.value)} placeholder="Example: S001" />
                      <Button onClick={handleScan}>Find</Button>
                    </div>
                  </div>
                  {activeSlab ? (
                    <div className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-lg font-semibold">{activeSlab.id}</div>
                          <div className="text-sm text-slate-600">{activeSlab.material} · {activeSlab.lengthCm} x {activeSlab.widthCm} cm · {activeSlab.thickness}</div>
                        </div>
                        <Badge className={statusColor(activeSlab.status)}>{activeSlab.status}</Badge>
                      </div>
                      <div className="mt-3 text-sm">Location: <span className="font-medium">{activeSlab.location}</span></div>
                      <div className="text-sm">Remaining area: <span className="font-medium">{activeSlab.remainingArea} sqm</span></div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-slate-500">No slab selected yet.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="h-5 w-5" /> Log Cut</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Job Name</Label><Input value={jobName} onChange={(e) => setJobName(e.target.value)} placeholder="Kitchen Smith" /></div>
                    <div><Label>Operator</Label><Input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Mario" /></div>
                    <div><Label>Used strip length (cm)</Label><Input type="number" value={usedLength} onChange={(e) => setUsedLength(e.target.value)} /></div>
                    <div><Label>Used strip width/depth (cm)</Label><Input type="number" value={usedWidth} onChange={(e) => setUsedWidth(e.target.value)} /></div>
                  </div>
                  <Button className="w-full" onClick={logCut}><Save className="mr-2 h-4 w-4" /> Save Cut</Button>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4 rounded-2xl shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5" /> Save Reusable Offcut</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <div><Label>Offcut length (cm)</Label><Input type="number" value={offcutLength} onChange={(e) => setOffcutLength(e.target.value)} /></div>
                <div><Label>Offcut width (cm)</Label><Input type="number" value={offcutWidth} onChange={(e) => setOffcutWidth(e.target.value)} /></div>
                <div><Label>Offcut location</Label><Input value={offcutLocation} onChange={(e) => setOffcutLocation(e.target.value)} placeholder="Offcut Rack 2" /></div>
                <div className="flex items-end"><Button className="w-full" onClick={saveOffcut}>Save Offcut</Button></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="slabs">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Slab Register</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-4"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by slab ID, material, or location" /></div>
                <div className="grid gap-3">
                  {filteredSlabs.map((slab) => (
                    <div key={slab.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-semibold">{slab.id} · {slab.material}</div>
                          <div className="text-sm text-slate-600">{slab.lengthCm} x {slab.widthCm} cm · {slab.thickness} · {slab.location}</div>
                          <div className="text-sm text-slate-600">Remaining: {slab.remainingArea} sqm</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusColor(slab.status)}>{slab.status}</Badge>
                          <Button variant="outline" onClick={() => setActiveSlabId(slab.id)}>Select</Button>
                          <Button variant="ghost" onClick={() => removeSlab(slab.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offcuts">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Reusable Offcuts</CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                {data.offcuts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">No offcuts saved yet.</div>
                ) : data.offcuts.map((o) => (
                  <div key={o.id} className="rounded-2xl border p-4">
                    <div className="font-semibold">{o.id} · {o.material}</div>
                    <div className="text-sm text-slate-600">From slab: {o.slabId}</div>
                    <div className="text-sm text-slate-600">{o.lengthCm} x {o.widthCm} cm · {o.area} sqm</div>
                    <div className="text-sm text-slate-600">Location: {o.location}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Add New Slab</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div><Label>Slab ID</Label><Input value={newSlab.id} onChange={(e) => setNewSlab({ ...newSlab, id: e.target.value })} /></div>
                <div><Label>Material</Label><Input value={newSlab.material} onChange={(e) => setNewSlab({ ...newSlab, material: e.target.value })} /></div>
                <div><Label>Thickness</Label><Input value={newSlab.thickness} onChange={(e) => setNewSlab({ ...newSlab, thickness: e.target.value })} /></div>
                <div><Label>Length (cm)</Label><Input type="number" value={newSlab.lengthCm} onChange={(e) => setNewSlab({ ...newSlab, lengthCm: Number(e.target.value) })} /></div>
                <div><Label>Width (cm)</Label><Input type="number" value={newSlab.widthCm} onChange={(e) => setNewSlab({ ...newSlab, widthCm: Number(e.target.value) })} /></div>
                <div><Label>Location</Label><Input value={newSlab.location} onChange={(e) => setNewSlab({ ...newSlab, location: e.target.value })} /></div>
                <div className="md:col-span-3"><Label>Notes</Label><Textarea value={newSlab.notes} onChange={(e) => setNewSlab({ ...newSlab, notes: e.target.value })} /></div>
                <div className="md:col-span-3"><Button onClick={addSlab}><Save className="mr-2 h-4 w-4" /> Add Slab</Button></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Export Data</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" onClick={() => exportJson(data, "marble-factory-data.json")}>Export JSON Backup</Button>
                  <p className="text-sm text-slate-500">Use this to save or share your latest mobile data.</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Daily Use Tips</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                  <p>1. Scan slab before every cut.</p>
                  <p>2. Record actual strip length and width used.</p>
                  <p>3. Save any reusable offcut immediately.</p>
                  <p>4. Keep location updated whenever material moves.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
